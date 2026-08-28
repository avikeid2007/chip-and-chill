import { useEffect, useState } from "react";
import AdminLayout from "../components/AdminLayout";
import { useAuth } from "../api/AuthContext";
import { adminApi, type AdminBooking } from "../api/admin";
import { paymentsApi } from "../api/payments";
import { courseApi } from "../api/course";
import { formatTime, toDateInput } from "../utils/time";
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
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<(typeof filterTabs)[number]["key"]>("all");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.tenantId) return;
    courseApi.getTenant(user.tenantId).then((t) => {
      if (t.currencySymbol) setCurrencySymbol(t.currencySymbol);
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
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to check in.");
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
    } catch (err: any) {
      alert(err?.message || "Failed to process refund.");
    }
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
        </div>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="border border-line rounded-md px-3 py-2 text-sm bg-white font-mono"
        />
      </div>

      {error && <p className="text-sm text-red-600 mb-4">{error}</p>}

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

      <div className="card overflow-hidden">
        <div className="grid grid-cols-[70px_1fr_80px_110px_110px_140px] text-mono text-xs uppercase tracking-wide text-ink-soft bg-[#FAFBF9] border-b border-[#EEF1ED] px-5 py-2.5">
          <span>Time</span>
          <span>Golfer</span>
          <span>Players</span>
          <span>Status</span>
          <span>Payment</span>
          <span>Actions</span>
        </div>
        {loading ? (
          <div className="px-5 py-6 space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-4 bg-line rounded animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="px-5 py-10 text-center">
            <div className="text-2xl mb-2">📭</div>
            <p className="text-sm text-ink-soft">No bookings found for this date.</p>
          </div>
        ) : (
          filtered.map((b) => (
            <div
              key={b.id}
              className="grid grid-cols-[70px_1fr_80px_110px_110px_140px] items-center px-5 py-3 border-b border-[#EEF1ED] last:border-b-0 text-sm row-hover"
            >
              <span className="text-mono font-medium">{formatTime(b.startTime)}</span>
              <div className="min-w-0 pr-2">
                <p className="font-medium text-fairway truncate">{b.userName || "Golfer"}</p>
                <p className="text-xs text-ink-soft truncate font-mono">{b.userEmail}</p>
              </div>
              <span className="text-ink-soft text-xs">{b.partySize}</span>
              <span
                className={`pill w-fit ${
                  b.status === "CheckedIn" ? "pill-green" : b.status === "Cancelled" ? "pill-red" : "pill-gray"
                }`}
              >
                {b.status}
              </span>
              <div>
                {b.paymentStatus === "Paid" ? (
                  <span className="text-[11px] font-semibold text-green-800 bg-green-100 px-2 py-0.5 rounded-full">
                    Paid ({currencySymbol}{(b.amountPaid || (b.price * b.partySize)).toFixed(0)})
                  </span>
                ) : b.paymentStatus === "Refunded" ? (
                  <span className="text-[11px] font-semibold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full">
                    Refunded
                  </span>
                ) : (
                  <span className="text-[11px] font-medium text-fairway/60 bg-sand px-2 py-0.5 rounded-full">
                    Unpaid
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 text-xs font-medium">
                {b.status !== "CheckedIn" && b.status !== "Cancelled" && (
                  <button
                    onClick={() => checkIn(b.id)}
                    className="text-turf hover:underline font-semibold"
                  >
                    Check in
                  </button>
                )}
                {b.paymentStatus === "Paid" && (
                  <button
                    onClick={() => refundBooking(b.id, b.amountPaid || (b.price * b.partySize))}
                    className="text-[#C0533F] hover:underline"
                  >
                    Refund
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </AdminLayout>
  );
}
