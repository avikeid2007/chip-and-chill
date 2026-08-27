import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import NavBar from "../components/NavBar";
import { authApi, type AppRole } from "../api/auth";
import { useAuth } from "../api/AuthContext";

export default function Register() {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<AppRole>("Golfer");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await authApi.register({ email, password, firstName, lastName, role });
      login(res);
      navigate(res.role === "Golfer" ? "/" : "/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed. Please try again.");
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
        <div className="max-w-sm mx-auto">
        <div className="eyebrow">Get started</div>
        <h1 className="text-3xl font-semibold tracking-tight text-fairway mb-8">Create an account</h1>

        <form onSubmit={handleSubmit} className="card p-7 space-y-5">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">First name</label>
              <input required value={firstName} onChange={(e) => setFirstName(e.target.value)} className="input" placeholder="Jane" />
            </div>
            <div>
              <label className="label">Last name</label>
              <input required value={lastName} onChange={(e) => setLastName(e.target.value)} className="input" placeholder="Doe" />
            </div>
          </div>

          <div>
            <label className="label">Email</label>
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="input" placeholder="you@example.com" />
          </div>

          <div>
            <label className="label">Password</label>
            <input type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} className="input" placeholder="••••••••" />
            <p className="text-xs text-ink-soft mt-1">At least 8 characters</p>
          </div>

          <div>
            <label className="label">I am a...</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setRole("Golfer")}
                className={`px-4 py-2.5 rounded-md text-sm font-medium border transition-all ${
                  role === "Golfer"
                    ? "bg-fairway text-white border-fairway shadow-sm"
                    : "border-line text-ink-soft hover:border-turf hover:text-turf"
                }`}
              >
                🏌️ Golfer
              </button>
              <button
                type="button"
                onClick={() => setRole("CourseAdmin")}
                className={`px-4 py-2.5 rounded-md text-sm font-medium border transition-all ${
                  role === "CourseAdmin"
                    ? "bg-fairway text-white border-fairway shadow-sm"
                    : "border-line text-ink-soft hover:border-turf hover:text-turf"
                }`}
              >
                ⛳ Course Owner
              </button>
            </div>
          </div>

          {error && (
            <p className="text-sm text-[#C0533F] bg-[#C0533F]/8 border border-[#C0533F]/20 rounded-md px-3 py-2">{error}</p>
          )}

          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? "Creating account..." : "Create account"}
          </button>
        </form>

        <p className="text-sm text-ink-soft mt-6 text-center">
          Already have an account?{" "}
          <Link to="/login" className="text-turf font-medium">
            Log in
          </Link>
        </p>
        </div>
      </div>
    </div>
  );
}

