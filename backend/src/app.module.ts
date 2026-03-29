import { Module, MiddlewareConsumer, NestModule, OnModuleInit } from "@nestjs/common";
import { ScheduleModule } from "@nestjs/schedule";
import { PrismaService } from "./common/prisma.service";
import { AuthModule } from "./auth/auth.module";
import { AgentModule } from "./agent/agent.module";
import { TasksModule } from "./tasks/tasks.module";
import { ChannelsModule } from "./channels/channels.module";
import { SkillsModule } from "./skills/skills.module";
import { ComposioModule } from "./composio/composio.module";
import { ReportsModule } from "./reports/reports.module";
import { WhatsAppModule } from "./whatsapp/whatsapp.module";
import { AgentService } from "./agent/agent.service";
import { TaskVettingService } from "./tasks/task-vetting.service";
import { TaskReportService } from "./tasks/task-report.service";
import { InboundMessageService } from "./channels/inbound-message.service";

@Module({
  imports: [
    ScheduleModule.forRoot(),
    AuthModule,
    AgentModule,
    TasksModule,
    ChannelsModule,
    SkillsModule,
    ComposioModule,
    ReportsModule,
    WhatsAppModule,
  ],
  providers: [PrismaService],
  exports: [PrismaService],
})
export class AppModule implements NestModule, OnModuleInit {
  constructor(
    private readonly agentService: AgentService,
    private readonly vettingService: TaskVettingService,
    private readonly reportService: TaskReportService,
    private readonly inboundService: InboundMessageService,
  ) {}

  configure(_consumer: MiddlewareConsumer) {}

  onModuleInit() {
    const generateText = (opts: { systemPrompt: string; userPrompt: string }) =>
      this.agentService.generateTextWithSystemPrompt(opts);

    this.vettingService.setGenerateText(generateText);
    this.reportService.setGenerateText(generateText);

    this.inboundService.setVetSubmission((submissionId) =>
      this.vettingService.vetSubmission(submissionId),
    );

    console.log("[Isaac] AI vetting + report generation wired up");
  }
}
