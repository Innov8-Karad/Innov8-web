import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { ToastProvider } from './contexts/ToastProvider';
import { UserProvider } from './contexts/UserProvider';
import ErrorBoundary from './components/ErrorBoundary';

import Layout from './components/Layout';

import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import UsersPage from './pages/Users';
import FeesPage from './pages/Fees';
import ExamsPage from './pages/Exams';
import AnnouncementsPage from './pages/Announcements';
import CoursesPage from './pages/Courses';
import PlacementsPage from './pages/Placements';
import ProgressPage from './pages/Progress';
import AttendancePage from './pages/Attendance';
import StudentDetailPage from './pages/StudentDetailPage';
import ExamResultsPage from './pages/ExamResults';
import JobsPage from './pages/JobsPage';
import InterviewsPage from './pages/Interviews';
import BatchesPage from './pages/Batches';

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
                <Routes>
                  <Route path="/login" element={<Login />} />

                  {/* Protected Routes */}
                  <Route path="/" element={<PrivateRoute><Layout><Dashboard /></Layout></PrivateRoute>} />
                  <Route path="/users" element={<PrivateRoute><Layout><UsersPage /></Layout></PrivateRoute>} />
                  <Route path="/fees" element={<PrivateRoute><Layout><FeesPage /></Layout></PrivateRoute>} />
                  <Route path="/exams" element={<PrivateRoute><Layout><ExamsPage /></Layout></PrivateRoute>} />
                  <Route path="/announcements" element={<PrivateRoute><Layout><AnnouncementsPage /></Layout></PrivateRoute>} />
                  <Route path="/courses" element={<PrivateRoute><Layout><CoursesPage /></Layout></PrivateRoute>} />
                  <Route path="/placements" element={<PrivateRoute><Layout><PlacementsPage /></Layout></PrivateRoute>} />
                  <Route path="/progress" element={<PrivateRoute><Layout><ProgressPage /></Layout></PrivateRoute>} />
                  <Route path="/attendance" element={<PrivateRoute><Layout><AttendancePage /></Layout></PrivateRoute>} />
                  <Route path="/progress/:id" element={<PrivateRoute><Layout><StudentDetailPage /></Layout></PrivateRoute>} />
                  <Route path="/exam-results" element={<PrivateRoute><Layout><ExamResultsPage /></Layout></PrivateRoute>} />
                  <Route path="/jobs" element={<PrivateRoute><Layout><JobsPage /></Layout></PrivateRoute>} />
                  <Route path="/interviews" element={<PrivateRoute><Layout><InterviewsPage /></Layout></PrivateRoute>} />
                  <Route path="/batches" element={<PrivateRoute><Layout><BatchesPage /></Layout></PrivateRoute>} />

                  {/* Redirects */}
                  <Route path="/profile/:id" element={<Navigate to="/progress" replace />} />
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </AuthProvider>
            </UserProvider>
          </ToastProvider>
        </ThemeProvider>
      </Router>
    </ErrorBoundary>
  );
}

export default App;