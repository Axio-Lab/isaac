import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../common/prisma.service";
import { WhatsAppService } from "../whatsapp/whatsapp.service";
import {
  sendTelegram,
  sendWhatsApp,
  sendDiscord,
  sendSlack,
  type SendResult,
} from "./platform-senders";

@Injectable()
export class ChannelMessagingService {
  private readonly logger = new Logger(ChannelMessagingService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly whatsappService: WhatsAppService,
  ) {}

  async sendToWorker(
    workerId: string,
    text: string,
  ): Promise<SendResult> {
    const worker = await (this.prisma as any).humanWorker.findUnique({
      where: { id: workerId },
      include: { taskChannel: true },
    });
    if (!worker) return { success: false, error: "Worker not found" };
    if (!worker.taskChannel) return { success: false, error: "No channel bound to worker" };

    return this.sendViaChannel(
      worker.taskChannel,
      worker.externalId,
      worker.platform,
      text,
    );
  }

  async sendViaChannel(
    channel: any,
    recipientId: string,
    platform: string,
    text: string,
  ): Promise<SendResult> {
    try {
      switch (platform.toUpperCase()) {
        case "TELEGRAM":
          return sendTelegram(channel.telegramBotToken, recipientId, text);
        case "WHATSAPP":
          return sendWhatsApp(this.whatsappService, channel.id, recipientId, text);
        case "DISCORD":
          return sendDiscord(channel.discordBotToken, recipientId, text);
        case "SLACK":
          return sendSlack(channel.slackBotToken, recipientId, text);
        default:
          return { success: false, error: `Unsupported platform: ${platform}` };
      }
    } catch (err: any) {
      this.logger.error(`sendViaChannel failed for ${platform}`, err);
      return { success: false, error: err.message };
    }
  }

  async broadcastToTask(
    taskId: string,
    text: string,
  ): Promise<{ sent: number; failed: number }> {
    const workers = await (this.prisma as any).humanWorker.findMany({
      where: { humanTaskId: taskId, status: "ACTIVE" },
    });

    let sent = 0;
    let failed = 0;
    for (const worker of workers) {
      const result = await this.sendToWorker(worker.id, text);
      if (result.success) sent++;
      else failed++;
    }
    return { sent, failed };
  }
}
