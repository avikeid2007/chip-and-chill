import { useEffect, useState } from "react";
import AdminLayout from "../components/AdminLayout";
import { useAuth } from "../api/AuthContext";
import { adminApi, type AdminBooking } from "../api/admin";
import { paymentsApi } from "../api/payments";
import { courseApi } from "../api/course";
import { formatTime, toDateInput } from "../utils/time";
import { exportToCsv } from "../utils/export";
import NoCourse from "../components/NoCourse";

const filterTabs = [
  { key: "all", label: "All" },
  { key: "Confirmed", label: "Confirmed" },
  { key: "CheckedIn", label: "Checked in" },
  { key: "Cancelled", label: "Cancelled" },
] as const;

export default function BookingsManagement() {
  const { user } = useAuth();
  const [date, setDate] = useState(() => toDateInput(new Date()));
  const [bookings, setBookings] = useState<AdminBooking[]>([]);
  const [currencySymbol, setCurrencySymbol] = useState("₹");
  const [tenantName, setTenantName] = useState("Golf Club");
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<(typeof filterTabs)[number]["key"]>("all");
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Starter Sheet Modal state
  const [showStarterSheet, setShowStarterSheet] = useState(false);

  // Collect Payment Modal state
  const [selectedBooking, setSelectedBooking] = useState<AdminBooking | null>(null);
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<string>("Cash");
  const [alsoCheckIn, setAlsoCheckIn] = useState<boolean>(true);
  const [collectingPayment, setCollectingPayment] = useState<boolean>(false);

  useEffect(() => {
    if (!user?.tenantId) return;
    courseApi.getTenant(user.tenantId).then((t) => {
      if (t.currencySymbol) setCurrencySymbol(t.currencySymbol);
      if (t.name) setTenantName(t.name);
    }).catch(() => {});
    loadBookings();
  }, [user, date]);

  async function loadBookings() {
    if (!user?.tenantId) return;
    setLoading(true);
    adminApi
      .allBookings(user.tenantId, user.token, date)
      .then(setBookings)
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load bookings."))
      .finally(() => setLoading(false));
  }

  async function checkIn(id: string) {
    if (!user?.tenantId) return;
    try {
      await adminApi.checkIn(user.tenantId, id, user.token);
      setBookings((prev) => prev.map((b) => (b.id === id ? { ...b, status: "CheckedIn" } : b)));
      setSuccessMsg("Golfer checked in successfully.");
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to check in.");
    }
  }

  function openCollectPaymentModal(b: AdminBooking) {
    setSelectedBooking(b);
    const defaultAmount = b.amountPaid > 0 ? b.amountPaid : b.price * b.partySize;
    setPaymentAmount(defaultAmount);
    setPaymentMethod("Cash");
    setAlsoCheckIn(b.status !== "CheckedIn");
  }

  async function handleConfirmCollectPayment(e: React.FormEvent) {
    e.preventDefault();
    if (!user?.tenantId || !selectedBooking) return;

    setCollectingPayment(true);
    setError(null);
    try {
      const res = await adminApi.collectPayment(
        user.tenantId,
        selectedBooking.id,
        user.token,
        paymentAmount
      );

      let updatedStatus = selectedBooking.status;
      if (alsoCheckIn && selectedBooking.status !== "CheckedIn") {
        await adminApi.checkIn(user.tenantId, selectedBooking.id, user.token);
        updatedStatus = "CheckedIn";
      }

      setBookings((prev) =>
        prev.map((b) =>
          b.id === selectedBooking.id
            ? {
                ...b,
                paymentStatus: "Paid",
                amountPaid: res.amountPaid,
                status: updatedStatus,
              }
            : b
        )
      );

      setSuccessMsg(
        `Payment of ${currencySymbol}${paymentAmount.toLocaleString()} recorded via ${paymentMethod}${
          alsoCheckIn && selectedBooking.status !== "CheckedIn" ? " and golfer checked in" : ""
        }.`
      );
      setTimeout(() => setSuccessMsg(null), 5000);
      setSelectedBooking(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to record payment.");
    } finally {
      setCollectingPayment(false);
    }
  }

  async function refundBooking(id: string, amount: number) {
    if (!user?.tenantId) return;
    if (!confirm(`Are you sure you want to refund ${currencySymbol}${amount.toFixed(2)} to the golfer?`)) return;

    try {
      await paymentsApi.refundBooking(user.tenantId, id, user.token);
      setBookings((prev) =>
        prev.map((b) => (b.id === id ? { ...b, paymentStatus: "Refunded" } : b))
      );
      setSuccessMsg("Refund processed successfully.");
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      alert(err?.message || "Failed to process refund.");
    }
  }

  function handleExportCsv() {
    const headers = [
      "Tee Time",
      "Golfer Name",
      "Email",
      "Party Size",
      "Green Fee Rate",
      "Total Price",
      "Amount Paid",
      "Payment Status",
      "Booking Status",
      "Booking ID"
    ];
    const rows = filtered.map((b) => [
      formatTime(b.startTime),
      b.userName,
      b.userEmail,
      b.partySize,
      b.price,
      b.price * b.partySize,
      b.amountPaid,
      b.paymentStatus,
      b.status,
      b.id
    ]);
    exportToCsv(`Tee_Sheet_Bookings_${date}`, headers, rows);
  }

  function handleExportStarterCsv() {
    const headers = [
      "Tee Time",
      "Golfer Name",
      "Players",
      "Status",
      "Payment",
      "Cart #",
      "Caddie",
      "Starter Signature / Check"
    ];
    const rows = filtered.map((b) => [
      formatTime(b.startTime),
      b.userName,
      b.partySize,
      b.status === "CheckedIn" ? "Checked In" : "Pending",
      b.paymentStatus === "Paid" ? "Paid" : "Pay at Desk",
      "",
      "",
      ""
    ]);
    exportToCsv(`Daily_Starter_Sheet_${date}`, headers, rows);
  }

  const filtered = bookings
    .filter((b) => statusFilter === "all" || b.status === statusFilter)
    .filter(
      (b) =>
        b.userName.toLowerCase().includes(search.toLowerCase()) ||
        b.userEmail.toLowerCase().includes(search.toLowerCase())
    );

  if (!user?.tenantId) {
    return (
      <AdminLayout>
        <NoCourse />
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
        <div>
          <div className="eyebrow mb-0">Course admin</div>
          <h1 className="text-3xl font-semibold tracking-tight text-fairway">Bookings Management</h1>
          <p className="text-sm text-ink-soft mt-1">
            Check-in arrivals, collect clubhouse payments, and manage tee time reservations.
          </p>
        </div>
        
        {/* Date Picker & Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="border border-line rounded-xl px-3 py-2 text-sm bg-white font-mono shadow-sm focus:outline-none focus:ring-2 focus:ring-fairway/20"
          />

          <button
            onClick={() => setShowStarterSheet(true)}
            className="px-3.5 py-2 rounded-xl border border-line bg-white hover:bg-[#F8FAF7] text-fairway text-xs font-semibold shadow-xs flex items-center gap-1.5 transition-all"
            title="Open Starter Sheet for Marshals & Caddie Masters"
          >
            <span>🖨️</span>
            <span>Starter Sheet</span>
          </button>

          <button
            onClick={handleExportCsv}
            className="px-3.5 py-2 rounded-xl bg-fairway hover:bg-fairway/90 text-white text-xs font-semibold shadow-xs flex items-center gap-1.5 transition-all"
            title="Download CSV for Excel or Google Sheets"
          >
            <span>📥</span>
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 mb-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="text-xs text-red-500 hover:text-red-700 font-bold ml-2">✕</button>
        </div>
      )}

      {successMsg && (
        <div className="p-4 mb-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span>✅</span>
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg(null)} className="text-xs text-emerald-600 hover:text-emerald-800 font-bold ml-2">✕</button>
        </div>
      )}

      <div className="flex items-center justify-between gap-4 mb-6 flex-wrap">
        <div className="flex gap-1.5">
          {filterTabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setStatusFilter(t.key)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                statusFilter === t.key ? "bg-fairway text-white" : "bg-black/5 text-ink-soft hover:bg-black/10"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <input
          type="text"
          placeholder="Search by golfer name or email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="input max-w-xs"
        />
      </div>

      <div className="card overflow-hidden shadow-sm">
        <div className="grid grid-cols-[75px_1fr_75px_110px_130px_180px] text-mono text-xs uppercase tracking-wide text-ink-soft bg-[#FAFBF9] border-b border-[#EEF1ED] px-5 py-2.5">
          <span>Time</span>
          <span>Golfer</span>
          <span>Players</span>
          <span>Status</span>
          <span>Payment</span>
          <span className="text-right">Actions</span>
        </div>
        {loading ? (
          <div className="px-5 py-6 space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-4 bg-line rounded animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="px-5 py-12 text-center">
            <div className="text-3xl mb-2">📭</div>
            <p className="text-sm font-medium text-fairway">No bookings found for this date.</p>
            <p className="text-xs text-ink-soft mt-1">Try switching dates or clearing the search filter.</p>
          </div>
        ) : (
          filtered.map((b) => {
            const calculatedTotal = b.amountPaid > 0 ? b.amountPaid : b.price * b.partySize;
            return (
              <div
                key={b.id}
                className="grid grid-cols-[75px_1fr_75px_110px_130px_180px] items-center px-5 py-3.5 border-b border-[#EEF1ED] last:border-b-0 text-sm row-hover"
              >
                <span className="text-mono font-semibold text-fairway">{formatTime(b.startTime)}</span>
                <div className="min-w-0 pr-2">
                  <p className="font-medium text-fairway truncate">{b.userName || "Golfer"}</p>
                  <p className="text-xs text-ink-soft truncate font-mono">{b.userEmail}</p>
                </div>
                <span className="text-ink-soft text-xs font-mono">{b.partySize} {b.partySize === 1 ? "player" : "players"}</span>
                <div>
                  <span
                    className={`pill w-fit ${
                      b.status === "CheckedIn" ? "pill-green" : b.status === "Cancelled" ? "pill-red" : "pill-gray"
                    }`}
                  >
                    {b.status === "CheckedIn" ? "Checked In" : b.status}
                  </span>
                </div>
                <div>
                  {b.paymentStatus === "Paid" ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-800 bg-emerald-100/80 border border-emerald-200 px-2.5 py-0.5 rounded-full">
                      ✓ Paid ({currencySymbol}{calculatedTotal.toFixed(0)})
                    </span>
                  ) : b.paymentStatus === "Refunded" ? (
                    <span className="inline-flex items-center text-[11px] font-semibold text-amber-800 bg-amber-100 border border-amber-200 px-2 py-0.5 rounded-full">
                      Refunded
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-900 bg-amber-50 border border-amber-200 px-2.5 py-0.5 rounded-full">
                      ⏳ Unpaid ({currencySymbol}{calculatedTotal.toFixed(0)})
                    </span>
                  )}
                </div>
                <div className="flex items-center justify-end gap-2 text-xs font-medium">
                  {/* Collect Payment Button (for Unpaid) */}
                  {b.paymentStatus === "Unpaid" && b.status !== "Cancelled" && (
                    <button
                      onClick={() => openCollectPaymentModal(b)}
                      className="px-2.5 py-1 rounded-lg bg-emerald-600 text-white font-semibold hover:bg-emerald-700 transition-colors shadow-xs flex items-center gap-1"
                      title="Collect payment at clubhouse / counter"
                    >
                      <span>💳</span> Collect
                    </button>
                  )}

                  {/* Check In Button */}
                  {b.status !== "CheckedIn" && b.status !== "Cancelled" && (
                    <button
                      onClick={() => checkIn(b.id)}
                      className="px-2.5 py-1 rounded-lg border border-fairway/30 text-fairway font-semibold hover:bg-fairway/5 transition-colors"
                    >
                      Check in
                    </button>
                  )}

                  {/* Refund Button */}
                  {b.paymentStatus === "Paid" && (
                    <button
                      onClick={() => refundBooking(b.id, calculatedTotal)}
                      className="text-[#C0533F] hover:underline"
                    >
                      Refund
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* ── Collect Payment Modal ─────────────────────────────────────── */}
      {selectedBooking && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-line animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-start justify-between mb-4">
              <div>
                <span className="text-xs font-mono uppercase tracking-widest text-emerald-700 font-bold">
                  Clubhouse Payment Desk
                </span>
                <h3 className="text-xl font-bold text-fairway mt-0.5">Collect Tee Time Payment</h3>
              </div>
              <button
                onClick={() => setSelectedBooking(null)}
                className="text-gray-400 hover:text-gray-600 text-lg leading-none p-1"
              >
                ✕
              </button>
            </div>

            {/* Booking Summary Box */}
            <div className="bg-[#FAFBF9] rounded-2xl p-4 border border-[#EEF1ED] space-y-2 mb-5 text-sm">
              <div className="flex justify-between">
                <span className="text-ink-soft">Golfer:</span>
                <span className="font-semibold text-fairway">{selectedBooking.userName || "Golfer"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-ink-soft">Tee Time:</span>
                <span className="font-mono font-medium text-fairway">{formatTime(selectedBooking.startTime)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-ink-soft">Party Size:</span>
                <span className="font-mono text-fairway">{selectedBooking.partySize} {selectedBooking.partySize === 1 ? "player" : "players"}</span>
              </div>
              <div className="flex justify-between pt-2 border-t border-[#EEF1ED]">
                <span className="text-ink-soft font-medium">Standard Rate:</span>
                <span className="font-mono font-bold text-fairway">
                  {selectedBooking.partySize} × {currencySymbol}{selectedBooking.price} = {currencySymbol}{(selectedBooking.price * selectedBooking.partySize).toLocaleString()}
                </span>
              </div>
            </div>

            <form onSubmit={handleConfirmCollectPayment} className="space-y-4">
              {/* Payment Amount Input */}
              <div>
                <label className="label text-xs">Amount to Collect ({currencySymbol})</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-fairway font-bold text-base">
                    {currencySymbol}
                  </span>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    required
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(parseFloat(e.target.value) || 0)}
                    className="input pl-8 font-mono text-base font-semibold"
                  />
                </div>
              </div>

              {/* Payment Method Selector */}
              <div>
                <label className="label text-xs">Payment Method</label>
                <div className="grid grid-cols-2 gap-2">
                  {["Cash", "Card / POS Terminal", "UPI / QR Code", "Clubhouse Account"].map((method) => (
                    <button
                      key={method}
                      type="button"
                      onClick={() => setPaymentMethod(method)}
                      className={`px-3 py-2 rounded-xl text-xs font-semibold border transition-all text-left flex items-center justify-between ${
                        paymentMethod === method
                          ? "bg-emerald-50 border-emerald-600 text-emerald-800"
                          : "border-line bg-white text-fairway hover:bg-[#F8FAF7]"
                      }`}
                    >
                      <span>{method}</span>
                      {paymentMethod === method && <span>✓</span>}
                    </button>
                  ))}
                </div>
              </div>

              {/* Check-in Checkbox */}
              {selectedBooking.status !== "CheckedIn" && (
                <label className="flex items-center gap-2.5 p-3 rounded-xl bg-fairway/5 border border-fairway/10 cursor-pointer text-xs font-medium text-fairway">
                  <input
                    type="checkbox"
                    checked={alsoCheckIn}
                    onChange={(e) => setAlsoCheckIn(e.target.checked)}
                    className="rounded border-gray-300 text-fairway focus:ring-fairway h-4 w-4"
                  />
                  <span>Also mark golfer as <strong>Checked In</strong></span>
                </label>
              )}

              {/* Submit Buttons */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedBooking(null)}
                  className="flex-1 py-2.5 px-4 rounded-xl border border-line text-sm font-semibold text-ink-soft hover:bg-[#F8FAF7]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={collectingPayment || paymentAmount <= 0}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold shadow-sm transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {collectingPayment ? (
                    <span>Processing...</span>
                  ) : (
                    <span>Confirm &amp; Mark Paid</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Starter Sheet Print & Preview Modal ────────────────────────────── */}
      {showStarterSheet && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl border border-[#EEF1ED] shadow-2xl max-w-4xl w-full p-6 my-8">
            {/* Modal Controls (Hidden in Print) */}
            <div className="flex items-center justify-between pb-4 mb-4 border-b border-[#EEF1ED] no-print">
              <div className="flex items-center gap-2">
                <span className="text-xl">🖨️</span>
                <div>
                  <h3 className="font-semibold text-fairway text-base">Daily Starter Sheet Preview</h3>
                  <p className="text-xs text-ink-soft">Official tee time roster for Starter Marshals &amp; Caddie Masters</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleExportStarterCsv}
                  className="px-3.5 py-1.5 rounded-xl border border-line bg-white hover:bg-[#F8FAF7] text-fairway text-xs font-semibold shadow-xs flex items-center gap-1.5"
                >
                  <span>📥</span>
                  <span>Export CSV</span>
                </button>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-4 py-1.5 rounded-xl bg-fairway hover:bg-fairway/90 text-white text-xs font-semibold shadow-xs flex items-center gap-1.5"
                >
                  <span>🖨️</span>
                  <span>Print Sheet</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowStarterSheet(false)}
                  className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-700 flex items-center justify-center text-sm font-bold ml-2"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Printable Document Area */}
            <div className="p-4 bg-white border border-gray-200 rounded-2xl print:border-0 print:p-0 print:m-0">
              {/* Document Header */}
              <div className="flex items-start justify-between border-b-2 border-fairway pb-3 mb-4">
                <div>
                  <h2 className="text-xl font-bold text-fairway uppercase tracking-tight">{tenantName}</h2>
                  <p className="text-xs font-semibold text-ink-soft uppercase tracking-wider">Official Daily Starter &amp; Marshal Sheet</p>
                </div>
                <div className="text-right">
                  <p className="font-mono font-bold text-sm text-fairway">
                    {new Date(date).toLocaleDateString("en-IN", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
                  </p>
                  <p className="text-[11px] font-mono text-ink-soft">Total Bookings: {filtered.length} | Generated: {new Date().toLocaleTimeString()}</p>
                </div>
              </div>

              {/* Marshal Guidance Notes */}
              <div className="grid grid-cols-3 gap-3 mb-4 p-2.5 bg-gray-50 rounded-xl text-[11px] border border-gray-100">
                <div>
                  <span className="font-bold text-fairway">Pace of Play Target:</span> 4 Hours 15 Mins
                </div>
                <div>
                  <span className="font-bold text-fairway">Pin Position:</span> Zone #2 (Center-Right)
                </div>
                <div>
                  <span className="font-bold text-fairway">Cart Rules:</span> 90-Degree Rule in Effect
                </div>
              </div>

              {/* Roster Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-gray-100 text-[11px] font-mono uppercase tracking-wider text-fairway border-b border-gray-300">
                      <th className="py-2.5 px-3 border border-gray-300 w-12 text-center">Check</th>
                      <th className="py-2.5 px-3 border border-gray-300 w-20">Time</th>
                      <th className="py-2.5 px-3 border border-gray-300">Golfer Name / Lead</th>
                      <th className="py-2.5 px-3 border border-gray-300 w-16 text-center">Players</th>
                      <th className="py-2.5 px-3 border border-gray-300 w-24 text-center">Status</th>
                      <th className="py-2.5 px-3 border border-gray-300 w-24 text-center">Payment</th>
                      <th className="py-2.5 px-3 border border-gray-300 w-20 text-center">Cart #</th>
                      <th className="py-2.5 px-3 border border-gray-300 w-24">Caddie</th>
                      <th className="py-2.5 px-3 border border-gray-300 w-32">Marshal Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="py-8 text-center text-ink-soft border border-gray-300">
                          No tee times booked for {date}.
                        </td>
                      </tr>
                    ) : (
                      filtered.map((b) => (
                        <tr key={b.id} className="border border-gray-300 hover:bg-gray-50">
                          <td className="py-2.5 px-3 border border-gray-300 text-center">
                            <div className="w-4 h-4 border-2 border-gray-400 rounded-xs inline-block" />
                          </td>
                          <td className="py-2.5 px-3 border border-gray-300 font-mono font-bold text-fairway">
                            {formatTime(b.startTime)}
                          </td>
                          <td className="py-2.5 px-3 border border-gray-300">
                            <div className="font-semibold text-fairway">{b.userName}</div>
                            <div className="text-[10px] text-ink-soft font-mono">{b.userEmail}</div>
                          </td>
                          <td className="py-2.5 px-3 border border-gray-300 font-mono font-medium text-center">
                            {b.partySize}
                          </td>
                          <td className="py-2.5 px-3 border border-gray-300 text-center">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                                b.status === "CheckedIn"
                                  ? "bg-emerald-100 text-emerald-800"
                                  : b.status === "Cancelled"
                                  ? "bg-red-100 text-red-800"
                                  : "bg-blue-50 text-blue-800"
                              }`}
                            >
                              {b.status === "CheckedIn" ? "Checked In" : b.status}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 border border-gray-300 text-center font-mono">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                                b.paymentStatus === "Paid"
                                  ? "bg-emerald-50 text-emerald-700"
                                  : "bg-amber-50 text-amber-700"
                              }`}
                            >
                              {b.paymentStatus === "Paid" ? "Paid" : "Pay at Desk"}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 border border-gray-300 text-center font-mono text-gray-300">
                            ____
                          </td>
                          <td className="py-2.5 px-3 border border-gray-300 text-gray-300">
                            __________
                          </td>
                          <td className="py-2.5 px-3 border border-gray-300 text-gray-300">
                            _________________
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Starter Sign-Off Box */}
              <div className="mt-6 pt-4 border-t border-gray-300 flex items-center justify-between text-xs text-ink-soft">
                <div>
                  <span className="font-semibold text-fairway">Starter On Duty: </span>
                  <span className="inline-block border-b border-gray-400 w-48 ml-2" />
                </div>
                <div>
                  <span className="font-semibold text-fairway">Marshal Signature: </span>
                  <span className="inline-block border-b border-gray-400 w-48 ml-2" />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}

