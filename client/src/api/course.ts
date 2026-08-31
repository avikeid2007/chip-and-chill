import { apiFetch } from "./client";

export interface CourseHole {
  holeNumber: number;
  par: number;
  handicapIndex?: number;
  yardageBlack?: number | null;
  yardageBlue?: number | null;
  yardageWhite: number;
  yardageGold?: number | null;
  yardageRed?: number | null;
  notes?: string | null;
}

export interface CourseWeather {
  condition: string;
  description: string;
  temperatureC: number;
  temperatureF: number;
  feelsLikeC: number;
  feelsLikeF: number;
  windSpeedMph: number;
  windDirection: string;
  humidity: number;
  playabilityRating: string;
  updatedAt: string;
}

export interface Tenant {
  id: string;
  name: string;
  type: "Course" | "Range";
  address?: string | null;
  description?: string | null;
  logoUrl?: string | null;
  coverImageUrl?: string | null;
  primaryColor?: string | null;
  subdomain?: string | null;
  customDomain?: string | null;
  timezone?: string;
  currency?: string;
  currencySymbol?: string;
  requirePaymentUpfront?: boolean;
  stripeChargesEnabled?: boolean;
  phone?: string | null;
  email?: string | null;
  website?: string | null;
  architect?: string | null;
  yearBuilt?: number | null;
  courseType?: string | null;
  courseRating?: number | null;
  slopeRating?: number | null;
  greensGrass?: string | null;
  fairwaysGrass?: string | null;
  amenities?: string | null;
  dressCode?: string | null;
  spikePolicy?: string | null;
  greenFee?: number | null;
  caddieFee?: number | null;
  coachFee?: number | null;
  holesCount?: number;
  holes?: CourseHole[];
}

export const courseApi = {
  list: (search?: string) =>
    apiFetch<Tenant[]>(`/api/tenants${search ? `?search=${encodeURIComponent(search)}` : ""}`),

  getTenant: (id: string) => apiFetch<Tenant>(`/api/tenants/${id}`),

  resolve: (host?: string) =>
    apiFetch<Tenant>(`/api/tenants/resolve${host ? `?host=${encodeURIComponent(host)}` : ""}`),

  getHoles: (tenantId: string) => apiFetch<CourseHole[]>(`/api/tenants/${tenantId}/holes`),

  saveHoles: (tenantId: string, holes: CourseHole[], token: string) =>
    apiFetch<void>(`/api/tenants/${tenantId}/holes`, { method: "PUT", body: JSON.stringify(holes) }, token, tenantId),

  updateTenant: (id: string, data: Partial<Tenant>, token: string) =>
    apiFetch<void>(`/api/tenants/${id}`, { method: "PUT", body: JSON.stringify(data) }, token, id),

  getWeather: (tenantId: string) => apiFetch<CourseWeather>(`/api/tenants/${tenantId}/weather`),

  uploadCover: async (tenantId: string, file: File, token: string) => {
    const formData = new FormData();
    formData.append("file", file);
    const res = await fetch(`/api/tenants/${tenantId}/cover`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    });
    if (!res.ok) {
      const txt = await res.text();
      throw new Error(txt || "Failed to upload cover banner");
    }
    return res.json() as Promise<{ url: string }>;
  },
};
