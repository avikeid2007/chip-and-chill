import { useState } from "react";
import { paymentsApi } from "../api/payments";

interface PaymentModalProps {
  tenantId: string;
  bookingId: string;
  token: string | null;
  courseName: string;
  slotTime: string;
  partySize: number;
  pricePerPlayer: number;
  totalPrice: number;
  currencySymbol?: string;
  onSuccess: (txId?: string) => void;
  onClose: () => void;
}

export default function PaymentModal({
  tenantId,
  bookingId,
  token,
  courseName,
  slotTime,
  partySize,
  pricePerPlayer,
  totalPrice,
  currencySymbol = "₹",
  onSuccess,
  onClose,
}: PaymentModalProps) {
  const [cardHolder, setCardHolder] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [exp, setExp] = useState("12/28");
  const [cvc, setCvc] = useState("123");
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function fillMockCard(type: "visa" | "mc" | "amex") {
    if (type === "visa") {
      setCardNumber("4242 •••• •••• 4242");
      setCardHolder("Tiger Woods");
    } else if (type === "mc") {
      setCardNumber("5555 •••• •••• 4444");
      setCardHolder("Rory McIlroy");
    } else {
      setCardNumber("3782 •••••• 0005");
      setCardHolder("Arnold Palmer");
    }
  }

  async function handlePay(e: React.FormEvent) {
    e.preventDefault();
    setProcessing(true);
    setError(null);

    try {
      // Create checkout session or direct sandbox confirmation
      const last4 = cardNumber.replace(/\D/g, "").slice(-4) || "4242";
      const result = await paymentsApi.confirmSandboxPayment(
        tenantId,
        bookingId,
        {
          cardHolderName: cardHolder || "Golfer",
          cardNumberLast4: last4,
        },
        token
      );

      onSuccess(result.transactionId);
    } catch (err: any) {
      setError(err?.message || "Payment failed. Please try again.");
    } finally {
      setProcessing(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in duration-150 border border-sand-dark">
        {/* Header */}
        <div className="bg-fairway text-white px-6 py-5 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl">💳</span>
              <h3 className="font-display font-semibold text-lg">Secure Checkout</h3>
            </div>
            <p className="text-xs text-white/70 mt-0.5">{courseName}</p>
          </div>
          <button
            onClick={onClose}
            disabled={processing}
            className="text-white/60 hover:text-white text-2xl leading-none transition-colors"
          >
            ×
          </button>
        </div>

        {/* Order Summary */}
        <div className="bg-mist px-6 py-4 border-b border-sand">
          <div className="flex items-center justify-between text-sm text-fairway-dark font-medium mb-1">
            <span>Tee Time</span>
            <span className="text-fairway font-semibold">{slotTime}</span>
          </div>
          <div className="flex items-center justify-between text-sm text-fairway-dark font-medium mb-1">
            <span>Players</span>
            <span>{partySize} × {currencySymbol}{pricePerPlayer.toFixed(2)}</span>
          </div>
          <div className="flex items-center justify-between text-base font-bold text-fairway pt-2 border-t border-sand">
            <span>Total Due</span>
            <span className="text-gold font-display text-lg">{currencySymbol}{totalPrice.toFixed(2)}</span>
          </div>
        </div>

        {/* Payment Form */}
        <form onSubmit={handlePay} className="p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm font-medium">
              {error}
            </div>
          )}

          {/* Quick Mock Card Selectors */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-fairway/70 uppercase tracking-wider">
                Test / Sandbox Cards
              </label>
              <span className="text-[11px] text-fairway/50">Click to autofill</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => fillMockCard("visa")}
                className="px-2.5 py-1.5 text-xs font-medium bg-sand/60 hover:bg-sand rounded border border-sand-dark text-fairway transition-colors"
              >
                Visa 4242
              </button>
              <button
                type="button"
                onClick={() => fillMockCard("mc")}
                className="px-2.5 py-1.5 text-xs font-medium bg-sand/60 hover:bg-sand rounded border border-sand-dark text-fairway transition-colors"
              >
                Mastercard
              </button>
              <button
                type="button"
                onClick={() => fillMockCard("amex")}
                className="px-2.5 py-1.5 text-xs font-medium bg-sand/60 hover:bg-sand rounded border border-sand-dark text-fairway transition-colors"
              >
                Amex 0005
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-fairway-dark mb-1">
              Cardholder Name
            </label>
            <input
              type="text"
              required
              value={cardHolder}
              onChange={(e) => setCardHolder(e.target.value)}
              placeholder="e.g. Tiger Woods"
              className="w-full px-3.5 py-2.5 rounded-lg border border-sand-dark text-fairway focus:outline-none focus:ring-2 focus:ring-fairway text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-fairway-dark mb-1">
              Card Number
            </label>
            <input
              type="text"
              required
              value={cardNumber}
              onChange={(e) => setCardNumber(e.target.value)}
              placeholder="4242 4242 4242 4242"
              className="w-full px-3.5 py-2.5 rounded-lg border border-sand-dark text-fairway focus:outline-none focus:ring-2 focus:ring-fairway text-sm font-mono"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-fairway-dark mb-1">
                Expiry Date
              </label>
              <input
                type="text"
                required
                value={exp}
                onChange={(e) => setExp(e.target.value)}
                placeholder="MM/YY"
                className="w-full px-3.5 py-2.5 rounded-lg border border-sand-dark text-fairway focus:outline-none focus:ring-2 focus:ring-fairway text-sm font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-fairway-dark mb-1">
                CVC / CVV
              </label>
              <input
                type="text"
                required
                value={cvc}
                onChange={(e) => setCvc(e.target.value)}
                placeholder="123"
                className="w-full px-3.5 py-2.5 rounded-lg border border-sand-dark text-fairway focus:outline-none focus:ring-2 focus:ring-fairway text-sm font-mono"
              />
            </div>
          </div>

          <div className="pt-3">
            <button
              type="submit"
              disabled={processing}
              className="w-full py-3.5 px-4 rounded-xl bg-fairway text-white font-medium hover:bg-fairway-dark transition-colors flex items-center justify-center gap-2 shadow-lg shadow-fairway/20 disabled:opacity-50"
            >
              {processing ? (
                <>
                  <svg className="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  <span>Processing Payment...</span>
                </>
              ) : (
                <>
                  <span>Pay {currencySymbol}{totalPrice.toFixed(2)}</span>
                  <span className="text-xs bg-white/20 px-2 py-0.5 rounded">Instant</span>
                </>
              )}
            </button>
          </div>

          <p className="text-[11px] text-center text-fairway/50 flex items-center justify-center gap-1">
            <span>🔒</span> End-to-end 256-bit encrypted • Powered by Stripe Connect
          </p>
        </form>
      </div>
    </div>
  );
}
