import { apiFetch } from "./client";
import type { StripeStatus, CheckoutSession, PaymentStatus } from "../types";


export interface StripeConnectLinkResult {
  url: string;
  accountId: string;
}

export interface PaymentConfirmationResult {
  bookingId: string;
  paymentStatus: PaymentStatus;
  amountPaid: number;
  transactionId?: string;
}

export interface RefundResult {
  bookingId: string;
  paymentStatus: PaymentStatus;
  amountRefunded: number;
}

export const paymentsApi = {
  getStripeStatus: (tenantId: string, token: string | null) =>
    apiFetch<StripeStatus>(`/api/tenants/${tenantId}/stripe/status`, {}, token, tenantId),

  getConnectLink: (tenantId: string, token: string | null, returnUrl?: string) => {
    const query = returnUrl ? `?returnUrl=${encodeURIComponent(returnUrl)}` : "";
    return apiFetch<StripeConnectLinkResult>(
      `/api/tenants/${tenantId}/stripe/connect-link${query}`,
      { method: "POST" },
      token,
      tenantId
    );
  },

  createCheckoutSession: (
    tenantId: string,
    bookingId: string,
    token: string | null,
    returnUrl?: string
  ) =>
    apiFetch<CheckoutSession>(
      `/api/tenants/${tenantId}/bookings/${bookingId}/checkout`,
      { method: "POST", body: JSON.stringify({ returnUrl }) },
      token,
      tenantId
    ),

  confirmSandboxPayment: (
    tenantId: string,
    bookingId: string,
    data: { cardHolderName?: string; cardNumberLast4?: string },
    token: string | null
  ) =>
    apiFetch<PaymentConfirmationResult>(
      `/api/tenants/${tenantId}/bookings/${bookingId}/confirm-sandbox-payment`,
      { method: "POST", body: JSON.stringify(data) },
      token,
      tenantId
    ),

  refundBooking: (tenantId: string, bookingId: string, token: string | null) =>
    apiFetch<RefundResult>(
      `/api/tenants/${tenantId}/bookings/${bookingId}/refund`,
      { method: "POST" },
      token,
      tenantId
    ),
};
