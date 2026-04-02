import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { PrismaService } from "@/common/prisma.service";
import { getZonedDayBoundsUtc, isValidIanaTimeZone } from "@/common/lib/taskTimezone";
import { ReportDeliveryService } from "@/reports/report-delivery.service";
import { TaskSubmissionService } from "./task-submission.service";
import { getTaskInstructions } from "@/agent/isaac-system-prompt";
import { TaskFlagService } from "./task-flag.service";

/** Counts as pass for compliance rate (aligned with liveboard). */
const PASS_STATUSES = new Set(["APPROVED", "VETTED"]);

/**
 * Submissions with a known outcome for pass rate: vetting result or missed slot.
 * Excludes SUBMITTED/COLLECTING/PENDING so pending vetting does not force 0%.
 */
const PASS_RATE_DENOM_STATUSES = new Set(["APPROVED", "REJECTED", "VETTED", "MISSED"]);

@Injectable()
export class TaskReportService {
  private readonly logger = new Logger(TaskReportService.name);

  private generateText:
    | ((opts: {
        systemPrompt: string;
        userPrompt: string;
        images?: Array<{ base64: string; mediaType: string }>;
      }) => Promise<{ text: string }>)
    | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly submissionService: TaskSubmissionService,
    private readonly reportDelivery: ReportDeliveryService,
    private readonly flagService: TaskFlagService
  ) {}

  setGenerateText(
    fn: (opts: {
      systemPrompt: string;
      userPrompt: string;
      images?: Array<{ base64: string; mediaType: string }>;
    }) => Promise<{ text: string }>
  ) {
    this.generateText = fn;
  }

  private async buildFlaggedWorkersSummary(params: {
    taskName: string;
    periodStart: Date;
    periodEnd: Date;
    flaggedWorkersSnapshot: Array<Record<string, any>>;
  }) {
    const { taskName, periodStart, periodEnd, flaggedWorkersSnapshot } = params;
    if (flaggedWorkersSnapshot.length === 0) return null;

    if (!this.generateText) {
      const criticalCount = flaggedWorkersSnapshot.filter(
        (flag) => flag.riskLevel === "CRITICAL"
      ).length;
      const topWorker = flaggedWorkersSnapshot[0];
      return criticalCount > 0
        ? `${topWorker.workerName} is the immediate operating risk for ${taskName}, and flagged activity should be reviewed before the next shift.`
        : `${flaggedWorkersSnapshot.length} flagged incidents were recorded for ${taskName}, with follow-up required before the next operating cycle.`;
    }

    const groupedByWorker = flaggedWorkersSnapshot.reduce(
      (acc, flag) => {
        const bucket = acc[flag.workerId] ?? [];
        bucket.push(flag);
        acc[flag.workerId] = bucket;
        return acc;
      },
      {} as Record<string, Array<Record<string, any>>>
    );

    const workerLines = Object.values(groupedByWorker).map((workerFlags) => {
      const latest = [...workerFlags].sort(
        (a, b) => new Date(b.triggeredAt).getTime() - new Date(a.triggeredAt).getTime()
      )[0];
      return [
        `Worker: ${latest.workerName}`,
        `Incidents today: ${workerFlags.length}`,
        `Current risk: ${latest.riskLevel}`,
        `Current open flags: ${latest.activeFlagCount}`,
        `Current total flags: ${latest.totalFlagCount}`,
        `Latest issue: ${latest.details || latest.reasonLabel}`,
      ].join("\n");
    });

    const userPrompt =
      `Task: ${taskName}\n` +
      `Window: ${periodStart.toISOString()} to ${periodEnd.toISOString()}\n\n` +
      `Flagged worker context:\n${workerLines.join("\n\n")}`;

    try {
      const { text } = await this.generateText({
        systemPrompt: getTaskInstructions("report"),
        userPrompt,
      });
      return text
        .replace(/[#*_`>-]/g, "")
        .replace(/\s+/g, " ")
        .trim();
    } catch (err: any) {
      this.logger.warn(`Flagged worker summary generation failed: ${err.message}`);
      const topWorker = flaggedWorkersSnapshot[0];
      return `${topWorker.workerName} is the immediate operating risk for ${taskName}, and flagged activity should be reviewed before the next shift.`;
    }
  }

  async generateDailyReport(taskId: string, userId: string) {
    const task = await (this.prisma as any).humanTask.findFirst({
      where: { id: taskId, userId },
      include: { workers: { where: { status: "ACTIVE" } } },
    });
    if (!task) throw new NotFoundException("Task not found");

    const now = new Date();
    const tzRaw = task.timezone || "UTC";
    const tz = isValidIanaTimeZone(tzRaw) ? tzRaw : "UTC";
    const { start: periodStart, end: periodEnd } = getZonedDayBoundsUtc(now, tz);

    const submissions = await this.submissionService.getSubmissionsForReport(
      taskId,
      periodStart,
      periodEnd
    );

    const totalDue = submissions.length;
    const submitted = submissions.filter(
      (s: any) => s.status !== "PENDING" && s.status !== "MISSED"
    ).length;
    const missed = submissions.filter((s: any) => s.status === "MISSED").length;
    const scores = submissions
      .filter((s: any) => s.aiScore != null)
      .map((s: any) => s.aiScore as number);
    const avgScore =
      scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null;
    const passRateDenominator = submissions.filter((s: any) =>
      PASS_RATE_DENOM_STATUSES.has(s.status)
    );
    const passedCount = passRateDenominator.filter((s: any) => PASS_STATUSES.has(s.status)).length;
    const passRate =
      passRateDenominator.length > 0
        ? Math.round((passedCount / passRateDenominator.length) * 100)
        : null;

    const workerMap: Record<
      string,
      {
        name: string;
        due: number;
        submitted: number;
        missed: number;
        scores: number[];
      }
    > = {};
    for (const sub of submissions) {
      const w = (sub as any).worker;
      if (!w) continue;
      if (!workerMap[w.id]) {
        workerMap[w.id] = {
          name: w.name,
          due: 0,
          submitted: 0,
          missed: 0,
          scores: [],
        };
      }
      workerMap[w.id].due++;
      if ((sub as any).status === "MISSED") workerMap[w.id].missed++;
      else if ((sub as any).status !== "PENDING") workerMap[w.id].submitted++;
      if ((sub as any).aiScore != null) workerMap[w.id].scores.push((sub as any).aiScore);
    }

    const hasActiveWorkers = task.workers.length > 0;
    const noWorkersMessage = "No active workers are assigned to this task yet";
    const workerBreakdown = Object.entries(workerMap).map(([id, w]) => {
      const wAvg =
        w.scores.length > 0
          ? Math.round(w.scores.reduce((a, b) => a + b, 0) / w.scores.length)
          : null;
      return `${w.name}: ${w.submitted}/${w.due} submitted${w.missed > 0 ? ` (${w.missed} missed)` : ""}, avg ${wAvg ?? "N/A"}`;
    });

    const flaggedWorkersSnapshot = await this.flagService.buildReportFlagSnapshot(
      taskId,
      userId,
      periodStart,
      periodEnd
    );
    const flaggedWorkersSummary = await this.buildFlaggedWorkersSummary({
      taskName: task.name,
      periodStart,
      periodEnd,
      flaggedWorkersSnapshot,
    });
    const flaggedWorkerIds = [...new Set(flaggedWorkersSnapshot.map((flag) => flag.workerId))];
    const flaggedWorkersText =
      flaggedWorkersSnapshot.length > 0
        ? flaggedWorkersSnapshot
            .map(
              (flag) =>
                `${flag.workerName} | ${flag.reasonLabel} | ${new Date(flag.triggeredAt).toISOString()} | severity ${flag.severity}${flag.details ? ` | ${flag.details}` : ""}`
            )
            .join("\n")
        : "None";

    let summaryMarkdown: string;

    if (this.generateText) {
      const reportData =
        `Task: ${task.name}\nDate: ${periodStart.toISOString().split("T")[0]}\n` +
        `Total Due: ${totalDue}\nSubmitted: ${submitted}\nMissed: ${missed}\n` +
        `Avg Score: ${avgScore ?? "N/A"}\nPass Rate: ${passRate ?? "N/A"}%\n\n` +
        `Worker Breakdown:\n${hasActiveWorkers ? workerBreakdown.join("\n") || "No submissions yet" : noWorkersMessage}\n\n` +
        `Flagged Workers:\n${flaggedWorkersText}`;

      const { text } = await this.generateText({
        systemPrompt: getTaskInstructions("report"),
        userPrompt: reportData,
      });
      summaryMarkdown = this.cleanReportOutput(text);
    } else {
      summaryMarkdown =
        `# Daily Report: ${task.name}\n\n` +
        `**Date:** ${periodStart.toISOString().split("T")[0]}\n` +
        `**Total Due:** ${totalDue} | **Submitted:** ${submitted} | **Missed:** ${missed}\n` +
        `**Avg Score:** ${avgScore ?? "N/A"} | **Pass Rate:** ${passRate ?? "N/A"}%\n\n` +
        `## Worker Breakdown\n${hasActiveWorkers ? workerBreakdown.map((l) => `- ${l}`).join("\n") || "- No submissions yet" : `- ${noWorkersMessage}`}\n\n` +
        `## Flagged Workers\n${
          flaggedWorkersSnapshot.length > 0
            ? flaggedWorkersSnapshot
                .map(
                  (flag) =>
                    `- ${flag.workerName}: ${flag.reasonLabel} (${flag.severity}) on ${new Date(flag.triggeredAt).toLocaleString()}${flag.details ? ` — ${flag.details}` : ""}`
                )
                .join("\n")
            : "None"
        }`;
    }

    const report = await (this.prisma as any).taskComplianceReport.create({
      data: {
        humanTaskId: taskId,
        periodStart,
        periodEnd,
        summaryMarkdown,
        totalSubmissions: totalDue,
        missedCount: missed,
        avgScore,
        passRate,
        flaggedWorkerIds,
        flaggedWorkersSnapshot:
          flaggedWorkersSnapshot.length > 0
            ? {
                summary: flaggedWorkersSummary,
                workers: flaggedWorkersSnapshot,
              }
            : null,
      },
    });

    await this.flagService.attachFlagsToReport(
      report.id,
      flaggedWorkersSnapshot.map((flag) => flag.id)
    );

    if (submissions.length > 0) {
      await (this.prisma as any).taskSubmission.updateMany({
        where: { id: { in: submissions.map((s: any) => s.id) } },
        data: { reportIncluded: true },
      });
    }

    return report;
  }

  /**
   * Handles doc creation (if configured), delivery to destinations (if configured),
   * and updates the report record with documentUrl / deliveredAt / deliveredTo.
   * Used by cron, manual generate, and resend.
   */
  async deliverAndRecord(reportId: string, taskId: string, userId: string): Promise<any> {
    const report = await this.getReport(reportId);
    const task = await (this.prisma as any).humanTask.findFirst({
      where: { id: taskId, userId },
    });
    if (!task) return report;

    const dc = (task.deliveryConfig ?? {}) as Record<string, unknown>;
    const destinations = (dc.destinations ?? []) as Array<{
      type: string;
      channelId: string;
      channelName?: string;
    }>;
    const rawDocType = (dc.reportDocType as string) || "";

    const reportDate = new Date(report.periodStart).toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });

    let docUrl: string | null = report.documentUrl ?? null;

    const shouldCreateDoc = rawDocType && rawDocType !== "none";
    if (shouldCreateDoc) {
      const documentType = rawDocType === "notion" ? "notion" : "google_doc";
      const folderId = (dc.reportFolderId as string) || task.reportFolderId || undefined;
      this.logger.log(`Creating ${documentType} for task ${taskId} (reportDocType=${rawDocType})`);
      try {
        docUrl = await this.reportDelivery.createReportDocument({
          userId,
          title: `${task.name} report for ${reportDate}`,
          content: report.summaryMarkdown,
          documentType,
          folderId,
        });
        if (docUrl) {
          this.logger.log(`Document created: ${docUrl}`);
        } else {
          this.logger.warn(`Document creation returned no URL for task ${taskId}`);
        }
      } catch (err: any) {
        this.logger.warn(`Document creation failed for task ${taskId}: ${err.message}`);
      }
    } else {
      this.logger.debug(`Skipping doc creation: reportDocType="${rawDocType}"`);
    }

    let deliveryResults: Record<string, boolean> | null = null;

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
      deliveryConfig.emailSubject = `${task.name} report for ${reportDate}`;

      const execSummary = this.extractExecSummary(report.summaryMarkdown);
      const summary =
        `${task.name} report for ${reportDate}\n\n` +
        execSummary +
        (docUrl ? `\n\nFull report: ${docUrl}` : "");

      try {
        deliveryResults = await this.reportDelivery.deliverToDestinations(
          destTypes,
          summary,
          null,
          userId,
          deliveryConfig
        );
        this.logger.log(
          `Report delivery results for task ${taskId}: ${JSON.stringify(deliveryResults)}`
        );
      } catch (err: any) {
        this.logger.error(`Report delivery failed for task ${taskId}: ${err.message}`);
      }
    }

    const hasDelivery = docUrl || deliveryResults;
    if (hasDelivery) {
      return (this.prisma as any).taskComplianceReport.update({
        where: { id: reportId },
        data: {
          ...(docUrl ? { documentUrl: docUrl } : {}),
          ...(deliveryResults ? { deliveredAt: new Date(), deliveredTo: deliveryResults } : {}),
        },
      });
    }

    return report;
  }

  /**
   * Short text for email / chat delivery. Uses only the Worker Review section so we
   * do not concatenate Issues bullets into one awkward line (first-N-lines was doing that).
   */
  private extractExecSummary(markdown: string): string {
    const workerSection = this.extractMarkdownSection(markdown, "Worker Review");
    const source = workerSection ?? this.fallbackReportProse(markdown);

    const lines = source
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l && !l.startsWith("#"));

    const parts: string[] = [];
    for (const line of lines) {
      const clean = line
        .replace(/\*\*/g, "")
        .replace(/^[-*•]\s*/, "")
        .replace(/^[0-9]+[.)]\s*/, "")
        .trim();
      if (!clean) continue;
      parts.push(clean);
    }

    const joined = parts.join(" ");
    if (!joined) return markdown.slice(0, 280).trim();

    const sentenceSplit = joined.match(/[^.!?]+(?:[.!?]+|$)/g);
    if (sentenceSplit && sentenceSplit.length > 0) {
      const two = sentenceSplit
        .map((s) => s.trim())
        .filter(Boolean)
        .slice(0, 2)
        .join(" ")
        .trim();
      if (two) return two;
    }
    return joined.slice(0, 400).trim();
  }

  private extractMarkdownSection(full: string, title: string): string | null {
    const re = new RegExp(`^##\\s*${title.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*$`, "im");
    const m = full.match(re);
    if (!m || m.index === undefined) return null;
    const start = m.index + m[0].length;
    const rest = full.slice(start);
    const nextHeading = rest.search(/^\s*##\s+/m);
    const body = nextHeading === -1 ? rest : rest.slice(0, nextHeading);
    const trimmed = body.trim();
    return trimmed.length > 0 ? trimmed : null;
  }

  /**
   * Strip AI preamble, tool invocation XML, and other non-report content from
   * the model output so only the actual markdown report is stored.
   */
  private cleanReportOutput(raw: string): string {
    let cleaned = raw
      .replace(/<invoke[\s\S]*?<\/invoke>/g, "")
      .replace(/<\/?[a-z_-]+(?:\s[^>]*)?>/gi, "")
      .trim();

    const headingIdx = cleaned.search(/^##\s+/m);
    if (headingIdx > 0) {
      cleaned = cleaned.slice(headingIdx);
    }

    return cleaned.trim();
  }

  /** First prose block before any ## heading (legacy reports without Worker Review). */
  private fallbackReportProse(markdown: string): string {
    const idx = markdown.search(/^\s*##\s+/m);
    const head = idx === -1 ? markdown : markdown.slice(0, idx);
    return head.replace(/^#[^\n]*\n?/gm, "").trim();
  }

  async listReports(taskId: string) {
    return (this.prisma as any).taskComplianceReport.findMany({
      where: { humanTaskId: taskId },
      orderBy: { createdAt: "desc" },
    });
  }

  async getReport(reportId: string) {
    const report = await (this.prisma as any).taskComplianceReport.findUnique({
      where: { id: reportId },
    });
    if (!report) throw new NotFoundException("Report not found");
    return report;
  }

  async deleteReport(reportId: string) {
    const report = await (this.prisma as any).taskComplianceReport.findUnique({
      where: { id: reportId },
    });
    if (!report) throw new NotFoundException("Report not found");

    return (this.prisma as any).taskComplianceReport.delete({
      where: { id: reportId },
    });
  }
}
