import { Link, useLocation, useNavigate } from "react-router-dom";
import type { ReactNode } from "react";
import Logo from "./Logo";
import { useAuth } from "../api/AuthContext";

// ownerOnly: true  → visible only to CourseAdmin (Owner)
// ownerOnly: false → visible to both Owner and Staff
const ALL_LINKS = [
  { to: "/dashboard",               label: "Overview",         icon: "📊", ownerOnly: false },
  { to: "/dashboard/tee-sheet",     label: "Tee Sheet",        icon: "⛳", ownerOnly: false },
  { to: "/dashboard/bookings",      label: "Bookings",         icon: "📖", ownerOnly: false },
  { to: "/dashboard/tournaments",   label: "Tournaments",      icon: "🏆", ownerOnly: false },
  { to: "/dashboard/range",         label: "Range Bays",       icon: "🎯", ownerOnly: false },
  { to: "/dashboard/golfers",       label: "Golfers & Members",icon: "🏌️", ownerOnly: false },
  // ── Owner-only section ────────────────────────────────────────────
  { to: "/dashboard/reports",      label: "Reports",          icon: "📊", ownerOnly: true  },
  { to: "/dashboard/course",        label: "Course Info",      icon: "🗺️", ownerOnly: true  },
  { to: "/dashboard/pricing",       label: "Pricing Rules",    icon: "🏷️", ownerOnly: true  },
  { to: "/dashboard/branding",      label: "Branding & Domain",icon: "🎨", ownerOnly: true  },
  { to: "/dashboard/notifications", label: "Email & SMS",      icon: "✉️", ownerOnly: true  },
  { to: "/dashboard/payouts",       label: "Payouts & Stripe", icon: "💳", ownerOnly: true  },
  { to: "/dashboard/staff",         label: "Staff",            icon: "👥", ownerOnly: true  },
];

export default function AdminLayout({ children }: { children: ReactNode }) {
  const location = useLocation();
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const isOwner = user?.role === "CourseAdmin" || user?.role === "SuperAdmin";

  // Filter nav: Staff only see ownerOnly:false links
  const visibleLinks = ALL_LINKS.filter((l) => !l.ownerOnly || isOwner);

  // Group links: first the shared ones, then owner-only (separated visually)
  const sharedLinks = visibleLinks.filter((l) => !l.ownerOnly);
  const ownerLinks  = visibleLinks.filter((l) => l.ownerOnly);

  function handleLogout() {
    logout();
    navigate("/login");
  }

  const initial  = (user?.firstName || user?.email || "?").charAt(0).toUpperCase();
  const rolLabel = isOwner ? "👑 Owner" : "👤 Staff";

  function NavLink({ l }: { l: (typeof ALL_LINKS)[0] }) {
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
  }

  return (
    <div className="min-h-screen grid md:grid-cols-[240px_1fr]">
      <aside className="bg-fairway text-white/85 px-5 py-8 flex flex-col md:sticky md:top-0 md:h-screen overflow-y-auto">
        <Link to="/" className="flex items-center text-white mb-8 px-1">
          <Logo size={24} dark showText textSize="text-xl" />
        </Link>

        <nav className="space-y-1 flex-1">
          {/* Shared links — both Owner and Staff */}
          {sharedLinks.map((l) => <NavLink key={l.to} l={l} />)}

          {/* Owner-only section with a subtle divider */}
          {isOwner && ownerLinks.length > 0 && (
            <>
              <div className="pt-3 pb-1 px-3">
                <span className="text-[10px] font-bold uppercase tracking-widest text-white/30">
                  Management
                </span>
              </div>
              {ownerLinks.map((l) => <NavLink key={l.to} l={l} />)}
            </>
          )}
        </nav>

        {/* User card at bottom */}
        <div className="pt-5 mt-5 border-t border-white/10">
          <div className="flex items-center gap-3 px-1 mb-3">
            <div className="w-8 h-8 rounded-full bg-gold text-fairway font-semibold text-sm flex items-center justify-center flex-shrink-0">
              {initial}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-white truncate">
                {user?.firstName || "Course admin"}
              </p>
              {/* Role badge */}
              <span className="inline-block text-[10px] font-semibold px-1.5 py-0.5 rounded bg-white/10 text-white/70 mt-0.5">
                {rolLabel}
              </span>
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
