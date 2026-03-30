"use client";

import * as Dialog from "@radix-ui/react-dialog";
import ReactMarkdown from "react-markdown";
import { X, ExternalLink } from "lucide-react";
import type { TaskComplianceReport } from "@/hooks/useHumanTasks";

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
