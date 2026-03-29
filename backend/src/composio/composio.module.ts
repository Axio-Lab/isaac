import { Module, Global } from "@nestjs/common";
import { PrismaService } from "../common/prisma.service";
import { ComposioService } from "./composio.service";
import { ComposioController } from "./composio.controller";

@Global()
@Module({
  controllers: [ComposioController],
  providers: [ComposioService, PrismaService],
  exports: [ComposioService],
})
export class ComposioModule {}
