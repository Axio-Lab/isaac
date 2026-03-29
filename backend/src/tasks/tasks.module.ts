import { Module } from "@nestjs/common";
import { PrismaService } from "@/common/prisma.service";
import { AgentModule } from "@/agent/agent.module";
import { ChannelsModule } from "@/channels/channels.module";
import { ReportsModule } from "@/reports/reports.module";
import { TasksController } from "./tasks.controller";
import { TasksService } from "./tasks.service";
import { TaskWorkerService } from "./task-worker.service";
import { TaskSubmissionService } from "./task-submission.service";
import { TaskVettingService } from "./task-vetting.service";
import { TaskReportService } from "./task-report.service";
import { TaskCronService } from "./task-cron.service";

@Module({
  imports: [AgentModule, ChannelsModule, ReportsModule],
  controllers: [TasksController],
  providers: [
    PrismaService,
    TasksService,
    TaskWorkerService,
    TaskSubmissionService,
    TaskVettingService,
    TaskReportService,
    TaskCronService,
  ],
  exports: [
    TasksService,
    TaskWorkerService,
    TaskSubmissionService,
    TaskVettingService,
    TaskReportService,
    TaskCronService,
  ],
})
export class TasksModule {}
