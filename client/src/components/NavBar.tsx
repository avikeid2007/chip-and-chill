import { useState, useRef, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../api/AuthContext";
import Logo from "./Logo";
import MobileBottomNav from "./MobileBottomNav";

export default function NavBar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const isAdmin =
    user?.role === "CourseAdmin" ||
    user?.role === "Staff" ||
    user?.role === "SuperAdmin";

  const isGolfer = user?.role === "Golfer";

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileOpen(false);
    setMenuOpen(false);
  }, [location.pathname]);

  function handleLogout() {
    logout();
    setMenuOpen(false);
    setMobileOpen(false);
    navigate("/");
  }

  // ── Nav links depend on role ──────────────────────────────────────────────
  const publicLinks = [
    { to: "/courses", label: "Find a Course" },
    { to: "/tournaments", label: "Tournaments" },
    { to: "/range", label: "Driving Range" },
  ];

  const golferLinks = [
    { to: "/courses", label: "Find a Course" },
    { to: "/tournaments", label: "Tournaments" },
    { to: "/range", label: "Driving Range" },
    { to: "/bookings", label: "My Bookings" },
    { to: "/rounds", label: "My Rounds" },
  ];

  const adminLinks = [
    { to: "/dashboard", label: "Overview" },
    { to: "/dashboard/tee-sheet", label: "Tee Sheet" },
    { to: "/dashboard/tournaments", label: "Tournaments" },
    { to: "/dashboard/golfers", label: "Golfers" },
    { to: "/dashboard/range", label: "Range" },
  ];

  const navLinks = isAdmin ? adminLinks : isGolfer ? golferLinks : publicLinks;

  // ── Avatar initial ────────────────────────────────────────────────────────
  const initial = user
    ? (user.firstName || user.email || "?").charAt(0).toUpperCase()
    : null;

  // ── Role badge ────────────────────────────────────────────────────────────
  const roleBadge = isAdmin
    ? { label: "Admin", cls: "bg-gold text-fairway" }
    : isGolfer
    ? { label: "Golfer", cls: "bg-white/20 text-white" }
    : null;

  return (
    <nav className="relative z-20">
      {/* Main bar */}
      <div className="flex items-center justify-between px-6 md:px-14 py-5">
        {/* Logo */}
        <Link
          to="/"
          className="flex items-center text-white flex-shrink-0 group"
        >
          <Logo size={28} dark showText textSize="text-2xl" />
        </Link>

        {/* Desktop center links */}
        <div className="hidden lg:flex items-center gap-1">
          {navLinks.map((link) => {
            const active = location.pathname === link.to;
            return (
              <Link
                key={link.to}
                to={link.to}
                className={`px-3.5 py-2 rounded-lg text-sm font-medium transition-all ${
                  active
                    ? "bg-white/15 text-white"
                    : "text-white/80 hover:text-white hover:bg-white/10"
                }`}
              >
                {link.label}
              </Link>
            );
          })}

          {/* "For Course Owners" only for guests */}
          {!user && (
            <Link
              to="/create-course"
              className="px-3.5 py-2 rounded-lg text-sm font-medium text-white/80 hover:text-white hover:bg-white/10 transition-all"
            >
              For Owners
            </Link>
          )}

          {/* Admin: More link */}
          {isAdmin && (
            <Link
              to="/dashboard/bookings"
              className={`px-3.5 py-2 rounded-lg text-sm font-medium transition-all ${
                location.pathname === "/dashboard/bookings"
                  ? "bg-white/15 text-white"
                  : "text-white/80 hover:text-white hover:bg-white/10"
              }`}
            >
              Bookings
            </Link>
          )}
        </div>

        {/* Right side */}
        <div className="flex items-center gap-2">
          {user ? (
            // ── Logged-in user avatar + dropdown ───────────────────────────
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setMenuOpen((o) => !o)}
                className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl hover:bg-white/10 transition-all text-white group"
                aria-label="Account menu"
              >
                {/* Avatar circle */}
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0 ${
                    isAdmin ? "bg-gold text-fairway" : "bg-white/25 text-white"
                  }`}
                >
                  {initial}
                </div>
                <div className="hidden sm:block text-left">
                  <div className="text-sm font-semibold leading-tight text-white">
                    {user.firstName}
                  </div>
                  {roleBadge && (
                    <div
                      className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none inline-block mt-0.5 ${roleBadge.cls}`}
                    >
                      {roleBadge.label}
                    </div>
                  )}
                </div>
                <svg
                  className={`w-4 h-4 text-white/70 transition-transform duration-200 hidden sm:block ${
                    menuOpen ? "rotate-180" : ""
                  }`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {/* Dropdown panel */}
              {menuOpen && (
                <div className="absolute right-0 top-12 bg-white rounded-2xl border border-[#E4E8E3] shadow-xl py-2 w-56 text-sm z-50 overflow-hidden">
                  {/* User info header */}
                  <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
                    <p className="font-semibold text-gray-900 text-sm">
                      {user.firstName} {user.lastName}
                    </p>
                    <p className="text-[11px] text-gray-500 truncate">{user.email}</p>
                    {roleBadge && (
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full mt-1 inline-block ${
                          isAdmin
                            ? "bg-amber-100 text-amber-800"
                            : "bg-emerald-100 text-emerald-800"
                        }`}
                      >
                        {roleBadge.label}
                      </span>
                    )}
                  </div>

                  {/* Admin section */}
                  {isAdmin && (
                    <>
                      <div className="px-4 pt-2 pb-1">
                        <p className="text-[10px] font-mono uppercase tracking-widest text-gray-400">
                          Course Admin
                        </p>
                      </div>
                      <Link
                        to="/dashboard"
                        className="flex items-center gap-3 px-4 py-2.5 text-gray-700 hover:bg-gray-50 transition-colors"
                      >
                        <span>📊</span>
                        <span>Dashboard Overview</span>
                      </Link>
                      <Link
                        to="/dashboard/tee-sheet"
                        className="flex items-center gap-3 px-4 py-2.5 text-gray-700 hover:bg-gray-50 transition-colors"
                      >
                        <span>⛳</span>
                        <span>Tee Sheet</span>
                      </Link>
                      <Link
                        to="/dashboard/golfers"
                        className="flex items-center gap-3 px-4 py-2.5 text-gray-700 hover:bg-gray-50 transition-colors"
                      >
                        <span>🏌️</span>
                        <span>Golfers &amp; Members</span>
                      </Link>
                      <Link
                        to="/dashboard/tournaments"
                        className="flex items-center gap-3 px-4 py-2.5 text-gray-700 hover:bg-gray-50 transition-colors"
                      >
                        <span>🏆</span>
                        <span>Tournaments</span>
                      </Link>
                      <div className="mx-4 my-1 border-t border-gray-100" />
                    </>
                  )}

                  {/* SuperAdmin section */}
                  {user.role === "SuperAdmin" && (
                    <>
                      <Link
                        to="/super-admin"
                        className="flex items-center gap-3 px-4 py-2.5 text-purple-700 hover:bg-purple-50 transition-colors font-semibold"
                      >
                        <span>⚡</span>
                        <span>Super Admin Panel</span>
                      </Link>
                      <div className="mx-4 my-1 border-t border-gray-100" />
                    </>
                  )}

                  {/* Golfer section */}
                  {isGolfer && (
                    <>
                      <div className="px-4 pt-2 pb-1">
                        <p className="text-[10px] font-mono uppercase tracking-widest text-gray-400">
                          My Golf
                        </p>
                      </div>
                      <Link
                        to="/bookings"
                        className="flex items-center gap-3 px-4 py-2.5 text-gray-700 hover:bg-gray-50 transition-colors"
                      >
                        <span>📋</span>
                        <span>My Bookings</span>
                      </Link>
                      <Link
                        to="/rounds"
                        className="flex items-center gap-3 px-4 py-2.5 text-gray-700 hover:bg-gray-50 transition-colors"
                      >
                        <span>🎯</span>
                        <span>Round History</span>
                      </Link>
                      <Link
                        to="/stats"
                        className="flex items-center gap-3 px-4 py-2.5 text-gray-700 hover:bg-gray-50 transition-colors"
                      >
                        <span>📈</span>
                        <span>My Stats</span>
                      </Link>
                      <div className="mx-4 my-1 border-t border-gray-100" />
                    </>
                  )}

                  {/* Account settings for everyone */}
                  <Link
                    to="/profile"
                    className="flex items-center gap-3 px-4 py-2.5 text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    <span>⚙️</span>
                    <span>Profile &amp; Settings</span>
                  </Link>

                  {/* Logout */}
                  <button
                    onClick={handleLogout}
                    className="flex items-center gap-3 w-full px-4 py-2.5 text-red-600 hover:bg-red-50 transition-colors border-t border-gray-100 mt-1"
                  >
                    <span>→</span>
                    <span>Sign Out</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            // ── Guest buttons ───────────────────────────────────────────────
            <div className="flex items-center gap-2">
              <Link
                to="/login"
                className="hidden sm:inline px-4 py-2 rounded-xl text-white/85 hover:text-white hover:bg-white/10 text-sm font-medium transition-all"
              >
                Log in
              </Link>
              <Link
                to="/register"
                className="hidden sm:inline px-4 py-2 rounded-xl bg-white/15 text-white hover:bg-white/25 text-sm font-medium transition-all border border-white/20"
              >
                Sign up
              </Link>
              <Link
                to="/courses"
                className="px-4 py-2 rounded-xl bg-gold text-fairway font-semibold text-sm hover:-translate-y-px transition-all hover:shadow-[0_6px_18px_rgba(212,160,23,0.35)]"
              >
                Book a Tee
              </Link>
            </div>
          )}

          {/* Mobile hamburger */}
          <button
            onClick={() => setMobileOpen((o) => !o)}
            className="lg:hidden ml-1 p-2 rounded-lg hover:bg-white/10 transition-colors text-white"
            aria-label="Open menu"
          >
            {mobileOpen ? (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Mobile slide-down menu */}
      {mobileOpen && (
        <div className="lg:hidden border-t border-white/10 bg-fairway/95 backdrop-blur-sm px-4 py-4 space-y-1">
          {navLinks.map((link) => {
            const active = location.pathname === link.to;
            return (
              <Link
                key={link.to}
                to={link.to}
                onClick={() => setMobileOpen(false)}
                className={`flex items-center px-4 py-3 rounded-xl text-sm font-medium transition-colors ${
                  active
                    ? "bg-white/15 text-white"
                    : "text-white/80 hover:text-white hover:bg-white/10"
                }`}
              >
                {link.label}
              </Link>
            );
          })}

          {!user && (
            <Link
              to="/create-course"
              onClick={() => setMobileOpen(false)}
              className="flex items-center px-4 py-3 rounded-xl text-sm font-medium text-white/80 hover:text-white hover:bg-white/10 transition-colors"
            >
              For Course Owners
            </Link>
          )}

          {isAdmin && (
            <>
              <Link
                to="/dashboard/bookings"
                onClick={() => setMobileOpen(false)}
                className="flex items-center px-4 py-3 rounded-xl text-sm font-medium text-white/80 hover:text-white hover:bg-white/10 transition-colors"
              >
                Bookings
              </Link>
              <div className="mx-4 border-t border-white/10 my-1" />
              <Link
                to="/dashboard"
                onClick={() => setMobileOpen(false)}
                className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold text-gold hover:bg-white/10 transition-colors"
              >
                📊 Full Admin Dashboard
              </Link>
            </>
          )}

          {!user && (
            <div className="flex gap-2 pt-3 border-t border-white/10 mt-2">
              <Link
                to="/login"
                onClick={() => setMobileOpen(false)}
                className="flex-1 text-center px-4 py-2.5 rounded-xl border border-white/20 text-white text-sm font-medium hover:bg-white/10 transition-colors"
              >
                Log in
              </Link>
              <Link
                to="/register"
                onClick={() => setMobileOpen(false)}
                className="flex-1 text-center px-4 py-2.5 rounded-xl bg-gold text-fairway text-sm font-semibold hover:bg-gold/90 transition-colors"
              >
                Sign up
              </Link>
            </div>
          )}

          {user && (
            <div className="pt-3 border-t border-white/10 mt-2 space-y-1">
              <Link
                to="/profile"
                onClick={() => setMobileOpen(false)}
                className="flex items-center px-4 py-3 rounded-xl text-sm font-medium text-white/80 hover:text-white hover:bg-white/10 transition-colors"
              >
                ⚙️ Profile &amp; Settings
              </Link>
              <button
                onClick={handleLogout}
                className="w-full flex items-center px-4 py-3 rounded-xl text-sm font-medium text-red-300 hover:text-red-200 hover:bg-white/5 transition-colors"
              >
                → Sign Out
              </button>
            </div>
          )}
        </div>
      )}
      <MobileBottomNav />
    </nav>
  );
}
