import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../api/AuthContext";

export default function MobileBottomNav() {
  const { user } = useAuth();
  const location = useLocation();

  // If user is Admin or SuperAdmin, dashboard navigation is handled in their respective layouts
  const isAdmin = user?.role === "CourseAdmin" || user?.role === "SuperAdmin" || user?.role === "Staff";
  if (isAdmin) return null;

  const currentPath = location.pathname;

  const navItems = [
    {
      to: "/booking",
      label: "Book",
      icon: (active: boolean) => (
        <svg className={`w-5 h-5 ${active ? "text-emerald-400" : "text-gray-400"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={active ? 2.5 : 1.8} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      ),
      active: currentPath === "/booking" || currentPath === "/range" || currentPath === "/courses",
    },
    {
      to: "/rounds/new",
      label: "Scorecard",
      icon: (active: boolean) => (
        <svg className={`w-5 h-5 ${active ? "text-emerald-400" : "text-gray-400"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={active ? 2.5 : 1.8} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
        </svg>
      ),
      active: currentPath === "/rounds/new" || currentPath.startsWith("/rounds/"),
    },
    {
      to: user ? "/bookings" : "/login",
      label: "My Passes",
      icon: (active: boolean) => (
        <svg className={`w-5 h-5 ${active ? "text-emerald-400" : "text-gray-400"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={active ? 2.5 : 1.8} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
        </svg>
      ),
      active: currentPath === "/bookings",
    },
    {
      to: user ? "/stats" : "/login",
      label: "Stats",
      icon: (active: boolean) => (
        <svg className={`w-5 h-5 ${active ? "text-emerald-400" : "text-gray-400"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={active ? 2.5 : 1.8} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      ),
      active: currentPath === "/stats" || currentPath === "/rounds",
    },
    {
      to: user ? "/profile" : "/login",
      label: "Passport",
      icon: (active: boolean) => (
        <svg className={`w-5 h-5 ${active ? "text-emerald-400" : "text-gray-400"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={active ? 2.5 : 1.8} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      ),
      active: currentPath === "/profile",
    },
  ];

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-[#0B2A1E]/95 backdrop-blur-xl border-t border-white/10 px-3 pt-2 pb-5 shadow-[0_-8px_30px_rgba(0,0,0,0.3)]">
      <div className="flex items-center justify-around max-w-md mx-auto">
        {navItems.map((item) => (
          <Link
            key={item.to}
            to={item.to}
            className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition-all duration-200 ${
              item.active
                ? "text-white font-bold scale-105"
                : "text-gray-400 hover:text-white/80 font-medium"
            }`}
          >
            <div className="relative">
              {item.icon(item.active)}
              {item.active && (
                <span className="absolute -top-1 -right-1 w-1.5 h-1.5 rounded-full bg-gold shadow-[0_0_8px_#D4A017]" />
              )}
            </div>
            <span className={`text-[10px] tracking-tight mt-1 ${item.active ? "text-gold font-bold" : "text-gray-300"}`}>
              {item.label}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
