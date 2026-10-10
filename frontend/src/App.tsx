import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './stores/authStore';
import type { Role } from './types';
import { ToastContainer } from './components/ui/Toast';

// ── Auth / Public ─────────────────────────────────────────────────────────────
import LandingPage          from './pages/LandingPage';
import LoginPage            from './pages/LoginPage';
import RegisterPage         from './pages/RegisterPage';
import ForgotPasswordPage   from './pages/ForgotPasswordPage';

// ── Layouts ───────────────────────────────────────────────────────────────────
import CitizenLayout        from './layouts/CitizenLayout';
import OfficerLayout        from './layouts/OfficerLayout';
import OfficeAdminLayout    from './layouts/OfficeAdminLayout';
import CentralAdminLayout   from './layouts/CentralAdminLayout';
import SuperAdminLayout     from './layouts/SuperAdminLayout';

// ── Citizen ───────────────────────────────────────────────────────────────────
import CitizenHomePage        from './pages/citizen/CitizenHomePage';
import FindServicesPage       from './pages/citizen/FindServicesPage';
import OfficeDetailPage       from './pages/citizen/OfficeDetailPage';
import CitizenTokenPage       from './pages/citizen/CitizenTokenPage';
import CitizenHistoryPage     from './pages/citizen/CitizenHistoryPage';
import NotificationsPage      from './pages/citizen/NotificationsPage';
import ProfilePage            from './pages/citizen/ProfilePage';
import GovernmentOfficesPage  from './pages/citizen/GovernmentOfficesPage';
import AboutPage              from './pages/citizen/AboutPage';
import FeedbackPage           from './pages/citizen/FeedbackPage';
import HelpSupportPage        from './pages/citizen/HelpSupportPage';

// ── Officer ───────────────────────────────────────────────────────────────────
import OfficerDashboardPage   from './pages/officer/OfficerDashboardPage';
import OfficerLiveQueuePage   from './pages/officer/OfficerLiveQueuePage';
import OfficerCountersPage    from './pages/officer/OfficerCountersPage';
import OfficerOfficersPage    from './pages/officer/OfficerOfficersPage';

// ── Office Admin ──────────────────────────────────────────────────────────────
import OfficeAdminDashboardPage    from './pages/office-admin/OfficeAdminDashboardPage';
import OfficeAdminCountersPage     from './pages/office-admin/OfficeAdminCountersPage';
import OfficeAdminOfficersPage     from './pages/office-admin/OfficeAdminOfficersPage';
import OfficeAdminAnalyticsPage    from './pages/office-admin/OfficeAdminAnalyticsPage';
import OfficeAdminForecastPage     from './pages/office-admin/OfficeAdminForecastPage';
import OfficeAdminVerificationPage from './pages/office-admin/OfficeAdminVerificationPage';

// ── Verification Copilot ──────────────────────────────────────────────────────
import VerificationCopilotPage from './pages/verification/VerificationCopilotPage';

// ── Central Admin ─────────────────────────────────────────────────────────────
import CentralDashboardPage  from './pages/central-admin/CentralDashboardPage';
import CentralOfficesPage    from './pages/central-admin/CentralOfficesPage';
import CentralCongestionPage from './pages/central-admin/CentralCongestionPage';
import CentralAnalyticsPage  from './pages/central-admin/CentralAnalyticsPage';
import CentralMapPage        from './pages/central-admin/CentralMapPage';

// ── Super Admin ───────────────────────────────────────────────────────────────
import SuperAdminDashboardPage from './pages/super-admin/SuperAdminDashboardPage';
import SuperAdminSystemPage    from './pages/super-admin/SuperAdminSystemPage';
import SuperAdminUsersPage     from './pages/super-admin/SuperAdminUsersPage';
import SuperAdminModelsPage    from './pages/super-admin/SuperAdminModelsPage';
import SuperAdminAuditPage     from './pages/super-admin/SuperAdminAuditPage';
import SuperAdminConfigPage    from './pages/super-admin/SuperAdminConfigPage';

// ─── Route Guard ──────────────────────────────────────────────────────────────

function RequireAuth({ children, roles }: { children: React.ReactNode; roles?: Role[] }) {
  const { isAuthenticated, user } = useAuthStore();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (roles && user && !roles.includes(user.role)) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function RootRedirect() {
  const { isAuthenticated, user } = useAuthStore();
  if (!isAuthenticated) return <Navigate to="/" replace />;
  switch (user?.role) {
    case 'CITIZEN':       return <Navigate to="/citizen/home"            replace />;
    case 'OFFICER':       return <Navigate to="/officer/dashboard"       replace />;
    case 'OFFICE_ADMIN':  return <Navigate to="/office-admin/dashboard"  replace />;
    case 'CENTRAL_ADMIN': return <Navigate to="/central/dashboard"       replace />;
    case 'SUPER_ADMIN':   return <Navigate to="/super-admin/dashboard"   replace />;
    default:              return <Navigate to="/login"                   replace />;
  }
}

// ─── App ──────────────────────────────────────────────────────────────────────

export default function App() {
  return (
    <>
      <ToastContainer />
      <Routes>
      {/* ── Public ── */}
      <Route path="/"               element={<LandingPage />} />
      <Route path="/login"          element={<LoginPage />} />
      <Route path="/register"       element={<RegisterPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/dashboard"      element={<RootRedirect />} />

      {/* ── Citizen ── */}
      <Route path="/citizen" element={<RequireAuth roles={['CITIZEN']}><CitizenLayout /></RequireAuth>}>
        <Route index                   element={<Navigate to="home" replace />} />
        <Route path="home"             element={<CitizenHomePage />} />
        <Route path="offices"          element={<FindServicesPage />} />
        <Route path="offices/:officeId" element={<OfficeDetailPage />} />
        <Route path="token"            element={<CitizenTokenPage />} />
        <Route path="history"          element={<CitizenHistoryPage />} />
        <Route path="notifications"      element={<NotificationsPage />} />
        <Route path="profile"            element={<ProfilePage />} />
        <Route path="government-offices" element={<GovernmentOfficesPage />} />
        <Route path="about"              element={<AboutPage />} />
        <Route path="feedback"           element={<FeedbackPage />} />
        <Route path="help"               element={<HelpSupportPage />} />
      </Route>

      {/* ── Officer ── */}
      <Route path="/officer" element={<RequireAuth roles={['OFFICER']}><OfficerLayout /></RequireAuth>}>
        <Route index              element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard"   element={<OfficerDashboardPage />} />
        <Route path="queue"       element={<OfficerLiveQueuePage />} />
        <Route path="counters"    element={<OfficerCountersPage />} />
        <Route path="officers"    element={<OfficerOfficersPage />} />
      </Route>

      {/* ── Office Admin ── */}
      <Route path="/office-admin" element={<RequireAuth roles={['OFFICE_ADMIN']}><OfficeAdminLayout /></RequireAuth>}>
        <Route index                    element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard"         element={<OfficeAdminDashboardPage />} />
        <Route path="counters"          element={<OfficeAdminCountersPage />} />
        <Route path="officers"          element={<OfficeAdminOfficersPage />} />
        <Route path="analytics"         element={<OfficeAdminAnalyticsPage />} />
        <Route path="forecast"          element={<OfficeAdminForecastPage />} />
        <Route path="verification"      element={<OfficeAdminVerificationPage />} />
        <Route path="verification/:id"  element={<VerificationCopilotPage />} />
      </Route>

      {/* ── Central Admin ── */}
      <Route path="/central" element={<RequireAuth roles={['CENTRAL_ADMIN']}><CentralAdminLayout /></RequireAuth>}>
        <Route index              element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard"   element={<CentralDashboardPage />} />
        <Route path="offices"     element={<CentralOfficesPage />} />
        <Route path="congestion"  element={<CentralCongestionPage />} />
        <Route path="analytics"   element={<CentralAnalyticsPage />} />
        <Route path="map"         element={<CentralMapPage />} />
      </Route>

      {/* ── Super Admin ── */}
      <Route path="/super-admin" element={<RequireAuth roles={['SUPER_ADMIN']}><SuperAdminLayout /></RequireAuth>}>
        <Route index              element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard"   element={<SuperAdminDashboardPage />} />
        <Route path="system"      element={<SuperAdminSystemPage />} />
        <Route path="users"       element={<SuperAdminUsersPage />} />
        <Route path="models"      element={<SuperAdminModelsPage />} />
        <Route path="audit"       element={<SuperAdminAuditPage />} />
        <Route path="config"      element={<SuperAdminConfigPage />} />
      </Route>

      {/* ── Verification (standalone, accessible by admin roles via direct URL) ── */}
      <Route path="/verification" element={<RequireAuth roles={['OFFICE_ADMIN', 'CENTRAL_ADMIN', 'SUPER_ADMIN']}><OfficeAdminLayout /></RequireAuth>}>
        <Route index element={<VerificationCopilotPage />} />
      </Route>

      {/* 404 → home */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
    </>
  );
}
