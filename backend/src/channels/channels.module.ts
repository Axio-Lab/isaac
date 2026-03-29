import { Module, Logger, OnModuleInit } from "@nestjs/common";
import * as crypto from "crypto";
import { PrismaService } from "../common/prisma.service";
import { ChannelsService } from "./channels.service";
import { ChannelsController } from "./channels.controller";
import { InternalWebhookController } from "./internal-webhook.controller";
import { ChannelMessagingService } from "./channel-messaging.service";
import { InboundMessageService } from "./inbound-message.service";
import { WhatsAppModule } from "../whatsapp/whatsapp.module";
import { WhatsAppService } from "../whatsapp/whatsapp.service";
import { normalizeIncomingExternalId } from "./platform-utils";

@Module({
  imports: [WhatsAppModule],
  controllers: [ChannelsController, InternalWebhookController],
  providers: [
    ChannelsService,
    ChannelMessagingService,
    InboundMessageService,
    PrismaService,
  ],
  exports: [ChannelsService, ChannelMessagingService, InboundMessageService],
})
export class ChannelsModule implements OnModuleInit {
  private readonly logger = new Logger(ChannelsModule.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly whatsappService: WhatsAppService,
    private readonly inbound: InboundMessageService,
  ) {}

  async onModuleInit() {
    this.whatsappService.setMessageHandler(({ channelId, senderJid, text, imageUrl }) => {
      const externalId = normalizeIncomingExternalId(senderJid, "WHATSAPP");
      this.inbound
        .handleIncoming({
          channelId,
          platform: "WHATSAPP",
          senderExternalId: externalId,
          text,
          imageUrl,
        })
        .catch(() => {});
    });

    await this.reRegisterTelegramWebhooks();
  }

  /**
   * On startup, re-register Telegram webhooks for all connected channels
   * so they always point to the current API_URL.
   */
  private async reRegisterTelegramWebhooks() {
    const apiBase = (process.env.API_URL || "").replace(/\/+$/, "");
    if (!apiBase || apiBase.includes("localhost") || apiBase.includes("127.0.0.1")) {
      this.logger.warn(
        "API_URL is not set to a public HTTPS URL — Telegram webhooks will not work. " +
          "Set API_URL in .env to your public tunnel/domain and restart.",
      );
      return;
    }

    const channels = await this.prisma.taskChannel.findMany({
      where: {
        platform: "TELEGRAM",
        telegramBotToken: { not: null },
      },
      select: { id: true, telegramBotToken: true },
    });

    for (const ch of channels) {
      if (!ch.telegramBotToken) continue;
      const secret = crypto.randomBytes(32).toString("hex");
      const webhookUrl = `${apiBase}/api/internal/task-channels/telegram/${ch.id}`;
      try {
        const res = await fetch(
          `https://api.telegram.org/bot${ch.telegramBotToken}/setWebhook`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              url: webhookUrl,
              secret_token: secret,
              allowed_updates: ["message"],
            }),
          },
        );
        const data = (await res.json()) as { ok?: boolean; description?: string };
        if (data.ok) {
          await this.prisma.taskChannel.update({
            where: { id: ch.id },
            data: { sharedSecret: secret },
          });
          this.logger.log(`Telegram webhook registered: ${webhookUrl}`);
        } else {
          this.logger.warn(`Telegram setWebhook failed for ${ch.id}: ${data.description}`);
        }
      } catch (err: any) {
        this.logger.error(`Failed to register Telegram webhook for ${ch.id}`, err);
      }
    }
  }
}
