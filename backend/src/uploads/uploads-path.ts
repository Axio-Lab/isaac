import { existsSync, mkdirSync } from "fs";
import { join } from "path";

/**
 * Root directory for uploaded and evidence files.
 * In production, set UPLOADS_DIR to a mounted volume path so files survive redeploys.
 * On Railway, mount the volume under /app (e.g. mount path /app/uploads) — the runtime user
 * can write there but cannot create arbitrary top-level dirs like /data.
 */
export function resolveUploadsDir(): string {
  const env = process.env.UPLOADS_DIR?.trim();
  const dir = env ? env : join(__dirname, "..", "..", "uploads");
  if (!existsSync(dir)) {
    try {
      mkdirSync(dir, { recursive: true });
    } catch (err: unknown) {
      const code =
        err && typeof err === "object" && "code" in err
          ? (err as NodeJS.ErrnoException).code
          : undefined;
      const msg = err instanceof Error ? err.message : String(err);
      if (code === "EACCES" || code === "EPERM") {
        throw new Error(
          `Cannot create uploads directory at "${dir}" (${code}: ${msg}). ` +
            `Use a path under the app directory (e.g. on Railway: mount a volume at /app/uploads and set UPLOADS_DIR=/app/uploads). ` +
            `Avoid /data/... unless that path is mounted and writable by the process.`
        );
      }
      throw err;
    }
  }
  return dir;
}
