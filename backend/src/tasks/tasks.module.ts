import { Module, forwardRef } from "@nestjs/common";
import { PrismaService } from "@/common/prisma.service";
import { AgentModule } from "@/agent/agent.module";
import { ChannelsModule } from "@/channels/channels.module";
import { ReportsModule } from "@/reports/reports.module";
import { AutomatedTasksModule } from "@/automated-tasks/automated-tasks.module";
import { TasksController } from "./tasks.controller";
import { TasksService } from "./tasks.service";
import { TaskWorkerService } from "./task-worker.service";
import { TaskSubmissionService } from "./task-submission.service";
import { TaskVettingService } from "./task-vetting.service";
import { TaskReportService } from "./task-report.service";
import { TaskCronService } from "./task-cron.service";
import { TaskFlagService } from "./task-flag.service";

@Module({
  imports: [
    forwardRef(() => AgentModule),
    forwardRef(() => ChannelsModule),
    ReportsModule,
    forwardRef(() => AutomatedTasksModule),
  ],
  controllers: [TasksController],
  providers: [
    PrismaService,
    TasksService,
    TaskWorkerService,
    TaskSubmissionService,
    TaskFlagService,
    TaskVettingService,
    TaskReportService,
    TaskCronService,
  ],
  exports: [
    TasksService,
    TaskWorkerService,
    TaskSubmissionService,
    TaskFlagService,
    TaskVettingService,
    TaskReportService,
    TaskCronService,
  ],
})
export class TasksModule {}
