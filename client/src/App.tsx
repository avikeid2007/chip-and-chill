import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./api/AuthContext";
import PwaInstallPrompt from "./components/PwaInstallPrompt";

import Landing from "./pages/Landing";
import CourseBrowse from "./pages/CourseBrowse";
import CourseProfile from "./pages/CourseProfile";
import Booking from "./pages/Booking";

import Login from "./pages/Login";
import Register from "./pages/Register";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import Profile from "./pages/Profile";

import MyBookings from "./pages/MyBookings";
import ScorecardEntry from "./pages/ScorecardEntry";
import RoundHistory from "./pages/RoundHistory";
import RoundDetail from "./pages/RoundDetail";
import StatsDashboard from "./pages/StatsDashboard";

import Dashboard from "./pages/Dashboard";
import TeeSheetManager from "./pages/TeeSheetManager";
import PricingRules from "./pages/PricingRules";
import BookingsManagement from "./pages/BookingsManagement";
import CourseEditor from "./pages/CourseEditor";
import BrandingSettings from "./pages/BrandingSettings";
import PayoutSettings from "./pages/PayoutSettings";
import StaffAccounts from "./pages/StaffAccounts";
import CreateCourse from "./pages/CreateCourse";
import RevenueReport from "./pages/RevenueReport";

import Tournaments from "./pages/Tournaments";
import TournamentDetail from "./pages/TournamentDetail";
import TournamentTvLeaderboard from "./pages/TournamentTvLeaderboard";
import RangeBooking from "./pages/RangeBooking";
import TournamentManager from "./pages/TournamentManager";
import RangeManager from "./pages/RangeManager";
import GolferDirectory from "./pages/GolferDirectory";
import NotificationSettings from "./pages/NotificationSettings";

import SuperAdminDashboard from "./pages/SuperAdminDashboard";
import SuperAdminTenants from "./pages/SuperAdminTenants";

function RequireSuperAdmin({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  if (isLoading) {
    return (
      <div className="min-h-screen bg-fairway flex items-center justify-center text-white/80 font-mono text-sm">
        Authenticating...
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== "SuperAdmin") return <Navigate to="/" replace />;
  return <>{children}</>;
}

/** BUG-16 FIX: Guards any route that requires the user to be logged in.
 *  Unauthenticated users are redirected to /login with a `redirect` param so
 *  they land back on the page they wanted after signing in. */
function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  if (isLoading) {
    return (
      <div className="min-h-screen bg-fairway flex items-center justify-center text-white/80 font-mono text-sm">
        Authenticating...
      </div>
    );
  }
  if (!user) return <Navigate to={`/login?redirect=${encodeURIComponent(window.location.pathname)}`} replace />;
  return <>{children}</>;
}

/** Guards routes that require a CourseAdmin, Staff or SuperAdmin role. */
function RequireCourseAdmin({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  if (isLoading) {
    return (
      <div className="min-h-screen bg-fairway flex items-center justify-center text-white/80 font-mono text-sm">
        Authenticating...
      </div>
    );
  }
  if (!user) return <Navigate to={`/login?redirect=${encodeURIComponent(window.location.pathname)}`} replace />;
  if (user.role === "Golfer") return <Navigate to="/" replace />;
  return <>{children}</>;
}

/** Guards routes that are Owner-only (CourseAdmin / SuperAdmin).
 *  Staff users are redirected to /dashboard instead of seeing a blank or broken page. */
function RequireOwner({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  if (isLoading) {
    return (
      <div className="min-h-screen bg-fairway flex items-center justify-center text-white/80 font-mono text-sm">
        Authenticating...
      </div>
    );
  }
  if (!user) return <Navigate to={`/login?redirect=${encodeURIComponent(window.location.pathname)}`} replace />;
  if (user.role === "Golfer") return <Navigate to="/" replace />;
  // Staff can use the dashboard but not owner-only management pages
  if (user.role === "Staff") return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <AuthProvider>
      <PwaInstallPrompt />
      <BrowserRouter>
        <Routes>
          {/* Public */}
          <Route path="/" element={<Landing />} />
          <Route path="/courses" element={<CourseBrowse />} />
          <Route path="/courses/:id" element={<CourseProfile />} />
          <Route path="/courses/:id/book" element={<Booking />} />
          <Route path="/courses/:id/booking" element={<Booking />} />
          <Route path="/booking" element={<Booking />} />
          <Route path="/range" element={<RangeBooking />} />
          <Route path="/tournaments" element={<Tournaments />} />
          <Route path="/tournaments/:id" element={<TournamentDetail />} />
          <Route path="/tournaments/:id/tv" element={<TournamentTvLeaderboard />} />

          {/* Auth & account */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/profile" element={<RequireAuth><Profile /></RequireAuth>} />

          {/* Golfer */}
          <Route path="/bookings" element={<RequireAuth><MyBookings /></RequireAuth>} />
          <Route path="/rounds" element={<RequireAuth><RoundHistory /></RequireAuth>} />
          <Route path="/rounds/new" element={<RequireAuth><ScorecardEntry /></RequireAuth>} />
          <Route path="/rounds/:id" element={<RequireAuth><RoundDetail /></RequireAuth>} />
          <Route path="/stats" element={<RequireAuth><StatsDashboard /></RequireAuth>} />

          {/* Admin */}
          <Route path="/dashboard" element={<RequireCourseAdmin><Dashboard /></RequireCourseAdmin>} />
          <Route path="/dashboard/tee-sheet" element={<RequireCourseAdmin><TeeSheetManager /></RequireCourseAdmin>} />
          <Route path="/dashboard/tournaments" element={<RequireCourseAdmin><TournamentManager /></RequireCourseAdmin>} />
          <Route path="/dashboard/range" element={<RequireCourseAdmin><RangeManager /></RequireCourseAdmin>} />
          <Route path="/dashboard/golfers" element={<RequireCourseAdmin><GolferDirectory /></RequireCourseAdmin>} />
          <Route path="/dashboard/pricing" element={<RequireCourseAdmin><PricingRules /></RequireCourseAdmin>} />
          <Route path="/dashboard/bookings" element={<RequireCourseAdmin><BookingsManagement /></RequireCourseAdmin>} />
          <Route path="/dashboard/reports" element={<RequireOwner><RevenueReport /></RequireOwner>} />
          <Route path="/dashboard/course" element={<RequireOwner><CourseEditor /></RequireOwner>} />
          <Route path="/dashboard/branding" element={<RequireOwner><BrandingSettings /></RequireOwner>} />
          <Route path="/dashboard/notifications" element={<RequireOwner><NotificationSettings /></RequireOwner>} />
          <Route path="/dashboard/payouts" element={<RequireOwner><PayoutSettings /></RequireOwner>} />
          <Route path="/dashboard/pricing" element={<RequireOwner><PricingRules /></RequireOwner>} />
          <Route path="/dashboard/staff" element={<RequireOwner><StaffAccounts /></RequireOwner>} />
          <Route path="/create-course" element={<RequireOwner><CreateCourse /></RequireOwner>} />

          {/* Super Admin */}
          <Route path="/super-admin" element={<RequireSuperAdmin><SuperAdminDashboard /></RequireSuperAdmin>} />
          <Route path="/super-admin/tenants" element={<RequireSuperAdmin><SuperAdminTenants /></RequireSuperAdmin>} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
