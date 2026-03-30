import { getSession } from "./auth-client";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

export async function getAuthHeaders(): Promise<Record<string, string>> {
  try {
    const session = await getSession();
    if (session?.data?.user?.email) {
      return {
        "Content-Type": "application/json",
        "X-User-Email": session.data.user.email,
      };
    }
  } catch {
    // Session not available
  }
  return { "Content-Type": "application/json" };
}

export async function authenticatedFetch(
  path: string,
  options: RequestInit = {}
): Promise<Response> {
  const headers = await getAuthHeaders();
  return fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      ...headers,
      ...options.headers,
    },
    credentials: "include",
  });
}

export { API_URL };
