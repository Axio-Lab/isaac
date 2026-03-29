import { Module } from "@nestjs/common";
import { PrismaService } from "../common/prisma.service";
import { AgentService } from "./agent.service";
import { AgentController } from "./agent.controller";
import { ComposioService } from "../composio/composio.service";

@Module({
  controllers: [AgentController],
  providers: [PrismaService, AgentService, ComposioService],
  exports: [AgentService],
})
export class AgentModule {}
