export type AppRole = "SuperAdmin" | "CourseAdmin" | "Staff" | "Golfer";

export interface AuthResponse {
  token: string;
  email: string;
  firstName: string;
  lastName: string;
  role: AppRole;
  tenantId: string | null;
}

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

async function handle<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `Request failed with status ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export const authApi = {
  login: (email: string, password: string) =>
    fetch(`${API_BASE}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    }).then((res) => handle<AuthResponse>(res)),

  register: (data: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    role: AppRole;
    tenantId?: string | null;
  }) =>
    fetch(`${API_BASE}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }).then((res) => handle<AuthResponse>(res)),
};
