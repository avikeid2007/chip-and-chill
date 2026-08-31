import { useEffect, useState } from "react";
import AdminLayout from "../components/AdminLayout";
import { useAuth } from "../api/AuthContext";
import { staffApi, type StaffMember } from "../api/admin";
import NoCourse from "../components/NoCourse";

// Role display config — CourseAdmin maps to "Owner", Staff maps to "Staff"
const ROLE_CONFIG = {
  CourseAdmin: {
    label: "👑 Owner",
    pill: "bg-amber-100 text-amber-800 border border-amber-200",
    canRemove: false,
  },
  Staff: {
    label: "👤 Staff",
    pill: "bg-sky-100 text-sky-800 border border-sky-200",
    canRemove: true,
  },
  SuperAdmin: {
    label: "⚡ Super Admin",
    pill: "bg-purple-100 text-purple-800 border border-purple-200",
    canRemove: false,
  },
  Golfer: {
    label: "🏌️ Golfer",
    pill: "bg-gray-100 text-gray-600 border border-gray-200",
    canRemove: false,
  },
} as const;

export default function StaffAccounts() {
  const { user } = useAuth();
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [inviting, setInviting] = useState(false);

  const isOwner = user?.role === "CourseAdmin" || user?.role === "SuperAdmin";

  useEffect(() => {
    if (!user?.tenantId) return;
    setLoading(true);
    staffApi
      .list(user.tenantId, user.token)
      .then(setStaff)
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load staff."))
      .finally(() => setLoading(false));
  }, [user]);

  async function invite(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !user?.tenantId) return;
    setError(null);
    setInviting(true);
    try {
      const created = await staffApi.invite(
        user.tenantId,
        {
          email,
          firstName: firstName || email.split("@")[0],
          lastName,
          password: password || "ChangeMe123!",
        },
        user.token
      );
      setStaff((prev) => [...prev, created]);
      setEmail("");
      setFirstName("");
      setLastName("");
      setPassword("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to invite staff.");
    } finally {
      setInviting(false);
    }
  }

  async function removeStaff(id: string, name: string) {
    if (!user?.tenantId) return;
    if (!window.confirm(`Remove ${name} from staff?`)) return;
    try {
      await staffApi.remove(user.tenantId, id, user.token);
      setStaff((prev) => prev.filter((s) => s.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to remove staff.");
    }
  }

  if (!user?.tenantId) {
    return (
      <AdminLayout>
        <NoCourse />
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      {/* Page header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <div className="eyebrow">Course management</div>
          <h1 className="text-3xl font-semibold tracking-tight text-fairway">Staff & Roles</h1>
          <p className="text-sm text-ink-soft mt-1">
            Manage who has access to your course dashboard and what they can do.
          </p>
        </div>
        {/* Role legend */}
        <div className="hidden sm:flex flex-col gap-1.5 text-xs text-ink-soft bg-white border border-[#EEF1ED] rounded-xl px-4 py-3 shadow-sm">
          <p className="font-semibold text-fairway text-[11px] uppercase tracking-wider mb-0.5">Role Access</p>
          <div className="flex items-center gap-2">
            <span className="inline-block px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-100 text-amber-800 border border-amber-200">👑 Owner</span>
            <span>Full access — all settings</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-block px-2 py-0.5 rounded-full text-[11px] font-semibold bg-sky-100 text-sky-800 border border-sky-200">👤 Staff</span>
            <span>Operational access only</span>
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl">
          {error}
        </div>
      )}

      {/* Permission matrix info box */}
      <div className="mb-6 bg-[#F8FAF7] border border-[#DDE8D8] rounded-2xl overflow-hidden">
        <div className="px-5 py-3 border-b border-[#DDE8D8] flex items-center gap-2">
          <span className="text-base">🔐</span>
          <span className="text-sm font-semibold text-fairway">What each role can access</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-0 divide-y sm:divide-y-0 sm:divide-x divide-[#DDE8D8]">
          {/* Owner column */}
          <div className="px-5 py-4">
            <p className="text-[11px] font-bold uppercase tracking-widest text-amber-700 mb-2">👑 Owner — Full Access</p>
            <ul className="space-y-1 text-xs text-ink-soft">
              {["Overview & Dashboard", "Tee Sheet", "Bookings & Check-in", "Tournaments", "Range Bays", "Golfers & Members",
                "Course Info & Fees", "Pricing Rules", "Branding & Domain", "Email & SMS Settings", "Payouts & Stripe", "Staff Management"].map((f) => (
                <li key={f} className="flex items-center gap-1.5">
                  <span className="text-emerald-500 text-[10px]">✓</span> {f}
                </li>
              ))}
            </ul>
          </div>
          {/* Staff column */}
          <div className="px-5 py-4">
            <p className="text-[11px] font-bold uppercase tracking-widest text-sky-700 mb-2">👤 Staff — Operational Only</p>
            <ul className="space-y-1 text-xs text-ink-soft">
              {[
                { label: "Overview & Dashboard",    ok: true  },
                { label: "Tee Sheet",               ok: true  },
                { label: "Bookings & Check-in",     ok: true  },
                { label: "Tournaments",             ok: true  },
                { label: "Range Bays",              ok: true  },
                { label: "Golfers & Members",       ok: true  },
                { label: "Course Info & Fees",      ok: false },
                { label: "Pricing Rules",           ok: false },
                { label: "Branding & Domain",       ok: false },
                { label: "Email & SMS Settings",    ok: false },
                { label: "Payouts & Stripe",        ok: false },
                { label: "Staff Management",        ok: false },
              ].map((f) => (
                <li key={f.label} className={`flex items-center gap-1.5 ${!f.ok ? "opacity-40" : ""}`}>
                  <span className={f.ok ? "text-emerald-500 text-[10px]" : "text-red-400 text-[10px]"}>
                    {f.ok ? "✓" : "✕"}
                  </span>
                  {f.label}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Staff list */}
      <div className="card overflow-hidden mb-8">
        <div className="px-5 py-3.5 border-b border-[#EEF1ED] flex items-center justify-between">
          <span className="text-sm font-semibold text-fairway">
            Team Members
          </span>
          <span className="text-xs text-ink-soft">{staff.length} {staff.length === 1 ? "person" : "people"}</span>
        </div>

        {loading ? (
          <div className="px-5 py-6 space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-12 bg-line rounded-xl animate-pulse" />
            ))}
          </div>
        ) : staff.length === 0 ? (
          <div className="px-5 py-10 text-center">
            <div className="text-3xl mb-2">👥</div>
            <p className="text-sm text-ink-soft">No team members yet — invite one below.</p>
          </div>
        ) : (
          staff.map((s) => {
            const name = `${s.firstName} ${s.lastName}`.trim() || s.email;
            const roleCfg = ROLE_CONFIG[s.role as keyof typeof ROLE_CONFIG] ?? ROLE_CONFIG.Staff;
            const canRemove = isOwner && roleCfg.canRemove;
            return (
              <div
                key={s.id}
                className="flex items-center justify-between px-5 py-3.5 border-b border-[#EEF1ED] last:border-b-0 text-sm"
              >
                {/* Avatar + name */}
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-turf/10 text-turf font-semibold text-sm flex items-center justify-center flex-shrink-0">
                    {name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-medium text-fairway flex items-center gap-2">
                      {name}
                      {!s.isActive && (
                        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-red-100 text-red-600">Locked</span>
                      )}
                    </p>
                    <p className="text-xs text-ink-soft">{s.email}</p>
                  </div>
                </div>

                {/* Role badge + remove */}
                <div className="flex items-center gap-3">
                  <span className={`inline-block text-[11px] font-semibold px-2.5 py-1 rounded-full ${roleCfg.pill}`}>
                    {roleCfg.label}
                  </span>
                  {canRemove && (
                    <button
                      onClick={() => removeStaff(s.id, name)}
                      className="text-xs font-medium text-danger hover:underline"
                    >
                      Remove
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Invite form — Owner only */}
      {isOwner ? (
        <div className="card p-5">
          <h2 className="font-semibold text-fairway text-sm mb-1">Invite a staff member</h2>
          <p className="text-xs text-ink-soft mb-4">
            New staff members will have <strong>operational access only</strong> (Tee Sheet, Bookings, Range, Tournaments).
            They won't see course settings, pricing, or billing.
          </p>
          <form onSubmit={invite} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <input
                placeholder="First name"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="input"
              />
              <input
                placeholder="Last name"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="input"
              />
            </div>
            <input
              type="email"
              required
              placeholder="email@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input"
            />
            <input
              type="password"
              placeholder="Initial password (min 8 chars)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input"
            />
            {/* Role indicator — Staff role is always assigned on invite */}
            <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-sky-50 border border-sky-100 text-xs text-sky-700">
              <span>👤</span>
              <span>New member will be added as <strong>Staff</strong>. To make someone an Owner, contact Super Admin.</span>
            </div>
            <button type="submit" className="btn-primary" disabled={inviting}>
              {inviting ? "Creating account…" : "Create staff account"}
            </button>
          </form>
        </div>
      ) : (
        <div className="card p-5 text-center text-sm text-ink-soft">
          <span className="text-2xl block mb-2">🔒</span>
          Only <strong>Owners</strong> can invite or remove staff members.
        </div>
      )}
    </AdminLayout>
  );
}
