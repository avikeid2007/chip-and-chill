import { useEffect, useState } from "react";
import AdminLayout from "../components/AdminLayout";
import { useAuth } from "../api/AuthContext";
import { staffApi, type StaffMember } from "../api/admin";
import NoCourse from "../components/NoCourse";

export default function StaffAccounts() {
  const { user } = useAuth();
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

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
      <div className="eyebrow">Course admin</div>
      <h1 className="text-3xl font-semibold tracking-tight text-fairway mb-8">Staff accounts</h1>

      {error && <p className="text-sm text-red-600 mb-4">{error}</p>}

      <div className="card overflow-hidden mb-8">
        {loading ? (
          <div className="px-5 py-6 space-y-3">
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="h-4 bg-line rounded animate-pulse" />
            ))}
          </div>
        ) : staff.length === 0 ? (
          <div className="px-5 py-10 text-center">
            <div className="text-2xl mb-2">👥</div>
            <p className="text-sm text-ink-soft">No staff accounts yet — invite one below.</p>
          </div>
        ) : (
          staff.map((s) => {
            const name = `${s.firstName} ${s.lastName}`.trim() || s.email;
            return (
              <div key={s.id} className="flex items-center justify-between px-5 py-3.5 border-b border-[#EEF1ED] last:border-b-0 text-sm row-hover">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-turf/10 text-turf font-semibold text-sm flex items-center justify-center flex-shrink-0">
                    {name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-medium text-fairway">{name}</p>
                    <p className="text-xs text-ink-soft">{s.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span className="pill pill-gray">Staff</span>
                  <button onClick={() => removeStaff(s.id, name)} className="text-xs font-medium text-danger hover:underline">
                    Remove
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="card p-5">
        <h2 className="font-semibold text-fairway text-sm mb-4">Invite staff member</h2>
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
          <button type="submit" className="btn-primary">
            Create staff account
          </button>
        </form>
      </div>
    </AdminLayout>
  );
}
