import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./api/AuthContext";

import Landing from "./pages/Landing";
import CourseBrowse from "./pages/CourseBrowse";
import CourseProfile from "./pages/CourseProfile";
import Booking from "./pages/Booking";

import Login from "./pages/Login";
import Register from "./pages/Register";
import ForgotPassword from "./pages/ForgotPassword";
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

import Tournaments from "./pages/Tournaments";
import TournamentDetail from "./pages/TournamentDetail";
import RangeBooking from "./pages/RangeBooking";
import TournamentManager from "./pages/TournamentManager";
import RangeManager from "./pages/RangeManager";
import GolferDirectory from "./pages/GolferDirectory";

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

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public */}
          <Route path="/" element={<Landing />} />
          <Route path="/courses" element={<CourseBrowse />} />
          <Route path="/courses/:id" element={<CourseProfile />} />
          <Route path="/booking" element={<Booking />} />
          <Route path="/range" element={<RangeBooking />} />
          <Route path="/tournaments" element={<Tournaments />} />
          <Route path="/tournaments/:id" element={<TournamentDetail />} />

          {/* Auth & account */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/profile" element={<Profile />} />

          {/* Golfer */}
          <Route path="/bookings" element={<MyBookings />} />
          <Route path="/rounds" element={<RoundHistory />} />
          <Route path="/rounds/new" element={<ScorecardEntry />} />
          <Route path="/rounds/:id" element={<RoundDetail />} />
          <Route path="/stats" element={<StatsDashboard />} />

          {/* Admin */}
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/dashboard/tee-sheet" element={<TeeSheetManager />} />
          <Route path="/dashboard/tournaments" element={<TournamentManager />} />
          <Route path="/dashboard/range" element={<RangeManager />} />
          <Route path="/dashboard/golfers" element={<GolferDirectory />} />
          <Route path="/dashboard/pricing" element={<PricingRules />} />
          <Route path="/dashboard/bookings" element={<BookingsManagement />} />
          <Route path="/dashboard/course" element={<CourseEditor />} />
          <Route path="/dashboard/branding" element={<BrandingSettings />} />
          <Route path="/dashboard/payouts" element={<PayoutSettings />} />
          <Route path="/dashboard/staff" element={<StaffAccounts />} />
          <Route path="/create-course" element={<CreateCourse />} />

          {/* Super Admin */}
          <Route path="/super-admin" element={<RequireSuperAdmin><SuperAdminDashboard /></RequireSuperAdmin>} />
          <Route path="/super-admin/tenants" element={<RequireSuperAdmin><SuperAdminTenants /></RequireSuperAdmin>} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
