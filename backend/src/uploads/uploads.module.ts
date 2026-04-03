import { Module } from "@nestjs/common";
import { PrismaService } from "../common/prisma.service";
import { UploadsController } from "./uploads.controller";
import { CloudStorageService } from "./cloud-storage.service";
import { EvidenceStorageService } from "./evidence-storage.service";

@Module({
  controllers: [UploadsController],
  providers: [PrismaService, CloudStorageService, EvidenceStorageService],
  exports: [CloudStorageService, EvidenceStorageService],
})
export class UploadsModule {}
