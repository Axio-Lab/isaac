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

const AI_FILL_SYSTEM_PROMPT = `You are a task configuration assistant. Given a user prompt describing a task they want to create, return ONLY valid JSON (no markdown, no backticks) matching this shape:
{
  "name": "string (required)",
  "description": "string",
  "evidenceType": "PHOTO|VIDEO|TEXT|DOCUMENT|LOCATION|AUDIO|ANY",
  "recurrenceType": "ONCE|DAILY|WEEKLY|MONTHLY|CUSTOM",
  "recurrenceInterval": number (minutes, only if CUSTOM),
  "scheduledTimes": ["HH:MM", ...],
  "timezone": "IANA timezone string",
  "acceptanceRules": ["string", ...],
  "scoringEnabled": boolean,
  "passingScore": number (0-100),
  "graceMinutes": number,
  "resubmissionAllowed": boolean,
  "reportTime": "HH:MM",
  "reportDocType": "googledocs|notion"
}
Only include fields you can confidently infer. Do NOT include taskChannelId, destinations, or reportFolderId as those are user-specific. Return ONLY the JSON object.`;

const AI_FILL_AUTOMATED_SYSTEM_PROMPT = `You are configuring an automated task that Isaac runs on a schedule. It may use Composio-connected tools (Gmail, Slack, Notion, etc.) when needed, or run as pure agent reasoning with no integrations.

Given the user's description and the bracketed context about which apps they already connected, return ONLY valid JSON (no markdown, no backticks) matching this shape:
{
  "name": "string (required, short title)",
  "description": "string",
  "prompt": "string (required — detailed instructions for the agent: what to check, what to produce, which tools to prefer when applicable)",
  "composioApps": ["GMAIL"],
  "connectSuggestions": [ { "app": "GMAIL", "reason": "one short line why connecting helps" } ],
  "recurrenceType": "ONCE|DAILY|WEEKLY|MONTHLY|CUSTOM",
  "recurrenceInterval": number,
  "scheduledTimes": ["HH:MM", ...],
  "timezone": "IANA timezone string"
}

Rules:
- "composioApps": UPPERCASE names. Include ONLY apps that appear in the user's connected-apps list from the context line. If the task needs no external API/tool (e.g. only summarization from pasted context, or internal logic), use [].
- "connectSuggestions": For each Composio app that would materially help this task but is NOT in the user's connected list, add one object. If the task needs no extra connections, or connected apps already suffice, use []. Do not duplicate apps they already have.
- Only include object keys you can confidently infer. Return ONLY the JSON object.`;

@Controller("human-tasks")
@UseGuards(AuthGuard)
export class TasksController {
  constructor(
    private readonly tasksService: TasksService,
    private readonly workerService: TaskWorkerService,
    private readonly submissionService: TaskSubmissionService,
    private readonly reportService: TaskReportService,
    private readonly agentService: AgentService,
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
    },
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
      ? AI_FILL_AUTOMATED_SYSTEM_PROMPT
      : AI_FILL_SYSTEM_PROMPT;

    const { text } = await this.agentService.generateTextWithSystemPrompt({
      systemPrompt,
      userPrompt,
    });

    try {
      const cleaned = text.replace(/```json?\n?/g, "").replace(/```/g, "").trim();
      const fields = JSON.parse(cleaned);
      return { fields };
    } catch {
      return { fields: {} };
    }
  }

  // ─── Tasks ────────────────────────────────────────────────────────

  @Get()
  async listTasks(
    @Req() req: any,
    @Query("page") page?: string,
    @Query("limit") limit?: string,
  ) {
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
  async updateTask(
    @Req() req: any,
    @Param("taskId") taskId: string,
    @Body() body: any,
  ) {
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
  async addWorker(
    @Param("taskId") taskId: string,
    @Body() body: any,
  ) {
    const worker = await this.workerService.addWorker(taskId, body);
    return { worker };
  }

  @Put(":taskId/workers/:workerId")
  async updateWorker(
    @Param("taskId") taskId: string,
    @Param("workerId") workerId: string,
    @Body() body: any,
  ) {
    const worker = await this.workerService.updateWorker(
      taskId,
      workerId,
      body,
    );
    return { success: true, worker };
  }

  @Delete(":taskId/workers/:workerId")
  async removeWorker(
    @Param("taskId") taskId: string,
    @Param("workerId") workerId: string,
  ) {
    await this.workerService.removeWorker(taskId, workerId);
    return { success: true };
  }

  // ─── Submissions ──────────────────────────────────────────────────

  @Get(":taskId/submissions")
  async listSubmissions(
    @Param("taskId") taskId: string,
    @Query("workerId") workerId?: string,
    @Query("status") status?: string,
    @Query("date") date?: string,
    @Query("dateFrom") dateFrom?: string,
    @Query("dateTo") dateTo?: string,
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

  @Post(":taskId/reports/generate")
  @HttpCode(HttpStatus.OK)
  async generateReport(
    @Req() req: any,
    @Param("taskId") taskId: string,
  ) {
    const report = await this.reportService.generateDailyReport(
      taskId,
      req.userId,
    );
    return { report };
  }

  @Delete(":taskId/reports/:reportId")
  async deleteReport(@Param("reportId") reportId: string) {
    await this.reportService.deleteReport(reportId);
    return { success: true };
  }
}
