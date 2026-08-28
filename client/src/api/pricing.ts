import { apiFetch } from "./client";
import type { PricingRule, PricingDays } from "../types";


export interface CreatePricingRuleDto {
  name: string;
  days: PricingDays;
  startTime?: string | null;
  endTime?: string | null;
  price: number;
  priority?: number;
  isActive?: boolean;
}

export interface UpdatePricingRuleDto {
  name?: string;
  days?: PricingDays;
  startTime?: string | null;
  endTime?: string | null;
  price?: number;
  priority?: number;
  isActive?: boolean;
}

export interface PricePreviewResult {
  slotTime: string;
  calculatedPrice: number;
  basePrice: number;
  matchedRuleId?: string | null;
  matchedRuleName?: string | null;
}

export const pricingApi = {
  getRules: (tenantId: string, token: string | null) =>
    apiFetch<PricingRule[]>(`/api/tenants/${tenantId}/pricing-rules`, {}, token, tenantId),

  createRule: (tenantId: string, data: CreatePricingRuleDto, token: string | null) =>
    apiFetch<PricingRule>(
      `/api/tenants/${tenantId}/pricing-rules`,
      { method: "POST", body: JSON.stringify(data) },
      token,
      tenantId
    ),

  updateRule: (tenantId: string, ruleId: string, data: UpdatePricingRuleDto, token: string | null) =>
    apiFetch<void>(
      `/api/tenants/${tenantId}/pricing-rules/${ruleId}`,
      { method: "PUT", body: JSON.stringify(data) },
      token,
      tenantId
    ),

  deleteRule: (tenantId: string, ruleId: string, token: string | null) =>
    apiFetch<void>(
      `/api/tenants/${tenantId}/pricing-rules/${ruleId}`,
      { method: "DELETE" },
      token,
      tenantId
    ),

  previewPrice: (tenantId: string, slotTime: string, basePrice: number = 50) =>
    apiFetch<PricePreviewResult>(
      `/api/tenants/${tenantId}/pricing/preview`,
      {
        method: "POST",
        body: JSON.stringify({ slotTime, basePrice }),
      },
      null,
      tenantId
    ),
};
