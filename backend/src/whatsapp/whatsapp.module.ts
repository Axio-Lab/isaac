import { Module } from "@nestjs/common";
import { PrismaService } from "../common/prisma.service";
import { WhatsAppService } from "./whatsapp.service";

@Module({
  providers: [WhatsAppService, PrismaService],
  exports: [WhatsAppService],
})
export class WhatsAppModule {}
