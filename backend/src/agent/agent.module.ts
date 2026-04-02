import { Module, forwardRef } from "@nestjs/common";
import { PrismaService } from "../common/prisma.service";
import { AgentService } from "./agent.service";
import { AgentController } from "./agent.controller";
import { ComposioService } from "../composio/composio.service";
import { ChannelsModule } from "../channels/channels.module";
import { WhatsAppModule } from "../whatsapp/whatsapp.module";

@Module({
  imports: [forwardRef(() => ChannelsModule), WhatsAppModule],
  controllers: [AgentController],
  providers: [PrismaService, AgentService, ComposioService],
  exports: [AgentService],
})
export class AgentModule {}
