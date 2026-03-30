/**
 * Per-platform webhook body parsers.
 * Each returns a normalized { senderExternalId, text, imageUrl } or null if the
 * payload is not an actionable user message.
 */

import { Logger } from "@nestjs/common";

const logger = new Logger("PlatformParsers");

export interface ParsedMessage {
  senderExternalId: string;
  text?: string;
  imageUrl?: string;
}

// ─── Telegram ──────────────────────────────────────────────────────

export async function parseTelegramWebhook(
  body: any,
  botToken?: string | null
): Promise<ParsedMessage | null> {
  const message = body?.message;
  if (!message) return null;

  const chatId = String(message.chat?.id ?? message.from?.id ?? "");
  if (!chatId) return null;

  const text = message.text ?? message.caption ?? "";
  let imageUrl: string | undefined;

  const photo = message.photo;
  if (photo && Array.isArray(photo) && photo.length > 0 && botToken) {
    const fileId = photo[photo.length - 1].file_id;
    if (fileId) {
      try {
        const res = await fetch(
          `https://api.telegram.org/bot${botToken}/getFile?file_id=${fileId}`
        );
        const data = (await res.json()) as { result?: { file_path?: string } };
        if (data.result?.file_path) {
          imageUrl = `https://api.telegram.org/file/bot${botToken}/${data.result.file_path}`;
        }
      } catch (err) {
        logger.error("Failed to resolve Telegram file", err);
      }
    }
  }

  return { senderExternalId: chatId, text: text || undefined, imageUrl };
}

// ─── Slack ─────────────────────────────────────────────────────────

export function parseSlackEvent(body: any): ParsedMessage | null {
  const event = body?.event;
  if (!event || event.type !== "message" || event.subtype) return null;

  const userId = event.user;
  const text = event.text;
  if (!userId) return null;

  let imageUrl: string | undefined;
  if (event.files && Array.isArray(event.files) && event.files.length > 0) {
    const file = event.files[0];
    if (file.mimetype?.startsWith("image/") && file.url_private) {
      imageUrl = file.url_private;
    }
  }

  return { senderExternalId: userId, text, imageUrl };
}

// ─── Discord ───────────────────────────────────────────────────────

export function parseDiscordWebhook(body: any): ParsedMessage | null {
  const userId = body?.author?.id ?? body?.userId;
  const text = body?.content ?? body?.text;
  if (!userId) return null;

  let imageUrl: string | undefined;
  if (body.attachments && Array.isArray(body.attachments)) {
    const img = body.attachments.find((a: any) => a.content_type?.startsWith("image/"));
    if (img?.url) imageUrl = img.url;
  }

  return { senderExternalId: userId, text, imageUrl };
}

// ─── WhatsApp (HTTP webhook path, not Baileys) ─────────────────────

export function parseWhatsAppWebhook(body: any): ParsedMessage | null {
  const senderJid = body?.from ?? body?.sender;
  if (!senderJid) return null;

  const senderExternalId = senderJid.replace(/:[\d]+@/, "@").replace(/@.*$/, "");

  const text = body.text ?? body.message;
  const imageUrl = body.imageUrl;

  return { senderExternalId, text, imageUrl };
}
