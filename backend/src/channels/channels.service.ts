import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from "@nestjs/common";
import { PrismaService } from "../common/prisma.service";
import { WhatsAppService } from "../whatsapp/whatsapp.service";
import { ChatPlatform } from "@prisma/client";
import type { TaskChannel } from "@prisma/client";
import * as crypto from "crypto";

@Injectable()
export class ChannelsService {
  private readonly logger = new Logger(ChannelsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly whatsappService: WhatsAppService
  ) {}

  private getApiBaseUrl(): string {
    return (process.env.API_URL || "http://localhost:8080").replace(/\/+$/, "");
  }

  async listChannels(userId: string) {
    return this.prisma.taskChannel.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });
  }

  async getChannel(userId: string, channelId: string) {
    const channel = await this.prisma.taskChannel.findUnique({
      where: { id: channelId },
    });

    if (!channel) {
      throw new NotFoundException("Channel not found");
    }
    if (channel.userId !== userId) {
      throw new ForbiddenException("Not authorized to access this channel");
    }

    return channel;
  }

  async createChannel(
    userId: string,
    data: {
      label: string;
      platform: ChatPlatform;
      telegramBotToken?: string;
      telegramBotUsername?: string;
      slackBotToken?: string;
      slackSigningSecret?: string;
      slackTeamId?: string;
      slackChannelId?: string;
      discordBotToken?: string;
      discordGuildId?: string;
      discordChannelId?: string;
      webhookUrl?: string;
      sharedSecret?: string;
    }
  ) {
    const hasCredentials =
      !!data.telegramBotToken ||
      !!data.slackBotToken ||
      !!data.discordBotToken ||
      !!data.webhookUrl;

    const channel = await this.prisma.taskChannel.create({
      data: {
        userId,
        ...data,
        status: hasCredentials ? "connected" : "pending",
      },
    });

    if (data.telegramBotToken) {
      await this.registerTelegramWebhook(channel.id, data.telegramBotToken);
    }

    return channel;
  }

  /**
   * Register a Telegram webhook so the bot receives incoming messages.
   */
  private async registerTelegramWebhook(channelId: string, botToken: string): Promise<void> {
    const secret = crypto.randomBytes(32).toString("hex");
    const webhookUrl = `${this.getApiBaseUrl()}/api/internal/task-channels/telegram/${channelId}`;

    try {
      const res = await fetch(`https://api.telegram.org/bot${botToken}/setWebhook`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: webhookUrl,
          secret_token: secret,
          allowed_updates: ["message"],
        }),
      });
      const data = (await res.json()) as { ok?: boolean; description?: string };
      if (!data.ok) {
        this.logger.warn(`Telegram setWebhook failed: ${data.description}`);
        return;
      }

      await this.prisma.taskChannel.update({
        where: { id: channelId },
        data: { sharedSecret: secret },
      });
      this.logger.log(`Telegram webhook registered for channel ${channelId}`);
    } catch (err) {
      this.logger.error("Failed to register Telegram webhook", err);
    }
  }

  async testChannel(userId: string, channelId: string) {
    const channel = await this.getChannel(userId, channelId);

    const hasCredentials =
      !!channel.telegramBotToken ||
      !!channel.slackBotToken ||
      !!channel.discordBotToken ||
      !!channel.webhookUrl;

    if (!hasCredentials && channel.status !== "connected") {
      throw new BadRequestException("Add credentials (or refresh status) before sending a test.");
    }

    switch (channel.platform) {
      case ChatPlatform.TELEGRAM:
        return this.testTelegramChannel(channel);
      case ChatPlatform.DISCORD:
        return this.testDiscordChannel(channel);
      case ChatPlatform.SLACK:
        return this.testSlackChannel(channel);
      case ChatPlatform.WHATSAPP:
        return this.testWhatsAppChannel(channel);
      default:
        return {
          success: true,
          message: `${channel.platform} channel saved`,
          detail: {
            hint: "Credentials are stored. Platform-specific live checks are not implemented yet.",
          },
        };
    }
  }

  private async testTelegramChannel(channel: TaskChannel) {
    const token = channel.telegramBotToken?.trim();
    if (!token) {
      throw new BadRequestException("No Telegram bot token stored.");
    }
    const url = `https://api.telegram.org/bot${encodeURIComponent(token)}/getMe`;
    const res = await fetch(url, { method: "GET" });
    const data = (await res.json()) as {
      ok?: boolean;
      description?: string;
      result?: { username?: string; first_name?: string };
    };
    if (!data.ok) {
      throw new BadRequestException(
        data.description || "Telegram rejected this token. Check the token from @BotFather."
      );
    }
    const uname = data.result?.username;
    return {
      success: true,
      message: uname ? `Telegram bot @${uname} is valid` : "Telegram accepted this bot token",
      detail: {
        hint: "Telegram’s API responded successfully — notifications can use this bot.",
      },
    };
  }

  private async testDiscordChannel(channel: TaskChannel) {
    const token = channel.discordBotToken?.trim();
    if (!token) {
      throw new BadRequestException("No Discord bot token stored.");
    }
    const res = await fetch("https://discord.com/api/v10/users/@me", {
      headers: { Authorization: `Bot ${token}` },
    });
    if (!res.ok) {
      const err = await res.text();
      throw new BadRequestException(
        res.status === 401
          ? "Discord rejected this bot token."
          : `Discord API error (${res.status}): ${err.slice(0, 120)}`
      );
    }
    const u = (await res.json()) as { username?: string; id?: string };
    return {
      success: true,
      message: u.username
        ? `Discord bot “${u.username}” is valid`
        : "Discord accepted this bot token",
      detail: {
        hint: "Discord’s API recognized your bot application.",
      },
    };
  }

  private async testSlackChannel(channel: TaskChannel) {
    const token = channel.slackBotToken?.trim();
    if (!token) {
      throw new BadRequestException("Add a Slack bot token (xoxb-...) before testing.");
    }
    const res = await fetch("https://slack.com/api/auth.test", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({ token }).toString(),
    });
    const data = (await res.json()) as { ok?: boolean; error?: string; team?: string };
    if (!data.ok) {
      throw new BadRequestException(data.error || "Slack auth.test failed.");
    }
    return {
      success: true,
      message: data.team ? `Slack workspace “${data.team}” reachable` : "Slack token is valid",
      detail: { hint: "Slack accepted your bot credentials." },
    };
  }

  private async testWhatsAppChannel(channel: TaskChannel) {
    const result = await this.whatsappService.sendTestMessage(channel.id);
    if (!result.success) {
      throw new BadRequestException(result.message);
    }
    return {
      success: true,
      message: result.message,
      detail: { hint: "Check your WhatsApp for a test message from Isaac." },
    };
  }

  async refreshChannel(userId: string, channelId: string) {
    const channel = await this.getChannel(userId, channelId);

    if (channel.platform === ChatPlatform.WHATSAPP) {
      const result = await this.whatsappService.refreshSession(channelId);
      const updated = await this.prisma.taskChannel.findUnique({ where: { id: channelId } });
      return updated ?? channel;
    }

    const hasCredentials =
      !!channel.telegramBotToken ||
      !!channel.slackBotToken ||
      !!channel.discordBotToken ||
      !!channel.webhookUrl;

    const newStatus = hasCredentials ? "connected" : "pending";

    if (channel.status !== newStatus) {
      return this.prisma.taskChannel.update({
        where: { id: channelId },
        data: { status: newStatus },
      });
    }

    return channel;
  }

  async updateChannel(
    userId: string,
    channelId: string,
    data: Partial<{
      label: string;
      platform: ChatPlatform;
      status: string;
      telegramBotToken: string;
      telegramBotUsername: string;
      slackBotToken: string;
      slackSigningSecret: string;
      slackTeamId: string;
      slackChannelId: string;
      discordBotToken: string;
      discordGuildId: string;
      discordChannelId: string;
      webhookUrl: string;
      sharedSecret: string;
    }>
  ) {
    const channel = await this.getChannel(userId, channelId);

    const updated = await this.prisma.taskChannel.update({
      where: { id: channelId },
      data,
    });

    if (data.telegramBotToken && channel.platform === ChatPlatform.TELEGRAM) {
      await this.registerTelegramWebhook(channelId, data.telegramBotToken);
    }

    return updated;
  }

  async deleteChannel(userId: string, channelId: string) {
    await this.getChannel(userId, channelId);

    return this.prisma.taskChannel.delete({
      where: { id: channelId },
    });
  }

  async disconnectChannel(userId: string, channelId: string) {
    const channel = await this.getChannel(userId, channelId);

    if (channel.platform === ChatPlatform.WHATSAPP) {
      await this.whatsappService.disconnectSession(channelId);
      return this.prisma.taskChannel.findUnique({ where: { id: channelId } });
    }

    if (channel.platform === ChatPlatform.TELEGRAM && channel.telegramBotToken) {
      try {
        await fetch(`https://api.telegram.org/bot${channel.telegramBotToken}/deleteWebhook`, {
          method: "POST",
        });
      } catch {
        this.logger.warn(`Failed to delete Telegram webhook for ${channelId}`);
      }
    }

    return this.prisma.taskChannel.update({
      where: { id: channelId },
      data: {
        status: "pending",
        telegramBotToken: null,
        slackBotToken: null,
        slackSigningSecret: null,
        discordBotToken: null,
        sharedSecret: null,
      },
    });
  }
}
