import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "@/common/prisma.service";

const MISSED_REASON_TYPES = ["MISSED_DEADLINE", "REPEATED_MISSED_DEADLINE"];
const LOW_SCORE_REASON_TYPES = ["LOW_SCORE", "REPEATED_LOW_SCORE"];

type FlagStatus = "OPEN" | "RESOLVED" | "DISMISSED";
type FlagSeverity = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
type FlagReasonType =
  | "MISSED_DEADLINE"
  | "LOW_SCORE"
  | "REPEATED_MISSED_DEADLINE"
  | "REPEATED_LOW_SCORE";

@Injectable()
export class TaskFlagService {
  constructor(private readonly prisma: PrismaService) {}

  private async assertTask(taskId: string, userId: string) {
    const task = await (this.prisma as any).humanTask.findFirst({
      where: { id: taskId, userId },
      select: { id: true, userId: true, passingScore: true, name: true },
    });
    if (!task) throw new NotFoundException("Task not found");
    return task;
  }

  private rollingWindowStart(days = 30) {
    return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  }

  private buildRiskLevel(activeFlagCount: number, severities: FlagSeverity[]): string {
    if (activeFlagCount <= 0) return "HEALTHY";
    if (severities.includes("CRITICAL") || activeFlagCount >= 4) return "CRITICAL";
    if (severities.includes("HIGH") || activeFlagCount >= 2) return "AT_RISK";
    return "WATCHLIST";
  }

  private async refreshWorkerRisk(workerId: string) {
    const [openFlags, totalFlagCount] = await Promise.all([
      (this.prisma as any).workerFlagEvent.findMany({
        where: { workerId, status: "OPEN" },
        select: {
          severity: true,
          triggeredAt: true,
          reasonLabel: true,
        },
        orderBy: { triggeredAt: "desc" },
      }),
      (this.prisma as any).workerFlagEvent.count({ where: { workerId } }),
    ]);

    const latest = openFlags[0];
    await (this.prisma as any).humanWorker.update({
      where: { id: workerId },
      data: {
        activeFlagCount: openFlags.length,
        totalFlagCount,
        lastFlaggedAt: latest?.triggeredAt ?? null,
        lastFlagReason: latest?.reasonLabel ?? null,
        riskLevel: this.buildRiskLevel(
          openFlags.length,
          openFlags.map((flag: any) => flag.severity as FlagSeverity)
        ),
      },
    });
  }

  private async createFlagEvent(input: {
    userId: string;
    humanTaskId: string;
    workerId: string;
    submissionId?: string | null;
    reasonType: FlagReasonType;
    reasonLabel: string;
    details?: string | null;
    severity: FlagSeverity;
    metadata?: Record<string, unknown>;
    dedupeKey: string;
  }) {
    const existing = await (this.prisma as any).workerFlagEvent.findUnique({
      where: { dedupeKey: input.dedupeKey },
    });
    if (existing) return existing;

    const event = await (this.prisma as any).workerFlagEvent.create({
      data: {
        userId: input.userId,
        humanTaskId: input.humanTaskId,
        workerId: input.workerId,
        submissionId: input.submissionId ?? null,
        reasonType: input.reasonType,
        reasonLabel: input.reasonLabel,
        details: input.details ?? null,
        severity: input.severity,
        metadata: input.metadata ?? null,
        dedupeKey: input.dedupeKey,
      },
    });

    await this.refreshWorkerRisk(input.workerId);
    return event;
  }

  async flagMissedSubmission(submissionId: string) {
    const submission = await (this.prisma as any).taskSubmission.findUnique({
      where: { id: submissionId },
      include: {
        humanTask: { select: { id: true, userId: true, name: true, passingScore: true } },
        worker: { select: { id: true, name: true } },
      },
    });
    if (!submission || !submission.worker || !submission.humanTask) {
      throw new NotFoundException("Submission not found");
    }

    const priorCount = await (this.prisma as any).workerFlagEvent.count({
      where: {
        workerId: submission.workerId,
        status: { not: "DISMISSED" },
        reasonType: { in: MISSED_REASON_TYPES },
        triggeredAt: { gte: this.rollingWindowStart(30) },
      },
    });

    const reasonType: FlagReasonType =
      priorCount >= 1 ? "REPEATED_MISSED_DEADLINE" : "MISSED_DEADLINE";
    const severity: FlagSeverity =
      priorCount >= 2 ? "CRITICAL" : priorCount >= 1 ? "HIGH" : "MEDIUM";
    const dueAt = new Date(submission.dueAt).toISOString();

    return this.createFlagEvent({
      userId: submission.humanTask.userId,
      humanTaskId: submission.humanTaskId,
      workerId: submission.workerId,
      submissionId: submission.id,
      reasonType,
      reasonLabel:
        reasonType === "REPEATED_MISSED_DEADLINE"
          ? `${submission.worker.name} has repeated missed deadlines`
          : `${submission.worker.name} missed a deadline`,
      details: `${submission.worker.name} missed the submission deadline for ${submission.humanTask.name} due at ${dueAt}.`,
      severity,
      metadata: {
        dueAt,
        rollingMissedCount30d: priorCount + 1,
      },
      dedupeKey: `missed:${submission.id}`,
    });
  }

  async flagLowScoreSubmission(submissionId: string) {
    const submission = await (this.prisma as any).taskSubmission.findUnique({
      where: { id: submissionId },
      include: {
        humanTask: { select: { id: true, userId: true, name: true, passingScore: true } },
        worker: { select: { id: true, name: true } },
      },
    });
    if (!submission || !submission.worker || !submission.humanTask) {
      throw new NotFoundException("Submission not found");
    }
    if (submission.aiScore == null) return null;

    const passingScore = submission.humanTask.passingScore || 70;
    if (submission.aiScore >= passingScore) return null;

    const priorCount = await (this.prisma as any).workerFlagEvent.count({
      where: {
        workerId: submission.workerId,
        status: { not: "DISMISSED" },
        reasonType: { in: LOW_SCORE_REASON_TYPES },
        triggeredAt: { gte: this.rollingWindowStart(30) },
      },
    });

    const reasonType: FlagReasonType = priorCount >= 1 ? "REPEATED_LOW_SCORE" : "LOW_SCORE";
    const severity: FlagSeverity = priorCount >= 2 ? "HIGH" : priorCount >= 1 ? "HIGH" : "MEDIUM";

    return this.createFlagEvent({
      userId: submission.humanTask.userId,
      humanTaskId: submission.humanTaskId,
      workerId: submission.workerId,
      submissionId: submission.id,
      reasonType,
      reasonLabel:
        reasonType === "REPEATED_LOW_SCORE"
          ? `${submission.worker.name} has repeated low scores`
          : `${submission.worker.name} scored below threshold`,
      details: `${submission.worker.name} scored ${submission.aiScore} on ${submission.humanTask.name}, below the passing score of ${passingScore}.`,
      severity,
      metadata: {
        aiScore: submission.aiScore,
        passingScore,
        rollingLowScoreCount30d: priorCount + 1,
      },
      dedupeKey: `low-score:${submission.id}`,
    });
  }

  async listAllFlaggedWorkers(userId: string, filters?: { status?: FlagStatus }) {
    const flagWhere: Record<string, unknown> = { userId };
    if (filters?.status) flagWhere.status = filters.status;

    const flags = await (this.prisma as any).workerFlagEvent.findMany({
      where: flagWhere,
      include: {
        worker: {
          select: {
            id: true,
            name: true,
            platform: true,
            riskLevel: true,
            activeFlagCount: true,
            totalFlagCount: true,
            lastFlaggedAt: true,
            lastFlagReason: true,
            status: true,
          },
        },
        humanTask: { select: { id: true, name: true } },
        submission: { select: { id: true, dueAt: true, status: true, aiScore: true } },
      },
      orderBy: { triggeredAt: "desc" },
    });

    return flags;
  }

  async listFlags(
    taskId: string,
    userId: string,
    filters?: { workerId?: string; status?: FlagStatus }
  ) {
    await this.assertTask(taskId, userId);
    return (this.prisma as any).workerFlagEvent.findMany({
      where: {
        humanTaskId: taskId,
        ...(filters?.workerId ? { workerId: filters.workerId } : {}),
        ...(filters?.status ? { status: filters.status } : {}),
      },
      include: {
        worker: {
          select: {
            id: true,
            name: true,
            riskLevel: true,
            activeFlagCount: true,
            totalFlagCount: true,
          },
        },
        submission: { select: { id: true, dueAt: true, status: true, aiScore: true } },
      },
      orderBy: { triggeredAt: "desc" },
    });
  }

  async listFlaggedWorkers(taskId: string, userId: string) {
    await this.assertTask(taskId, userId);
    return (this.prisma as any).humanWorker.findMany({
      where: {
        humanTaskId: taskId,
        activeFlagCount: { gt: 0 },
      },
      include: {
        flagEvents: {
          where: { status: "OPEN" },
          orderBy: { triggeredAt: "desc" },
          take: 5,
        },
        submissions: {
          orderBy: { dueAt: "desc" },
          take: 1,
          select: { status: true, dueAt: true, aiScore: true },
        },
      },
      orderBy: [{ activeFlagCount: "desc" }, { lastFlaggedAt: "desc" }],
    });
  }

  async resolveFlag(
    taskId: string,
    flagId: string,
    userId: string,
    body?: { reason?: string; note?: string }
  ) {
    await this.assertTask(taskId, userId);
    const flag = await (this.prisma as any).workerFlagEvent.findFirst({
      where: { id: flagId, humanTaskId: taskId },
    });
    if (!flag) throw new NotFoundException("Flag not found");

    const updated = await (this.prisma as any).workerFlagEvent.update({
      where: { id: flagId },
      data: {
        status: "RESOLVED",
        resolvedAt: new Date(),
        resolvedBy: userId,
        resolutionReason: body?.reason ?? "Resolved by manager",
        resolutionNote: body?.note ?? null,
      },
    });
    await this.refreshWorkerRisk(flag.workerId);
    return updated;
  }

  async dismissFlag(
    taskId: string,
    flagId: string,
    userId: string,
    body?: { reason?: string; note?: string }
  ) {
    await this.assertTask(taskId, userId);
    const flag = await (this.prisma as any).workerFlagEvent.findFirst({
      where: { id: flagId, humanTaskId: taskId },
    });
    if (!flag) throw new NotFoundException("Flag not found");

    const updated = await (this.prisma as any).workerFlagEvent.update({
      where: { id: flagId },
      data: {
        status: "DISMISSED",
        resolvedAt: new Date(),
        resolvedBy: userId,
        resolutionReason: body?.reason ?? "Dismissed by manager",
        resolutionNote: body?.note ?? null,
      },
    });
    await this.refreshWorkerRisk(flag.workerId);
    return updated;
  }

  async buildReportFlagSnapshot(
    taskId: string,
    userId: string,
    periodStart: Date,
    periodEnd: Date
  ) {
    await this.assertTask(taskId, userId);
    const flags = await (this.prisma as any).workerFlagEvent.findMany({
      where: {
        humanTaskId: taskId,
        triggeredAt: { gte: periodStart, lte: periodEnd },
      },
      include: {
        worker: {
          select: {
            id: true,
            name: true,
            activeFlagCount: true,
            totalFlagCount: true,
            riskLevel: true,
          },
        },
      },
      orderBy: { triggeredAt: "desc" },
    });

    return flags.map((flag: any) => ({
      id: flag.id,
      workerId: flag.workerId,
      workerName: flag.worker?.name ?? "Unknown worker",
      reasonType: flag.reasonType,
      reasonLabel: flag.reasonLabel,
      details: flag.details,
      severity: flag.severity,
      status: flag.status,
      triggeredAt: flag.triggeredAt,
      activeFlagCount: flag.worker?.activeFlagCount ?? 0,
      totalFlagCount: flag.worker?.totalFlagCount ?? 0,
      riskLevel: flag.worker?.riskLevel ?? "HEALTHY",
      metadata: flag.metadata ?? null,
    }));
  }

  async attachFlagsToReport(reportId: string, flagIds: string[]) {
    if (flagIds.length === 0) return;
    await (this.prisma as any).workerFlagEvent.updateMany({
      where: { id: { in: flagIds } },
      data: { reportId },
    });
  }
}
