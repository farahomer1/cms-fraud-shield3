// Copyright 2026 Google. Google provides these Materials as “Free Evaluation Services” subject to the terms, restrictions and limitations at https://cloud.google.com/terms/service-terms.

import React, { Suspense } from 'react';
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { Box, CircularProgress } from '@mui/material';
import { useAuth } from './contexts/AuthContext';
import { useGoogleAuth } from './contexts/GoogleAuthContext';
import { AppShell } from './components/layout/AppShell';
import LoginPage from './pages/LoginPage';
import GoogleAuthPage from './pages/GoogleAuthPage';
import { ROUTES, ROLE_ROUTES, ROLE_DEFAULT_ROUTE } from './utils/constants';

// Lazy-load all pages for code splitting
const DashboardPage = React.lazy(() => import('./pages/DashboardPage'));
const IngestionPage = React.lazy(() => import('./pages/IngestionPage'));
const ValidationPage = React.lazy(() => import('./pages/ValidationPage'));
const AnalyticsPage = React.lazy(() => import('./pages/AnalyticsPage'));
const FraudResearchPage = React.lazy(() => import('./pages/FraudResearchPage'));
const AuditLogPage = React.lazy(() => import('./pages/AuditLogPage'));
const MonitoringPage = React.lazy(() => import('./pages/MonitoringPage'));
const RecoupmentPage = React.lazy(() => import('./pages/RecoupmentPage'));
const AgentManagementPage = React.lazy(() => import('./pages/AgentManagementPage'));
const AuditorWorkflowPage = React.lazy(() => import('./pages/AuditorWorkflowPage'));
const UserManagementPage = React.lazy(() => import('./pages/UserManagementPage'));
const EnrollmentPage = React.lazy(() => import('./pages/EnrollmentPage'));
const NFEDReferralsPage = React.lazy(() => import('./pages/NFEDReferralsPage'));

const PageLoader: React.FC = () => (
  <Box role="status" aria-label="Loading page" sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
    <CircularProgress sx={{ color: '#003F72' }} aria-label="Loading" />
  </Box>
);

const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

/** Gate: Google Auth required on deployed versions, skipped on localhost */
const GoogleAuthGate: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isGoogleAuthenticated, loading } = useGoogleAuth();
  if (isLocalhost) return <>{children}</>;
  if (loading) return <PageLoader />;
  if (!isGoogleAuthenticated) return <Navigate to="/google-auth" replace />;
  return <>{children}</>;
};

/** Gate: PIV/role auth required */
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) return <Navigate to={ROUTES.LOGIN} replace />;
  return <>{children}</>;
};

/** Gate: Check role has access to the current route */
const RoleGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const location = useLocation();
  const role = user?.role ?? '';
  const allowed = ROLE_ROUTES[role];

  // If role config is missing, allow all (safety fallback)
  if (!allowed) return <>{children}</>;

  if (!allowed.includes(location.pathname)) {
    const defaultRoute = ROLE_DEFAULT_ROUTE[role] || ROUTES.DASHBOARD;
    return <Navigate to={defaultRoute} replace />;
  }
  return <>{children}</>;
};

const App: React.FC = () => {
  return (
    <BrowserRouter>
      <Routes>
        {/* Google auth page — only relevant on deployed version */}
        <Route path="/google-auth" element={<GoogleAuthPage />} />

        {/* Existing login page — requires Google auth on deployed version */}
        <Route
          path={ROUTES.LOGIN}
          element={
            <GoogleAuthGate>
              <LoginPage />
            </GoogleAuthGate>
          }
        />

        {/* All protected app routes — require both Google auth + PIV login */}
        <Route
          element={
            <GoogleAuthGate>
              <ProtectedRoute>
                <AppShell />
              </ProtectedRoute>
            </GoogleAuthGate>
          }
        >
          <Route path={ROUTES.DASHBOARD} element={<RoleGuard><Suspense fallback={<PageLoader />}><DashboardPage /></Suspense></RoleGuard>} />
          <Route path={ROUTES.INGESTION} element={<RoleGuard><Suspense fallback={<PageLoader />}><IngestionPage /></Suspense></RoleGuard>} />
          <Route path={ROUTES.VALIDATION} element={<RoleGuard><Suspense fallback={<PageLoader />}><ValidationPage /></Suspense></RoleGuard>} />
          <Route path={ROUTES.ANALYTICS} element={<RoleGuard><Suspense fallback={<PageLoader />}><AnalyticsPage /></Suspense></RoleGuard>} />
          <Route path={ROUTES.FRAUD_RESEARCH} element={<RoleGuard><Suspense fallback={<PageLoader />}><FraudResearchPage /></Suspense></RoleGuard>} />
          <Route path={ROUTES.AUDIT_LOG} element={<RoleGuard><Suspense fallback={<PageLoader />}><AuditLogPage /></Suspense></RoleGuard>} />
          <Route path={ROUTES.RECOUPMENT} element={<RoleGuard><Suspense fallback={<PageLoader />}><RecoupmentPage /></Suspense></RoleGuard>} />
          <Route path={ROUTES.AGENT_MANAGEMENT} element={<RoleGuard><Suspense fallback={<PageLoader />}><AgentManagementPage /></Suspense></RoleGuard>} />
          <Route path={ROUTES.AUDITOR_WORKFLOWS} element={<RoleGuard><Suspense fallback={<PageLoader />}><AuditorWorkflowPage /></Suspense></RoleGuard>} />
          <Route path={ROUTES.USER_MANAGEMENT} element={<RoleGuard><Suspense fallback={<PageLoader />}><UserManagementPage /></Suspense></RoleGuard>} />
          <Route path={ROUTES.MONITORING} element={<RoleGuard><Suspense fallback={<PageLoader />}><MonitoringPage /></Suspense></RoleGuard>} />
          <Route path={ROUTES.ENROLLMENT} element={<RoleGuard><Suspense fallback={<PageLoader />}><EnrollmentPage /></Suspense></RoleGuard>} />
          <Route path={ROUTES.REFERRALS} element={<RoleGuard><Suspense fallback={<PageLoader />}><NFEDReferralsPage /></Suspense></RoleGuard>} />
        </Route>

        {/* Catch-all: on localhost go to /login, on deployed go to /google-auth */}
        <Route path="*" element={<Navigate to={isLocalhost ? ROUTES.LOGIN : '/google-auth'} replace />} />
      </Routes>
    </BrowserRouter>
  );
};

export default App;
