"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { authenticatedFetch } from "@/lib/api-client";
import { toast } from "sonner";

export interface UserSkill {
  id: string;
  name: string;
  description?: string | null;
  url?: string | null;
  content?: string | null;
  createdAt: string;
  updatedAt: string;
}

async function fetchJson<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await authenticatedFetch(path, options);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || body.message || res.statusText);
  }
  return res.json();
}

export function useSkills(page?: number, limit?: number) {
  const params = new URLSearchParams();
  if (page != null) params.set("page", String(page));
  if (limit != null) params.set("limit", String(limit));
  const qs = params.toString();

  return useQuery<{ skills: UserSkill[] }>({
    queryKey: ["skills", { page, limit }],
    queryFn: () => fetchJson(`/api/skills${qs ? `?${qs}` : ""}`),
  });
}

export function useSkill(id: string) {
  return useQuery<{ skill: UserSkill }>({
    queryKey: ["skills", id],
    queryFn: () => fetchJson(`/api/skills/${id}`),
    enabled: !!id,
  });
}

export function useCreateSkill() {
  const queryClient = useQueryClient();
  return useMutation<
    { skill: UserSkill },
    Error,
    { name: string; description?: string; url?: string; content?: string }
  >({
    mutationFn: (data) =>
      fetchJson("/api/skills", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["skills"] });
      toast.success("Skill created");
    },
    onError: (e) => toast.error(e.message || "Could not create skill"),
  });
}

export function useUpdateSkill() {
  const queryClient = useQueryClient();
  return useMutation<
    { skill: UserSkill },
    Error,
    {
      id: string;
      data: { name?: string; description?: string; url?: string; content?: string };
    }
  >({
    mutationFn: ({ id, data }) =>
      fetchJson(`/api/skills/${id}`, {
        method: "PUT",
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["skills"] });
      toast.success("Skill updated");
    },
    onError: (e) => toast.error(e.message || "Could not update skill"),
  });
}

export function useDeleteSkill() {
  const queryClient = useQueryClient();
  return useMutation<void, Error, { id: string }>({
    mutationFn: ({ id }) => fetchJson(`/api/skills/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["skills"] });
      toast.success("Skill deleted");
    },
    onError: (e) => toast.error(e.message || "Could not delete skill"),
  });
}
