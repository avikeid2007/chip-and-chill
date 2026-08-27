import { apiFetch } from "./client";

export interface CourseHole {
  holeNumber: number;
  par: number;
  yardageWhite: number;
  yardageBlue?: number;
  yardageRed?: number;
  notes?: string;
}

export interface Tenant {
  id: string;
  name: string;
  type: "Course" | "Range";
  address?: string;
  description?: string;
  logoUrl?: string;
}

export const courseApi = {
  list: (search?: string) =>
    apiFetch<Tenant[]>(`/api/tenants${search ? `?search=${encodeURIComponent(search)}` : ""}`),

  getTenant: (id: string) => apiFetch<Tenant>(`/api/tenants/${id}`),

  getHoles: (tenantId: string) => apiFetch<CourseHole[]>(`/api/tenants/${tenantId}/holes`),

  saveHoles: (tenantId: string, holes: CourseHole[], token: string) =>
    apiFetch<void>(`/api/tenants/${tenantId}/holes`, { method: "PUT", body: JSON.stringify(holes) }, token, tenantId),

  updateTenant: (id: string, data: Partial<Tenant>, token: string) =>
    apiFetch<void>(`/api/tenants/${id}`, { method: "PUT", body: JSON.stringify(data) }, token, id),
};
