import { apiFetch } from "./client";
import type {
  RangeBay,
  BayBooking,
  RangeAvailabilitySlot,
  RangeLiveStatus,
} from "../types";

export interface CreateRangeBayDto {
  bayNumber: number;
  name: string;
  isOutdoor: boolean;
  hasLaunchMonitor: boolean;
  hourlyRate: number;
  isActive: boolean;
}

export interface UpdateRangeBayDto {
  bayNumber?: number;
  name?: string;
  isOutdoor?: boolean;
  hasLaunchMonitor?: boolean;
  hourlyRate?: number;
  isActive?: boolean;
}

export interface CreateBayBookingDto {
  rangeBayId: string;
  golferName: string;
  golferEmail: string;
  startTime: string;
  durationMinutes: number;
}

export const rangeApi = {
  getBays: (tenantId: string, token?: string | null) =>
    apiFetch<RangeBay[]>(`/api/tenants/${tenantId}/range/bays`, {}, token, tenantId),

  createBay: (tenantId: string, data: CreateRangeBayDto, token?: string | null) =>
    apiFetch<RangeBay>(
      `/api/tenants/${tenantId}/range/bays`,
      {
        method: "POST",
        body: JSON.stringify(data),
      },
      token,
      tenantId
    ),

  updateBay: (tenantId: string, bayId: string, data: UpdateRangeBayDto, token?: string | null) =>
    apiFetch<RangeBay>(
      `/api/tenants/${tenantId}/range/bays/${bayId}`,
      {
        method: "PUT",
        body: JSON.stringify(data),
      },
      token,
      tenantId
    ),

  deleteBay: (tenantId: string, bayId: string, token?: string | null) =>
    apiFetch<void>(
      `/api/tenants/${tenantId}/range/bays/${bayId}`,
      {
        method: "DELETE",
      },
      token,
      tenantId
    ),

  getAvailability: (tenantId: string, date: string, durationMinutes: number = 60, token?: string | null) =>
    apiFetch<RangeAvailabilitySlot[]>(
      `/api/tenants/${tenantId}/range/availability?date=${date}&durationMinutes=${durationMinutes}`,
      {},
      token,
      tenantId
    ),

  createBooking: (tenantId: string, data: CreateBayBookingDto, token?: string | null) =>
    apiFetch<BayBooking>(
      `/api/tenants/${tenantId}/range/bookings`,
      {
        method: "POST",
        body: JSON.stringify(data),
      },
      token,
      tenantId
    ),

  confirmSandboxPayment: (tenantId: string, bookingId: string, token?: string | null) =>
    apiFetch<BayBooking>(
      `/api/tenants/${tenantId}/range/bookings/${bookingId}/confirm-sandbox-payment`,
      {
        method: "POST",
      },
      token,
      tenantId
    ),

  getAllBookings: (tenantId: string, date?: string, token?: string | null) => {
    const query = date ? `?date=${date}` : "";
    return apiFetch<BayBooking[]>(`/api/tenants/${tenantId}/range/bookings${query}`, {}, token, tenantId);
  },

  checkIn: (tenantId: string, bookingId: string, token?: string | null) =>
    apiFetch<void>(
      `/api/tenants/${tenantId}/range/bookings/${bookingId}/check-in`,
      {
        method: "POST",
      },
      token,
      tenantId
    ),

  cancelBooking: (tenantId: string, bookingId: string, token?: string | null) =>
    apiFetch<void>(
      `/api/tenants/${tenantId}/range/bookings/${bookingId}/cancel`,
      {
        method: "POST",
      },
      token,
      tenantId
    ),

  getLiveStatus: (tenantId: string, token?: string | null) =>
    apiFetch<RangeLiveStatus>(`/api/tenants/${tenantId}/range/live-status`, {}, token, tenantId),
};
