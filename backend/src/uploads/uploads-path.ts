import { existsSync, mkdirSync } from "fs";
import { join } from "path";

/**
 * Root directory for uploaded and evidence files.
 * In production, set UPLOADS_DIR to a mounted volume path (e.g. Railway volume) so files survive redeploys.
 */
export function resolveUploadsDir(): string {
  const env = process.env.UPLOADS_DIR?.trim();
  const dir = env ? env : join(__dirname, "..", "..", "uploads");
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  return dir;
}
