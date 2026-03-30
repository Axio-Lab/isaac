import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../common/prisma.service";
import { ComposioService } from "../composio/composio.service";

export type ReportDestination =
  | "whatsapp"
  | "telegram"
  | "slack"
  | "discord"
  | "gmail";

export interface DeliveryConfig {
  destinations: ReportDestination[];
  documentType?: "google_doc" | "notion";
  recipientEmail?: string;
  slackChannelId?: string;
  discordChannelId?: string;
  telegramChatId?: string;
  whatsappNumber?: string;
  emailSubject?: string;
}

@Injectable()
export class ReportDeliveryService {
  private readonly logger = new Logger(ReportDeliveryService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly composioService: ComposioService,
  ) {}

  async createReportDocument(config: {
    userId: string;
    title: string;
    content: string;
    documentType?: "google_doc" | "notion";
    folderId?: string;
  }): Promise<string | null> {
    const { userId, title, content, documentType = "google_doc", folderId } = config;

    if (!this.composioService.isConfigured()) {
      this.logger.warn("Composio not configured, skipping document creation");
      return null;
    }

    try {
      if (documentType === "google_doc") {
        const params: Record<string, unknown> = {
          title,
          markdown_text: content,
        };
        if (folderId) params.folder_id = folderId;

        const result: any = await this.composioService.executeComposioAction(
          userId,
          "GOOGLEDOCS_CREATE_DOCUMENT_MARKDOWN",
          params,
        );
        return result?.data?.documentUrl ?? result?.data?.url ?? null;
      }

      if (documentType === "notion") {
        const params: Record<string, unknown> = {
          title,
          markdown: content,
        };
        if (folderId) params.parent_id = folderId;

        const result: any = await this.composioService.executeComposioAction(
          userId,
          "NOTION_CREATE_NOTION_PAGE",
          params,
        );
        return result?.data?.url ?? null;
      }

      return null;
    } catch (error) {
      this.logger.error("Failed to create report document", error);
      return null;
    }
  }

  async deliverToDestinations(
    destinations: ReportDestination[],
    summary: string,
    documentUrl: string | null,
    userId: string,
    deliveryConfig?: Partial<DeliveryConfig>,
    emailSubject?: string,
  ): Promise<Record<ReportDestination, boolean>> {
    const results = {} as Record<ReportDestination, boolean>;
    const message = documentUrl
      ? `${summary}\n\nFull report: ${documentUrl}`
      : summary;

    for (const destination of destinations) {
      try {
        results[destination] = await this.deliverToSingleDestination(
          destination,
          message,
          userId,
          deliveryConfig,
          emailSubject,
        );
      } catch (error) {
        this.logger.error(`Failed to deliver to ${destination}`, error);
        results[destination] = false;
      }
    }

    return results;
  }

  private async deliverToSingleDestination(
    destination: ReportDestination,
    message: string,
    userId: string,
    config?: Partial<DeliveryConfig>,
    emailSubject?: string,
  ): Promise<boolean> {
    if (!this.composioService.isConfigured()) return false;

    switch (destination) {
      case "telegram": {
        const result = await this.composioService.executeComposioAction(
          userId,
          "TELEGRAM_SEND_MESSAGE",
          { chat_id: config?.telegramChatId, text: message },
        );
        return !!result;
      }

      case "slack": {
        const result = await this.composioService.executeComposioAction(
          userId,
          "SLACK_SEND_MESSAGE",
          { channel: config?.slackChannelId, text: message },
        );
        return !!result;
      }

      case "discord": {
        const result = await this.composioService.executeComposioAction(
          userId,
          "DISCORD_SEND_MESSAGE",
          { channel_id: config?.discordChannelId, content: message },
        );
        return !!result;
      }

      case "gmail": {
        const result = await this.composioService.executeComposioAction(
          userId,
          "GMAIL_SEND_EMAIL",
          {
            to: config?.recipientEmail,
            subject: emailSubject || config?.emailSubject || "Task Compliance Report",
            body: message,
          },
        );
        return !!result;
      }

      case "whatsapp": {
        const result = await this.composioService.executeComposioAction(
          userId,
          "WHATSAPP_SEND_MESSAGE",
          { to: config?.whatsappNumber, message },
        );
        return !!result;
      }

      default:
        this.logger.warn(`Unknown delivery destination: ${destination}`);
        return false;
    }
  }
}
