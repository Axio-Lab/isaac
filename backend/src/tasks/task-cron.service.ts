import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from "@nestjs/common";
import * as cron from "node-cron";
import { PrismaService } from "@/common/prisma.service";
import {
  isValidIanaTimeZone,
  getZonedDayBoundsUtc,
  zonedWallTimeToUtc,
} from "@/common/lib/taskTimezone";
import { TaskReportService } from "./task-report.service";
import { ReportDeliveryService } from "@/reports/report-delivery.service";
import { ChannelMessagingService } from "@/channels/channel-messaging.service";
import { AutomatedTaskRunnerService } from "@/automated-tasks/automated-task-runner.service";
import { msgTaskDuePrompt, msgSubmissionMissed } from "@/channels/bot-messages";

@Injectable()
export class TaskCronService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(TaskCronService.name);
  private cronTask: cron.ScheduledTask | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly reportService: TaskReportService,
    private readonly reportDelivery: ReportDeliveryService,
    private readonly channelMessaging: ChannelMessagingService,
    private readonly automatedRunner: AutomatedTaskRunnerService,
  ) {}

  onModuleInit() {
    this.cronTask = cron.schedule("* * * * *", () => {
      this.tick().catch((err) =>
        this.logger.error("Cron tick failed", err),
      );
    });
    this.logger.log("Task cron started (every minute)");
  }

  onModuleDestroy() {
    if (this.cronTask) {
      this.cronTask.stop();
      this.cronTask = null;
      this.logger.log("Task cron stopped");
    }
  }

  private async tick() {
    const now = new Date();

    const activeTasks = await (this.prisma as any).humanTask.findMany({
      where: { status: "ACTIVE" },
      select: {
        id: true,
        userId: true,
        name: true,
        scheduledTimes: true,
        reportTime: true,
        timezone: true,
        graceMinutes: true,
        evidenceType: true,
      },
    });

    for (const task of activeTasks) {
      const tz = task.timezone || "UTC";
      if (!isValidIanaTimeZone(tz)) continue;

      await this.processTaskSubmissions(task, now, tz);
      await this.processOverdueSubmissions(task, now, tz);
      await this.processReport(task, now, tz);
    }

    await this.processAutomatedTasks(now);
  }

  // ─── Submission creation + prompts ──────────────────────────────

  private async processTaskSubmissions(
    task: any,
    now: Date,
    tz: string,
  ): Promise<void> {
    const scheduledTimes: string[] = task.scheduledTimes ?? [];
    if (scheduledTimes.length === 0) return;

    let nowHour: number;
    let nowMin: number;
    let localYear: number;
    let localMonth: number;
    let localDay: number;
    try {
      const timeParts = new Intl.DateTimeFormat("en-US", {
        timeZone: tz,
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      }).formatToParts(now);
      nowHour = Number(timeParts.find((p) => p.type === "hour")?.value || 0);
      nowMin = Number(timeParts.find((p) => p.type === "minute")?.value || 0);

      const dateParts = new Intl.DateTimeFormat("en-US", {
        timeZone: tz,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).formatToParts(now);
      localYear = Number(dateParts.find((p) => p.type === "year")?.value || 0);
      localMonth = Number(dateParts.find((p) => p.type === "month")?.value || 0);
      localDay = Number(dateParts.find((p) => p.type === "day")?.value || 0);
    } catch {
      return;
    }

    const EARLY_REMINDER_MINUTES = 30;

    for (const timeStr of scheduledTimes) {
      const [sh, sm] = String(timeStr).split(":").map(Number);
      if (Number.isNaN(sh) || Number.isNaN(sm)) continue;

      const dueMinutesFromMidnight = sh * 60 + sm;
      const reminderMinutes = dueMinutesFromMidnight - EARLY_REMINDER_MINUTES;
      const reminderH = reminderMinutes >= 0
        ? Math.floor(reminderMinutes / 60)
        : Math.floor((reminderMinutes + 1440) / 60);
      const reminderM = ((reminderMinutes % 60) + 60) % 60;

      if (nowHour !== reminderH || Math.abs(nowMin - reminderM) > 1) continue;

      const dueAt = zonedWallTimeToUtc(localYear, localMonth, localDay, sh, sm, 0, tz);

      const activeWorkers = await (this.prisma as any).humanWorker.findMany({
        where: { humanTaskId: task.id, status: "ACTIVE" },
      });

      for (const worker of activeWorkers) {
        const existing = await (this.prisma as any).taskSubmission.findFirst({
          where: {
            humanTaskId: task.id,
            workerId: worker.id,
            dueAt,
          },
        });
        if (existing) continue;

        await (this.prisma as any).taskSubmission.create({
          data: {
            humanTaskId: task.id,
            workerId: worker.id,
            dueAt,
            status: "PENDING",
          },
        });

        const evidenceLabel = (task.evidenceType || "evidence").toLowerCase();
        const dueTimeStr = `${String(sh).padStart(2, "0")}:${String(sm).padStart(2, "0")}`;
        await this.channelMessaging
          .sendToWorker(
            worker.id,
            msgTaskDuePrompt(worker.name, task.name, evidenceLabel, dueTimeStr, tz),
          )
          .catch((err) =>
            this.logger.warn(
              `Prompt send failed for worker ${worker.id}: ${err.message}`,
            ),
          );

        this.logger.log(
          `Created submission for worker ${worker.name} on task ${task.name} (due ${dueAt.toISOString()}, reminded ${EARLY_REMINDER_MINUTES}min early)`,
        );
      }
    }
  }

  // ─── Mark overdue submissions as MISSED ─────────────────────────

  private async processOverdueSubmissions(
    task: any,
    now: Date,
    _tz: string,
  ): Promise<void> {
    const graceMs = (task.graceMinutes || 30) * 60 * 1000;
    const cutoff = new Date(now.getTime() - graceMs);

    const overdue = await (this.prisma as any).taskSubmission.findMany({
      where: {
        humanTaskId: task.id,
        status: "PENDING",
        dueAt: { lt: cutoff },
      },
      include: { worker: true },
    });

    for (const sub of overdue) {
      await (this.prisma as any).taskSubmission.update({
        where: { id: sub.id },
        data: { status: "MISSED" },
      });

      if (sub.worker?.status === "ACTIVE") {
        await this.channelMessaging
          .sendToWorker(
            sub.worker.id,
            msgSubmissionMissed(sub.worker.name, task.name, sub.dueAt.toISOString().slice(11, 16)),
          )
          .catch(() => {});
      }

      this.logger.log(
        `Submission ${sub.id} marked MISSED for worker ${sub.worker?.name ?? sub.workerId}`,
      );
    }
  }

  // ─── Daily report generation ────────────────────────────────────

  private async processReport(
    task: any,
    now: Date,
    tz: string,
  ): Promise<void> {
    if (!task.reportTime) return;

    const [rh, rm] = String(task.reportTime).split(":").map(Number);
    if (Number.isNaN(rh) || Number.isNaN(rm)) return;

    let nowHour: number;
    let nowMin: number;
    try {
      const nowInTz = new Intl.DateTimeFormat("en-US", {
        timeZone: tz,
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      }).formatToParts(now);
      nowHour = Number(nowInTz.find((p) => p.type === "hour")?.value || 0);
      nowMin = Number(nowInTz.find((p) => p.type === "minute")?.value || 0);
    } catch {
      return;
    }

    if (nowHour !== rh || Math.abs(nowMin - rm) > 1) return;

    const { start: dayStartUtc, end: dayEndUtc } = getZonedDayBoundsUtc(now, tz);
    const existing = await (this.prisma as any).taskComplianceReport.findFirst({
      where: {
        humanTaskId: task.id,
        createdAt: { gte: dayStartUtc, lte: dayEndUtc },
      },
    });
    if (existing) return;

    try {
      this.logger.log(`Generating daily report for task ${task.id}`);
      const report = await this.reportService.generateDailyReport(
        task.id,
        task.userId,
      );
      await this.deliverReport(task, report);
    } catch (err: any) {
      this.logger.error(
        `Failed to generate report for task ${task.id}: ${err.message}`,
      );
    }
  }

  // ─── Automated task scheduled runs ───────────────────────────────

  private async processAutomatedTasks(now: Date): Promise<void> {
    const tasks = await (this.prisma as any).automatedTask.findMany({
      where: { status: "ACTIVE" },
      select: {
        id: true,
        userId: true,
        name: true,
        prompt: true,
        scheduledTimes: true,
        timezone: true,
        deliveryConfig: true,
      },
    });

    for (const task of tasks) {
      const tz = task.timezone || "UTC";
      if (!isValidIanaTimeZone(tz)) continue;

      const scheduledTimes: string[] = task.scheduledTimes ?? [];
      if (scheduledTimes.length === 0) continue;

      let nowHour: number;
      let nowMin: number;
      try {
        const timeParts = new Intl.DateTimeFormat("en-US", {
          timeZone: tz,
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
        }).formatToParts(now);
        nowHour = Number(timeParts.find((p) => p.type === "hour")?.value || 0);
        nowMin = Number(timeParts.find((p) => p.type === "minute")?.value || 0);
      } catch {
        continue;
      }

      for (const timeStr of scheduledTimes) {
        const [sh, sm] = String(timeStr).split(":").map(Number);
        if (Number.isNaN(sh) || Number.isNaN(sm)) continue;
        if (nowHour !== sh || Math.abs(nowMin - sm) > 1) continue;

        const todayStart = new Date(now);
        todayStart.setUTCHours(0, 0, 0, 0);
        const existingRun = await (this.prisma as any).automatedTaskRun.findFirst({
          where: {
            automatedTaskId: task.id,
            triggeredBy: "SCHEDULE",
            startedAt: { gte: todayStart },
          },
        });
        if (existingRun) continue;

        this.logger.log(`Triggering scheduled automated task "${task.name}" (${timeStr} ${tz})`);
        this.automatedRunner
          .execute(task, "SCHEDULE")
          .catch((err) =>
            this.logger.error(`Automated task "${task.name}" failed: ${err.message}`),
          );
      }
    }
  }

  private async deliverReport(task: any, report: any): Promise<void> {
    const fullTask = await (this.prisma as any).humanTask.findUnique({
      where: { id: task.id },
    });
    if (!fullTask) return;

    const dc = (fullTask.deliveryConfig ?? {}) as Record<string, unknown>;
    const destinations = (dc.destinations ?? []) as Array<{
      type: string;
      channelId: string;
      channelName?: string;
    }>;
    const reportDocType = (dc.reportDocType as string) || "google_doc";

    let docUrl: string | null = null;
    try {
      docUrl = await this.reportDelivery.createReportDocument({
        userId: task.userId,
        title: `Report: ${fullTask.name} — ${new Date().toISOString().split("T")[0]}`,
        content: report.summaryMarkdown,
        documentType: reportDocType === "notion" ? "notion" : "google_doc",
      });
    } catch (err: any) {
      this.logger.warn(
        `Document creation failed for task ${task.id}: ${err.message}`,
      );
    }

    if (destinations.length > 0) {
      const destTypes = destinations.map((d) => d.type as any);
      const deliveryConfig: Record<string, string | undefined> = {};
      for (const d of destinations) {
        if (d.type === "telegram") deliveryConfig.telegramChatId = d.channelId;
        if (d.type === "slack") deliveryConfig.slackChannelId = d.channelId;
        if (d.type === "discord") deliveryConfig.discordChannelId = d.channelId;
        if (d.type === "whatsapp") deliveryConfig.whatsappNumber = d.channelId;
        if (d.type === "gmail") deliveryConfig.recipientEmail = d.channelId;
      }

      const summary =
        `📋 *Daily Report: ${fullTask.name}*\n` +
        `Total: ${report.totalSubmissions} | Missed: ${report.missedCount} | ` +
        `Avg Score: ${report.avgScore ?? "N/A"} | Pass Rate: ${report.passRate ?? "N/A"}%`;

      try {
        const results = await this.reportDelivery.deliverToDestinations(
          destTypes,
          summary,
          docUrl,
          task.userId,
          deliveryConfig,
        );
        this.logger.log(
          `Report delivery results for task ${task.id}: ${JSON.stringify(results)}`,
        );
      } catch (err: any) {
        this.logger.error(
          `Report delivery failed for task ${task.id}: ${err.message}`,
        );
      }
    }
  }
}
