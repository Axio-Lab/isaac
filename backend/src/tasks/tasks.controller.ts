import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Query,
  Req,
  UseGuards,
  HttpCode,
  HttpStatus,
} from "@nestjs/common";
import { AuthGuard } from "@/auth/auth.guard";
import { AgentService } from "@/agent/agent.service";
import { TasksService } from "./tasks.service";
import { TaskWorkerService } from "./task-worker.service";
import { TaskSubmissionService } from "./task-submission.service";
import { TaskReportService } from "./task-report.service";
import { TaskFlagService } from "./task-flag.service";
import { getTaskInstructions } from "@/agent/isaac-system-prompt";

@Controller("human-tasks")
@UseGuards(AuthGuard)
export class TasksController {
  constructor(
    private readonly tasksService: TasksService,
    private readonly workerService: TaskWorkerService,
    private readonly submissionService: TaskSubmissionService,
    private readonly reportService: TaskReportService,
    private readonly flagService: TaskFlagService,
    private readonly agentService: AgentService
  ) {}

  // ─── AI Fill ──────────────────────────────────────────────────────

  @Post("ai-fill")
  @HttpCode(HttpStatus.OK)
  async aiFill(
    @Body()
    body: {
      prompt: string;
      taskType?: "HUMAN" | "AUTOMATED";
      /** UPPERCASE Composio app names the user already connected (e.g. from the UI) */
      connectedAppNames?: string[];
    }
  ) {
    if (!body.prompt?.trim()) {
      return { fields: {} };
    }

    const isAutomated = body.taskType === "AUTOMATED";
    const connected = (body.connectedAppNames ?? [])
      .map((s) => String(s).toUpperCase().trim())
      .filter(Boolean);

    const userPrompt = isAutomated
      ? `${body.prompt.trim()}\n\n---\nContext — apps this user already has connected in Isaac (use only these in "composioApps"; may be empty): ${connected.length > 0 ? connected.join(", ") : "NONE"}.`
      : body.prompt.trim();

    const systemPrompt = isAutomated
      ? getTaskInstructions("ai-fill-automated")
      : getTaskInstructions("ai-fill-human");

    const { text } = await this.agentService.generateTextWithSystemPrompt({
      systemPrompt,
      userPrompt,
    });

    try {
      const cleaned = text
        .replace(/```json?\n?/g, "")
        .replace(/```/g, "")
        .trim();
      const fields = JSON.parse(cleaned);
      return { fields };
    } catch {
      return { fields: {} };
    }
  }

  // ─── Flagged Workers (user-scoped, before :taskId routes) ────────

  @Get("flagged-workers")
  async listAllFlaggedWorkers(
    @Req() req: any,
    @Query("status") status?: "OPEN" | "RESOLVED" | "DISMISSED"
  ) {
    const workers = await this.flagService.listAllFlaggedWorkers(req.userId, { status });
    return { workers };
  }

  // ─── Tasks ────────────────────────────────────────────────────────

  @Get()
  async listTasks(@Req() req: any, @Query("page") page?: string, @Query("limit") limit?: string) {
    const p = page ? parseInt(page, 10) : undefined;
    const l = limit ? parseInt(limit, 10) : undefined;
    return this.tasksService.listTasks(req.userId, p, l);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createTask(@Req() req: any, @Body() body: any) {
    const task = await this.tasksService.createTask(req.userId, body);
    return { task };
  }

  @Get(":taskId")
  async getTask(@Req() req: any, @Param("taskId") taskId: string) {
    const task = await this.tasksService.getTask(req.userId, taskId);
    return { task };
  }

  @Put(":taskId")
  async updateTask(@Req() req: any, @Param("taskId") taskId: string, @Body() body: any) {
    await this.tasksService.updateTask(req.userId, taskId, body);
    return { success: true };
  }

  @Post(":taskId/archive")
  @HttpCode(HttpStatus.OK)
  async archiveTask(@Req() req: any, @Param("taskId") taskId: string) {
    await this.tasksService.archiveTask(req.userId, taskId);
    return { success: true };
  }

  @Post(":taskId/activate")
  @HttpCode(HttpStatus.OK)
  async activateTask(@Req() req: any, @Param("taskId") taskId: string) {
    await this.tasksService.activateTask(req.userId, taskId);
    return { success: true };
  }

  @Delete(":taskId")
  async deleteTask(@Req() req: any, @Param("taskId") taskId: string) {
    await this.tasksService.deleteTask(req.userId, taskId);
    return { success: true };
  }

  @Post(":taskId/pause")
  @HttpCode(HttpStatus.OK)
  async pauseTask(@Req() req: any, @Param("taskId") taskId: string) {
    await this.tasksService.pauseTask(req.userId, taskId);
    return { success: true };
  }

  @Post(":taskId/resume")
  @HttpCode(HttpStatus.OK)
  async resumeTask(@Req() req: any, @Param("taskId") taskId: string) {
    await this.tasksService.resumeTask(req.userId, taskId);
    return { success: true };
  }

  // ─── Workers ──────────────────────────────────────────────────────

  @Get(":taskId/workers")
  async listWorkers(@Param("taskId") taskId: string) {
    const workers = await this.workerService.listWorkers(taskId);
    return { workers };
  }

  @Post(":taskId/workers")
  @HttpCode(HttpStatus.CREATED)
  async addWorker(@Param("taskId") taskId: string, @Body() body: any) {
    const worker = await this.workerService.addWorker(taskId, body);
    return { worker };
  }

  @Put(":taskId/workers/:workerId")
  async updateWorker(
    @Param("taskId") taskId: string,
    @Param("workerId") workerId: string,
    @Body() body: any
  ) {
    const worker = await this.workerService.updateWorker(taskId, workerId, body);
    return { success: true, worker };
  }

  @Delete(":taskId/workers/:workerId")
  async removeWorker(@Param("taskId") taskId: string, @Param("workerId") workerId: string) {
    await this.workerService.removeWorker(taskId, workerId);
    return { success: true };
  }

  @Get(":taskId/workers/flagged")
  async listFlaggedWorkers(@Req() req: any, @Param("taskId") taskId: string) {
    const workers = await this.flagService.listFlaggedWorkers(taskId, req.userId);
    return { workers };
  }

  @Get(":taskId/workers/:workerId/flags")
  async listWorkerFlags(
    @Req() req: any,
    @Param("taskId") taskId: string,
    @Param("workerId") workerId: string
  ) {
    const flags = await this.flagService.listFlags(taskId, req.userId, { workerId });
    return { flags };
  }

  // ─── Submissions ──────────────────────────────────────────────────

  @Get(":taskId/submissions")
  async listSubmissions(
    @Param("taskId") taskId: string,
    @Query("workerId") workerId?: string,
    @Query("status") status?: string,
    @Query("date") date?: string,
    @Query("dateFrom") dateFrom?: string,
    @Query("dateTo") dateTo?: string
  ) {
    const submissions = await this.submissionService.listSubmissions(taskId, {
      workerId,
      status,
      date,
      dateFrom,
      dateTo,
    });
    return { submissions };
  }

  // ─── Reports ──────────────────────────────────────────────────────

  @Get(":taskId/reports")
  async listReports(@Param("taskId") taskId: string) {
    const reports = await this.reportService.listReports(taskId);
    return { reports };
  }

  @Get(":taskId/flags")
  async listFlags(
    @Req() req: any,
    @Param("taskId") taskId: string,
    @Query("workerId") workerId?: string,
    @Query("status") status?: "OPEN" | "RESOLVED" | "DISMISSED"
  ) {
    const flags = await this.flagService.listFlags(taskId, req.userId, { workerId, status });
    return { flags };
  }

  @Post(":taskId/flags/:flagId/resolve")
  @HttpCode(HttpStatus.OK)
  async resolveFlag(
    @Req() req: any,
    @Param("taskId") taskId: string,
    @Param("flagId") flagId: string,
    @Body() body: { reason?: string; note?: string }
  ) {
    const flag = await this.flagService.resolveFlag(taskId, flagId, req.userId, body);
    return { success: true, flag };
  }

  @Post(":taskId/flags/:flagId/dismiss")
  @HttpCode(HttpStatus.OK)
  async dismissFlag(
    @Req() req: any,
    @Param("taskId") taskId: string,
    @Param("flagId") flagId: string,
    @Body() body: { reason?: string; note?: string }
  ) {
    const flag = await this.flagService.dismissFlag(taskId, flagId, req.userId, body);
    return { success: true, flag };
  }

  @Post(":taskId/reports/generate")
  @HttpCode(HttpStatus.OK)
  async generateReport(@Req() req: any, @Param("taskId") taskId: string) {
    const report = await this.reportService.generateDailyReport(taskId, req.userId);
    const delivered = await this.reportService.deliverAndRecord(report.id, taskId, req.userId);
    return { report: delivered };
  }

  @Post(":taskId/reports/:reportId/resend")
  @HttpCode(HttpStatus.OK)
  async resendReport(
    @Req() req: any,
    @Param("taskId") taskId: string,
    @Param("reportId") reportId: string
  ) {
    const report = await this.reportService.deliverAndRecord(reportId, taskId, req.userId);
    return { success: true, report };
  }

  @Delete(":taskId/reports/:reportId")
  async deleteReport(@Param("reportId") reportId: string) {
    await this.reportService.deleteReport(reportId);
    return { success: true };
  }
}
