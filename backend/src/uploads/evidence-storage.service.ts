import { Injectable } from "@nestjs/common";
import { CloudStorageService } from "./cloud-storage.service";

@Injectable()
export class EvidenceStorageService {
  constructor(private readonly cloudStorage: CloudStorageService) {}

  /**
   * Download evidence from an external URL and upload it to Cloudinary.
   * Returns the permanent cloud URL, or null on failure.
   */
  async downloadAndStore(externalUrl: string): Promise<string | null> {
    return await this.cloudStorage.downloadAndUpload(externalUrl, {
      folder: "isaac-evidence",
    });
  }
}
