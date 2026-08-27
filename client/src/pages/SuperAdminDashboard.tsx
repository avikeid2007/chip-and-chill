import { useEffect, useState } from "react";
import SuperAdminLayout from "../components/SuperAdminLayout";
import { useAuth } from "../api/AuthContext";
import { superAdminApi, type PlatformStats } from "../api/superAdmin";

export default function SuperAdminDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    superAdminApi
      .stats(user.token)
      .then(setStats)
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load platform stats."))
      .finally(() => setLoading(false));
  }, [user]);

  const cards = stats
    ? [
        { label: "Tenants", value: String(stats.totalTenants), icon: "🏌️" },
        { label: "Active tenants", value: String(stats.activeTenants), icon: "✅" },
        { label: "Golfers", value: String(stats.totalGolfers), icon: "⛳" },
        { label: "Course admins", value: String(stats.totalCourseAdmins), icon: "🧑‍💼" },
        { label: "Staff", value: String(stats.totalStaff), icon: "👥" },
        { label: "Total bookings", value: String(stats.totalBookings), icon: "📖" },
        { label: "Rounds logged", value: String(stats.totalRounds), icon: "📊" },
      ]
    : [];

  return (
    <SuperAdminLayout>
      <div className="eyebrow">Platform</div>
      <h1 className="text-3xl font-semibold tracking-tight text-fairway mb-8">Overview</h1>

      {error && <p className="text-sm text-red-600 mb-4">{error}</p>}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {loading
          ? Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="card p-5 animate-pulse">
                <div className="h-8 w-12 bg-line rounded mb-2" />
                <div className="h-3 w-20 bg-line rounded" />
              </div>
            ))
          : cards.map((c) => (
              <div key={c.label} className="card card-hover p-5">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-display text-2xl font-semibold text-fairway">{c.value}</span>
                  <span className="text-lg opacity-70" aria-hidden="true">{c.icon}</span>
                </div>
                <div className="text-xs text-ink-soft">{c.label}</div>
              </div>
            ))}
      </div>
    </SuperAdminLayout>
  );
}
