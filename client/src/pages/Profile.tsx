import { useState } from "react";
import NavBar from "../components/NavBar";
import { useAuth } from "../api/AuthContext";
import { usersApi } from "../api/users";

export default function Profile() {
  const { user } = useAuth();
  const [firstName, setFirstName] = useState(user?.firstName || "");
  const [lastName, setLastName] = useState(user?.lastName || "");
  const [newPassword, setNewPassword] = useState("");
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!user) {
    return (
      <div className="min-h-screen">
        <div className="bg-gradient-to-br from-fairway to-turf">
          <NavBar />
        </div>
        <div className="max-w-sm mx-auto px-8 py-16 text-center text-ink-soft text-sm">
          You need to be logged in to view your profile.
        </div>
      </div>
    );
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await usersApi.updateMe(
        { firstName, lastName },
        user!.token
      );
      if (newPassword) {
        // Password change requires the current password; prompt inline.
        const currentPassword = window.prompt("Enter your current password to change it:");
        if (currentPassword) {
          await usersApi.changePassword(
            { currentPassword, newPassword },
            user!.token
          );
        }
      }
      setSaved(true);
      setNewPassword("");
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    }
  }

  return (
    <div className="min-h-screen">
      <div className="bg-gradient-to-br from-fairway to-turf">
        <NavBar />
      </div>
      <div className="max-w-sm mx-auto px-8 py-16">
        <div className="text-mono text-xs tracking-widest uppercase text-turf mb-3">Account</div>
        <h1 className="text-3xl font-semibold tracking-tight text-fairway mb-8">Profile settings</h1>

        <form onSubmit={handleSave} className="card p-7 space-y-5">
          <div className="flex items-center gap-4 pb-5 border-b border-line">
            <div className="w-14 h-14 rounded-full hero-gradient text-white flex items-center justify-center font-display text-xl font-semibold">
              {(firstName || user.firstName || "?").charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="font-semibold text-fairway">{`${firstName} ${lastName}`.trim() || user.email}</p>
              <p className="text-xs text-ink-soft">{user.role}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">First name</label>
              <input value={firstName} onChange={(e) => setFirstName(e.target.value)} className="input" />
            </div>
            <div>
              <label className="label">Last name</label>
              <input value={lastName} onChange={(e) => setLastName(e.target.value)} className="input" />
            </div>
          </div>

          <div>
            <label className="label">Email</label>
            <input disabled value={user.email} className="input bg-black/4 text-ink-soft cursor-not-allowed" />
          </div>

          <div className="pt-2 border-t border-line">
            <label className="label mt-4">New password</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Leave blank to keep current password"
              className="input"
            />
          </div>

          {error && (
            <p className="text-sm text-[#C0533F] bg-[#C0533F]/8 border border-[#C0533F]/20 rounded-md px-3 py-2">{error}</p>
          )}

          <button type="submit" className="btn-primary w-full">
            {saved ? "Saved ✓" : "Save changes"}
          </button>
        </form>
      </div>
    </div>
  );
}
