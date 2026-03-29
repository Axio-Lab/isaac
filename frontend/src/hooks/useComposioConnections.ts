"use client";

import {
  useQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { authenticatedFetch } from "@/lib/api-client";
import { toast } from "sonner";

export interface ComposioConnectedAccount {
  id: string;
  appName: string;
  status: string;
  createdAt?: string;
  [key: string]: unknown;
}

export interface ComposioApp {
  slug: string;
  name: string;
  description?: string;
  logo?: string;
  categories?: string[];
  [key: string]: unknown;
}

export interface ComposioAppDetails extends ComposioApp {
  actions?: Array<{ name: string; description?: string }>;
  triggers?: Array<{ name: string; description?: string }>;
  [key: string]: unknown;
}

async function fetchJson<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await authenticatedFetch(path, options);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || body.message || res.statusText);
  }
  return res.json();
}

export function useComposioConnectedAccounts() {
  return useQuery<{ accounts: ComposioConnectedAccount[] }>({
    queryKey: ["composio", "accounts"],
    queryFn: () => fetchJson("/api/composio/connections/accounts"),
  });
}

export function useComposioApps() {
  return useQuery<{ apps: ComposioApp[] }>({
    queryKey: ["composio", "apps"],
    queryFn: () => fetchJson("/api/composio/connections/apps"),
  });
}

export function useComposioAppDetails(slug: string) {
  return useQuery<{ app: ComposioAppDetails }>({
    queryKey: ["composio", "apps", slug],
    queryFn: () => fetchJson(`/api/composio/connections/apps/${slug}`),
    enabled: !!slug,
  });
}

export function useInitiateComposioConnection() {
  return useMutation<
    { redirectUrl: string },
    Error,
    { appSlug: string; [key: string]: unknown }
  >({
    mutationFn: (data) =>
      fetchJson("/api/composio/connections/initiate", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    onSuccess: (data) => {
      if (data.redirectUrl) {
        window.location.href = data.redirectUrl;
      }
    },
    onError: (e) => toast.error(e.message || "Could not initiate connection"),
  });
}

export function useDeleteComposioConnection() {
  const queryClient = useQueryClient();
  return useMutation<void, Error, { accountId: string }>({
    mutationFn: ({ accountId }) =>
      fetchJson(`/api/composio/connections/${accountId}`, {
        method: "DELETE",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["composio", "accounts"] });
      toast.success("Connection removed");
    },
    onError: (e) => toast.error(e.message || "Could not remove connection"),
  });
}
