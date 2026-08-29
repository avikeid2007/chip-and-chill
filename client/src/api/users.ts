import { apiFetch } from "./client";
import type { AppRole } from "./auth";

export interface GolferCareerStats {
  totalRounds: number;
  bestRoundScore?: number | null;
  tournamentsPlayed: number;
  rangeSessionsBooked: number;
  teeTimesBooked: number;
}

export interface UserProfile {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phoneNumber?: string | null;
  role: AppRole;
  tenantId?: string | null;
  handicapIndex?: number | null;
  createdAt: string;
  avatarUrl?: string | null;
  bio?: string | null;
  city?: string | null;
  country?: string | null;
  homeClubName?: string | null;
  handedness?: string | null;
  preferredTee?: string | null;
  averageScore?: string | null;
  playFrequency?: string | null;
  driver?: string | null;
  irons?: string | null;
  putter?: string | null;
  golfBall?: string | null;
  emergencyContactName?: string | null;
  emergencyContactPhone?: string | null;
  smsAlertsEnabled: boolean;
  marketingEnabled: boolean;
  careerStats?: GolferCareerStats | null;
}

export interface UpdateProfilePayload {
  firstName: string;
  lastName: string;
  phoneNumber?: string | null;
  avatarUrl?: string | null;
  bio?: string | null;
  city?: string | null;
  country?: string | null;
  homeClubName?: string | null;
  handedness?: string | null;
  preferredTee?: string | null;
  averageScore?: string | null;
  playFrequency?: string | null;
  driver?: string | null;
  irons?: string | null;
  putter?: string | null;
  golfBall?: string | null;
  emergencyContactName?: string | null;
  emergencyContactPhone?: string | null;
  smsAlertsEnabled?: boolean;
  marketingEnabled?: boolean;
}

export const usersApi = {
  me: (token: string) => apiFetch<UserProfile>("/api/users/me", {}, token),

  updateMe: (data: UpdateProfilePayload, token: string) =>
    apiFetch<UserProfile>("/api/users/me", {
      method: "PUT",
      body: JSON.stringify(data),
    }, token),

  uploadAvatar: async (file: File, token: string) => {
    const formData = new FormData();
    formData.append("file", file);
    const res = await fetch("/api/users/me/avatar", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    });
    if (!res.ok) {
      const txt = await res.text();
      throw new Error(txt || "Failed to upload avatar");
    }
    return res.json() as Promise<{ url: string }>;
  },

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
