import { apiFetch } from "./client";
import type { AppRole } from "./auth";

export interface UserProfile {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phoneNumber?: string | null;
  role: AppRole;
  tenantId?: string | null;
  handicapIndex?: number | null;
}

export const usersApi = {
  me: (token: string) => apiFetch<UserProfile>("/api/users/me", {}, token),

  updateMe: (
    data: { firstName: string; lastName: string; phoneNumber?: string },
    token: string
  ) =>
    apiFetch<void>("/api/users/me", {
      method: "PUT",
      body: JSON.stringify(data),
    }, token),

  changePassword: (
    data: { currentPassword: string; newPassword: string },
    token: string
  ) =>
    apiFetch<void>("/api/users/me/password", {
      method: "PUT",
      body: JSON.stringify(data),
    }, token),
};

export const authApiExtended = {
  forgotPassword: (email: string) =>
    apiFetch<{ message: string; token?: string }>("/api/auth/forgot-password", {
      method: "POST",
      body: JSON.stringify({ email }),
    }),

  resetPassword: (email: string, token: string, newPassword: string) =>
    apiFetch<{ message: string }>("/api/auth/reset-password", {
      method: "POST",
      body: JSON.stringify({ email, token, newPassword }),
    }),
};
