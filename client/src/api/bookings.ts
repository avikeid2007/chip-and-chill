import { apiFetch } from "./client";

export interface Booking {
  id: string;
  teeSlotId: string;
  partySize: number;
  status: "Confirmed" | "CheckedIn" | "Cancelled";
  paymentStatus?: "Unpaid" | "Paid" | "Refunded";
  amountPaid?: number;
  totalPrice?: number;
  startTime?: string;
  price?: number;
  teeSlot?: { startTime: string; price: number };
}

export const bookingsApi = {
  mine: (tenantId: string, token: string) =>
    apiFetch<Booking[]>(`/api/tenants/${tenantId}/bookings/mine`, {}, token, tenantId),

  // BUG-05 FIX: Single global endpoint that returns ALL bookings for the user across
  // all tenants — avoids the N-API-calls-per-tenant pattern in MyBookings.
  mineAll: (token: string) =>
    apiFetch<(Booking & { startTime: string; price: number })[]>("/api/bookings/mine", {}, token),

  create: (tenantId: string, token: string, data: { teeSlotId: string; partySize: number }) =>
    apiFetch<Booking>(`/api/tenants/${tenantId}/bookings`, {
      method: "POST",
      body: JSON.stringify(data),
    }, token, tenantId),

  cancel: (tenantId: string, bookingId: string, token: string) =>
    apiFetch<void>(`/api/tenants/${tenantId}/bookings/${bookingId}/cancel`, { method: "POST" }, token, tenantId),
};

export interface WaitlistEntryInfo {
  id: string;
  partySize: number;
  notified: boolean;
  joinedAt: string;
}

export const waitlistApi = {
  join: (tenantId: string, slotId: string, token: string, partySize = 1) =>
    apiFetch<{ id: string; position: number }>(
      `/api/tenants/${tenantId}/tee-slots/${slotId}/waitlist`,
      { method: "POST", body: JSON.stringify({ partySize }) },
      token,
      tenantId
    ),

  mine: (tenantId: string, slotId: string, token: string) =>
    apiFetch<WaitlistEntryInfo[]>(
      `/api/tenants/${tenantId}/tee-slots/${slotId}/waitlist/mine`,
      {},
      token,
      tenantId
    ),

  leave: (tenantId: string, slotId: string, entryId: string, token: string) =>
    apiFetch<void>(
      `/api/tenants/${tenantId}/tee-slots/${slotId}/waitlist/${entryId}`,
      { method: "DELETE" },
      token,
      tenantId
    ),
};
