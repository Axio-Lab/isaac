import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from "@nestjs/common";
import * as cron from "node-cron";
import { PrismaService } from "@/common/prisma.service";
import {
  isValidIanaTimeZone,
  getZonedDayBoundsUtc,
  zonedWallTimeToUtc,
} from "@/common/lib/taskTimezone";
import { TaskReportService } from "./task-report.service";
import { TaskFlagService } from "./task-flag.service";
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
    private readonly flagService: TaskFlagService,
    private readonly channelMessaging: ChannelMessagingService,
    private readonly automatedRunner: AutomatedTaskRunnerService
  ) {}

  onModuleInit() {
    this.cronTask = cron.schedule("* * * * *", () => {
      this.tick().catch((err) => this.logger.error("Cron tick failed", err));
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
        requiredItems: true,
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

  private async processTaskSubmissions(task: any, now: Date, tz: string): Promise<void> {
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
      const reminderH =
        reminderMinutes >= 0
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

        const submission = await (this.prisma as any).taskSubmission.create({
          data: {
            humanTaskId: task.id,
            workerId: worker.id,
            dueAt,
            status: "PENDING",
          },
        });

        const items: Array<{ label: string; evidenceType: string }> = Array.isArray(
          task.requiredItems
        )
          ? task.requiredItems
          : [];
        if (items.length > 0) {
          await (this.prisma as any).submissionItem.createMany({
            data: items.map((it: any, idx: number) => ({
              submissionId: submission.id,
              label: it.label,
              sortOrder: idx,
            })),
          });
        }

        const evidenceLabel = (task.evidenceType || "evidence").toLowerCase();
        const dueTimeStr = `${String(sh).padStart(2, "0")}:${String(sm).padStart(2, "0")}`;
        await this.channelMessaging
          .sendToWorker(
            worker.id,
            msgTaskDuePrompt(
              worker.name,
              task.name,
              evidenceLabel,
              dueTimeStr,
              tz,
              items.length > 0 ? items : undefined
            )
          )
          .catch((err) =>
            this.logger.warn(`Prompt send failed for worker ${worker.id}: ${err.message}`)
          );

        this.logger.log(
          `Created submission for worker ${worker.name} on task ${task.name} (due ${dueAt.toISOString()}, reminded ${EARLY_REMINDER_MINUTES}min early)`
        );
      }
    }
  }

  // ─── Mark overdue submissions as MISSED ─────────────────────────

  private async processOverdueSubmissions(task: any, now: Date, _tz: string): Promise<void> {
    const graceMs = (task.graceMinutes || 30) * 60 * 1000;
    const cutoff = new Date(now.getTime() - graceMs);

    const overdue = await (this.prisma as any).taskSubmission.findMany({
      where: {
        humanTaskId: task.id,
        status: { in: ["PENDING", "COLLECTING", "REJECTED"] },
        dueAt: { lt: cutoff },
      },
      include: { worker: true },
    });

    for (const sub of overdue) {
      await (this.prisma as any).taskSubmission.update({
        where: { id: sub.id },
        data: { status: "MISSED" },
      });
      await this.flagService.flagMissedSubmission(sub.id).catch(() => {});

      if (sub.worker?.status === "ACTIVE") {
        await this.channelMessaging
          .sendToWorker(
            sub.worker.id,
            msgSubmissionMissed(sub.worker.name, task.name, sub.dueAt.toISOString().slice(11, 16))
          )
          .catch(() => {});
      }

      this.logger.log(
        `Submission ${sub.id} marked MISSED for worker ${sub.worker?.name ?? sub.workerId}`
      );
    }
  }

  // ─── Daily report generation ────────────────────────────────────

  private async processReport(task: any, now: Date, tz: string): Promise<void> {
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

    this.logger.log(
      `Report time match for task ${task.id}: reportTime=${task.reportTime}, ` +
        `now=${nowHour}:${String(nowMin).padStart(2, "0")} (${tz})`
    );

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
      const report = await this.reportService.generateDailyReport(task.id, task.userId);
      await this.reportService.deliverAndRecord(report.id, task.id, task.userId);
    } catch (err: any) {
      this.logger.error(`Failed to generate report for task ${task.id}: ${err.message}`);
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
            this.logger.error(`Automated task "${task.name}" failed: ${err.message}`)
          );
      }
    }
  }
}
