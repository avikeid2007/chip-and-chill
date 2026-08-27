import { useState } from "react";
import { Link } from "react-router-dom";
import NavBar from "../components/NavBar";
import { authApiExtended } from "../api/users";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [resetToken, setResetToken] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [resetDone, setResetDone] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      const res = await authApiExtended.forgotPassword(email);
      // MVP: the API returns the reset token directly (no email provider yet).
      setResetToken(res.token ?? null);
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    }
  }

  async function handleReset(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await authApiExtended.resetPassword(email, resetToken!, newPassword);
      setResetDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    }
  }

  return (
    <div className="min-h-screen">
      <div className="bg-gradient-to-br from-fairway to-turf">
        <NavBar />
      </div>
      <div className="page-shell fade-up">
        <div className="max-w-sm mx-auto">
        <div className="eyebrow">Account recovery</div>
        <h1 className="text-3xl font-semibold tracking-tight text-fairway mb-8">Reset your password</h1>

        {resetDone ? (
          <div className="bg-white border border-[#E4E8E3] rounded-md p-6">
            <p className="text-sm text-ink-soft">
              Password reset successfully. You can now{" "}
              <Link to="/login" className="text-turf font-medium">log in</Link> with your new password.
            </p>
          </div>
        ) : sent && resetToken ? (
          <form onSubmit={handleReset} className="card p-7 space-y-5">
            <div className="bg-turf/6 border border-line rounded-md p-4">
              <p className="text-xs text-ink-soft">
                No email provider is configured in this environment, so your reset token is shown below.
              </p>
              <code className="block mt-2 text-xs bg-black/5 p-2 rounded break-all">{resetToken}</code>
            </div>
            <div>
              <label className="label">New password</label>
              <input
                type="password"
                required
                minLength={8}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="input"
                placeholder="••••••••"
              />
            </div>
            {error && (
              <p className="text-sm text-[#C0533F] bg-[#C0533F]/8 border border-[#C0533F]/20 rounded-md px-3 py-2">{error}</p>
            )}
            <button type="submit" className="btn-primary w-full">Set new password</button>
          </form>
        ) : sent ? (
          <div className="card p-7">
            <div className="w-11 h-11 rounded-full bg-turf/10 text-turf flex items-center justify-center mx-auto mb-4 text-xl">✉️</div>
            <p className="text-sm text-ink-soft text-center">
              If an account exists for <span className="font-medium text-ink">{email}</span>, a reset link is on its way.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="card p-7 space-y-5">
            <div>
              <label className="label">Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input"
                placeholder="you@example.com"
              />
            </div>
            {error && (
              <p className="text-sm text-[#C0533F] bg-[#C0533F]/8 border border-[#C0533F]/20 rounded-md px-3 py-2">{error}</p>
            )}
            <button type="submit" className="btn-primary w-full">Send reset link</button>
          </form>
        )}

        <p className="text-sm text-ink-soft mt-6 text-center">
          <Link to="/login" className="text-turf font-medium">
            Back to log in
          </Link>
        </p>
        </div>
      </div>
    </div>
  );
}
