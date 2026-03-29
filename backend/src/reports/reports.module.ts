import { Module } from "@nestjs/common";
import { PrismaService } from "../common/prisma.service";
import { ReportDeliveryService } from "./report-delivery.service";

@Module({
  providers: [ReportDeliveryService, PrismaService],
  exports: [ReportDeliveryService],
})
export class ReportsModule {}
