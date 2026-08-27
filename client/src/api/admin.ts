import { apiFetch } from "./client";

export interface StaffMember {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  isActive: boolean;
}

export interface AdminBooking {
  id: string;
  teeSlotId: string;
  startTime: string;
  userEmail: string;
  userName: string;
  partySize: number;
  status: "Confirmed" | "CheckedIn" | "Cancelled";
  price: number;
}

export interface DashboardSummary {
  bookingsToday: number;
  bookingsThisWeek: number;
  upcomingBookings: number;
  totalRounds: number;
  occupancyPercent: number;
  activeSlotsToday: number;
}

export const staffApi = {
  list: (tenantId: string, token: string) =>
    apiFetch<StaffMember[]>(`/api/tenants/${tenantId}/staff`, {}, token, tenantId),

  invite: (
    tenantId: string,
    data: { email: string; password: string; firstName: string; lastName: string },
    token: string
  ) =>
    apiFetch<StaffMember>(`/api/tenants/${tenantId}/staff`, {
      method: "POST",
      body: JSON.stringify(data),
    }, token, tenantId),

  remove: (tenantId: string, userId: string, token: string) =>
    apiFetch<void>(`/api/tenants/${tenantId}/staff/${userId}`, { method: "DELETE" }, token, tenantId),
};

export const adminApi = {
  allBookings: (tenantId: string, token: string, date?: string) =>
    apiFetch<AdminBooking[]>(
      `/api/tenants/${tenantId}/bookings/all${date ? `?date=${date}` : ""}`,
      {},
      token,
      tenantId
    ),

  checkIn: (tenantId: string, bookingId: string, token: string) =>
    apiFetch<{ id: string; status: string }>(
      `/api/tenants/${tenantId}/bookings/${bookingId}/check-in`,
      { method: "POST" },
      token,
      tenantId
    ),

  setSlotBlocked: (tenantId: string, slotId: string, isBlocked: boolean, token: string) =>
    apiFetch<void>(
      `/api/tenants/${tenantId}/tee-slots/${slotId}`,
      { method: "PATCH", body: JSON.stringify({ isBlocked }) },
      token,
      tenantId
    ),

  dashboardSummary: (tenantId: string, token: string) =>
    apiFetch<DashboardSummary>(
      `/api/tenants/${tenantId}/dashboard-summary`,
      {},
      token,
      tenantId
    ),
};
