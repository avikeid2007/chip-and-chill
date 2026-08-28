import { Link, useLocation, useNavigate } from "react-router-dom";
import type { ReactNode } from "react";
import Logo from "./Logo";
import { useAuth } from "../api/AuthContext";

const links = [
  { to: "/dashboard", label: "Overview", icon: "📊" },
  { to: "/dashboard/tee-sheet", label: "Tee Sheet", icon: "⛳" },
  { to: "/dashboard/tournaments", label: "Tournaments", icon: "🏆" },
  { to: "/dashboard/range", label: "Range Bays", icon: "🎯" },
  { to: "/dashboard/golfers", label: "Golfers & Members", icon: "🏌️" },
  { to: "/dashboard/pricing", label: "Pricing Rules", icon: "🏷️" },
  { to: "/dashboard/bookings", label: "Bookings", icon: "📖" },
  { to: "/dashboard/course", label: "Course Info", icon: "🗺️" },
  { to: "/dashboard/branding", label: "Branding & Domain", icon: "🎨" },
  { to: "/dashboard/payouts", label: "Payouts & Stripe", icon: "💳" },
  { to: "/dashboard/staff", label: "Staff", icon: "👥" },
];

export default function AdminLayout({ children }: { children: ReactNode }) {
  const location = useLocation();
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate("/login");
  }

  const initial = (user?.firstName || user?.email || "?").charAt(0).toUpperCase();

  return (
    <div className="min-h-screen grid md:grid-cols-[240px_1fr]">
      <aside className="bg-fairway text-white/85 px-5 py-8 flex flex-col md:sticky md:top-0 md:h-screen">
        <Link to="/" className="font-display font-semibold text-lg text-white flex items-center gap-2 mb-10 px-1">
          <Logo size={22} dark />
          chip &amp; chill
        </Link>
        <nav className="space-y-1 flex-1">
          {links.map((l) => {
            const active = location.pathname === l.to;
            return (
              <Link
                key={l.to}
                to={l.to}
                className={`flex items-center gap-2.5 px-3 py-2.5 rounded-md text-sm font-medium transition-colors border-l-2 ${
                  active
                    ? "bg-white/10 text-white border-gold"
                    : "border-transparent hover:bg-white/5 hover:text-white"
                }`}
              >
                <span className="text-base leading-none" aria-hidden="true">{l.icon}</span>
                {l.label}
              </Link>
            );
          })}
        </nav>
        <div className="pt-5 mt-5 border-t border-white/10">
          <div className="flex items-center gap-3 px-1 mb-3">
            <div className="w-8 h-8 rounded-full bg-gold text-fairway font-semibold text-sm flex items-center justify-center flex-shrink-0">
              {initial}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-white truncate">{user?.firstName || "Course admin"}</p>
              <p className="text-xs text-white/50 truncate">{user?.email}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full text-left px-3 py-2 rounded-md text-sm font-medium text-white/70 hover:bg-white/5 hover:text-white transition-colors"
          >
            Log out
          </button>
        </div>
      </aside>
      <main className="bg-mist">
        <div className="max-w-5xl mx-auto px-8 md:px-12 py-12">{children}</div>
      </main>
    </div>
  );
}

