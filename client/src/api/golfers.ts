import { apiFetch } from "./client";
import type { TenantGolferSummary, TenantGolferDetail } from "../types";

export const golfersApi = {
  getGolfers: (tenantId: string, search?: string, token?: string | null) => {
    const query = search ? `?search=${encodeURIComponent(search)}` : "";
    return apiFetch<TenantGolferSummary[]>(
      `/api/tenants/${tenantId}/golfers${query}`,
      {},
      token,
      tenantId
    );
  },

  getGolferDetail: (tenantId: string, golferId: string, token?: string | null) =>
    apiFetch<TenantGolferDetail>(
      `/api/tenants/${tenantId}/golfers/${golferId}`,
      {},
      token,
      tenantId
    ),

  createGolfer: (
    tenantId: string,
    data: {
      email: string;
      firstName: string;
      lastName: string;
      phoneNumber?: string;
      handicapIndex?: number;
      password?: string;
    },
    token?: string | null
  ) =>
    apiFetch<TenantGolferSummary>(
      `/api/tenants/${tenantId}/golfers`,
      {
        method: "POST",
        body: JSON.stringify(data),
      },
      token,
      tenantId
    ),
};
