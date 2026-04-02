import { Injectable, Logger } from "@nestjs/common";
import { randomUUID } from "crypto";
import { writeFile } from "fs/promises";
import { join, extname } from "path";
import { resolveUploadsDir } from "./uploads-path";

const MIME_TO_EXT: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/gif": ".gif",
  "image/webp": ".webp",
  "image/svg+xml": ".svg",
  "video/mp4": ".mp4",
  "video/webm": ".webm",
};

@Injectable()
export class EvidenceStorageService {
  private readonly logger = new Logger(EvidenceStorageService.name);

  async downloadAndStore(externalUrl: string): Promise<string | null> {
    try {
      const res = await fetch(externalUrl, { signal: AbortSignal.timeout(20_000) });
      if (!res.ok) {
        this.logger.warn(`Evidence download failed (${res.status}): ${externalUrl}`);
        return null;
      }

      const contentType = (res.headers.get("content-type") || "image/jpeg").split(";")[0].trim();
      const ext = MIME_TO_EXT[contentType] || extname(new URL(externalUrl).pathname) || ".jpg";

      const filename = `${randomUUID()}${ext}`;
      const uploadsDir = resolveUploadsDir();

      const buffer = Buffer.from(await res.arrayBuffer());
      await writeFile(join(uploadsDir, filename), buffer);

      const stableUrl = `/api/uploads/${filename}`;
      this.logger.log(`Evidence stored: ${stableUrl} (${buffer.length} bytes)`);
      return stableUrl;
    } catch (err: any) {
      this.logger.warn(`Evidence download error: ${err.message} — ${externalUrl}`);
      return null;
    }
  }
}
