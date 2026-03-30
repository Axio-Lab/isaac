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
  Users,
  Clock,
  FileCheck2,
  Megaphone,
} from "lucide-react";
import type { HumanTask } from "@/hooks/useHumanTasks";
import { PlatformChannelIcon } from "@/lib/channel-icons";
import { statusColor, formatEvidenceTypeLabel, formatTimeHm } from "./utils";

const SEP = (
  <span className="text-border" aria-hidden>
    ·
  </span>
);

interface TaskCardProps {
  task: HumanTask;
  actionLoadingId: string | null;
  onEdit: (task: HumanTask) => void;
  onPauseResume: (task: HumanTask) => void;
  onArchive: (task: HumanTask) => void;
  onReactivate: (task: HumanTask) => void;
  onDeletePermanently: (task: HumanTask) => void;
  onManageWorkers?: (task: HumanTask) => void;
}

export function TaskCard({
  task,
  actionLoadingId,
  onEdit,
  onPauseResume,
  onArchive,
  onReactivate,
  onDeletePermanently,
  onManageWorkers,
}: TaskCardProps) {
  const slots =
    Array.isArray(task.scheduledTimes) && task.scheduledTimes.length > 0
      ? task.scheduledTimes.map((t) => formatTimeHm(t)).join(" · ")
      : null;
  const reportSlot = task.reportTime ? formatTimeHm(task.reportTime) : null;

  return (
    <div className="group border border-border rounded-xl px-3.5 py-3 bg-card hover:border-border/80 transition-all duration-150">
      {/* Row 1 — title + status + menu */}
      <div className="flex items-center justify-between gap-2 mb-1">
        <div className="flex items-center gap-2 min-w-0">
          <h3 className="text-xs font-semibold text-foreground truncate">{task.name}</h3>
          <span
            className={`shrink-0 px-1.5 py-0.5 rounded-full text-[9px] font-medium border leading-none ${statusColor(task.status)}`}
          >
            {task.status}
          </span>
        </div>

        <div className="flex items-center gap-0.5 shrink-0">
          {actionLoadingId === task.id && (
            <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
          )}
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
                {task.taskChannel && onManageWorkers && (
                  <DropdownMenu.Item
                    className="flex items-center gap-2 px-2.5 py-1.5 text-[11px] rounded-md cursor-pointer outline-none hover:bg-muted"
                    onSelect={() => onManageWorkers(task)}
                  >
                    <Users className="h-3 w-3" /> Manage workers
                  </DropdownMenu.Item>
                )}
                {task.status !== "DRAFT" && task.status !== "ARCHIVED" && (
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

      {/* Row 2 — description (optional, clamped) */}
      {task.description && (
        <p className="text-[11px] text-muted-foreground mb-1.5 line-clamp-1">{task.description}</p>
      )}

      {/* Row 3 — all metadata in a single wrapped line */}
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
        {reportSlot && (
          <>
            <span className="inline-flex items-center gap-1">
              <Megaphone className="h-2.5 w-2.5 shrink-0" />
              {reportSlot}
            </span>
            {SEP}
          </>
        )}
        <span className="inline-flex items-center gap-1">
          <FileCheck2 className="h-2.5 w-2.5 shrink-0" />
          {formatEvidenceTypeLabel(task.evidenceType)}
        </span>
        {task.taskChannel && (
          <>
            {SEP}
            <span className="inline-flex items-center gap-1 max-w-[140px]">
              <PlatformChannelIcon
                platform={task.taskChannel.platform}
                className="h-2.5 w-2.5 shrink-0"
              />
              <span className="truncate">
                {task.taskChannel.label || task.taskChannel.platform}
              </span>
            </span>
          </>
        )}
        {SEP}
        <span className="inline-flex items-center gap-1">
          <Users className="h-2.5 w-2.5 shrink-0" />
          {task._count?.workers ?? 0}
        </span>
        {SEP}
        <span>{task.recurrenceType}</span>
        {SEP}
        <span className="hidden sm:inline">{new Date(task.updatedAt).toLocaleDateString()}</span>
      </div>
    </div>
  );
}
