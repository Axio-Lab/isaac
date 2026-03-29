"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { authenticatedFetch } from "@/lib/api-client";
import { toast } from "sonner";

export interface AutomatedTask {
  id: string;
  userId: string;
  name: string;
  description?: string | null;
  prompt: string;
  composioApps: string[];
  scheduledTimes: string[];
  timezone: string;
  deliveryConfig?: Record<string, unknown> | null;
  status: string;
  createdAt: string;
  updatedAt: string;
  runs?: AutomatedTaskRun[];
  _taskType: "AUTOMATED";
}

export interface AutomatedTaskRun {
  id: string;
  automatedTaskId: string;
  triggeredBy: string;
  status: string;
  result?: string | null;
  error?: string | null;
  startedAt: string;
  completedAt?: string | null;
}

export function useAutomatedTasks() {
  return useQuery({
    queryKey: ["automated-tasks"],
    queryFn: async () => {
      const res = await authenticatedFetch("/api/automated-tasks");
      if (!res.ok) throw new Error("Failed to fetch automated tasks");
      return res.json() as Promise<{ tasks: AutomatedTask[]; total: number }>;
    },
  });
}

export function useCreateAutomatedTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: Partial<AutomatedTask>) => {
      const res = await authenticatedFetch("/api/automated-tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to create automated task");
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["automated-tasks"] });
      toast.success("Automated task created");
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useUpdateAutomatedTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ taskId, data }: { taskId: string; data: Partial<AutomatedTask> }) => {
      const res = await authenticatedFetch(`/api/automated-tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to update automated task");
      return res.json();
    },
    onSuccess: (_, { data }) => {
      qc.invalidateQueries({ queryKey: ["automated-tasks"] });
      if (data.status === "ARCHIVED") {
        toast.success("Automated task archived");
      } else {
        toast.success("Automated task updated");
      }
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useActivateAutomatedTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ taskId }: { taskId: string }) => {
      const res = await authenticatedFetch(`/api/automated-tasks/${taskId}/activate`, {
        method: "POST",
      });
      if (!res.ok) throw new Error("Failed to reactivate automated task");
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["automated-tasks"] });
      toast.success("Automated task reactivated");
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useDeleteAutomatedTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ taskId }: { taskId: string }) => {
      const res = await authenticatedFetch(`/api/automated-tasks/${taskId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete automated task");
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["automated-tasks"] });
      toast.success("Automated task deleted");
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useRunAutomatedTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ taskId }: { taskId: string }) => {
      const res = await authenticatedFetch(`/api/automated-tasks/${taskId}/run`, {
        method: "POST",
      });
      if (!res.ok) throw new Error("Failed to run automated task");
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["automated-tasks"] });
      toast.success("Task run triggered");
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function usePauseAutomatedTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ taskId }: { taskId: string }) => {
      const res = await authenticatedFetch(`/api/automated-tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "PAUSED" }),
      });
      if (!res.ok) throw new Error("Failed to pause task");
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["automated-tasks"] });
      toast.success("Automated task paused");
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useResumeAutomatedTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ taskId }: { taskId: string }) => {
      const res = await authenticatedFetch(`/api/automated-tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "ACTIVE" }),
      });
      if (!res.ok) throw new Error("Failed to resume task");
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["automated-tasks"] });
      toast.success("Automated task resumed");
    },
    onError: (err: Error) => toast.error(err.message),
  });
}
