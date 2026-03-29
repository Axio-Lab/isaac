"use client";

import { useSession } from "@/lib/auth-client";

export function useAuth() {
  const session = useSession();

  const isAuthenticated =
    !!session.data?.user && !!session.data.user.emailVerified;

  return {
    user: session.data?.user ?? null,
    session: session.data?.session ?? null,
    isAuthenticated,
    isLoading: session.isPending,
    error: session.error,
  };
}
