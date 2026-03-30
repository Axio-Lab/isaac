/**
 * Per-platform message senders.
 * Each takes platform-specific credentials + a recipient and returns
 * a uniform { success, error? } result.
 */

import { Logger } from "@nestjs/common";
import { WhatsAppService } from "../whatsapp/whatsapp.service";

const logger = new Logger("PlatformSenders");

export interface SendResult {
  success: boolean;
  error?: string;
}

// ─── Telegram ──────────────────────────────────────────────────────

export async function sendTelegram(
  botToken: string | null | undefined,
  chatId: string,
  text: string
): Promise<SendResult> {
  if (!botToken?.trim()) {
    return { success: false, error: "No Telegram bot token" };
  }
  const url = `https://api.telegram.org/bot${botToken.trim()}/sendMessage`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: "Markdown" }),
  });
  if (!res.ok) {
    const body = await res.text();
    logger.error(`Telegram sendMessage failed: ${res.status} ${body}`);
    return { success: false, error: `Telegram API ${res.status}` };
  }
  return { success: true };
}

// ─── WhatsApp ──────────────────────────────────────────────────────

export async function sendWhatsApp(
  whatsappService: WhatsAppService,
  channelId: string,
  jidOrPhone: string,
  text: string
): Promise<SendResult> {
  try {
    const jid = jidOrPhone.includes("@")
      ? jidOrPhone
      : `${jidOrPhone.replace(/\D/g, "")}@s.whatsapp.net`;
    await whatsappService.sendMessage(channelId, jid, text);
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// ─── Discord ───────────────────────────────────────────────────────

export async function sendDiscord(
  botToken: string | null | undefined,
  userId: string,
  text: string
): Promise<SendResult> {
  if (!botToken?.trim()) {
    return { success: false, error: "No Discord bot token" };
  }
  const token = botToken.trim();

  const dmRes = await fetch("https://discord.com/api/v10/users/@me/channels", {
    method: "POST",
    headers: {
      Authorization: `Bot ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ recipient_id: userId }),
  });
  if (!dmRes.ok) {
    const body = await dmRes.text();
    logger.error(`Discord DM channel creation failed: ${dmRes.status} ${body}`);
    return { success: false, error: `Discord API ${dmRes.status}` };
  }
  const dmChannel = (await dmRes.json()) as { id: string };

  const msgRes = await fetch(`https://discord.com/api/v10/channels/${dmChannel.id}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bot ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ content: text }),
  });
  if (!msgRes.ok) {
    const body = await msgRes.text();
    logger.error(`Discord sendMessage failed: ${msgRes.status} ${body}`);
    return { success: false, error: `Discord API ${msgRes.status}` };
  }
  return { success: true };
}

// ─── Slack ──────────────────────────────────────────────────────────

export async function sendSlack(
  botToken: string | null | undefined,
  recipientId: string,
  text: string
): Promise<SendResult> {
  if (!botToken?.trim()) {
    return { success: false, error: "No Slack bot token" };
  }
  const res = await fetch("https://slack.com/api/chat.postMessage", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${botToken.trim()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ channel: recipientId, text }),
  });
  const data = (await res.json()) as { ok?: boolean; error?: string };
  if (!data.ok) {
    return { success: false, error: data.error || "Slack API error" };
  }
  return { success: true };
}
