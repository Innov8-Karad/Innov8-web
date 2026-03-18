import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import UsersPage from './pages/Users';
import FeesPage from './pages/Fees';
import ExamsPage from './pages/Exams';
import AnnouncementsPage from './pages/Announcements';
import CoursesPage from './pages/Courses';
import PlacementsPage from './pages/Placements';
import ProgressPage from './pages/Progress';
import Layout from './components/Layout';

import { ThemeProvider } from './contexts/ThemeContext';

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { currentUser } = useAuth()!;
  return currentUser ? children : <Navigate to="/login" />;
}

function App() {
  return (
    <Router>
      <ThemeProvider>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<Login />} />
          <Route path="/" element={
            <PrivateRoute>
              <Layout>
                <Dashboard />
              </Layout>
            </PrivateRoute>
          } />
          <Route path="/users" element={
            <PrivateRoute>
              <Layout>
                <UsersPage />
              </Layout>
            </PrivateRoute>
          } />
          <Route path="/fees" element={
            <PrivateRoute>
              <Layout>
                <FeesPage />
              </Layout>
            </PrivateRoute>
          } />
          <Route path="/exams" element={
            <PrivateRoute>
              <Layout>
                <ExamsPage />
              </Layout>
            </PrivateRoute>
          } />
          <Route path="/announcements" element={
            <PrivateRoute>
              <Layout>
                <AnnouncementsPage />
              </Layout>
            </PrivateRoute>
          } />
          <Route path="/courses" element={
            <PrivateRoute>
              <Layout>
                <CoursesPage />
              </Layout>
            </PrivateRoute>
          } />
          <Route path="/placements" element={
            <PrivateRoute>
              <Layout>
                <PlacementsPage />
              </Layout>
            </PrivateRoute>
          } />
          <Route path="/progress" element={
            <PrivateRoute>
              <Layout>
                <ProgressPage />
              </Layout>
            </PrivateRoute>
          } />
          {/* Add more routes here */}
        </Routes>
        </AuthProvider>
      </ThemeProvider>
    </Router>
  );
}

export default App;
