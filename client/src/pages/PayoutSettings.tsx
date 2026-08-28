import { useEffect, useState } from "react";
import AdminLayout from "../components/AdminLayout";
import { useAuth } from "../api/AuthContext";
import { paymentsApi } from "../api/payments";
import { courseApi } from "../api/course";
import type { StripeStatus } from "../types";

export default function PayoutSettings() {
  const { user } = useAuth();
  const token = user?.token || null;
  const tenantId = user?.tenantId;


  const [status, setStatus] = useState<StripeStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [savingPolicy, setSavingPolicy] = useState(false);
  const [requireUpfront, setRequireUpfront] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!tenantId) return;
    loadData();
  }, [tenantId]);

  async function loadData() {
    if (!tenantId) return;
    setLoading(true);
    setError(null);
    try {
      const [stripeData, tenantData] = await Promise.all([
        paymentsApi.getStripeStatus(tenantId, token),
        courseApi.getTenant(tenantId),
      ]);
      setStatus(stripeData);
      setRequireUpfront(!!tenantData.requirePaymentUpfront);
    } catch (err: any) {
      setError(err?.message || "Failed to load payout settings.");
    } finally {
      setLoading(false);
    }
  }

  async function handleConnectStripe() {
    if (!tenantId) return;
    setConnecting(true);
    setMessage(null);
    setError(null);
    try {
      const result = await paymentsApi.getConnectLink(tenantId, token, window.location.href);
      if (result.url) {
        // If it's a redirect to Stripe or sandbox success
        window.location.href = result.url;
      }
    } catch (err: any) {
      setError(err?.message || "Failed to initiate Stripe Connect.");
      setConnecting(false);
    }
  }

  async function handleToggleUpfront(enabled: boolean) {
    if (!tenantId) return;
    setSavingPolicy(true);
    setMessage(null);
    try {
      await courseApi.updateTenant(tenantId, { requirePaymentUpfront: enabled }, token || "");
      setRequireUpfront(enabled);
      setMessage("Payment policy updated successfully.");
    } catch (err: any) {
      setError(err?.message || "Failed to update payment policy.");
    } finally {
      setSavingPolicy(false);
    }
  }

  if (!tenantId) {
    return (
      <AdminLayout>
        <div className="bg-white rounded-2xl p-10 text-center border border-sand-dark">
          <p className="text-fairway text-lg font-medium">No course linked to your account.</p>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-8 max-w-4xl">
        {/* Header */}
        <div>
          <h1 className="font-display font-bold text-3xl text-fairway">Payouts &amp; Stripe Connect</h1>
          <p className="text-fairway/70 text-sm mt-1">
            Receive direct payouts into your bank account whenever golfers book tee times or enter tournaments online.
          </p>
        </div>

        {message && (
          <div className="p-4 rounded-xl bg-green-50 border border-green-200 text-green-800 text-sm font-medium">
            ✓ {message}
          </div>
        )}

        {error && (
          <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
            {error}
          </div>
        )}

        {/* Stripe Connection Card */}
        <div className="bg-white rounded-2xl p-8 border border-sand-dark shadow-sm">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-sand">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <span className="text-3xl">💳</span>
                <div>
                  <h2 className="font-display font-bold text-xl text-fairway">Stripe Connect Account</h2>
                  <p className="text-xs text-fairway/60">
                    Direct merchant payouts powered by Stripe Connect Express.
                  </p>
                </div>
              </div>
            </div>

            {loading ? (
              <span className="text-xs text-fairway/50">Loading status...</span>
            ) : status?.isConnected ? (
              <div className="flex items-center gap-2 bg-green-50 border border-green-200 px-4 py-2 rounded-xl text-green-800 text-sm font-medium">
                <span className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse"></span>
                <span>Connected &amp; Active</span>
              </div>
            ) : (
              <button
                onClick={handleConnectStripe}
                disabled={connecting}
                className="px-6 py-3 rounded-xl bg-[#635BFF] text-white font-medium hover:bg-[#5349e0] transition-colors shadow-sm flex items-center gap-2 text-sm disabled:opacity-50"
              >
                <span>{connecting ? "Connecting..." : "Connect with Stripe"}</span>
                <span>→</span>
              </button>
            )}
          </div>

          <div className="pt-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl bg-mist border border-sand space-y-1">
              <span className="text-xs text-fairway/60 font-semibold uppercase">Account ID</span>
              <p className="font-mono text-sm text-fairway font-medium truncate">
                {status?.accountId || "None linked"}
              </p>
            </div>
            <div className="p-4 rounded-xl bg-mist border border-sand space-y-1">
              <span className="text-xs text-fairway/60 font-semibold uppercase">Payouts Status</span>
              <p className="text-sm font-medium text-fairway">
                {status?.payoutsEnabled ? "✓ Enabled (Direct Deposit)" : "Not configured"}
              </p>
            </div>
            <div className="p-4 rounded-xl bg-mist border border-sand space-y-1">
              <span className="text-xs text-fairway/60 font-semibold uppercase">Charges Status</span>
              <p className="text-sm font-medium text-fairway">
                {status?.chargesEnabled ? "✓ Active (Ready for Cards)" : "Inactive"}
              </p>
            </div>
          </div>
        </div>

        {/* Booking Payment Policy */}
        <div className="bg-white rounded-2xl p-8 border border-sand-dark shadow-sm space-y-6">
          <div>
            <h2 className="font-display font-bold text-xl text-fairway">Booking Payment Policy</h2>
            <p className="text-xs text-fairway/60 mt-1">
              Control whether golfers must pay when making their reservation online or can pay in the pro shop upon arrival.
            </p>
          </div>

          <div className="space-y-3">
            <label className="flex items-start gap-3.5 p-4 rounded-xl border border-sand-dark hover:bg-mist/40 cursor-pointer transition-colors">
              <input
                type="radio"
                name="paymentPolicy"
                checked={requireUpfront}
                onChange={() => handleToggleUpfront(true)}
                disabled={savingPolicy}
                className="mt-1 text-fairway focus:ring-fairway"
              />
              <div className="space-y-0.5">
                <span className="text-sm font-bold text-fairway">
                  Require 100% Upfront Payment Online
                </span>
                <p className="text-xs text-fairway/60">
                  Golfers must enter credit card details to complete the booking. Minimizes no-shows. Automatically refunded if cancelled within policy.
                </p>
              </div>
            </label>

            <label className="flex items-start gap-3.5 p-4 rounded-xl border border-sand-dark hover:bg-mist/40 cursor-pointer transition-colors">
              <input
                type="radio"
                name="paymentPolicy"
                checked={!requireUpfront}
                onChange={() => handleToggleUpfront(false)}
                disabled={savingPolicy}
                className="mt-1 text-fairway focus:ring-fairway"
              />
              <div className="space-y-0.5">
                <span className="text-sm font-bold text-fairway">
                  Optional / Pay at Pro Shop
                </span>
                <p className="text-xs text-fairway/60">
                  Golfers can choose to pay online or pay at the front desk when checking in for their round.
                </p>
              </div>
            </label>
          </div>
        </div>

        {/* How It Works Explainer */}
        <div className="bg-fairway/5 rounded-2xl p-6 border border-fairway/10 space-y-3 text-fairway text-xs leading-relaxed">
          <h3 className="font-display font-semibold text-sm text-fairway">How Chip &amp; Chill Payouts Work</h3>
          <ul className="space-y-1.5 list-disc list-inside text-fairway/80">
            <li>
              <strong>Direct Routing:</strong> All golfer credit card payments flow straight to your connected Stripe account.
            </li>
            <li>
              <strong>Automatic Refunds:</strong> When a golfer cancels an eligible paid booking, the payment is seamlessly refunded back to their card with a confirmation receipt.
            </li>
            <li>
              <strong>Zero Lock-in:</strong> You own your Stripe merchant account and customer relations.
            </li>
          </ul>
        </div>
      </div>
    </AdminLayout>
  );
}
