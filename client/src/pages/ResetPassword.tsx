import { useState, useEffect } from "react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import NavBar from "../components/NavBar";
import { authApi } from "../api/auth";

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const emailParam = searchParams.get("email") || "";
  const tokenParam = searchParams.get("token") || "";

  const [email, setEmail] = useState(emailParam);
  const [token, setToken] = useState(tokenParam);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (emailParam) setEmail(emailParam);
    if (tokenParam) setToken(tokenParam);
  }, [emailParam, tokenParam]);

  const hasParams = Boolean(email && token);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !token) {
      setError("Invalid password reset link. Please request a new link.");
      return;
    }

    if (newPassword.length < 6) {
      setError("Password must be at least 6 characters long.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match. Please re-enter.");
      return;
    }

    setError(null);
    setLoading(true);

    try {
      await authApi.resetPassword({
        email: email.trim(),
        token: token.trim(),
        newPassword,
      });
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Password reset failed. The link may be expired.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen">
      <div className="bg-gradient-to-br from-fairway to-turf">
        <NavBar />
      </div>
      <div className="page-shell fade-up">
        <div className="max-w-md mx-auto">
          {success ? (
            <div className="card p-8 text-center space-y-6">
              <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center text-3xl mx-auto shadow-inner">
                ✓
              </div>
              <div className="space-y-2">
                <h1 className="text-2xl font-bold font-display text-fairway tracking-tight">
                  Password reset successfully!
                </h1>
                <p className="text-sm text-ink-soft">
                  Your password has been updated. You can now log in to your account with your new credentials.
                </p>
              </div>

              <button
                type="button"
                onClick={() => navigate("/login")}
                className="btn-primary w-full py-3 text-sm font-semibold"
              >
                Log In Now
              </button>
            </div>
          ) : !hasParams ? (
            <div className="card p-8 text-center space-y-6">
              <div className="w-16 h-16 bg-red-50 text-red-600 rounded-full flex items-center justify-center text-3xl mx-auto shadow-inner">
                ⚠️
              </div>
              <div className="space-y-2">
                <h1 className="text-2xl font-bold font-display text-gray-900 tracking-tight">
                  Invalid or Expired Link
                </h1>
                <p className="text-sm text-ink-soft">
                  This password reset link is missing required security tokens or has expired. Please request a new link.
                </p>
              </div>

              <Link
                to="/forgot-password"
                className="btn-primary w-full py-2.5 text-sm font-semibold inline-block"
              >
                Request New Reset Link
              </Link>
            </div>
          ) : (
            <>
              <div className="eyebrow">Secure Reset</div>
              <h1 className="text-3xl font-semibold tracking-tight text-fairway mb-2">
                Set new password
              </h1>
              <p className="text-sm text-ink-soft mb-8">
                Choose a strong password for <span className="font-semibold text-gray-900">{email}</span>.
              </p>

              <form onSubmit={handleSubmit} className="card p-7 space-y-5">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="label mb-0">New Password</label>
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="text-xs text-ink-soft hover:text-gray-900"
                    >
                      {showPassword ? "Hide" : "Show"}
                    </button>
                  </div>
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="input"
                    placeholder="••••••••"
                    autoFocus
                  />
                  <p className="text-[11px] text-ink-soft mt-1">
                    Minimum 6 characters, including at least 1 uppercase letter and 1 number.
                  </p>
                </div>

                <div>
                  <label className="label">Confirm New Password</label>
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="input"
                    placeholder="••••••••"
                  />
                </div>

                {error && (
                  <p className="text-sm text-[#C0533F] bg-[#C0533F]/8 border border-[#C0533F]/20 rounded-md px-3 py-2">
                    {error}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="btn-primary w-full flex items-center justify-center gap-2"
                >
                  {loading ? "Resetting password..." : "Reset Password & Log In"}
                </button>
              </form>

              <p className="text-sm text-ink-soft mt-6 text-center">
                Back to{" "}
                <Link to="/login" className="text-turf font-medium hover:underline">
                  Log in
                </Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
