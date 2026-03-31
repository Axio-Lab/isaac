"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { authenticatedFetch } from "@/lib/api-client";
import { toast } from "sonner";

export interface HumanTask {
  id: string;
  userId: string;
  name: string;
  description?: string | null;
  evidenceType: string;
  recurrenceType: string;
  recurrenceInterval?: number | null;
  scheduledTimes: string[];
  timezone: string;
  acceptanceRules: string[];
  requiredItems?: Array<{ label: string; evidenceType: string; referenceUrl?: string }>;
  sampleEvidenceUrl?: string | null;
  scoringEnabled: boolean;
  passingScore: number;
  graceMinutes: number;
  resubmissionAllowed: boolean;
  reportTime: string;
  reportChannelId?: string | null;
  taskChannelId?: string | null;
  taskChannel?: {
    id: string;
    platform: string;
    label?: string | null;
  } | null;
  deliveryConfig?: Record<string, unknown> | null;
  reportFolderId?: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
  workers?: HumanWorker[];
  submissions?: TaskSubmission[];
  _count?: { workers: number; submissions: number; reports: number };
  flaggedWorkerCount?: number;
}

export interface HumanWorker {
  id: string;
  humanTaskId: string;
  name: string;
  phone?: string | null;
  platform: string;
  externalId: string;
  taskChannelId?: string | null;
  role?: string | null;
  status: string;
  activeFlagCount?: number;
  totalFlagCount?: number;
  lastFlaggedAt?: string | null;
  lastFlagReason?: string | null;
  riskLevel?: string;
  onboardedAt?: string | null;
  createdAt: string;
  flagEvents?: WorkerFlagEvent[];
  submissions?: Array<{
    status: string;
    dueAt: string;
    aiScore?: number | null;
  }>;
}

export interface WorkerFlagEvent {
  id: string;
  userId?: string;
  humanTaskId: string;
  workerId: string;
  submissionId?: string | null;
  reportId?: string | null;
  reasonType: string;
  reasonLabel: string;
  details?: string | null;
  severity: string;
  status: string;
  metadata?: Record<string, unknown> | null;
  triggeredAt: string;
  resolvedAt?: string | null;
  resolvedBy?: string | null;
  resolutionReason?: string | null;
  resolutionNote?: string | null;
  worker?: {
    id: string;
    name: string;
    riskLevel?: string;
    activeFlagCount?: number;
    totalFlagCount?: number;
  };
  submission?: {
    id: string;
    dueAt: string;
    status: string;
    aiScore?: number | null;
  };
}

export interface SubmissionItem {
  id: string;
  submissionId: string;
  label: string;
  sortOrder: number;
  imageUrl?: string | null;
  rawMessage?: string | null;
  receivedAt?: string | null;
  createdAt: string;
}

export interface TaskSubmission {
  id: string;
  humanTaskId: string;
  workerId: string;
  worker?: { id: string; name: string; platform: string };
  dueAt: string;
  submittedAt?: string | null;
  latenessSeconds?: number | null;
  imageUrl?: string | null;
  rawMessage?: string | null;
  aiScore?: number | null;
  aiFindings?: string | null;
  aiFeedback?: string | null;
  status: string;
  vetAttempts: number;
  reportIncluded: boolean;
  items?: SubmissionItem[];
  createdAt: string;
}

export interface TaskComplianceReport {
  id: string;
  humanTaskId: string;
  periodStart: string;
  periodEnd: string;
  summaryMarkdown: string;
  totalSubmissions: number;
  missedCount: number;
  avgScore?: number | null;
  passRate?: number | null;
  flaggedWorkerIds: string[];
  flaggedWorkersSnapshot?: Array<{
    id: string;
    workerId: string;
    workerName: string;
    reasonType: string;
    reasonLabel: string;
    details?: string | null;
    severity: string;
    status: string;
    triggeredAt: string;
    activeFlagCount: number;
    totalFlagCount: number;
    riskLevel: string;
    metadata?: Record<string, unknown> | null;
  }> | null;
  documentUrl?: string | null;
  deliveredAt?: string | null;
  deliveredTo?: Record<string, unknown> | null;
  createdAt: string;
}

async function fetchJson<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await authenticatedFetch(path, options);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || body.message || res.statusText);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

export function useHumanTasks(page?: number, limit?: number) {
  const params = new URLSearchParams();
  if (page != null) params.set("page", String(page));
  if (limit != null) params.set("limit", String(limit));
  const qs = params.toString();

  return useQuery<{ tasks: HumanTask[] }>({
    queryKey: ["human-tasks", { page, limit }],
    queryFn: () => fetchJson(`/api/human-tasks${qs ? `?${qs}` : ""}`),
  });
}

export function useHumanTask(taskId: string) {
  return useQuery<{ task: HumanTask }>({
    queryKey: ["human-tasks", taskId],
    queryFn: () => fetchJson(`/api/human-tasks/${taskId}`),
    enabled: !!taskId,
  });
}

export function useCreateHumanTask() {
  const queryClient = useQueryClient();
  return useMutation<{ task: HumanTask }, Error, Partial<HumanTask>>({
    mutationFn: (data) =>
      fetchJson("/api/human-tasks", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["human-tasks"] });
      toast.success("Task created");
    },
    onError: (e) => toast.error(e.message || "Could not create task"),
  });
}

export function useUpdateHumanTask() {
  const queryClient = useQueryClient();
  return useMutation<void, Error, { taskId: string; data: Partial<HumanTask> }>({
    mutationFn: ({ taskId, data }) =>
      fetchJson(`/api/human-tasks/${taskId}`, {
        method: "PUT",
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["human-tasks"] });
      toast.success("Task updated");
    },
    onError: (e) => toast.error(e.message || "Could not update task"),
  });
}

export function useArchiveHumanTask() {
  const queryClient = useQueryClient();
  return useMutation<void, Error, { taskId: string }>({
    mutationFn: ({ taskId }) => fetchJson(`/api/human-tasks/${taskId}/archive`, { method: "POST" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["human-tasks"] });
      toast.success("Task archived — workers notified");
    },
    onError: (e) => toast.error(e.message || "Could not archive task"),
  });
}

export function useActivateHumanTask() {
  const queryClient = useQueryClient();
  return useMutation<void, Error, { taskId: string }>({
    mutationFn: ({ taskId }) =>
      fetchJson(`/api/human-tasks/${taskId}/activate`, { method: "POST" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["human-tasks"] });
      toast.success("Task reactivated — workers notified");
    },
    onError: (e) => toast.error(e.message || "Could not reactivate task"),
  });
}

export function useDeleteHumanTask() {
  const queryClient = useQueryClient();
  return useMutation<void, Error, { taskId: string }>({
    mutationFn: ({ taskId }) => fetchJson(`/api/human-tasks/${taskId}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["human-tasks"] });
      toast.success("Task deleted");
    },
    onError: (e) => toast.error(e.message || "Could not delete task"),
  });
}

export function usePauseHumanTask() {
  const queryClient = useQueryClient();
  return useMutation<void, Error, { taskId: string; name?: string }>({
    mutationFn: ({ taskId }) => fetchJson(`/api/human-tasks/${taskId}/pause`, { method: "POST" }),
    onSuccess: (_, { name }) => {
      queryClient.invalidateQueries({ queryKey: ["human-tasks"] });
      toast.success(name ? `${name} has been paused` : "Task paused");
    },
    onError: (e) => toast.error(e.message || "Could not pause task"),
  });
}

export function useResumeHumanTask() {
  const queryClient = useQueryClient();
  return useMutation<void, Error, { taskId: string; name?: string }>({
    mutationFn: ({ taskId }) => fetchJson(`/api/human-tasks/${taskId}/resume`, { method: "POST" }),
    onSuccess: (_, { name }) => {
      queryClient.invalidateQueries({ queryKey: ["human-tasks"] });
      toast.success(name ? `${name} has been resumed` : "Task resumed");
    },
    onError: (e) => toast.error(e.message || "Could not resume task"),
  });
}

export function useTaskWorkers(taskId: string) {
  return useQuery<{ workers: HumanWorker[] }>({
    queryKey: ["human-tasks", taskId, "workers"],
    queryFn: () => fetchJson(`/api/human-tasks/${taskId}/workers`),
    enabled: !!taskId,
    refetchOnWindowFocus: true,
  });
}

export function useAddWorker() {
  const queryClient = useQueryClient();
  return useMutation<
    { worker: HumanWorker },
    Error,
    {
      taskId: string;
      data: {
        name: string;
        platform: string;
        externalId: string;
        phone?: string;
        role?: string;
      };
    }
  >({
    mutationFn: ({ taskId, data }) =>
      fetchJson(`/api/human-tasks/${taskId}/workers`, {
        method: "POST",
        body: JSON.stringify(data),
      }),
    onSuccess: (result, { taskId }) => {
      queryClient.invalidateQueries({
        queryKey: ["human-tasks", taskId, "workers"],
      });
      queryClient.invalidateQueries({ queryKey: ["human-tasks"] });
      toast.success(`${result.worker.name} added to task`);
    },
    onError: (e) => toast.error(e.message || "Could not add worker"),
  });
}

export function useUpdateWorker() {
  const queryClient = useQueryClient();
  return useMutation<
    { worker: HumanWorker },
    Error,
    { taskId: string; workerId: string; data: { status?: string; role?: string }; name?: string }
  >({
    mutationFn: ({ taskId, workerId, data }) =>
      fetchJson(`/api/human-tasks/${taskId}/workers/${workerId}`, {
        method: "PUT",
        body: JSON.stringify(data),
      }),
    onSuccess: (_, { taskId, name, data }) => {
      queryClient.invalidateQueries({
        queryKey: ["human-tasks", taskId, "workers"],
      });
      queryClient.invalidateQueries({ queryKey: ["human-tasks"] });
      const action = data.status === "INACTIVE" ? "paused" : "activated";
      toast.success(name ? `${name} ${action}` : `Worker ${action}`);
    },
    onError: (e) => toast.error(e.message || "Could not update worker"),
  });
}

export function useRemoveWorker() {
  const queryClient = useQueryClient();
  return useMutation<void, Error, { taskId: string; workerId: string; name?: string }>({
    mutationFn: ({ taskId, workerId }) =>
      fetchJson(`/api/human-tasks/${taskId}/workers/${workerId}`, {
        method: "DELETE",
      }),
    onSuccess: (_, { taskId, name }) => {
      queryClient.invalidateQueries({
        queryKey: ["human-tasks", taskId, "workers"],
      });
      queryClient.invalidateQueries({ queryKey: ["human-tasks"] });
      toast.success(name ? `${name} removed from task` : "Worker removed");
    },
    onError: (e) => toast.error(e.message || "Could not remove worker"),
  });
}

export function useTaskSubmissions(
  taskId: string,
  filters?: {
    workerId?: string;
    status?: string;
    date?: string;
    dateFrom?: string;
    dateTo?: string;
  }
) {
  const params = new URLSearchParams();
  if (filters?.workerId) params.set("workerId", filters.workerId);
  if (filters?.status) params.set("status", filters.status);
  if (filters?.date) params.set("date", filters.date);
  if (filters?.dateFrom) params.set("dateFrom", filters.dateFrom);
  if (filters?.dateTo) params.set("dateTo", filters.dateTo);
  const qs = params.toString();

  return useQuery<{ submissions: TaskSubmission[] }>({
    queryKey: ["human-tasks", taskId, "submissions", filters],
    queryFn: () => fetchJson(`/api/human-tasks/${taskId}/submissions${qs ? `?${qs}` : ""}`),
    enabled: !!taskId,
    refetchInterval: 30_000,
  });
}

export function useTaskReports(taskId: string) {
  return useQuery<{ reports: TaskComplianceReport[] }>({
    queryKey: ["human-tasks", taskId, "reports"],
    queryFn: () => fetchJson(`/api/human-tasks/${taskId}/reports`),
    enabled: !!taskId,
  });
}

export function useAllFlaggedWorkers(filters?: { status?: string }) {
  const params = new URLSearchParams();
  if (filters?.status) params.set("status", filters.status);
  const qs = params.toString();

  return useQuery<{ workers: WorkerFlagEvent[] }>({
    queryKey: ["human-tasks", "flagged-workers", filters],
    queryFn: () => fetchJson(`/api/human-tasks/flagged-workers${qs ? `?${qs}` : ""}`),
    placeholderData: (previousData) => previousData,
    staleTime: 30_000,
  });
}

export function useTaskFlags(
  taskId: string,
  filters?: {
    workerId?: string;
    status?: string;
  }
) {
  const params = new URLSearchParams();
  if (filters?.workerId) params.set("workerId", filters.workerId);
  if (filters?.status) params.set("status", filters.status);
  const qs = params.toString();

  return useQuery<{ flags: WorkerFlagEvent[] }>({
    queryKey: ["human-tasks", taskId, "flags", filters],
    queryFn: () => fetchJson(`/api/human-tasks/${taskId}/flags${qs ? `?${qs}` : ""}`),
    enabled: !!taskId,
  });
}

export function useFlaggedWorkers(taskId: string) {
  return useQuery<{ workers: HumanWorker[] }>({
    queryKey: ["human-tasks", taskId, "workers", "flagged"],
    queryFn: () => fetchJson(`/api/human-tasks/${taskId}/workers/flagged`),
    enabled: !!taskId,
  });
}

export function useWorkerFlags(taskId: string, workerId: string) {
  return useQuery<{ flags: WorkerFlagEvent[] }>({
    queryKey: ["human-tasks", taskId, "workers", workerId, "flags"],
    queryFn: () => fetchJson(`/api/human-tasks/${taskId}/workers/${workerId}/flags`),
    enabled: !!taskId && !!workerId,
  });
}

export function useResolveWorkerFlag() {
  const queryClient = useQueryClient();
  return useMutation<
    { success: boolean; flag: WorkerFlagEvent },
    Error,
    { taskId: string; flagId: string; reason?: string; note?: string }
  >({
    mutationFn: ({ taskId, flagId, reason, note }) =>
      fetchJson(`/api/human-tasks/${taskId}/flags/${flagId}/resolve`, {
        method: "POST",
        body: JSON.stringify({ reason, note }),
      }),
    onSuccess: (_, { taskId }) => {
      queryClient.invalidateQueries({ queryKey: ["human-tasks", taskId, "workers"] });
      queryClient.invalidateQueries({ queryKey: ["human-tasks", taskId, "workers", "flagged"] });
      queryClient.invalidateQueries({ queryKey: ["human-tasks", taskId, "flags"] });
      queryClient.invalidateQueries({ queryKey: ["human-tasks", taskId, "reports"] });
      toast.success("Flag resolved");
    },
    onError: (e) => toast.error(e.message || "Could not resolve flag"),
  });
}

export function useDismissWorkerFlag() {
  const queryClient = useQueryClient();
  return useMutation<
    { success: boolean; flag: WorkerFlagEvent },
    Error,
    { taskId: string; flagId: string; reason?: string; note?: string }
  >({
    mutationFn: ({ taskId, flagId, reason, note }) =>
      fetchJson(`/api/human-tasks/${taskId}/flags/${flagId}/dismiss`, {
        method: "POST",
        body: JSON.stringify({ reason, note }),
      }),
    onSuccess: (_, { taskId }) => {
      queryClient.invalidateQueries({ queryKey: ["human-tasks", taskId, "workers"] });
      queryClient.invalidateQueries({ queryKey: ["human-tasks", taskId, "workers", "flagged"] });
      queryClient.invalidateQueries({ queryKey: ["human-tasks", taskId, "flags"] });
      queryClient.invalidateQueries({ queryKey: ["human-tasks", taskId, "reports"] });
      toast.success("Flag dismissed");
    },
    onError: (e) => toast.error(e.message || "Could not dismiss flag"),
  });
}

export function useGenerateReport() {
  const queryClient = useQueryClient();
  return useMutation<{ report: TaskComplianceReport }, Error, { taskId: string }>({
    mutationFn: ({ taskId }) =>
      fetchJson(`/api/human-tasks/${taskId}/reports/generate`, {
        method: "POST",
      }),
    onSuccess: (_, { taskId }) => {
      queryClient.invalidateQueries({
        queryKey: ["human-tasks", taskId, "reports"],
      });
      toast.success("Report generated");
    },
    onError: (e) => toast.error(e.message || "Could not generate report"),
  });
}

export function useResendReport() {
  const queryClient = useQueryClient();
  return useMutation<{ success: boolean }, Error, { taskId: string; reportId: string }>({
    mutationFn: ({ taskId, reportId }) =>
      fetchJson(`/api/human-tasks/${taskId}/reports/${reportId}/resend`, {
        method: "POST",
      }),
    onSuccess: (_, { taskId }) => {
      queryClient.invalidateQueries({
        queryKey: ["human-tasks", taskId, "reports"],
      });
      toast.success("Report resent");
    },
    onError: (e) => toast.error(e.message || "Could not resend report"),
  });
}

export function useDeleteReport() {
  const queryClient = useQueryClient();
  return useMutation<void, Error, { taskId: string; reportId: string }>({
    mutationFn: ({ taskId, reportId }) =>
      fetchJson(`/api/human-tasks/${taskId}/reports/${reportId}`, {
        method: "DELETE",
      }),
    onSuccess: (_, { taskId }) => {
      queryClient.invalidateQueries({
        queryKey: ["human-tasks", taskId, "reports"],
      });
      toast.success("Report deleted");
    },
    onError: (e) => toast.error(e.message || "Could not delete report"),
  });
}

export function useAiFillTask() {
  return useMutation<
    { fields: Record<string, unknown> },
    Error,
    {
      prompt: string;
      taskType?: "HUMAN" | "AUTOMATED";
      /** Composio app names already connected; Isaac uses this to prefill apps and suggest missing ones */
      connectedAppNames?: string[];
    }
  >({
    mutationFn: (data) =>
      fetchJson("/api/human-tasks/ai-fill", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    onError: (e) => toast.error(e.message || "Could not prefill the form with Isaac"),
  });
}
