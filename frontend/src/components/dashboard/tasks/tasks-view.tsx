"use client";

import { useState, useEffect, useCallback } from "react";
import {
  useHumanTasks,
  useCreateHumanTask,
  useUpdateHumanTask,
  useDeleteHumanTask,
  usePauseHumanTask,
  useResumeHumanTask,
} from "@/hooks/useHumanTasks";
import type { HumanTask } from "@/hooks/useHumanTasks";
import { useActiveChannels } from "@/hooks/useTaskChannels";
import { useComposioConnectedAccounts } from "@/hooks/useComposioConnections";
import { Plus, Loader2, CalendarDays, FileEdit } from "lucide-react";
import { toast } from "sonner";
import { GlassButton } from "@/components/ui/glass-button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { TaskCard } from "./task-card";
import { TaskFormDialog } from "./task-form-dialog";
import { WorkersDialog } from "./workers-dialog";
import {
  defaultForm,
  emptyDestination,
  getBrowserTimezone,
  DRAFT_STORAGE_KEY,
  type TaskFormData,
  type DeliveryDestination,
} from "./constants";

export function TasksView() {
  const { data, isLoading } = useHumanTasks();
  const createTask = useCreateHumanTask();
  const updateTask = useUpdateHumanTask();
  const deleteTask = useDeleteHumanTask();
  const pauseTask = usePauseHumanTask();
  const resumeTask = useResumeHumanTask();

  const { data: channelsData } = useActiveChannels();
  const channels = channelsData?.channels ?? [];

  const { data: composioData } = useComposioConnectedAccounts();
  const connectedAccounts = composioData?.accounts ?? [];

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<HumanTask | null>(null);
  const [form, setForm] = useState<TaskFormData>(defaultForm);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [draftPending, setDraftPending] = useState(false);
  const [hasSavedDraft, setHasSavedDraft] = useState(false);
  const [workersTask, setWorkersTask] = useState<HumanTask | null>(null);
  const [taskPendingDelete, setTaskPendingDelete] = useState<HumanTask | null>(null);

  const tasks = data?.tasks ?? [];

  useEffect(() => {
    try {
      const saved = localStorage.getItem(DRAFT_STORAGE_KEY);
      if (saved) setHasSavedDraft(true);
    } catch {}
  }, []);

  function openCreate() {
    setEditingTask(null);
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

    setEditingTask(task);
    setForm({
      name: task.name,
      description: task.description || "",
      evidenceType: task.evidenceType,
      recurrenceType: task.recurrenceType,
      recurrenceInterval: task.recurrenceInterval ?? 60,
      scheduledTimes: task.scheduledTimes?.join(", ") || "",
      timezone: task.timezone || getBrowserTimezone(),
      taskChannelId: task.taskChannelId || "",
      acceptanceRules:
        task.acceptanceRules?.length > 0 ? [...task.acceptanceRules] : [""],
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

  const buildPayload = useCallback(
    (status?: string) => {
      const scheduledTimes = form.scheduledTimes
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);

      const acceptanceRules = form.acceptanceRules.filter(
        (r) => r.trim().length > 0,
      );

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
    [form],
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const payload = buildPayload();
    if (editingTask) {
      if (editingTask.status === "DRAFT") {
        payload.status = "ACTIVE";
      }
      await updateTask.mutateAsync({
        taskId: editingTask.id,
        data: payload as Partial<HumanTask>,
      });
    } else {
      await createTask.mutateAsync(payload as Partial<HumanTask>);
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
      const payload = buildPayload("DRAFT");
      if (editingTask) {
        await updateTask.mutateAsync({
          taskId: editingTask.id,
          data: payload as Partial<HumanTask>,
        });
      } else {
        await createTask.mutateAsync(payload as Partial<HumanTask>);
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

  function requestDeleteTask(task: HumanTask) {
    setTaskPendingDelete(task);
  }

  async function confirmDeleteTask() {
    if (!taskPendingDelete) return;
    await deleteTask.mutateAsync({ taskId: taskPendingDelete.id });
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-lg font-semibold text-foreground tracking-tight">
            Tasks
          </h1>
          <p className="text-xs text-muted-foreground">
            Create and manage your tasks
          </p>
        </div>
        <GlassButton
          onClick={openCreate}
          size="sm"
          className="glass-filled"
          contentClassName="flex items-center gap-1.5 text-xs"
        >
          <Plus className="h-3 w-3" />
          Create Task
        </GlassButton>
      </div>

      {hasSavedDraft && (
        <button
          onClick={openFromLocalDraft}
          className="w-full mb-4 flex items-center gap-2.5 px-4 py-3 rounded-xl border border-primary/30 bg-primary/5 hover:bg-primary/10 transition-colors text-left"
        >
          <FileEdit className="h-4 w-4 text-primary shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-foreground">
              You have an unsaved draft
            </p>
            <p className="text-[10px] text-muted-foreground">
              Click to continue where you left off
            </p>
          </div>
        </button>
      )}

      {tasks.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="h-10 w-10 rounded-xl bg-muted flex items-center justify-center mb-3">
            <CalendarDays className="h-5 w-5 text-muted-foreground" />
          </div>
          <p className="text-xs text-muted-foreground">
            No tasks yet. Create your first task to get started.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {tasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              actionLoadingId={actionLoadingId}
              onEdit={openEdit}
              onPauseResume={handlePauseResume}
              onDelete={requestDeleteTask}
              onManageWorkers={setWorkersTask}
            />
          ))}
        </div>
      )}

      {workersTask?.taskChannel && (
        <WorkersDialog
          taskId={workersTask.id}
          platform={workersTask.taskChannel.platform}
          open={!!workersTask}
          onOpenChange={(open) => { if (!open) setWorkersTask(null); }}
        />
      )}

      <ConfirmDialog
        open={taskPendingDelete !== null}
        onOpenChange={(open) => {
          if (!open) setTaskPendingDelete(null);
        }}
        title="Delete task?"
        description={
          taskPendingDelete
            ? `Delete "${taskPendingDelete.name}"? This cannot be undone.`
            : undefined
        }
        confirmLabel="Delete"
        cancelLabel="Cancel"
        variant="destructive"
        onConfirm={confirmDeleteTask}
      />

      <TaskFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        editingTask={editingTask}
        form={form}
        setForm={setForm}
        onSubmit={handleSubmit}
        onSaveDraft={handleSaveDraft}
        draftPending={draftPending}
        createPending={createTask.isPending && !draftPending}
        updatePending={updateTask.isPending && !draftPending}
        channels={channels}
        connectedAccounts={connectedAccounts}
      />
    </div>
  );
}
