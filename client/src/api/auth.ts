export type AppRole = "SuperAdmin" | "CourseAdmin" | "Staff" | "Golfer";

export interface AuthResponse {
  token: string;
  email: string;
  firstName: string;
  lastName: string;
  role: AppRole;
  tenantId: string | null;
}

import { API_BASE } from "./client";

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
      credentials: "include",
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
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }).then((res) => handle<AuthResponse>(res)),

  refresh: () =>
    fetch(`${API_BASE}/api/auth/refresh`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
    }).then((res) => handle<AuthResponse>(res)),

  logout: () =>
    fetch(`${API_BASE}/api/auth/logout`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
    }).then(async (res) => {
      if (!res.ok) return { message: "Logged out" };
      return res.json().catch(() => ({ message: "Logged out" }));
    }),

  me: (token: string) =>
    fetch(`${API_BASE}/api/auth/me`, {
      method: "GET",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    }).then((res) => handle<any>(res)),

  forgotPassword: (email: string) =>
    fetch(`${API_BASE}/api/auth/forgot-password`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, clientUrl: window.location.origin }),
    }).then((res) => handle<{ message: string }>(res)),

  resetPassword: (payload: { email: string; token: string; newPassword: string }) =>
    fetch(`${API_BASE}/api/auth/reset-password`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }).then((res) => handle<{ message: string }>(res)),
};
