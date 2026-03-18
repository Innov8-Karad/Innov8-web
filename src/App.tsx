import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
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

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { currentUser } = useAuth()!;
  return currentUser ? children : <Navigate to="/login" />;
}

const appRoutes = [
  { path: '/', component: Dashboard },
  { path: '/users', component: UsersPage },
  { path: '/fees', component: FeesPage },
  { path: '/exams', component: ExamsPage },
  { path: '/announcements', component: AnnouncementsPage },
  { path: '/courses', component: CoursesPage },
  { path: '/placements', component: PlacementsPage },
  { path: '/progress', component: ProgressPage },
];

function App() {
  return (
    <Router>
      <ThemeProvider>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<Login />} />
            {appRoutes.map(({ path, component: Component }) => (
              <Route
                key={path}
                path={path}
                element={
                  <PrivateRoute>
                    <Layout>
                      <Component />
                    </Layout>
                  </PrivateRoute>
                }
              />
            ))}
          </Routes>
        </AuthProvider>
      </ThemeProvider>
    </Router>
  );
}

export default App;
