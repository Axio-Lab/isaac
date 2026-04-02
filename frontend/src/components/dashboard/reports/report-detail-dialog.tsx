"use client";

import * as Dialog from "@radix-ui/react-dialog";
import ReactMarkdown from "react-markdown";
import { X, ExternalLink } from "lucide-react";
import type { TaskComplianceReport } from "@/hooks/useHumanTasks";
import { formatFlagDetails } from "@/lib/flag-details";

interface ReportDetailDialogProps {
  report: TaskComplianceReport | null;
  onClose: () => void;
}

export function ReportDetailDialog({ report, onClose }: ReportDetailDialogProps) {
  const periodLabel = report
    ? new Date(report.periodStart).toLocaleDateString("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric",
      })
    : "";
  const flaggedSnapshot = Array.isArray(report?.flaggedWorkersSnapshot)
    ? { summary: null, workers: report?.flaggedWorkersSnapshot ?? [] }
    : (report?.flaggedWorkersSnapshot ?? null);

  return (
    <Dialog.Root open={!!report} onOpenChange={(open) => !open && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50" />
        <Dialog.Content
          aria-describedby={undefined}
          className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-card border border-border rounded-xl shadow-2xl w-[calc(100%-2rem)] max-w-2xl max-h-[85vh] flex flex-col z-50"
        >
          <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-border shrink-0">
            <div className="min-w-0">
              <Dialog.Title className="text-sm font-semibold text-foreground tracking-tight">
                Compliance Report
              </Dialog.Title>
              {report && <p className="text-[11px] text-muted-foreground mt-0.5">{periodLabel}</p>}
            </div>
            <Dialog.Close asChild>
              <button className="p-1 rounded-md hover:bg-muted text-muted-foreground">
                <X className="h-3.5 w-3.5" />
              </button>
            </Dialog.Close>
          </div>

          {report && (
            <div className="flex-1 overflow-y-auto px-6 py-5 min-h-0">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
                <KpiCard label="Submissions" value={String(report.totalSubmissions)} />
                <KpiCard
                  label="Missed"
                  value={String(report.missedCount)}
                  variant={report.missedCount > 0 ? "destructive" : "default"}
                />
                <KpiCard
                  label="Avg Score"
                  value={report.avgScore != null ? report.avgScore.toFixed(1) : "N/A"}
                />
                <KpiCard
                  label="Pass Rate"
                  value={report.passRate != null ? `${report.passRate.toFixed(0)}%` : "N/A"}
                />
              </div>

              {flaggedSnapshot && flaggedSnapshot.workers.length > 0 && (
                <div className="mb-6">
                  <h2 className="text-[13px] font-semibold text-foreground tracking-tight mb-2">
                    Flagged Workers
                  </h2>
                  <div className="rounded-lg border border-primary/15 bg-primary/5 px-3.5 py-3 mb-3">
                    <p className="text-[11px] leading-[1.7] text-foreground">
                      {flaggedSnapshot.summary ||
                        buildFlagExecutiveSummary(flaggedSnapshot.workers)}
                    </p>
                  </div>
                  <div className="space-y-2">
                    {summarizeFlaggedWorkers(flaggedSnapshot.workers).map((worker) => (
                      <div
                        key={worker.workerId}
                        className="rounded-lg border border-border bg-muted/20 px-3.5 py-3"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div>
                            <p className="text-xs font-semibold text-foreground">
                              {worker.workerName}
                            </p>
                            <p className="text-[11px] text-muted-foreground mt-0.5">
                              {worker.reasonsSummary || "Flagged activity recorded"}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-[10px] font-medium text-foreground">
                              {worker.topSeverity}
                            </p>
                            <p className="text-[10px] text-muted-foreground">
                              {new Date(worker.latestTriggeredAt).toLocaleString()}
                            </p>
                          </div>
                        </div>
                        <p className="text-[11px] text-foreground mt-2">
                          {buildWorkerFlagNarrative(worker)}
                        </p>
                        {worker.latestDetails && (
                          <p className="text-[11px] text-muted-foreground mt-2">
                            Latest issue:{" "}
                            {formatFlagDetails(worker.latestDetails, worker.taskTimezone)}
                          </p>
                        )}
                        <div className="flex flex-wrap gap-3 mt-2 text-[10px] text-muted-foreground">
                          <span>Open flags: {worker.activeFlagCount}</span>
                          <span>Total flags: {worker.totalFlagCount}</span>
                          <span>Risk: {worker.riskLevel}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="report-prose">
                <ReactMarkdown
                  components={{
                    h1: ({ children }) => (
                      <h1 className="text-[15px] font-semibold text-foreground tracking-tight mt-6 mb-2.5 first:mt-0">
                        {children}
                      </h1>
                    ),
                    h2: ({ children }) => (
                      <h2 className="text-[13px] font-semibold text-foreground tracking-tight mt-5 mb-2 first:mt-0">
                        {children}
                      </h2>
                    ),
                    h3: ({ children }) => (
                      <h3 className="text-xs font-semibold text-foreground mt-4 mb-1.5">
                        {children}
                      </h3>
                    ),
                    p: ({ children }) => (
                      <p className="text-xs leading-[1.7] text-muted-foreground mb-3">{children}</p>
                    ),
                    strong: ({ children }) => (
                      <strong className="font-semibold text-foreground">{children}</strong>
                    ),
                    em: ({ children }) => <em className="italic">{children}</em>,
                    ul: ({ children }) => (
                      <ul className="pl-4 mb-3 space-y-1 text-xs leading-[1.7] text-muted-foreground list-disc list-outside">
                        {children}
                      </ul>
                    ),
                    ol: ({ children }) => (
                      <ol className="pl-4 mb-3 space-y-1 text-xs leading-[1.7] text-muted-foreground list-decimal list-outside">
                        {children}
                      </ol>
                    ),
                    li: ({ children }) => (
                      <li className="text-xs leading-[1.7] text-muted-foreground pl-0.5">
                        {children}
                      </li>
                    ),
                    table: ({ children }) => (
                      <div className="overflow-x-auto mb-4 mt-2 rounded-lg border border-border">
                        <table className="w-full text-[11px]">{children}</table>
                      </div>
                    ),
                    thead: ({ children }) => (
                      <thead className="bg-muted/40 border-b border-border">{children}</thead>
                    ),
                    th: ({ children }) => (
                      <th className="text-left px-3 py-2 text-muted-foreground font-medium whitespace-nowrap">
                        {children}
                      </th>
                    ),
                    tr: ({ children }) => (
                      <tr className="border-b border-border/40 last:border-b-0">{children}</tr>
                    ),
                    td: ({ children }) => (
                      <td className="text-left px-3 py-2 text-foreground whitespace-nowrap">
                        {children}
                      </td>
                    ),
                    hr: () => <hr className="border-border my-4" />,
                    blockquote: ({ children }) => (
                      <blockquote className="border-l-2 border-primary/30 pl-3.5 text-xs italic text-muted-foreground my-3">
                        {children}
                      </blockquote>
                    ),
                    code: ({ children }) => (
                      <code className="text-[11px] bg-muted px-1 py-0.5 rounded font-mono text-foreground">
                        {children}
                      </code>
                    ),
                  }}
                >
                  {report.summaryMarkdown}
                </ReactMarkdown>
              </div>

              <div className="mt-5 pt-4 border-t border-border flex flex-wrap items-center gap-4">
                {report.deliveredAt && (
                  <p className="text-[10px] text-muted-foreground">
                    Delivered {new Date(report.deliveredAt).toLocaleString()}
                  </p>
                )}
                {report.documentUrl && (
                  <a
                    href={report.documentUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-[11px] font-medium text-primary hover:underline"
                  >
                    <ExternalLink className="h-3 w-3" /> View Document
                  </a>
                )}
              </div>
            </div>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

type ReportFlagSnapshot = NonNullable<
  NonNullable<TaskComplianceReport["flaggedWorkersSnapshot"]>["workers"]
>[number];

function buildFlagExecutiveSummary(flags: ReportFlagSnapshot[]) {
  const workerSummaries = summarizeFlaggedWorkers(flags);
  const workerCount = workerSummaries.length;
  const totalFlags = flags.length;
  const criticalWorkers = workerSummaries.filter((worker) => worker.riskLevel === "CRITICAL");
  const topWorker = workerSummaries[0];
  if (!topWorker) return "No flagged worker activity recorded for this report period.";

  const leadSentence =
    workerCount === 1
      ? `${topWorker.workerName} is the only flagged worker today and remains the operational priority.`
      : `${workerCount} workers were flagged today, with ${topWorker.workerName} carrying the highest concentration of risk.`;

  const exposureSentence =
    topWorker.flagCount === 1
      ? `${topWorker.workerName} recorded a single flagged incident, but the worker is still sitting at ${topWorker.riskLabel}.`
      : `${topWorker.workerName} generated ${topWorker.flagCount} flagged incidents today and is currently ${topWorker.riskLabel}.`;

  const escalationSentence =
    criticalWorkers.length > 0
      ? `${criticalWorkers.length === 1 ? "Immediate review is required before the next operating cycle." : `${criticalWorkers.length} workers are now in the critical band and need immediate review before the next operating cycle.`}`
      : `No worker is yet in the critical band, but the flagged activity should be addressed before the next operating cycle.`;

  return [leadSentence, exposureSentence, escalationSentence].filter(Boolean).join(" ");
}

function buildWorkerFlagNarrative(worker: ReturnType<typeof summarizeFlaggedWorkers>[number]) {
  const incidentText =
    worker.flagCount === 1 ? "1 flagged incident" : `${worker.flagCount} flagged incidents`;
  return `${worker.workerName} recorded ${incidentText} in this reporting window and is currently ${worker.riskLabel}.`;
}

function summarizeFlaggedWorkers(flags: ReportFlagSnapshot[]) {
  const grouped = new Map<string, ReportFlagSnapshot[]>();

  for (const flag of flags) {
    const bucket = grouped.get(flag.workerId) ?? [];
    bucket.push(flag);
    grouped.set(flag.workerId, bucket);
  }

  return Array.from(grouped.values())
    .map((workerFlags) => {
      const sorted = [...workerFlags].sort(
        (a, b) => new Date(b.triggeredAt).getTime() - new Date(a.triggeredAt).getTime()
      );
      const latest = sorted[0];
      const severityRank = { LOW: 1, MEDIUM: 2, HIGH: 3, CRITICAL: 4 } as const;
      const topSeverity = sorted.reduce((highest, current) =>
        severityRank[current.severity as keyof typeof severityRank] >
        severityRank[highest.severity as keyof typeof severityRank]
          ? current
          : highest
      );

      const reasonCounts = new Map<string, number>();
      for (const flag of sorted) {
        reasonCounts.set(flag.reasonLabel, (reasonCounts.get(flag.reasonLabel) ?? 0) + 1);
      }

      const topReasons = Array.from(reasonCounts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 2)
        .map(([label, count]) => (count > 1 ? `${label} (${count})` : label));

      return {
        workerId: latest.workerId,
        workerName: latest.workerName,
        flagCount: sorted.length,
        topSeverity: topSeverity.severity,
        riskLevel: latest.riskLevel,
        riskLabel: latest.riskLevel.toLowerCase().replace(/_/g, " "),
        activeFlagCount: latest.activeFlagCount,
        totalFlagCount: latest.totalFlagCount,
        latestTriggeredAt: latest.triggeredAt,
        latestDetails: latest.details,
        taskTimezone: latest.taskTimezone,
        reasonsSummary: topReasons.join(" • "),
      };
    })
    .sort(
      (a, b) => new Date(b.latestTriggeredAt).getTime() - new Date(a.latestTriggeredAt).getTime()
    );
}

function KpiCard({
  label,
  value,
  variant = "default",
}: {
  label: string;
  value: string;
  variant?: "default" | "destructive";
}) {
  return (
    <div className="rounded-lg border border-border bg-muted/20 px-3.5 py-2.5">
      <p className="text-[9px] uppercase tracking-widest text-muted-foreground font-medium mb-1">
        {label}
      </p>
      <p
        className={`text-base font-semibold tracking-tight ${
          variant === "destructive" ? "text-destructive" : "text-foreground"
        }`}
      >
        {value}
      </p>
    </div>
  );
}
