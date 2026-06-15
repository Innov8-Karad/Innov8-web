import React, { Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { ToastProvider } from './contexts/ToastProvider';
import { UserProvider } from './contexts/UserProvider';
import ErrorBoundary from './components/ErrorBoundary';

import Layout from './components/Layout';

// ── Lazy-loaded Pages (Code Splitting) ─────────────────────────────────
const Login = React.lazy(() => import('./pages/Login'));
const ResetPassword = React.lazy(() => import('./pages/ResetPassword'));
const Dashboard = React.lazy(() => import('./pages/Dashboard'));
const UsersPage = React.lazy(() => import('./pages/Users'));
const FeesPage = React.lazy(() => import('./pages/Fees'));
const ExamsPage = React.lazy(() => import('./pages/Exams'));
const CertificationsPage = React.lazy(() => import('./pages/Certifications'));
const AnnouncementsPage = React.lazy(() => import('./pages/Announcements'));
const CoursesPage = React.lazy(() => import('./pages/Courses'));
const PlacementsPage = React.lazy(() => import('./pages/Placements'));
const ProgressPage = React.lazy(() => import('./pages/Progress'));

const StudentDetailPage = React.lazy(() => import('./pages/StudentDetailPage'));
const ExamResultsPage = React.lazy(() => import('./pages/ExamResults'));
const JobsPage = React.lazy(() => import('./pages/JobsPage'));
const PlacementTallyPage = React.lazy(() => import('./pages/PlacementTally'));
const DeviceApprovalsPage = React.lazy(() => import('./pages/DeviceApprovals'));
const NotificationsPage = React.lazy(() => import('./pages/NotificationsPage'));
const BatchesPage = React.lazy(() => import('./pages/Batches'));
const MockSchedulingPage = React.lazy(() => import('./pages/MockScheduling'));
const CoursePurchasesPage = React.lazy(() => import('./pages/CoursePurchases'));

// ── Loading Fallback ───────────────────────────────────────────────────
function PageLoader() {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
      <div className="loading-spinner" style={{ width: 40, height: 40, border: '3px solid var(--border)', borderTop: '3px solid var(--primary)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
    </div>
  );
}

interface PrivateRouteProps {
  children: React.ReactNode;
}

function PrivateRoute({ children }: PrivateRouteProps) {
  const auth = useAuth();

  if (!auth?.currentUser) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

function App() {
  return (
    <ErrorBoundary>
      <Router>
        <ThemeProvider>
          <ToastProvider>
            <UserProvider>
              <AuthProvider>
                <Suspense fallback={<PageLoader />}>
                <Routes>
                  <Route path="/login" element={<Login />} />
                  <Route path="/reset-password" element={<ResetPassword />} />

                  {/* Protected Routes */}
                  <Route path="/" element={<PrivateRoute><Layout><Dashboard /></Layout></PrivateRoute>} />
                  <Route path="/users" element={<PrivateRoute><Layout><UsersPage /></Layout></PrivateRoute>} />
                  <Route path="/fees" element={<PrivateRoute><Layout><FeesPage /></Layout></PrivateRoute>} />
                  <Route path="/exams" element={<PrivateRoute><Layout><ExamsPage /></Layout></PrivateRoute>} />
                  <Route path="/certifications" element={<PrivateRoute><Layout><CertificationsPage /></Layout></PrivateRoute>} />
                  <Route path="/announcements" element={<PrivateRoute><Layout><AnnouncementsPage /></Layout></PrivateRoute>} />
                  <Route path="/courses" element={<PrivateRoute><Layout><CoursesPage /></Layout></PrivateRoute>} />
                  <Route path="/placements" element={<PrivateRoute><Layout><PlacementsPage /></Layout></PrivateRoute>} />
                  <Route path="/progress" element={<PrivateRoute><Layout><ProgressPage /></Layout></PrivateRoute>} />

                  <Route path="/progress/:id" element={<PrivateRoute><Layout><StudentDetailPage /></Layout></PrivateRoute>} />
                  <Route path="/exam-results" element={<PrivateRoute><Layout><ExamResultsPage /></Layout></PrivateRoute>} />
                  <Route path="/jobs" element={<PrivateRoute><Layout><JobsPage /></Layout></PrivateRoute>} />
                  <Route path="/placement-tally" element={<PrivateRoute><Layout><PlacementTallyPage /></Layout></PrivateRoute>} />
                  <Route path="/device-approvals" element={<PrivateRoute><Layout><DeviceApprovalsPage /></Layout></PrivateRoute>} />
                  <Route path="/notifications" element={<PrivateRoute><Layout><NotificationsPage /></Layout></PrivateRoute>} />
                  <Route path="/batches" element={<PrivateRoute><Layout><BatchesPage /></Layout></PrivateRoute>} />
                  <Route path="/mock-scheduling" element={<PrivateRoute><Layout><MockSchedulingPage /></Layout></PrivateRoute>} />
                  <Route path="/course-purchases" element={<PrivateRoute><Layout><CoursePurchasesPage /></Layout></PrivateRoute>} />

                  {/* Redirects */}
                  <Route path="/profile/:id" element={<Navigate to="/progress" replace />} />
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
                </Suspense>
              </AuthProvider>
            </UserProvider>
          </ToastProvider>
        </ThemeProvider>
      </Router>
    </ErrorBoundary>
  );
}

export default App;
