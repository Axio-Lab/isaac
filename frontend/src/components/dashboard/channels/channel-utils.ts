import type { TaskChannel, CreateChannelPayload } from "@/hooks/useTaskChannels";

export type ChannelDialogMode = "add" | "edit";

export const CHANNEL_PLATFORMS = ["WHATSAPP", "TELEGRAM", "SLACK", "DISCORD"];

export function platformColor(platform: string) {
  switch (platform) {
    case "WHATSAPP":
      return "bg-green-500/10 text-green-400 border-green-500/20";
    case "TELEGRAM":
      return "bg-blue-500/10 text-blue-400 border-blue-500/20";
    case "SLACK":
      return "bg-purple-500/10 text-purple-400 border-purple-500/20";
    case "DISCORD":
      return "bg-indigo-500/10 text-indigo-400 border-indigo-500/20";
    default:
      return "bg-muted text-muted-foreground border-border";
  }
}

export function connectionStatusColor(status: string) {
  switch (status.toLowerCase()) {
    case "connected":
      return "bg-success/10 text-success border-success/20";
    case "pending":
      return "bg-warning/10 text-warning border-warning/20";
    default:
      return "bg-muted text-muted-foreground border-border";
  }
}

export interface ChannelFormData {
  label: string;
  platform: string;
  /** Transient input for Telegram / Discord / Slack bot tokens. Not a Prisma column. */
  botToken: string;
  /** Read-only; populated from `channel.whatsappNumber` in edit mode. */
  whatsappNumber: string;
  hasStoredTelegramToken?: boolean;
  hasStoredDiscordToken?: boolean;
  hasStoredSlackToken?: boolean;
}

export const defaultChannelForm: ChannelFormData = {
  label: "",
  platform: "WHATSAPP",
  botToken: "",
  whatsappNumber: "",
  hasStoredTelegramToken: false,
  hasStoredDiscordToken: false,
  hasStoredSlackToken: false,
};

/**
 * Build the POST body for creating a new channel.
 * Returns a shape matching `CreateChannelPayload`.
 */
export function toChannelPayload(form: ChannelFormData): CreateChannelPayload {
  const base: CreateChannelPayload = {
    label: form.label,
    platform: form.platform,
  };

  if (form.platform === "TELEGRAM" && form.botToken) {
    base.telegramBotToken = form.botToken;
  }
  if (form.platform === "DISCORD" && form.botToken) {
    base.discordBotToken = form.botToken;
  }
  if (form.platform === "SLACK" && form.botToken) {
    base.slackBotToken = form.botToken;
  }

  return base;
}

/**
 * Map an API channel object back into form state for editing.
 * Secrets are never exposed — boolean flags drive masked display.
 */
export function formFromChannel(channel: TaskChannel): ChannelFormData {
  return {
    label: channel.label || "",
    platform: channel.platform,
    botToken: "",
    whatsappNumber: channel.whatsappNumber ?? "",
    hasStoredTelegramToken: !!channel.telegramBotToken?.trim(),
    hasStoredDiscordToken: !!channel.discordBotToken?.trim(),
    hasStoredSlackToken: !!channel.slackBotToken?.trim(),
  };
}

/**
 * Build the PUT body for updating an existing channel.
 * Only sends fields that were actually changed (non-empty).
 */
export function toChannelUpdatePayload(form: ChannelFormData): Record<string, unknown> {
  const data: Record<string, unknown> = { label: form.label.trim() };

  if (form.platform === "TELEGRAM" && form.botToken.trim()) {
    data.telegramBotToken = form.botToken.trim();
  }
  if (form.platform === "DISCORD" && form.botToken.trim()) {
    data.discordBotToken = form.botToken.trim();
  }
  if (form.platform === "SLACK" && form.botToken.trim()) {
    data.slackBotToken = form.botToken.trim();
  }

  return data;
}
