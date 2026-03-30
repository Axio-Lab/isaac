/**
 * Platform-specific webhook signature verification.
 */

import * as crypto from "crypto";

export function verifySlackSignature(
  signingSecret: string,
  signature: string,
  timestamp: string,
  rawBody: string
): boolean {
  const fiveMinAgo = Math.floor(Date.now() / 1000) - 60 * 5;
  if (parseInt(timestamp, 10) < fiveMinAgo) return false;

  const baseString = `v0:${timestamp}:${rawBody}`;
  const hmac = crypto.createHmac("sha256", signingSecret).update(baseString).digest("hex");
  const computed = `v0=${hmac}`;
  return crypto.timingSafeEqual(Buffer.from(computed), Buffer.from(signature));
}
