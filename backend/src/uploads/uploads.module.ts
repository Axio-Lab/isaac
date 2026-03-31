import { Module } from "@nestjs/common";
import { UploadsController } from "./uploads.controller";
import { EvidenceStorageService } from "./evidence-storage.service";

@Module({
  controllers: [UploadsController],
  providers: [EvidenceStorageService],
  exports: [EvidenceStorageService],
})
export class UploadsModule {}
