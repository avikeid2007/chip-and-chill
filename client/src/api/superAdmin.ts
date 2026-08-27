import { apiFetch } from "./client";

export interface PlatformStats {
  totalTenants: number;
  activeTenants: number;
  totalGolfers: number;
  totalCourseAdmins: number;
  totalStaff: number;
  totalBookings: number;
  totalRounds: number;
}

export interface AdminTenant {
  id: string;
  name: string;
  type: "Course" | "Range";
  address?: string;
  isActive: boolean;
  createdAt: string;
  staffCount: number;
  bookingCount: number;
}

export const superAdminApi = {
  stats: (token: string) => apiFetch<PlatformStats>("/api/admin/stats", {}, token),

  tenants: (token: string, search?: string) =>
    apiFetch<AdminTenant[]>(`/api/admin/tenants${search ? `?search=${encodeURIComponent(search)}` : ""}`, {}, token),

  setTenantStatus: (tenantId: string, isActive: boolean, token: string) =>
    apiFetch<void>(
      `/api/admin/tenants/${tenantId}/status`,
      { method: "PATCH", body: JSON.stringify({ isActive }) },
      token
    ),
};
