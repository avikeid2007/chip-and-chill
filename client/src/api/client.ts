// Shared authenticated fetch helper. Attaches the JWT and (if present) the
// current tenant header so requests are scoped correctly against the API.
export const API_BASE =
  import.meta.env.VITE_API_BASE_URL !== undefined
    ? import.meta.env.VITE_API_BASE_URL
    : import.meta.env.DEV
    ? "http://localhost:5000"
    : "";

export function authHeaders(token?: string | null, tenantId?: string | null): HeadersInit {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  if (tenantId) headers["X-Tenant-Id"] = tenantId;
  return headers;
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
  token?: string | null,
  tenantId?: string | null
): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    credentials: "include",
    headers: { ...authHeaders(token, tenantId), ...(options.headers || {}) },
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `Request failed with status ${res.status}`);
  }
  if (res.status === 204) return undefined as T;

  const text = await res.text();
  if (!text || text.trim() === "") return undefined as T;

  try {
    return JSON.parse(text) as T;
  } catch {
    return text as unknown as T;
  }
}
