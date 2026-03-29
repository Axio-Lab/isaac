import {
  Controller,
  Post,
  Param,
  Body,
  Headers,
  HttpCode,
  Res,
  Logger,
} from "@nestjs/common";
import { Response } from "express";
import { PrismaService } from "../common/prisma.service";
import { InboundMessageService } from "./inbound-message.service";
import {
  parseTelegramWebhook,
  parseSlackEvent,
  parseDiscordWebhook,
  parseWhatsAppWebhook,
} from "./platform-parsers";
import { verifySlackSignature } from "./platform-verify";

@Controller("internal/task-channels")
export class InternalWebhookController {
  private readonly logger = new Logger(InternalWebhookController.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly inbound: InboundMessageService,
  ) {}

  // ─── Telegram ────────────────────────────────────────────────────

  @Post("telegram/:channelId")
  @HttpCode(200)
  async telegramWebhook(
    @Param("channelId") channelId: string,
    @Headers("x-telegram-bot-api-secret-token") secret: string | undefined,
    @Body() body: any,
  ) {
    const channel = await this.findChannel(channelId);
    if (!channel) return { ok: true };

    if (channel.sharedSecret && channel.sharedSecret !== secret) {
      this.logger.warn(`Telegram webhook secret mismatch for channel ${channelId}`);
      return { ok: true };
    }

    const parsed = await parseTelegramWebhook(body, channel.telegramBotToken);
    if (!parsed) return { ok: true };

    await this.inbound.handleIncoming({
      channelId,
      platform: "TELEGRAM",
      senderExternalId: parsed.senderExternalId,
      text: parsed.text,
      imageUrl: parsed.imageUrl,
    });

    return { ok: true };
  }

  // ─── Slack ───────────────────────────────────────────────────────

  @Post("slack/:channelId/events")
  @HttpCode(200)
  async slackEvents(
    @Param("channelId") channelId: string,
    @Headers("x-slack-signature") slackSig: string | undefined,
    @Headers("x-slack-request-timestamp") slackTs: string | undefined,
    @Body() body: any,
    @Res({ passthrough: true }) _res: Response,
  ) {
    if (body.type === "url_verification") {
      return { challenge: body.challenge };
    }

    const channel = await this.findChannel(channelId);
    if (!channel) return { ok: true };

    if (channel.slackSigningSecret && slackSig && slackTs) {
      if (!verifySlackSignature(channel.slackSigningSecret, slackSig, slackTs, JSON.stringify(body))) {
        this.logger.warn(`Slack signature mismatch for channel ${channelId}`);
        return { ok: true };
      }
    }

    const parsed = parseSlackEvent(body);
    if (!parsed) return { ok: true };

    await this.inbound.handleIncoming({
      channelId,
      platform: "SLACK",
      senderExternalId: parsed.senderExternalId,
      text: parsed.text,
      imageUrl: parsed.imageUrl,
    });

    return { ok: true };
  }

  // ─── Discord ─────────────────────────────────────────────────────

  @Post("discord/:channelId")
  @HttpCode(200)
  async discordWebhook(
    @Param("channelId") channelId: string,
    @Headers("x-discord-secret") secret: string | undefined,
    @Body() body: any,
  ) {
    const channel = await this.findChannel(channelId);
    if (!channel) return { ok: true };

    const expectedSecret = channel.sharedSecret || process.env.DISCORD_INCOMING_SECRET;
    if (expectedSecret && expectedSecret !== secret) {
      this.logger.warn(`Discord webhook secret mismatch for channel ${channelId}`);
      return { ok: true };
    }

    const parsed = parseDiscordWebhook(body);
    if (!parsed) return { ok: true };

    await this.inbound.handleIncoming({
      channelId,
      platform: "DISCORD",
      senderExternalId: parsed.senderExternalId,
      text: parsed.text,
      imageUrl: parsed.imageUrl,
    });

    return { ok: true };
  }

  // ─── WhatsApp (HTTP path — Baileys goes through ChannelsModule) ──

  @Post("whatsapp/incoming")
  @HttpCode(200)
  async whatsappIncoming(
    @Headers("x-whatsapp-secret") secret: string | undefined,
    @Body() body: any,
  ) {
    const expectedSecret = process.env.WHATSAPP_INCOMING_SECRET;
    if (expectedSecret && expectedSecret !== secret) {
      this.logger.warn("WhatsApp incoming secret mismatch");
      return { ok: true };
    }

    const channelId = body.channelId ?? body.sessionId;
    if (!channelId) return { ok: true };

    const parsed = parseWhatsAppWebhook(body);
    if (!parsed) return { ok: true };

    await this.inbound.handleIncoming({
      channelId,
      platform: "WHATSAPP",
      senderExternalId: parsed.senderExternalId,
      text: parsed.text,
      imageUrl: parsed.imageUrl,
    });

    return { ok: true };
  }

  // ─── Helpers ─────────────────────────────────────────────────────

  private async findChannel(channelId: string) {
    return (this.prisma as any).taskChannel.findUnique({
      where: { id: channelId },
    });
  }
}
