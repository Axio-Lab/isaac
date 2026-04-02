import { getSession } from "./auth-client";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

export async function getAuthHeaders(options?: {
  includeJsonContentType?: boolean;
}): Promise<Record<string, string>> {
  try {
    const session = await getSession();
    if (session?.data?.user?.email) {
      return {
        ...(options?.includeJsonContentType === false
          ? {}
          : { "Content-Type": "application/json" }),
        "X-User-Email": session.data.user.email,
      };
    }
  } catch {
    // Session not available
  }
  return options?.includeJsonContentType === false ? {} : { "Content-Type": "application/json" };
}

export async function authenticatedFetch(
  path: string,
  options: RequestInit = {}
): Promise<Response> {
  const isFormData = typeof FormData !== "undefined" && options.body instanceof FormData;
  const headers = await getAuthHeaders({ includeJsonContentType: !isFormData });
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
