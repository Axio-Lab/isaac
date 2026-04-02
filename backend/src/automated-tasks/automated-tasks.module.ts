import { Module, forwardRef } from "@nestjs/common";
import { PrismaService } from "@/common/prisma.service";
import { AgentModule } from "@/agent/agent.module";
import { ReportsModule } from "@/reports/reports.module";
import { AutomatedTasksController } from "./automated-tasks.controller";
import { AutomatedTasksService } from "./automated-tasks.service";
import { AutomatedTaskRunnerService } from "./automated-task-runner.service";

@Module({
  imports: [forwardRef(() => AgentModule), ReportsModule],
  controllers: [AutomatedTasksController],
  providers: [PrismaService, AutomatedTasksService, AutomatedTaskRunnerService],
  exports: [AutomatedTasksService, AutomatedTaskRunnerService],
})
export class AutomatedTasksModule {}
