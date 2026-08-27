import { useEffect, useState } from "react";
import SuperAdminLayout from "../components/SuperAdminLayout";
import { useAuth } from "../api/AuthContext";
import { superAdminApi, type AdminTenant } from "../api/superAdmin";

export default function SuperAdminTenants() {
  const { user } = useAuth();
  const [tenants, setTenants] = useState<AdminTenant[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  function load() {
    if (!user) return;
    setLoading(true);
    superAdminApi
      .tenants(user.token, search || undefined)
      .then(setTenants)
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load tenants."))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    const timeout = setTimeout(load, 250);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, search]);

  async function toggleActive(t: AdminTenant) {
    if (!user) return;
    try {
      await superAdminApi.setTenantStatus(t.id, !t.isActive, user.token);
      setTenants((prev) => prev.map((x) => (x.id === t.id ? { ...x, isActive: !x.isActive } : x)));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update tenant status.");
    }
  }

  return (
    <SuperAdminLayout>
      <div className="eyebrow">Platform</div>
      <h1 className="text-3xl font-semibold tracking-tight text-fairway mb-8">Tenants</h1>

      {error && <p className="text-sm text-red-600 mb-4">{error}</p>}

      <input
        type="text"
        placeholder="Search by name or city..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="input mb-6"
      />

      <div className="card overflow-hidden">
        <div className="grid grid-cols-[1fr_90px_80px_90px_100px_110px] text-mono text-xs uppercase tracking-wide text-ink-soft bg-[#FAFBF9] border-b border-[#EEF1ED] px-5 py-2.5">
          <span>Tenant</span><span>Type</span><span>Staff</span><span>Bookings</span><span>Status</span><span>Actions</span>
        </div>
        {loading ? (
          <div className="px-5 py-6 space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-4 bg-line rounded animate-pulse" />
            ))}
          </div>
        ) : tenants.length === 0 ? (
          <div className="px-5 py-10 text-center">
            <div className="text-2xl mb-2">🏌️</div>
            <p className="text-sm text-ink-soft">No tenants found.</p>
          </div>
        ) : (
          tenants.map((t) => (
            <div key={t.id} className="grid grid-cols-[1fr_90px_80px_90px_100px_110px] items-center px-5 py-3.5 border-b border-[#EEF1ED] last:border-b-0 text-sm row-hover">
              <div>
                <p className="font-medium text-fairway">{t.name}</p>
                <p className="text-xs text-ink-soft">{t.address || "No address"}</p>
              </div>
              <span className="text-ink-soft text-xs">{t.type === "Range" ? "Range" : "Course"}</span>
              <span className="text-mono">{t.staffCount}</span>
              <span className="text-mono">{t.bookingCount}</span>
              <span className={`pill w-fit ${t.isActive ? "pill-green" : "pill-red"}`}>{t.isActive ? "Active" : "Suspended"}</span>
              <button
                onClick={() => toggleActive(t)}
                className={`text-xs font-medium hover:underline text-left ${t.isActive ? "text-danger" : "text-turf"}`}
              >
                {t.isActive ? "Suspend" : "Reactivate"}
              </button>
            </div>
          ))
        )}
      </div>
    </SuperAdminLayout>
  );
}
