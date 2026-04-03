import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { v2 as cloudinary, UploadApiResponse } from "cloudinary";
import { randomUUID } from "crypto";

@Injectable()
export class CloudStorageService implements OnModuleInit {
  private readonly logger = new Logger(CloudStorageService.name);

  onModuleInit() {
    const cloud = process.env.CLOUDINARY_CLOUD_NAME;
    const key = process.env.CLOUDINARY_API_KEY;
    const secret = process.env.CLOUDINARY_API_SECRET;

    if (!cloud || !key || !secret) {
      throw new Error(
        "Missing Cloudinary credentials. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET."
      );
    }

    cloudinary.config({ cloud_name: cloud, api_key: key, api_secret: secret });
    this.logger.log(`Cloudinary configured (cloud: ${cloud})`);
  }

  /**
   * Upload a file buffer to Cloudinary and return the permanent URL.
   */
  async uploadBuffer(
    buffer: Buffer,
    opts?: { folder?: string; resourceType?: "image" | "video" | "auto" }
  ): Promise<string> {
    const folder = opts?.folder ?? "isaac-uploads";
    const resourceType = opts?.resourceType ?? "auto";

    const result = await new Promise<UploadApiResponse>((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder,
          public_id: randomUUID(),
          resource_type: resourceType,
          overwrite: false,
        },
        (err, res) => {
          if (err || !res) return reject(err ?? new Error("No response from Cloudinary"));
          resolve(res);
        }
      );
      stream.end(buffer);
    });

    return result.secure_url;
  }

  /**
   * Download a file from an external URL and re-upload it to Cloudinary.
   * Returns the permanent Cloudinary URL, or null on failure.
   */
  async downloadAndUpload(externalUrl: string, opts?: { folder?: string }): Promise<string | null> {
    try {
      const res = await fetch(externalUrl, { signal: AbortSignal.timeout(20_000) });
      if (!res.ok) {
        this.logger.warn(`Download failed (${res.status}): ${externalUrl}`);
        return null;
      }

      const buffer = Buffer.from(await res.arrayBuffer());
      return await this.uploadBuffer(buffer, { folder: opts?.folder ?? "isaac-evidence" });
    } catch (err: any) {
      this.logger.warn(`Download error: ${err.message} — ${externalUrl}`);
      return null;
    }
  }
}
