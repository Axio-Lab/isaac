"use client";

import { useState, useMemo } from "react";
import {
  useAllFlaggedWorkers,
  useResolveWorkerFlag,
  useDismissWorkerFlag,
} from "@/hooks/useHumanTasks";
import type { WorkerFlagEvent } from "@/hooks/useHumanTasks";
import { AppPagination } from "@/components/ui/pagination";
import { Loader2, Flag, Check, XCircle, Filter } from "lucide-react";

const PAGE_SIZE = 15;
type FlaggedWorkerRow = WorkerFlagEvent & {
  humanTask?: { id: string; name: string };
};

const STATUS_OPTIONS = [
  { value: "", label: "All" },
  { value: "OPEN", label: "Open" },
  { value: "RESOLVED", label: "Resolved" },
  { value: "DISMISSED", label: "Dismissed" },
] as const;

function severityColor(severity: string) {
  switch (severity) {
    case "CRITICAL":
      return "bg-red-500/10 text-red-500 border-red-500/20";
    case "HIGH":
      return "bg-orange-500/10 text-orange-500 border-orange-500/20";
    case "MEDIUM":
      return "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20";
    case "LOW":
      return "bg-blue-500/10 text-blue-500 border-blue-500/20";
    default:
      return "bg-muted text-muted-foreground border-border";
  }
}

function statusColor(status: string) {
  switch (status) {
    case "OPEN":
      return "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20";
    case "RESOLVED":
      return "bg-success/10 text-success border-success/20";
    case "DISMISSED":
      return "bg-muted text-muted-foreground border-border";
    default:
      return "bg-muted text-muted-foreground border-border";
  }
}

function riskColor(risk: string) {
  switch (risk) {
    case "CRITICAL":
      return "text-red-500";
    case "AT_RISK":
      return "text-orange-500";
    case "WATCHLIST":
      return "text-amber-600 dark:text-amber-400";
    default:
      return "text-muted-foreground";
  }
}

export function FlaggedWorkersView() {
  const [statusFilter, setStatusFilter] = useState("");
  const [pendingAction, setPendingAction] = useState<{
    flagId: string;
    action: "resolve" | "dismiss";
  } | null>(null);
  const { data, isLoading, isFetching } = useAllFlaggedWorkers(
    statusFilter ? { status: statusFilter } : undefined
  );
  const resolveFlag = useResolveWorkerFlag();
  const dismissFlag = useDismissWorkerFlag();
  const [page, setPage] = useState(1);

  const liveFlags: FlaggedWorkerRow[] = (data?.workers as FlaggedWorkerRow[] | undefined) ?? [];
  const flags: FlaggedWorkerRow[] = useMemo(() => liveFlags, [liveFlags]);
  const totalPages = Math.max(1, Math.ceil(flags.length / PAGE_SIZE));

  const paginatedFlags = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return flags.slice(start, start + PAGE_SIZE);
  }, [flags, page]);

  if (isLoading && !data) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div>
          <h1 className="text-lg font-semibold text-foreground tracking-tight flex items-center gap-2">
            Flagged Workers
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">All worker flags across your tasks</p>
        </div>

        <div className="flex items-center gap-2">
          {isFetching ? (
            <Loader2 className="h-3 w-3 animate-spin text-muted-foreground shrink-0" />
          ) : (
            <Filter className="h-3 w-3 text-muted-foreground shrink-0" />
          )}
          <div className="flex rounded-lg border border-border overflow-hidden">
            {STATUS_OPTIONS.map((opt) => (
              <button
                type="button"
                key={opt.value}
                onClick={() => {
                  setStatusFilter(opt.value);
                  setPage(1);
                }}
                className={`px-2.5 py-1 text-[10px] font-medium transition-colors ${
                  statusFilter === opt.value
                    ? "bg-primary text-primary-foreground"
                    : "bg-background text-muted-foreground hover:bg-muted"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {flags.length === 0 ? (
        <div className="rounded-xl border border-border bg-card p-12 text-center">
          <Flag className="h-8 w-8 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-sm font-medium text-foreground">No flags found</p>
          <p className="text-xs text-muted-foreground mt-1">
            {statusFilter
              ? `No ${statusFilter.toLowerCase()} flags. Try a different filter.`
              : "Workers will appear here when they miss deadlines or score below the passing threshold."}
          </p>
        </div>
      ) : (
        <>
          <div className="hidden sm:block rounded-xl border border-border bg-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[980px] text-xs">
                <thead>
                  <tr className="bg-muted/40 border-b border-border">
                    <th className="text-left px-4 py-2.5 text-muted-foreground font-medium">
                      Worker
                    </th>
                    <th className="text-left px-4 py-2.5 text-muted-foreground font-medium">
                      Task
                    </th>
                    <th className="text-left px-4 py-2.5 text-muted-foreground font-medium">
                      Reason
                    </th>
                    <th className="text-left px-4 py-2.5 text-muted-foreground font-medium">
                      Severity
                    </th>
                    <th className="text-left px-4 py-2.5 text-muted-foreground font-medium">
                      Risk
                    </th>
                    <th className="text-left px-4 py-2.5 text-muted-foreground font-medium">
                      Date
                    </th>
                    <th className="text-left px-4 py-2.5 text-muted-foreground font-medium">
                      Status
                    </th>
                    <th className="text-right px-4 py-2.5 text-muted-foreground font-medium">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedFlags.map((flag) => {
                    const resolveBusy =
                      pendingAction?.flagId === flag.id && pendingAction.action === "resolve";
                    const dismissBusy =
                      pendingAction?.flagId === flag.id && pendingAction.action === "dismiss";
                    const busy = resolveBusy || dismissBusy;
                    return (
                      <tr
                        key={flag.id}
                        className="border-b border-border/40 last:border-b-0 hover:bg-muted/20 align-top"
                      >
                        <td className="px-4 py-3 whitespace-nowrap">
                          <p className="font-medium text-foreground">
                            {flag.worker?.name ?? "Unknown"}
                          </p>
                          <p className="text-[10px] text-muted-foreground mt-0.5">
                            {flag.worker?.activeFlagCount ?? 0} open &middot;{" "}
                            {flag.worker?.totalFlagCount ?? 0} total
                          </p>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <p className="text-foreground">
                            {(flag as any).humanTask?.name ?? "Unknown"}
                          </p>
                        </td>
                        <td className="px-4 py-3 min-w-[260px]">
                          <p className="text-foreground whitespace-normal wrap-break-word">
                            {flag.reasonLabel}
                          </p>
                          {flag.details && (
                            <p className="text-[10px] text-muted-foreground mt-0.5 whitespace-normal wrap-break-word">
                              {flag.details}
                            </p>
                          )}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span
                            className={`px-1.5 py-0.5 rounded-full text-[9px] font-medium border ${severityColor(flag.severity)}`}
                          >
                            {flag.severity}
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span
                            className={`text-[11px] font-medium ${riskColor(flag.worker?.riskLevel ?? "HEALTHY")}`}
                          >
                            {flag.worker?.riskLevel ?? "HEALTHY"}
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">
                          {new Date(flag.triggeredAt).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                          <br />
                          <span className="text-[10px]">
                            {new Date(flag.triggeredAt).toLocaleTimeString("en-US", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span
                            className={`px-1.5 py-0.5 rounded-full text-[9px] font-medium border ${statusColor(flag.status)}`}
                          >
                            {flag.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right whitespace-nowrap">
                          {flag.status === "OPEN" && (
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => {
                                  setPendingAction({ flagId: flag.id, action: "resolve" });
                                  resolveFlag.mutate(
                                    {
                                      taskId: flag.humanTaskId,
                                      flagId: flag.id,
                                      reason: "Resolved from flagged workers page",
                                    },
                                    {
                                      onSettled: () => setPendingAction(null),
                                    }
                                  );
                                }}
                                disabled={busy}
                                className="inline-flex items-center gap-1 px-2 py-1 rounded-md border border-border text-[10px] font-medium text-foreground hover:bg-muted disabled:opacity-50"
                              >
                                {resolveBusy ? (
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                ) : (
                                  <Check className="h-3 w-3" />
                                )}
                                {resolveBusy ? "Resolving..." : "Resolve"}
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setPendingAction({ flagId: flag.id, action: "dismiss" });
                                  dismissFlag.mutate(
                                    {
                                      taskId: flag.humanTaskId,
                                      flagId: flag.id,
                                      reason: "Dismissed from flagged workers page",
                                    },
                                    {
                                      onSettled: () => setPendingAction(null),
                                    }
                                  );
                                }}
                                disabled={busy}
                                className="inline-flex items-center gap-1 px-2 py-1 rounded-md border border-border text-[10px] text-muted-foreground hover:bg-muted disabled:opacity-50"
                              >
                                {dismissBusy ? (
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                ) : (
                                  <XCircle className="h-3 w-3" />
                                )}
                                {dismissBusy ? "Dismissing..." : "Dismiss"}
                              </button>
                            </div>
                          )}
                          {flag.status !== "OPEN" && flag.resolvedAt && (
                            <p className="text-[10px] text-muted-foreground">
                              {new Date(flag.resolvedAt).toLocaleDateString()}
                            </p>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile card layout */}
          <div className="sm:hidden space-y-3">
            {paginatedFlags.map((flag) => {
              const resolveBusy =
                pendingAction?.flagId === flag.id && pendingAction.action === "resolve";
              const dismissBusy =
                pendingAction?.flagId === flag.id && pendingAction.action === "dismiss";
              const busy = resolveBusy || dismissBusy;
              return (
                <div key={flag.id} className="rounded-xl border border-border bg-card p-3.5">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-foreground">
                        {flag.worker?.name ?? "Unknown"}
                      </p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        {(flag as any).humanTask?.name ?? "Unknown task"}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span
                        className={`px-1.5 py-0.5 rounded-full text-[9px] font-medium border ${severityColor(flag.severity)}`}
                      >
                        {flag.severity}
                      </span>
                      <span
                        className={`px-1.5 py-0.5 rounded-full text-[9px] font-medium border ${statusColor(flag.status)}`}
                      >
                        {flag.status}
                      </span>
                    </div>
                  </div>

                  <p className="text-[11px] text-foreground">{flag.reasonLabel}</p>
                  {flag.details && (
                    <p className="text-[10px] text-muted-foreground mt-1">{flag.details}</p>
                  )}

                  <div className="flex flex-wrap gap-3 mt-2 text-[10px] text-muted-foreground">
                    <span>
                      Risk:{" "}
                      <span className={riskColor(flag.worker?.riskLevel ?? "HEALTHY")}>
                        {flag.worker?.riskLevel ?? "HEALTHY"}
                      </span>
                    </span>
                    <span>Open: {flag.worker?.activeFlagCount ?? 0}</span>
                    <span>Total: {flag.worker?.totalFlagCount ?? 0}</span>
                    <span>{new Date(flag.triggeredAt).toLocaleString()}</span>
                  </div>

                  {flag.status === "OPEN" && (
                    <div className="flex items-center gap-2 mt-3 pt-2.5 border-t border-border">
                      <button
                        type="button"
                        onClick={() => {
                          setPendingAction({ flagId: flag.id, action: "resolve" });
                          resolveFlag.mutate(
                            {
                              taskId: flag.humanTaskId,
                              flagId: flag.id,
                              reason: "Resolved from flagged workers page",
                            },
                            {
                              onSettled: () => setPendingAction(null),
                            }
                          );
                        }}
                        disabled={busy}
                        className="flex-1 inline-flex items-center justify-center gap-1 px-2.5 py-1.5 rounded-lg border border-border text-[10px] font-medium text-foreground hover:bg-muted disabled:opacity-50"
                      >
                        {resolveBusy ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <Check className="h-3 w-3" />
                        )}
                        {resolveBusy ? "Resolving..." : "Resolve"}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setPendingAction({ flagId: flag.id, action: "dismiss" });
                          dismissFlag.mutate(
                            {
                              taskId: flag.humanTaskId,
                              flagId: flag.id,
                              reason: "Dismissed from flagged workers page",
                            },
                            {
                              onSettled: () => setPendingAction(null),
                            }
                          );
                        }}
                        disabled={busy}
                        className="flex-1 inline-flex items-center justify-center gap-1 px-2.5 py-1.5 rounded-lg border border-border text-[10px] text-muted-foreground hover:bg-muted disabled:opacity-50"
                      >
                        {dismissBusy ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <XCircle className="h-3 w-3" />
                        )}
                        {dismissBusy ? "Dismissing..." : "Dismiss"}
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {totalPages > 1 && (
            <AppPagination
              page={page}
              totalPages={totalPages}
              onPageChange={setPage}
              className="mt-5"
            />
          )}
        </>
      )}
    </div>
  );
}
