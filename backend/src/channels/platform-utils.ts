/**
 * Shared platform types + externalId normalization used across
 * inbound parsing, outbound sending, and worker matching.
 */

export type ChatPlatform = "TELEGRAM" | "WHATSAPP" | "SLACK" | "DISCORD";

export interface IncomingMessage {
  channelId: string;
  platform: ChatPlatform;
  senderExternalId: string;
  text?: string;
  imageUrl?: string;
}

/**
 * Build all possible externalId forms so DB lookups succeed regardless
 * of whether the stored value has a `+` prefix, raw digits, or a JID suffix.
 */
export function buildExternalIdCandidates(
  senderExternalId: string,
  platform: string,
): string[] {
  const candidates = [senderExternalId];
  const upper = platform.toUpperCase();

  if (upper === "WHATSAPP") {
    const digits = senderExternalId.replace(/\D/g, "");
    if (digits) {
      candidates.push(`+${digits}`);
      candidates.push(digits);
      candidates.push(`${digits}@s.whatsapp.net`);
    }
  }

  return [...new Set(candidates)];
}

/**
 * Normalize a raw JID / phone from a platform webhook into a clean externalId
 * that strips device suffixes and `@` domains.
 */
export function normalizeIncomingExternalId(
  rawId: string,
  platform: string,
): string {
  const upper = platform.toUpperCase();

  if (upper === "WHATSAPP") {
    return rawId
      .replace(/:[\d]+@/, "@")   // strip device suffix  e.g. 234...:5@s.whatsapp.net
      .replace(/@.*$/, "");       // strip @s.whatsapp.net
  }

  return rawId;
}
