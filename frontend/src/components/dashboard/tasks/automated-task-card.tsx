"use client";

import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import {
  MoreVertical,
  Loader2,
  Pencil,
  Pause,
  Play,
  Archive,
  ArchiveRestore,
  Trash2,
  Clock,
  Bot,
  Zap,
} from "lucide-react";
import type { AutomatedTask } from "@/hooks/useAutomatedTasks";
import { statusColor, formatTimeHm } from "./utils";

const SEP = (
  <span className="text-border" aria-hidden>
    ·
  </span>
);

interface AutomatedTaskCardProps {
  task: AutomatedTask;
  actionLoadingId: string | null;
  onEdit: (task: AutomatedTask) => void;
  onPauseResume: (task: AutomatedTask) => void;
  onArchive: (task: AutomatedTask) => void;
  onReactivate: (task: AutomatedTask) => void;
  onDeletePermanently: (task: AutomatedTask) => void;
  onRun: (task: AutomatedTask) => void;
}

export function AutomatedTaskCard({
  task,
  actionLoadingId,
  onEdit,
  onPauseResume,
  onArchive,
  onReactivate,
  onDeletePermanently,
  onRun,
}: AutomatedTaskCardProps) {
  const slots =
    Array.isArray(task.scheduledTimes) && task.scheduledTimes.length > 0
      ? task.scheduledTimes.map((t) => formatTimeHm(t)).join(" · ")
      : null;

  const latestRun = task.runs?.[0];
  const runStatusLabel = latestRun
    ? `Last run: ${latestRun.status}${latestRun.completedAt ? ` (${new Date(latestRun.completedAt).toLocaleDateString()})` : ""}`
    : "Never run";

  return (
    <div className="group border border-border rounded-xl px-3.5 py-3 bg-card hover:border-border/80 transition-all duration-150">
      <div className="flex items-center justify-between gap-2 mb-1">
        <div className="flex items-center gap-2 min-w-0">
          <div className="h-4 w-4 rounded bg-primary/10 flex items-center justify-center shrink-0">
            <Bot className="h-2.5 w-2.5 text-primary" />
          </div>
          <h3 className="text-xs font-semibold text-foreground truncate">{task.name}</h3>
          <span
            className={`shrink-0 px-1.5 py-0.5 rounded-full text-[9px] font-medium border leading-none ${statusColor(task.status)}`}
          >
            {task.status}
          </span>
          <span className="shrink-0 px-1.5 py-0.5 rounded-full text-[9px] font-medium border leading-none bg-primary/5 text-primary border-primary/20">
            Automated
          </span>
        </div>

        <div className="flex items-center gap-0.5 shrink-0">
          {actionLoadingId === task.id && (
            <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
          )}
          <button
            onClick={() => onRun(task)}
            disabled={actionLoadingId === task.id || task.status !== "ACTIVE"}
            className="p-1 rounded-md hover:bg-primary/10 text-primary transition-colors disabled:opacity-40"
            title="Run now"
          >
            <Zap className="h-3.5 w-3.5" />
          </button>
          <DropdownMenu.Root>
            <DropdownMenu.Trigger asChild>
              <button className="p-1 rounded-md hover:bg-muted text-muted-foreground transition-colors">
                <MoreVertical className="h-3.5 w-3.5" />
              </button>
            </DropdownMenu.Trigger>
            <DropdownMenu.Portal>
              <DropdownMenu.Content
                className="min-w-[130px] bg-popover text-popover-foreground border border-border rounded-lg shadow-xl p-1 z-50"
                sideOffset={4}
                align="end"
              >
                <DropdownMenu.Item
                  className="flex items-center gap-2 px-2.5 py-1.5 text-[11px] rounded-md cursor-pointer outline-none hover:bg-muted"
                  onSelect={() => onEdit(task)}
                >
                  <Pencil className="h-3 w-3" /> Edit
                </DropdownMenu.Item>
                {task.status !== "ARCHIVED" && (
                  <DropdownMenu.Item
                    className="flex items-center gap-2 px-2.5 py-1.5 text-[11px] rounded-md cursor-pointer outline-none hover:bg-muted"
                    onSelect={() => onPauseResume(task)}
                  >
                    {task.status === "ACTIVE" ? (
                      <>
                        <Pause className="h-3 w-3" /> Pause
                      </>
                    ) : (
                      <>
                        <Play className="h-3 w-3" /> Resume
                      </>
                    )}
                  </DropdownMenu.Item>
                )}
                {task.status === "ARCHIVED" ? (
                  <DropdownMenu.Item
                    className="flex items-center gap-2 px-2.5 py-1.5 text-[11px] rounded-md cursor-pointer outline-none hover:bg-muted"
                    onSelect={() => onReactivate(task)}
                  >
                    <ArchiveRestore className="h-3 w-3" /> Reactivate
                  </DropdownMenu.Item>
                ) : (
                  <DropdownMenu.Item
                    className="flex items-center gap-2 px-2.5 py-1.5 text-[11px] rounded-md cursor-pointer outline-none hover:bg-muted"
                    onSelect={() => onArchive(task)}
                  >
                    <Archive className="h-3 w-3" /> Archive
                  </DropdownMenu.Item>
                )}
                <DropdownMenu.Item
                  className="flex items-center gap-2 px-2.5 py-1.5 text-[11px] rounded-md cursor-pointer outline-none hover:bg-muted text-destructive"
                  onSelect={() => onDeletePermanently(task)}
                >
                  <Trash2 className="h-3 w-3" /> Delete permanently
                </DropdownMenu.Item>
              </DropdownMenu.Content>
            </DropdownMenu.Portal>
          </DropdownMenu.Root>
        </div>
      </div>

      {task.description && (
        <p className="text-[11px] text-muted-foreground mb-1.5 line-clamp-1">{task.description}</p>
      )}

      <div className="flex items-center gap-x-2 gap-y-1 flex-wrap text-[10px] text-muted-foreground leading-none">
        {slots && (
          <>
            <span className="inline-flex items-center gap-1">
              <Clock className="h-2.5 w-2.5 shrink-0" />
              {slots}
              {task.timezone && (
                <span className="text-muted-foreground/60 hidden sm:inline">
                  {task.timezone.split("/").pop()?.replace(/_/g, " ")}
                </span>
              )}
            </span>
            {SEP}
          </>
        )}
        {Array.isArray(task.composioApps) && task.composioApps.length > 0 && (
          <>
            <span className="inline-flex items-center gap-1">
              <Zap className="h-2.5 w-2.5 shrink-0" />
              {task.composioApps.join(", ")}
            </span>
            {SEP}
          </>
        )}
        <span className="text-muted-foreground/70">{runStatusLabel}</span>
      </div>
    </div>
  );
}
