import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import AdminLayout from "../components/AdminLayout";
import { useAuth } from "../api/AuthContext";
import { adminApi, type DashboardSummary, type AdminBooking } from "../api/admin";
import { formatTime, toDateInput } from "../utils/time";
import NoCourse from "../components/NoCourse";

const statusColor: Record<string, string> = {
  CheckedIn: "text-turf bg-turf/10",
  Confirmed: "text-ink-soft bg-black/5",
  Cancelled: "text-[#C0533F] bg-[#C0533F]/10",
};

export default function Dashboard() {
  const { user } = useAuth();
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [bookings, setBookings] = useState<AdminBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.tenantId) return;
    setLoading(true);
    const today = toDateInput(new Date());
    Promise.all([
      adminApi.dashboardSummary(user.tenantId, user.token),
      adminApi.allBookings(user.tenantId, user.token, today),
    ])
      .then(([s, b]) => {
        setSummary(s);
        setBookings(b);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load dashboard."))
      .finally(() => setLoading(false));
  }, [user]);

  if (!user?.tenantId) {
    return (
      <AdminLayout>
        <NoCourse />
      </AdminLayout>
    );
  }

  const stats = summary
    ? [
        { label: "Bookings today", value: String(summary.bookingsToday), icon: "📅" },
        { label: "This week", value: String(summary.bookingsThisWeek), icon: "📈" },
        { label: "Occupancy today", value: `${summary.occupancyPercent}%`, icon: "⛳" },
        { label: "Rounds logged", value: String(summary.totalRounds), icon: "🏌️" },
      ]
    : [];

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-8">
        <div>
          <div className="eyebrow mb-0">Course admin</div>
          <h1 className="text-3xl font-semibold tracking-tight text-fairway">Dashboard</h1>
        </div>
        <div className="flex gap-3">
          <Link to="/dashboard/tee-sheet" className="btn-outline">Add tee time</Link>
          <Link to="/dashboard/bookings" className="btn-primary">View bookings</Link>
        </div>
      </div>

      {error && <p className="text-sm text-red-600 mb-4">{error}</p>}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
        {loading
          ? Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="card p-5 animate-pulse">
                <div className="h-8 w-12 bg-line rounded mb-2" />
                <div className="h-3 w-20 bg-line rounded" />
              </div>
            ))
          : stats.map((s) => (
              <div key={s.label} className="card card-hover p-5">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-display text-2xl font-semibold text-fairway">{s.value}</span>
                  <span className="text-lg opacity-70" aria-hidden="true">{s.icon}</span>
                </div>
                <div className="text-xs text-ink-soft">{s.label}</div>
              </div>
            ))}
      </div>

      <h2 className="text-lg font-semibold text-fairway mb-4">Today's tee sheet</h2>
      <div className="card overflow-hidden">
        {loading ? (
          <div className="px-5 py-8 space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-4 bg-line rounded animate-pulse" />
            ))}
          </div>
        ) : bookings.length === 0 ? (
          <div className="px-5 py-10 text-center">
            <div className="text-2xl mb-2">📭</div>
            <p className="text-sm text-ink-soft">No bookings today.</p>
          </div>
        ) : (
          bookings.map((b) => (
            <div key={b.id} className="grid grid-cols-[70px_1fr_80px_110px] items-center px-5 py-3.5 border-b border-[#EEF1ED] last:border-b-0 text-sm row-hover">
              <span className="text-mono font-medium">{formatTime(b.startTime)}</span>
              <span className="font-medium">{b.userName || b.userEmail}</span>
              <span className="text-ink-soft text-xs">{b.partySize} players</span>
              <span className={`text-xs font-medium px-2.5 py-1 rounded-full text-center ${statusColor[b.status]}`}>{b.status}</span>
            </div>
          ))
        )}
      </div>
    </AdminLayout>
  );
}
