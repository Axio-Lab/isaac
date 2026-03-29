import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "@/common/prisma.service";
import {
  getZonedDayBoundsUtc,
  isValidIanaTimeZone,
} from "@/common/lib/taskTimezone";
import { TaskSubmissionService } from "./task-submission.service";

@Injectable()
export class TaskReportService {
  private generateText: ((opts: {
    systemPrompt: string;
    userPrompt: string;
  }) => Promise<{ text: string }>) | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly submissionService: TaskSubmissionService,
  ) {}

  setGenerateText(
    fn: (opts: {
      systemPrompt: string;
      userPrompt: string;
    }) => Promise<{ text: string }>,
  ) {
    this.generateText = fn;
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
    const { start: periodStart, end: periodEnd } = getZonedDayBoundsUtc(
      now,
      tz,
    );

    const submissions = await this.submissionService.getSubmissionsForReport(
      taskId,
      periodStart,
      periodEnd,
    );

    const totalDue = submissions.length;
    const submitted = submissions.filter(
      (s: any) => s.status !== "PENDING" && s.status !== "MISSED",
    ).length;
    const missed = submissions.filter(
      (s: any) => s.status === "MISSED",
    ).length;
    const scores = submissions
      .filter((s: any) => s.aiScore != null)
      .map((s: any) => s.aiScore as number);
    const avgScore =
      scores.length > 0
        ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
        : null;
    const passed = submissions.filter(
      (s: any) => s.status === "APPROVED",
    ).length;
    const passRate =
      totalDue > 0 ? Math.round((passed / totalDue) * 100) : null;

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
      else if ((sub as any).status !== "PENDING")
        workerMap[w.id].submitted++;
      if ((sub as any).aiScore != null)
        workerMap[w.id].scores.push((sub as any).aiScore);
    }

    const flaggedWorkerIds: string[] = [];
    const workerBreakdown = Object.entries(workerMap).map(([id, w]) => {
      const wAvg =
        w.scores.length > 0
          ? Math.round(w.scores.reduce((a, b) => a + b, 0) / w.scores.length)
          : null;
      if (
        w.missed >= 2 ||
        (wAvg !== null && wAvg < (task.passingScore || 70))
      ) {
        flaggedWorkerIds.push(id);
      }
      return `${w.name}: ${w.submitted}/${w.due} submitted${w.missed > 0 ? ` (${w.missed} missed)` : ""}, avg ${wAvg ?? "N/A"}`;
    });

    let summaryMarkdown: string;

    if (this.generateText) {
      const dataForAI =
        `Task: ${task.name}\nDate: ${periodStart.toISOString().split("T")[0]}\n` +
        `Total Due: ${totalDue}\nSubmitted: ${submitted}\nMissed: ${missed}\n` +
        `Avg Score: ${avgScore ?? "N/A"}\nPass Rate: ${passRate ?? "N/A"}%\n\n` +
        `Worker Breakdown:\n${workerBreakdown.join("\n")}\n\n` +
        `Flagged Workers: ${flaggedWorkerIds.length > 0 ? flaggedWorkerIds.join(", ") : "None"}`;

      const { text } = await this.generateText({
        systemPrompt:
          "You are a compliance report writer. Generate a clear, professional daily task compliance report in markdown format. Include a summary, worker breakdown, and any flags or recommendations.",
        userPrompt: dataForAI,
      });
      summaryMarkdown = text;
    } else {
      summaryMarkdown =
        `# Daily Report: ${task.name}\n\n` +
        `**Date:** ${periodStart.toISOString().split("T")[0]}\n` +
        `**Total Due:** ${totalDue} | **Submitted:** ${submitted} | **Missed:** ${missed}\n` +
        `**Avg Score:** ${avgScore ?? "N/A"} | **Pass Rate:** ${passRate ?? "N/A"}%\n\n` +
        `## Worker Breakdown\n${workerBreakdown.map((l) => `- ${l}`).join("\n")}\n\n` +
        `## Flagged Workers\n${flaggedWorkerIds.length > 0 ? flaggedWorkerIds.join(", ") : "None"}`;
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
      },
    });

    if (submissions.length > 0) {
      await (this.prisma as any).taskSubmission.updateMany({
        where: { id: { in: submissions.map((s: any) => s.id) } },
        data: { reportIncluded: true },
      });
    }

    return report;
  }

  async listReports(taskId: string) {
    return (this.prisma as any).taskComplianceReport.findMany({
      where: { humanTaskId: taskId },
      orderBy: { periodStart: "desc" },
    });
  }

  async getReport(reportId: string) {
    const report = await (
      this.prisma as any
    ).taskComplianceReport.findUnique({
      where: { id: reportId },
    });
    if (!report) throw new NotFoundException("Report not found");
    return report;
  }

  async deleteReport(reportId: string) {
    const report = await (
      this.prisma as any
    ).taskComplianceReport.findUnique({
      where: { id: reportId },
    });
    if (!report) throw new NotFoundException("Report not found");

    return (this.prisma as any).taskComplianceReport.delete({
      where: { id: reportId },
    });
  }
}
