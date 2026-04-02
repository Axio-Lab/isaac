"use client";

import { useState, useEffect } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { Loader2, X, Plus, Trash2, UserPlus, Pause, Play, Flag } from "lucide-react";
import {
  useTaskWorkers,
  useAddWorker,
  useUpdateWorker,
  useRemoveWorker,
  useFlaggedWorkers,
  useResolveWorkerFlag,
  useDismissWorkerFlag,
} from "@/hooks/useHumanTasks";
import type { HumanWorker } from "@/hooks/useHumanTasks";
import { formatFlagDetails } from "@/lib/flag-details";
import { PlatformChannelIcon } from "@/lib/channel-icons";
import { AppPagination } from "@/components/ui/pagination";

const WORKERS_PAGE_SIZE = 10;

const PLATFORM_INPUT: Record<
  string,
  { label: string; placeholder: string; inputMode?: "tel" | "text" | "numeric" }
> = {
  TELEGRAM: {
    label: "Telegram chat ID",
    placeholder: "e.g. 123456789",
    inputMode: "numeric",
  },
  WHATSAPP: {
    label: "WhatsApp number",
    placeholder: "e.g. +2348012345678",
    inputMode: "tel",
  },
  SLACK: {
    label: "Slack user ID",
    placeholder: "e.g. U012ABC3DEF",
    inputMode: "text",
  },
  DISCORD: {
    label: "Discord user ID",
    placeholder: "e.g. 987654321012345678",
    inputMode: "numeric",
  },
};

function statusColor(status: string) {
  switch (status) {
    case "ACTIVE":
      return "bg-success/10 text-success border-success/20";
    case "ONBOARDING":
      return "bg-blue-500/10 text-blue-400 border-blue-500/20";
    case "INACTIVE":
      return "bg-muted text-muted-foreground border-border";
    case "REMOVED":
      return "bg-destructive/10 text-destructive border-destructive/20";
    default:
      return "bg-muted text-muted-foreground border-border";
  }
}

interface WorkersDialogProps {
  taskId: string;
  platform: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function WorkersDialog({ taskId, platform, open, onOpenChange }: WorkersDialogProps) {
  const { data, isLoading } = useTaskWorkers(taskId);
  const { data: flaggedData, isLoading: flaggedLoading } = useFlaggedWorkers(taskId);
  const addWorker = useAddWorker();
  const updateWorker = useUpdateWorker();
  const removeWorker = useRemoveWorker();
  const resolveFlag = useResolveWorkerFlag();
  const dismissFlag = useDismissWorkerFlag();

  const [name, setName] = useState("");
  const [externalId, setExternalId] = useState("");
  const [workersPage, setWorkersPage] = useState(1);

  const workers: HumanWorker[] = Array.isArray(data)
    ? data
    : ((data as { workers?: HumanWorker[] })?.workers ?? []);
  const flaggedWorkers: HumanWorker[] = Array.isArray(flaggedData)
    ? flaggedData
    : ((flaggedData as { workers?: HumanWorker[] })?.workers ?? []);

  const workersTotalPages = Math.max(1, Math.ceil(workers.length / WORKERS_PAGE_SIZE));
  const pagedWorkers = workers.slice(
    (workersPage - 1) * WORKERS_PAGE_SIZE,
    workersPage * WORKERS_PAGE_SIZE
  );

  useEffect(() => {
    if (open) setWorkersPage(1);
  }, [open, taskId]);

  useEffect(() => {
    if (workersPage > workersTotalPages) {
      setWorkersPage(workersTotalPages);
    }
  }, [workers.length, workersPage, workersTotalPages]);

  const inputCfg = PLATFORM_INPUT[platform.toUpperCase()] ?? {
    label: "External ID",
    placeholder: "User/chat ID",
    inputMode: "text" as const,
  };

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !externalId.trim()) return;
    await addWorker.mutateAsync({
      taskId,
      data: { name: name.trim(), platform: platform.toUpperCase(), externalId: externalId.trim() },
    });
    setName("");
    setExternalId("");
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50" />
        <Dialog.Content
          aria-describedby={undefined}
          className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-card border border-border rounded-xl shadow-2xl w-[calc(100%-2rem)] max-w-lg max-h-[85vh] overflow-hidden flex flex-col p-0 z-50"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-border">
            <div className="flex items-center gap-2">
              <Dialog.Title className="text-sm font-semibold text-foreground">
                Manage workers
              </Dialog.Title>
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[9px] font-medium border border-border bg-muted/40 text-foreground">
                <PlatformChannelIcon platform={platform} className="h-2.5 w-2.5" />
                {platform}
              </span>
            </div>
            <Dialog.Close asChild>
              <button className="p-1 rounded-md hover:bg-muted text-muted-foreground">
                <X className="h-3.5 w-3.5" />
              </button>
            </Dialog.Close>
          </div>

          {/* Add form */}
          <form
            onSubmit={handleAdd}
            className="flex items-end gap-2 px-5 py-3 border-b border-border bg-muted/20"
          >
            <div className="flex-1 min-w-0">
              <label className="block text-[10px] font-medium text-muted-foreground mb-0.5">
                Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Worker name"
                className="w-full px-2.5 py-1.5 border border-input rounded-lg text-xs bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                required
              />
            </div>
            <div className="flex-1 min-w-0">
              <label className="block text-[10px] font-medium text-muted-foreground mb-0.5">
                {inputCfg.label}
              </label>
              <input
                type="text"
                inputMode={inputCfg.inputMode}
                value={externalId}
                onChange={(e) => setExternalId(e.target.value)}
                placeholder={inputCfg.placeholder}
                className="w-full px-2.5 py-1.5 border border-input rounded-lg text-xs bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                required
              />
            </div>
            <button
              type="submit"
              disabled={addWorker.isPending || !name.trim() || !externalId.trim()}
              className="inline-flex items-center gap-1 px-3 py-1.5 bg-primary text-primary-foreground rounded-lg text-xs font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 shrink-0"
            >
              {addWorker.isPending ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Plus className="h-3 w-3" />
              )}
              Add
            </button>
          </form>

          {/* Worker list */}
          <div className="flex-1 overflow-y-auto px-5 py-3">
            {flaggedLoading ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              </div>
            ) : flaggedWorkers.length > 0 ? (
              <div className="mb-4 rounded-xl border border-amber-500/20 bg-amber-500/5 p-3">
                <div className="flex items-center gap-2 mb-3">
                  <Flag className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                  <p className="text-xs font-semibold text-foreground">Flagged workers</p>
                </div>
                <div className="space-y-2">
                  {flaggedWorkers.map((worker) => (
                    <div
                      key={`flagged-${worker.id}`}
                      className="rounded-lg border border-border bg-background px-3 py-2.5"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-foreground truncate">
                            {worker.name}
                          </p>
                          <div className="flex flex-wrap gap-2 mt-1 text-[10px] text-muted-foreground">
                            <span>Risk: {worker.riskLevel ?? "HEALTHY"}</span>
                            <span>Open: {worker.activeFlagCount ?? 0}</span>
                            <span>Total: {worker.totalFlagCount ?? 0}</span>
                          </div>
                        </div>
                        {worker.lastFlaggedAt && (
                          <p className="text-[10px] text-muted-foreground shrink-0">
                            {new Date(worker.lastFlaggedAt).toLocaleString()}
                          </p>
                        )}
                      </div>
                      <div className="mt-2 space-y-2">
                        {(worker.flagEvents ?? []).map((flag) => {
                          const flagMutationBusy =
                            (resolveFlag.isPending && resolveFlag.variables?.flagId === flag.id) ||
                            (dismissFlag.isPending && dismissFlag.variables?.flagId === flag.id);
                          return (
                            <div
                              key={flag.id}
                              className="rounded-md border border-border/70 bg-muted/20 px-2.5 py-2"
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0">
                                  <p className="text-[11px] font-medium text-foreground">
                                    {flag.reasonLabel}
                                  </p>
                                  {flag.details && (
                                    <p className="text-[10px] text-muted-foreground mt-0.5">
                                      {formatFlagDetails(flag.details, flag.humanTask?.timezone)}
                                    </p>
                                  )}
                                </div>
                                <span className="text-[9px] font-medium text-amber-600 dark:text-amber-400 shrink-0">
                                  {flag.severity}
                                </span>
                              </div>
                              <div className="mt-2 flex items-center justify-between gap-2">
                                <p className="text-[10px] text-muted-foreground">
                                  {new Date(flag.triggeredAt).toLocaleString()}
                                </p>
                                <div className="flex items-center gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      resolveFlag.mutate({
                                        taskId,
                                        flagId: flag.id,
                                        reason: "Resolved from worker management",
                                      })
                                    }
                                    disabled={flagMutationBusy}
                                    className="px-2 py-1 rounded-md border border-border text-[10px] text-foreground hover:bg-muted disabled:opacity-50"
                                  >
                                    Resolve
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      dismissFlag.mutate({
                                        taskId,
                                        flagId: flag.id,
                                        reason: "Dismissed from worker management",
                                      })
                                    }
                                    disabled={flagMutationBusy}
                                    className="px-2 py-1 rounded-md border border-border text-[10px] text-muted-foreground hover:bg-muted disabled:opacity-50"
                                  >
                                    Dismiss
                                  </button>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              </div>
            ) : workers.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <UserPlus className="h-6 w-6 text-muted-foreground/40 mb-2" />
                <p className="text-[11px] text-muted-foreground">No workers yet. Add one above.</p>
              </div>
            ) : (
              <>
                <div className="space-y-1.5">
                  {pagedWorkers.map((w) => {
                    const isRemoving =
                      removeWorker.isPending && removeWorker.variables?.workerId === w.id;
                    const isToggling =
                      updateWorker.isPending && updateWorker.variables?.workerId === w.id;
                    const canToggle = w.status === "ACTIVE" || w.status === "INACTIVE";

                    return (
                      <div
                        key={w.id}
                        className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg border border-border bg-background"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="min-w-0">
                            <p className="text-xs font-medium text-foreground truncate">{w.name}</p>
                            <p className="text-[10px] text-muted-foreground font-mono truncate">
                              {w.externalId}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          {typeof w.activeFlagCount === "number" && w.activeFlagCount > 0 && (
                            <span className="px-1.5 py-0.5 rounded-full text-[8px] font-medium border border-amber-500/20 bg-amber-500/10 text-amber-600 dark:text-amber-400">
                              {w.activeFlagCount} flag{w.activeFlagCount > 1 ? "s" : ""}
                            </span>
                          )}
                          <span
                            className={`px-1.5 py-0.5 rounded-full text-[8px] font-medium border ${statusColor(w.status)}`}
                          >
                            {w.status}
                          </span>
                          {canToggle && (
                            <button
                              type="button"
                              onClick={() =>
                                updateWorker.mutate({
                                  taskId,
                                  workerId: w.id,
                                  name: w.name,
                                  data: {
                                    status: w.status === "ACTIVE" ? "INACTIVE" : "ACTIVE",
                                  },
                                })
                              }
                              disabled={updateWorker.isPending || removeWorker.isPending}
                              className="p-1 rounded-md hover:bg-muted text-muted-foreground transition-colors disabled:opacity-50"
                              title={w.status === "ACTIVE" ? "Pause worker" : "Activate worker"}
                            >
                              {isToggling ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : w.status === "ACTIVE" ? (
                                <Pause className="h-3 w-3" />
                              ) : (
                                <Play className="h-3 w-3" />
                              )}
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() =>
                              removeWorker.mutate({
                                taskId,
                                workerId: w.id,
                                name: w.name,
                              })
                            }
                            disabled={removeWorker.isPending || updateWorker.isPending}
                            className="p-1 rounded-md hover:bg-muted text-destructive transition-colors disabled:opacity-50"
                            title="Remove worker"
                          >
                            {isRemoving ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <Trash2 className="h-3 w-3" />
                            )}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
                {workersTotalPages > 1 && (
                  <div className="mt-4 pb-1">
                    <AppPagination
                      page={workersPage}
                      totalPages={workersTotalPages}
                      onPageChange={setWorkersPage}
                    />
                  </div>
                )}
              </>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between px-5 py-3 border-t border-border">
            <p className="text-[10px] text-muted-foreground">
              {workers.length} worker{workers.length !== 1 ? "s" : ""}
            </p>
            <Dialog.Close asChild>
              <button className="px-3 py-1.5 border border-border rounded-lg text-xs font-medium text-foreground hover:bg-muted transition-colors">
                Done
              </button>
            </Dialog.Close>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
