import { useEffect, useState } from "react";
import AdminLayout from "../components/AdminLayout";
import { useAuth } from "../api/AuthContext";
import { adminApi, type AdminBooking } from "../api/admin";
import NoCourse from "../components/NoCourse";

function formatTime(iso: string): string {
  const d = new Date(iso);
  const h = d.getHours();
  const m = d.getMinutes().toString().padStart(2, "0");
  const ampm = h >= 12 ? "p" : "a";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${m}${ampm}`;
}

function toDateInput(d: Date): string {
  return d.toISOString().slice(0, 10);
}

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
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<(typeof filterTabs)[number]["key"]>("all");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.tenantId) return;
    setLoading(true);
    adminApi
      .allBookings(user.tenantId, user.token, date)
      .then(setBookings)
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load bookings."))
      .finally(() => setLoading(false));
  }, [user, date]);

  async function checkIn(id: string) {
    if (!user?.tenantId) return;
    try {
      await adminApi.checkIn(user.tenantId, id, user.token);
      setBookings((prev) => prev.map((b) => (b.id === id ? { ...b, status: "CheckedIn" } : b)));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to check in.");
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
          <h1 className="text-3xl font-semibold tracking-tight text-fairway">Bookings management</h1>
        </div>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="border border-line rounded-md px-3 py-2 text-sm"
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
        <div className="grid grid-cols-[70px_1fr_90px_120px_160px] text-mono text-xs uppercase tracking-wide text-ink-soft bg-[#FAFBF9] border-b border-[#EEF1ED] px-5 py-2.5">
          <span>Time</span><span>Golfer</span><span>Players</span><span>Status</span><span>Actions</span>
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
            <p className="text-sm text-ink-soft">No bookings found.</p>
          </div>
        ) : (
          filtered.map((b) => (
            <div key={b.id} className="grid grid-cols-[70px_1fr_90px_120px_160px] items-center px-5 py-3 border-b border-[#EEF1ED] last:border-b-0 text-sm row-hover">
              <span className="text-mono font-medium">{formatTime(b.startTime)}</span>
              <span className="font-medium">{b.userName || b.userEmail}</span>
              <span className="text-ink-soft text-xs">{b.partySize}</span>
              <span className={`pill w-fit ${b.status === "CheckedIn" ? "pill-green" : b.status === "Cancelled" ? "pill-red" : "pill-gray"}`}>{b.status}</span>
              <div className="flex gap-3 text-xs font-medium">
                {b.status !== "CheckedIn" && b.status !== "Cancelled" && (
                  <button onClick={() => checkIn(b.id)} className="text-turf hover:underline">Check in</button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </AdminLayout>
  );
}
