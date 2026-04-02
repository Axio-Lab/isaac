"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { AppPagination } from "@/components/ui/pagination";
import {
  useHumanTasks,
  useCreateHumanTask,
  useUpdateHumanTask,
  useArchiveHumanTask,
  useActivateHumanTask,
  useDeleteHumanTask,
  usePauseHumanTask,
  useResumeHumanTask,
} from "@/hooks/useHumanTasks";
import type { HumanTask } from "@/hooks/useHumanTasks";
import {
  useAutomatedTasks,
  useCreateAutomatedTask,
  useUpdateAutomatedTask,
  useActivateAutomatedTask,
  useDeleteAutomatedTask,
  useRunAutomatedTask,
  usePauseAutomatedTask,
  useResumeAutomatedTask,
} from "@/hooks/useAutomatedTasks";
import type { AutomatedTask } from "@/hooks/useAutomatedTasks";
import { useActiveChannels } from "@/hooks/useTaskChannels";
import { useComposioApps, useComposioConnectedAccounts } from "@/hooks/useComposioConnections";
import { Plus, Loader2, CalendarDays, FileEdit, Search } from "lucide-react";
import { toast } from "sonner";
import { GlassButton } from "@/components/ui/glass-button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { TaskCard } from "./task-card";
import { AutomatedTaskCard } from "./automated-task-card";
import { TaskFormDialog } from "./task-form-dialog";
import { TaskSelectDropdown, type TaskSelectOption } from "./task-select-dropdown";
import { WorkersDialog } from "./workers-dialog";
import {
  defaultForm,
  CHAT_NOTIFICATION_PLATFORMS,
  emptyDestination,
  getBrowserTimezone,
  DRAFT_STORAGE_KEY,
  type TaskFormData,
  type DeliveryDestination,
} from "./constants";

type AnyTask = (HumanTask & { _taskType: "HUMAN" }) | (AutomatedTask & { _taskType: "AUTOMATED" });

const TASKS_PAGE_SIZE = 10;

const TASK_STATUSES = ["DRAFT", "ACTIVE", "PAUSED", "ARCHIVED"] as const;

const CHANNEL_FILTER_OPTIONS = CHAT_NOTIFICATION_PLATFORMS;

/** Slack / Telegram / etc. for human tasks from taskChannel; for automated from first destination type. */
function getTaskPlatform(t: AnyTask): string | null {
  if (t._taskType === "HUMAN") {
    const p = t.taskChannel?.platform;
    return p ? String(p).toLowerCase() : null;
  }
  const dc = (t.deliveryConfig ?? {}) as Record<string, unknown>;
  const raw = dc.destinations as Array<{ type?: string }> | undefined;
  if (!Array.isArray(raw) || raw.length === 0) return null;
  const ty = raw[0]?.type;
  return ty ? String(ty).toLowerCase() : null;
}

const CHANNEL_NONE = "__none__";

const STATUS_FILTER_OPTIONS: TaskSelectOption[] = [
  { value: "", label: "All statuses" },
  ...TASK_STATUSES.map((s) => ({ value: s, label: s })),
];

const CHANNEL_FILTER_SELECT_OPTIONS: TaskSelectOption[] = [
  { value: "", label: "All channels" },
  { value: CHANNEL_NONE, label: "No channel" },
  ...CHANNEL_FILTER_OPTIONS.map((d) => ({ value: d.value, label: d.label })),
];

export function TasksView() {
  const { data, isLoading } = useHumanTasks();
  const createTask = useCreateHumanTask();
  const updateTask = useUpdateHumanTask();
  const archiveHumanTask = useArchiveHumanTask();
  const activateHumanTask = useActivateHumanTask();
  const deleteTask = useDeleteHumanTask();
  const pauseTask = usePauseHumanTask();
  const resumeTask = useResumeHumanTask();

  const { data: autoData, isLoading: autoLoading } = useAutomatedTasks();
  const createAutoTask = useCreateAutomatedTask();
  const updateAutoTask = useUpdateAutomatedTask();
  const activateAutoTask = useActivateAutomatedTask();
  const deleteAutoTask = useDeleteAutomatedTask();
  const runAutoTask = useRunAutomatedTask();
  const pauseAutoTask = usePauseAutomatedTask();
  const resumeAutoTask = useResumeAutomatedTask();

  const { data: channelsData } = useActiveChannels();
  const channels = channelsData?.channels ?? [];

  const { data: composioData } = useComposioConnectedAccounts();
  const connectedAccounts = composioData?.accounts ?? [];
  const { data: composioAppsData } = useComposioApps();
  const composioAppCatalog = composioAppsData?.apps ?? [];

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<HumanTask | null>(null);
  const [editingAutoTask, setEditingAutoTask] = useState<AutomatedTask | null>(null);
  const [form, setForm] = useState<TaskFormData>(defaultForm);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [draftPending, setDraftPending] = useState(false);
  const [hasSavedDraft, setHasSavedDraft] = useState(false);
  const [workersTask, setWorkersTask] = useState<HumanTask | null>(null);
  type TaskPendingAction =
    | { kind: "archive-human"; id: string; name: string }
    | { kind: "delete-human"; id: string; name: string }
    | { kind: "archive-auto"; id: string; name: string }
    | { kind: "delete-auto"; id: string; name: string };

  const [taskPendingAction, setTaskPendingAction] = useState<TaskPendingAction | null>(null);
  const [taskSearch, setTaskSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [platformFilter, setPlatformFilter] = useState("");
  const [taskListPage, setTaskListPage] = useState(1);

  const humanTasks = data?.tasks ?? [];
  const automatedTasks = autoData?.tasks ?? [];
  const channelUsageById = useMemo<Record<string, string>>(
    () =>
      humanTasks.reduce(
        (acc, task) => {
          if (task.taskChannelId) acc[task.taskChannelId] = task.name;
          return acc;
        },
        {} as Record<string, string>
      ),
    [humanTasks]
  );

  const allTasks: AnyTask[] = useMemo(() => {
    const human = humanTasks.map((t) => ({ ...t, _taskType: "HUMAN" as const }));
    const auto = automatedTasks.map((t) => ({ ...t, _taskType: "AUTOMATED" as const }));
    return [...human, ...auto].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }, [humanTasks, automatedTasks]);

  const filteredTasks = useMemo(() => {
    const q = taskSearch.trim().toLowerCase();
    return allTasks.filter((t) => {
      if (statusFilter && t.status !== statusFilter) return false;

      if (platformFilter) {
        const plat = getTaskPlatform(t);
        if (platformFilter === CHANNEL_NONE) {
          if (plat) return false;
        } else if (plat !== platformFilter.toLowerCase()) {
          return false;
        }
      }

      if (!q) return true;
      const name = (t.name ?? "").toLowerCase();
      const desc = (t.description ?? "").toLowerCase();
      if (t._taskType === "AUTOMATED") {
        const prompt = (t.prompt ?? "").toLowerCase();
        return name.includes(q) || desc.includes(q) || prompt.includes(q);
      }
      return name.includes(q) || desc.includes(q);
    });
  }, [allTasks, taskSearch, statusFilter, platformFilter]);

  const taskTotalPages = Math.max(1, Math.ceil(filteredTasks.length / TASKS_PAGE_SIZE));

  const paginatedTasks = useMemo(() => {
    const start = (taskListPage - 1) * TASKS_PAGE_SIZE;
    return filteredTasks.slice(start, start + TASKS_PAGE_SIZE);
  }, [filteredTasks, taskListPage]);

  useEffect(() => {
    setTaskListPage(1);
  }, [taskSearch, statusFilter, platformFilter]);

  useEffect(() => {
    if (taskListPage > taskTotalPages) {
      setTaskListPage(taskTotalPages);
    }
  }, [taskListPage, taskTotalPages]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(DRAFT_STORAGE_KEY);
      if (saved) setHasSavedDraft(true);
    } catch {}
  }, []);

  function openCreate() {
    setEditingTask(null);
    setEditingAutoTask(null);
    setForm({ ...defaultForm, timezone: getBrowserTimezone() });
    setDialogOpen(true);
  }

  function openFromLocalDraft() {
    try {
      const saved = localStorage.getItem(DRAFT_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as TaskFormData;
        if (!parsed.deliveryDestination) {
          parsed.deliveryDestination = { ...emptyDestination };
        }
        setEditingTask(null);
        setForm(parsed);
        setDialogOpen(true);
        localStorage.removeItem(DRAFT_STORAGE_KEY);
        setHasSavedDraft(false);
      }
    } catch {
      openCreate();
    }
  }

  function openEdit(task: HumanTask) {
    const dc = (task.deliveryConfig ?? {}) as Record<string, unknown>;

    const rawDests = dc.destinations as
      | Array<{ type: string; channelId?: string; value?: string; channelName?: string }>
      | undefined;
    let dest: DeliveryDestination = { ...emptyDestination };
    if (Array.isArray(rawDests) && rawDests.length > 0) {
      const first = rawDests[0];
      dest = {
        type: first.type || "",
        channelId: first.channelId || first.value || "",
        channelName: first.channelName || "",
      };
    }

    setEditingAutoTask(null);
    setEditingTask(task);
    setForm({
      ...defaultForm,
      taskType: "HUMAN",
      name: task.name,
      description: task.description || "",
      evidenceType: task.evidenceType,
      recurrenceType: task.recurrenceType,
      recurrenceInterval: task.recurrenceInterval ?? 60,
      scheduledTimes: task.scheduledTimes?.join(", ") || "",
      timezone: task.timezone || getBrowserTimezone(),
      taskChannelId: task.taskChannelId || "",
      acceptanceRules: task.acceptanceRules?.length > 0 ? [...task.acceptanceRules] : [""],
      sampleEvidenceUrl: task.sampleEvidenceUrl || "",
      submissionMode:
        Array.isArray((task as any).requiredItems) && (task as any).requiredItems.length > 0
          ? "multi"
          : "single",
      requiredItems: Array.isArray((task as any).requiredItems) ? (task as any).requiredItems : [],
      scoringEnabled: task.scoringEnabled,
      passingScore: task.passingScore,
      graceMinutes: task.graceMinutes,
      resubmissionAllowed: task.resubmissionAllowed,
      reportTime: task.reportTime || "18:00",
      reportDocType: (dc.reportDocType as string) || "googledocs",
      reportFolderId: task.reportFolderId || "",
      deliveryDestination: dest,
    });
    setDialogOpen(true);
  }

  function openEditAutoTask(task: AutomatedTask) {
    const dc = (task.deliveryConfig ?? {}) as Record<string, unknown>;
    const rawDests = dc.destinations as
      | Array<{ type: string; channelId?: string; value?: string; channelName?: string }>
      | undefined;
    let dest: DeliveryDestination = { ...emptyDestination };
    if (Array.isArray(rawDests) && rawDests.length > 0) {
      const first = rawDests[0];
      dest = {
        type: first.type || "",
        channelId: first.channelId || first.value || "",
        channelName: first.channelName || "",
      };
    }

    setEditingTask(null);
    setEditingAutoTask(task);
    setForm({
      ...defaultForm,
      taskType: "AUTOMATED",
      name: task.name,
      description: task.description || "",
      prompt: task.prompt,
      composioApps: Array.isArray(task.composioApps) ? task.composioApps : [],
      scheduledTimes: task.scheduledTimes?.join(", ") || "",
      timezone: task.timezone || getBrowserTimezone(),
      deliveryDestination: dest,
    });
    setDialogOpen(true);
  }

  const buildHumanPayload = useCallback(
    (status?: string) => {
      const scheduledTimes = form.scheduledTimes
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);

      const acceptanceRules = form.acceptanceRules.filter((r) => r.trim().length > 0);

      const destinations: Array<Record<string, string>> = [];
      const dest = form.deliveryDestination;
      if (dest.type && dest.channelId) {
        destinations.push({
          type: dest.type,
          channelId: dest.channelId,
          channelName: dest.channelName,
        });
      }

      const payload: Record<string, unknown> = {
        name: form.name,
        description: form.description || null,
        evidenceType: form.evidenceType,
        recurrenceType: form.recurrenceType,
        scheduledTimes,
        timezone: form.timezone,
        reportChannelId: form.taskChannelId || null,
        taskChannelId: form.taskChannelId || null,
        acceptanceRules,
        sampleEvidenceUrl: form.sampleEvidenceUrl || null,
        requiredItems:
          form.submissionMode === "multi"
            ? form.requiredItems.filter((it) => it.label.trim().length > 0)
            : [],
        scoringEnabled: form.scoringEnabled,
        passingScore: form.passingScore,
        graceMinutes: form.graceMinutes,
        resubmissionAllowed: form.resubmissionAllowed,
        reportTime: form.reportTime,
        reportFolderId: form.reportFolderId || null,
        deliveryConfig: {
          reportDocType: form.reportDocType,
          reportFolderId: form.reportFolderId || null,
          destinations,
        },
      };

      if (form.recurrenceType === "CUSTOM") {
        payload.recurrenceInterval = form.recurrenceInterval;
      }

      if (status) {
        payload.status = status;
      }

      return payload;
    },
    [form]
  );

  const buildAutoPayload = useCallback(
    (status?: string) => {
      const scheduledTimes = form.scheduledTimes
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);

      const destinations: Array<Record<string, string>> = [];
      const dest = form.deliveryDestination;
      if (dest.type && dest.channelId) {
        destinations.push({
          type: dest.type,
          channelId: dest.channelId,
          channelName: dest.channelName,
        });
      }

      const payload: Record<string, unknown> = {
        name: form.name,
        description: form.description || null,
        prompt: form.prompt,
        composioApps: form.composioApps,
        scheduledTimes,
        timezone: form.timezone,
        deliveryConfig: { destinations },
      };

      if (status) payload.status = status;
      return payload;
    },
    [form]
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (form.taskType === "AUTOMATED") {
      const payload = buildAutoPayload();
      if (editingAutoTask) {
        await updateAutoTask.mutateAsync({
          taskId: editingAutoTask.id,
          data: payload as Partial<AutomatedTask>,
        });
      } else {
        await createAutoTask.mutateAsync(payload as Partial<AutomatedTask>);
      }
    } else {
      const payload = buildHumanPayload();
      if (editingTask) {
        if (editingTask.status === "DRAFT") payload.status = "ACTIVE";
        await updateTask.mutateAsync({
          taskId: editingTask.id,
          data: payload as Partial<HumanTask>,
        });
      } else {
        await createTask.mutateAsync(payload as Partial<HumanTask>);
      }
    }
    setDialogOpen(false);
  }

  async function handleSaveDraft() {
    if (!form.name.trim()) {
      toast.error("Give the task a name before saving as draft");
      return;
    }
    setDraftPending(true);
    try {
      if (form.taskType === "AUTOMATED") {
        const payload = buildAutoPayload("DRAFT");
        if (editingAutoTask) {
          await updateAutoTask.mutateAsync({
            taskId: editingAutoTask.id,
            data: payload as Partial<AutomatedTask>,
          });
        } else {
          await createAutoTask.mutateAsync(payload as Partial<AutomatedTask>);
        }
      } else {
        const payload = buildHumanPayload("DRAFT");
        if (editingTask) {
          await updateTask.mutateAsync({
            taskId: editingTask.id,
            data: payload as Partial<HumanTask>,
          });
        } else {
          await createTask.mutateAsync(payload as Partial<HumanTask>);
        }
      }
      toast.success("Task saved as draft");
      setDialogOpen(false);
    } catch {
    } finally {
      setDraftPending(false);
    }
  }

  async function handlePauseResume(task: HumanTask) {
    setActionLoadingId(task.id);
    try {
      if (task.status === "ACTIVE") {
        await pauseTask.mutateAsync({ taskId: task.id, name: task.name });
      } else {
        await resumeTask.mutateAsync({ taskId: task.id, name: task.name });
      }
    } finally {
      setActionLoadingId(null);
    }
  }

  async function handleAutoTaskPauseResume(task: AutomatedTask) {
    setActionLoadingId(task.id);
    try {
      if (task.status === "ACTIVE") {
        await pauseAutoTask.mutateAsync({ taskId: task.id });
      } else {
        await resumeAutoTask.mutateAsync({ taskId: task.id });
      }
    } finally {
      setActionLoadingId(null);
    }
  }

  async function handleRunAutoTask(task: AutomatedTask) {
    setActionLoadingId(task.id);
    try {
      await runAutoTask.mutateAsync({ taskId: task.id });
    } finally {
      setActionLoadingId(null);
    }
  }

  function requestArchiveHumanTask(task: HumanTask) {
    setTaskPendingAction({
      kind: "archive-human",
      id: task.id,
      name: task.name,
    });
  }

  function requestArchiveAutoTask(task: AutomatedTask) {
    setTaskPendingAction({
      kind: "archive-auto",
      id: task.id,
      name: task.name,
    });
  }

  async function handleReactivateHumanTask(task: HumanTask) {
    setActionLoadingId(task.id);
    try {
      await activateHumanTask.mutateAsync({ taskId: task.id });
    } finally {
      setActionLoadingId(null);
    }
  }

  async function handleReactivateAutoTask(task: AutomatedTask) {
    setActionLoadingId(task.id);
    try {
      await activateAutoTask.mutateAsync({ taskId: task.id });
    } finally {
      setActionLoadingId(null);
    }
  }

  function requestDeleteHumanTaskPermanently(task: HumanTask) {
    setTaskPendingAction({
      kind: "delete-human",
      id: task.id,
      name: task.name,
    });
  }

  function requestDeleteAutoTaskPermanently(task: AutomatedTask) {
    setTaskPendingAction({
      kind: "delete-auto",
      id: task.id,
      name: task.name,
    });
  }

  async function confirmTaskPendingAction() {
    if (!taskPendingAction) return;
    switch (taskPendingAction.kind) {
      case "archive-human":
        await archiveHumanTask.mutateAsync({ taskId: taskPendingAction.id });
        break;
      case "delete-human":
        await deleteTask.mutateAsync({ taskId: taskPendingAction.id });
        break;
      case "archive-auto":
        await updateAutoTask.mutateAsync({
          taskId: taskPendingAction.id,
          data: { status: "ARCHIVED" },
        });
        break;
      case "delete-auto":
        await deleteAutoTask.mutateAsync({ taskId: taskPendingAction.id });
        break;
    }
  }

  if (isLoading || autoLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between mb-4">
        <div>
          <h1 className="text-lg font-semibold text-foreground tracking-tight">Tasks</h1>
          <p className="text-xs text-muted-foreground">Create and manage your tasks</p>
        </div>
        <GlassButton
          onClick={openCreate}
          size="sm"
          className="glass-filled shrink-0"
          contentClassName="flex items-center gap-1.5 text-xs"
        >
          <Plus className="h-3 w-3" />
          Create Task
        </GlassButton>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between mb-6">
        <div className="flex flex-wrap items-end gap-2.5 sm:gap-3 min-w-0">
          <TaskSelectDropdown
            label="Status"
            value={statusFilter}
            onChange={setStatusFilter}
            options={STATUS_FILTER_OPTIONS}
            ariaLabel="Filter by status"
            triggerClassName="w-[min(100%,8.5rem)] sm:w-auto"
          />
          <TaskSelectDropdown
            label="Channel"
            value={platformFilter}
            onChange={setPlatformFilter}
            options={CHANNEL_FILTER_SELECT_OPTIONS}
            ariaLabel="Filter by notification channel"
            triggerClassName="w-[min(100%,12rem)] sm:w-auto sm:min-w-40"
          />
        </div>
        <div className="relative w-full sm:flex-1 sm:min-w-48 sm:max-w-2xl">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
          <input
            type="search"
            value={taskSearch}
            onChange={(e) => setTaskSearch(e.target.value)}
            placeholder="Search by task name, description..."
            className="w-full pl-9 pr-4 py-1.5 sm:py-2 bg-muted border border-border rounded-lg text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            aria-label="Search tasks"
          />
        </div>
      </div>

      {hasSavedDraft && (
        <button
          onClick={openFromLocalDraft}
          className="w-full mb-4 flex items-center gap-2.5 px-4 py-3 rounded-xl border border-primary/30 bg-primary/5 hover:bg-primary/10 transition-colors text-left"
        >
          <FileEdit className="h-4 w-4 text-primary shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-foreground">You have an unsaved draft</p>
            <p className="text-[10px] text-muted-foreground">
              Click to continue where you left off
            </p>
          </div>
        </button>
      )}

      {allTasks.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="h-10 w-10 rounded-xl bg-muted flex items-center justify-center mb-3">
            <CalendarDays className="h-5 w-5 text-muted-foreground" />
          </div>
          <p className="text-xs text-muted-foreground">
            No tasks yet. Create your first task to get started.
          </p>
        </div>
      ) : filteredTasks.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="h-10 w-10 rounded-xl bg-muted flex items-center justify-center mb-3">
            <Search className="h-5 w-5 text-muted-foreground" />
          </div>
          <p className="text-xs text-muted-foreground max-w-sm">
            No tasks match your search or filters. Try different keywords, status, or channel.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {paginatedTasks.map((task) =>
            task._taskType === "AUTOMATED" ? (
              <AutomatedTaskCard
                key={`auto-${task.id}`}
                task={task}
                actionLoadingId={actionLoadingId}
                onEdit={openEditAutoTask}
                onPauseResume={handleAutoTaskPauseResume}
                onArchive={requestArchiveAutoTask}
                onReactivate={handleReactivateAutoTask}
                onDeletePermanently={requestDeleteAutoTaskPermanently}
                onRun={handleRunAutoTask}
              />
            ) : (
              <TaskCard
                key={`human-${task.id}`}
                task={task}
                actionLoadingId={actionLoadingId}
                onEdit={openEdit}
                onPauseResume={handlePauseResume}
                onArchive={requestArchiveHumanTask}
                onReactivate={handleReactivateHumanTask}
                onDeletePermanently={requestDeleteHumanTaskPermanently}
                onManageWorkers={setWorkersTask}
              />
            )
          )}
          <AppPagination
            page={taskListPage}
            totalPages={taskTotalPages}
            onPageChange={setTaskListPage}
            className="pt-2"
          />
        </div>
      )}

      {workersTask?.taskChannel && (
        <WorkersDialog
          taskId={workersTask.id}
          platform={workersTask.taskChannel.platform}
          open={!!workersTask}
          onOpenChange={(open) => {
            if (!open) setWorkersTask(null);
          }}
        />
      )}

      <ConfirmDialog
        open={taskPendingAction !== null}
        onOpenChange={(open) => {
          if (!open) setTaskPendingAction(null);
        }}
        title={
          taskPendingAction?.kind === "delete-auto" || taskPendingAction?.kind === "delete-human"
            ? "Delete permanently?"
            : "Archive task?"
        }
        description={
          taskPendingAction
            ? taskPendingAction.kind === "delete-auto" || taskPendingAction.kind === "delete-human"
              ? `Permanently delete "${taskPendingAction.name}"? This cannot be undone.`
              : `Archive "${taskPendingAction.name}"? It stays in this list as Archived. Reminders and submissions stop until you reactivate. Connected workers are notified.`
            : ""
        }
        confirmLabel={
          taskPendingAction?.kind === "delete-auto" || taskPendingAction?.kind === "delete-human"
            ? "Delete permanently"
            : "Archive"
        }
        cancelLabel="Cancel"
        variant={
          taskPendingAction?.kind === "delete-auto" || taskPendingAction?.kind === "delete-human"
            ? "destructive"
            : "default"
        }
        onConfirm={confirmTaskPendingAction}
      />

      <TaskFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        editingTask={editingTask}
        editingAutoTask={editingAutoTask}
        form={form}
        setForm={setForm}
        onSubmit={handleSubmit}
        onSaveDraft={handleSaveDraft}
        draftPending={draftPending}
        createPending={(createTask.isPending || createAutoTask.isPending) && !draftPending}
        updatePending={(updateTask.isPending || updateAutoTask.isPending) && !draftPending}
        channels={channels}
        channelUsageById={channelUsageById}
        connectedAccounts={connectedAccounts}
        composioAppCatalog={composioAppCatalog}
      />
    </div>
  );
}
