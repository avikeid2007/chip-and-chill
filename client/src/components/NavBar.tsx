import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../api/AuthContext";
import Logo from "./Logo";

export default function NavBar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  const isAdmin = user?.role === "CourseAdmin" || user?.role === "Staff" || user?.role === "SuperAdmin";

  return (
    <nav className="flex items-center justify-between px-8 md:px-14 py-7 relative z-10">
      <Link to="/" className="font-display font-semibold text-xl tracking-tight flex items-center gap-2.5 text-white">
        <Logo size={26} dark />
        chip &amp; chill
      </Link>
      <div className="hidden md:flex gap-8 text-sm font-medium text-white/85">
        <Link to="/courses" className="hover:text-white transition-colors">Find a Course</Link>
        <Link to="/tournaments" className="hover:text-white transition-colors">Tournaments</Link>
        <Link to="/for-courses" className="hover:text-white transition-colors">For Course Owners</Link>
      </div>

      {user ? (
        <div className="relative">
          <button
            onClick={() => setMenuOpen((o) => !o)}
            className="flex items-center gap-2 text-white/85 hover:text-white text-sm font-medium"
          >
            Hi, {user.firstName}
            <span className="text-xs">▾</span>
          </button>
          {menuOpen && (
            <div className="absolute right-0 top-9 bg-white rounded-md border border-[#E4E8E3] shadow-lg py-2 w-48 text-sm">
              {isAdmin && (
                <Link to="/dashboard" onClick={() => setMenuOpen(false)} className="block px-4 py-2 text-ink hover:bg-mist">
                  Admin Dashboard
                </Link>
              )}
              <Link to="/bookings" onClick={() => setMenuOpen(false)} className="block px-4 py-2 text-ink hover:bg-mist">
                My Bookings
              </Link>
              <Link to="/rounds" onClick={() => setMenuOpen(false)} className="block px-4 py-2 text-ink hover:bg-mist">
                Round History
              </Link>
              <Link to="/profile" onClick={() => setMenuOpen(false)} className="block px-4 py-2 text-ink hover:bg-mist">
                Profile Settings
              </Link>
              <button
                onClick={() => {
                  logout();
                  setMenuOpen(false);
                  navigate("/");
                }}
                className="block w-full text-left px-4 py-2 text-[#C0533F] hover:bg-mist border-t border-[#EEF1ED] mt-1 pt-2"
              >
                Log out
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="flex items-center gap-3">
          <Link to="/login" className="text-white/85 hover:text-white text-sm font-medium hidden sm:inline">
            Log in
          </Link>
          <Link
            to="/booking"
            className="bg-gold text-fairway px-5 py-2.5 rounded-[3px] font-semibold text-sm hover:-translate-y-px transition-transform hover:shadow-[0_6px_18px_rgba(212,160,23,0.35)]"
          >
            Book a Tee Time
          </Link>
        </div>
      )}
    </nav>
  );
}
