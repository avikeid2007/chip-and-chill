import { useState } from "react";
import { Link } from "react-router-dom";
import NavBar from "../components/NavBar";
import { authApi } from "../api/auth";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;

    setError(null);
    setLoading(true);

    try {
      await authApi.forgotPassword(email.trim());
      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send reset email. Please try again.");
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
          {submitted ? (
            <div className="card p-8 text-center space-y-6">
              <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center text-3xl mx-auto shadow-inner">
                ✉️
              </div>
              <div className="space-y-2">
                <h1 className="text-2xl font-bold font-display text-fairway tracking-tight">
                  Check your inbox
                </h1>
                <p className="text-sm text-ink-soft leading-relaxed">
                  If an account exists for <span className="font-semibold text-gray-900">{email}</span>, we have sent a secure password reset link.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-[#F4F6F3] border border-[#E4E8E3] text-xs text-ink-soft text-left space-y-1">
                <p className="font-semibold text-gray-800">Didn't receive the email?</p>
                <p>• Check your Spam or Promotions folder.</p>
                <p>• Make sure the email address is spelled correctly.</p>
                <p>• The reset link remains valid for 2 hours.</p>
              </div>

              <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setSubmitted(false);
                    setEmail("");
                  }}
                  className="text-xs font-semibold text-turf hover:underline py-2"
                >
                  Try another email
                </button>
                <span className="hidden sm:inline text-gray-300">•</span>
                <Link
                  to="/login"
                  className="btn-primary py-2.5 px-6 text-xs text-center font-semibold"
                >
                  Back to Log in
                </Link>
              </div>
            </div>
          ) : (
            <>
              <div className="eyebrow">Account Recovery</div>
              <h1 className="text-3xl font-semibold tracking-tight text-fairway mb-2">
                Forgot password?
              </h1>
              <p className="text-sm text-ink-soft mb-8">
                Enter your email address and we'll send you instructions to safely reset your password.
              </p>

              <form onSubmit={handleSubmit} className="card p-7 space-y-5">
                <div>
                  <label className="label">Your Email Address</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="input"
                    placeholder="you@example.com"
                    autoFocus
                  />
                </div>

                {error && (
                  <p className="text-sm text-[#C0533F] bg-[#C0533F]/8 border border-[#C0533F]/20 rounded-md px-3 py-2">
                    {error}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={loading || !email}
                  className="btn-primary w-full flex items-center justify-center gap-2"
                >
                  {loading ? "Sending link..." : "Send Password Reset Link"}
                </button>
              </form>

              <p className="text-sm text-ink-soft mt-6 text-center">
                Remember your password?{" "}
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
