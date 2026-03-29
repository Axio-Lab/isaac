"use client";

import {
  useQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { authenticatedFetch } from "@/lib/api-client";
import { toast } from "sonner";

/**
 * Mirrors the Prisma `TaskChannel` model.
 * Sensitive token fields may be present on API responses for edit flows.
 */
export interface TaskChannel {
  id: string;
  userId: string;
  label: string;
  platform: string;
  status: string;

  telegramBotToken?: string | null;
  telegramBotUsername?: string | null;

  slackBotToken?: string | null;
  slackSigningSecret?: string | null;
  slackTeamId?: string | null;
  slackChannelId?: string | null;

  discordBotToken?: string | null;
  discordGuildId?: string | null;
  discordChannelId?: string | null;

  webhookUrl?: string | null;
  sharedSecret?: string | null;

  whatsappNumber?: string | null;

  createdAt: string;
  updatedAt: string;
}

/**
 * Payload accepted by `POST /api/task-channels`.
 * Matches the controller's `@Body()` type exactly.
 */
export interface CreateChannelPayload {
  label: string;
  platform: string;
  telegramBotToken?: string;
  slackBotToken?: string;
  discordBotToken?: string;
}

export type ChannelTestResult = {
  success: boolean;
  message: string;
};

async function fetchJson<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await authenticatedFetch(path, options);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || body.message || res.statusText);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

function normalizeChannelsPayload(data: unknown): { channels: TaskChannel[] } {
  if (Array.isArray(data)) {
    return { channels: data as TaskChannel[] };
  }
  if (
    data &&
    typeof data === "object" &&
    "channels" in data &&
    Array.isArray((data as { channels: unknown }).channels)
  ) {
    return data as { channels: TaskChannel[] };
  }
  return { channels: [] };
}

export function useTaskChannels() {
  return useQuery<{ channels: TaskChannel[] }>({
    queryKey: ["task-channels"],
    queryFn: async () => {
      const raw = await fetchJson<unknown>("/api/task-channels");
      return normalizeChannelsPayload(raw);
    },
  });
}

export function useActiveChannels() {
  return useQuery<{ channels: TaskChannel[] }>({
    queryKey: ["task-channels", "active"],
    queryFn: async () => {
      const raw = await fetchJson<unknown>("/api/task-channels/active");
      return normalizeChannelsPayload(raw);
    },
  });
}

export function useCreateChannel() {
  const queryClient = useQueryClient();
  return useMutation<TaskChannel, Error, CreateChannelPayload>({
    mutationFn: (data) =>
      fetchJson("/api/task-channels", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["task-channels"] });
      toast.success("Channel created");
    },
    onError: (e) => toast.error(e.message || "Could not create channel"),
  });
}

export function useUpdateChannel() {
  const queryClient = useQueryClient();
  return useMutation<
    TaskChannel,
    Error,
    { id: string; data: Record<string, unknown> }
  >({
    mutationFn: ({ id, data }) =>
      fetchJson(`/api/task-channels/${id}`, {
        method: "PUT",
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["task-channels"] });
      toast.success("Channel updated");
    },
    onError: (e) => toast.error(e.message || "Could not update channel"),
  });
}

export function useDeleteChannel() {
  const queryClient = useQueryClient();
  return useMutation<void, Error, { id: string }>({
    mutationFn: ({ id }) =>
      fetchJson(`/api/task-channels/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["task-channels"] });
      toast.success("Channel deleted");
    },
    onError: (e) => toast.error(e.message || "Could not delete channel"),
  });
}

export function useDisconnectChannel() {
  const queryClient = useQueryClient();
  return useMutation<void, Error, { id: string }>({
    mutationFn: ({ id }) =>
      fetchJson(`/api/task-channels/${id}/disconnect`, { method: "POST" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["task-channels"] });
      toast.success("Channel disconnected");
    },
    onError: (e) => toast.error(e.message || "Could not disconnect channel"),
  });
}

export function useTestChannel() {
  return useMutation<ChannelTestResult, Error, { id: string }>({
    mutationFn: ({ id }) =>
      fetchJson(`/api/task-channels/${id}/test`, { method: "POST" }),
    onSuccess: (data) => {
      toast.success(data?.message || "Test successful");
    },
    onError: (e) => toast.error(e.message || "Test failed"),
  });
}

export function useRefreshChannel() {
  const queryClient = useQueryClient();
  return useMutation<TaskChannel, Error, { id: string }>({
    mutationFn: ({ id }) =>
      fetchJson(`/api/task-channels/${id}/refresh`, { method: "POST" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["task-channels"] });
      toast.success("Channel refreshed");
    },
    onError: (e) => toast.error(e.message || "Could not refresh channel"),
  });
}
