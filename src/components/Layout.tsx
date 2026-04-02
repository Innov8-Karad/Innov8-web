import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../hooks/useToast';
import {
    LayoutDashboard,
    Users,
    CreditCard,
    FileText,
    Briefcase,
    BookOpen,
    Award,
    Bell,
    LogOut,
    Menu
} from 'lucide-react';
import logo from '../assets/logo.png';
import { ThemeToggle } from './ThemeToggle';
import { UI_STRINGS } from '../constants';

export default function Layout({ children }: { children: React.ReactNode }) {
    const { logout, currentUser } = useAuth()!;
    const { showToast } = useToast();
    const navigate = useNavigate();
    const [sidebarOpen, setSidebarOpen] = React.useState(true);

    async function handleLogout() {
        try {
            await logout();
            showToast("logout successfully", "success");
            navigate('/login');
        } catch (error) {
            console.error("Failed to log out", error);
        }
    }

    const navItems = [
        { icon: LayoutDashboard, label: UI_STRINGS.NAV.DASHBOARD, path: '/' },
        { icon: Users, label: UI_STRINGS.NAV.STUDENTS, path: '/users' },
        { icon: CreditCard, label: UI_STRINGS.NAV.FEES, path: '/fees' },
        { icon: FileText, label: UI_STRINGS.NAV.EXAMS, path: '/exams' },
        { icon: Briefcase, label: UI_STRINGS.NAV.PLACEMENTS, path: '/placements' },
        { icon: BookOpen, label: UI_STRINGS.NAV.COURSES, path: '/courses' },
        { icon: Award, label: UI_STRINGS.NAV.PROGRESS, path: '/progress' },
        { icon: Bell, label: UI_STRINGS.NAV.ANNOUNCEMENTS, path: '/announcements' },
        { icon: Briefcase, label: UI_STRINGS.NAV.JOBS, path: '/jobs' },
    ];

    return (
        <div className="flex" style={{ minHeight: '100vh' }}>
            {/* Sidebar */}
            <aside className="sidebar" style={{ width: sidebarOpen ? '260px' : '80px' }}>
                <div className="sidebar-header" style={{ justifyContent: sidebarOpen ? 'space-between' : 'center' }}>
                    {sidebarOpen && (
                        <div className="flex items-center">
                            <img src={logo} alt="Innov8 Logo" style={{ height: '100px', width: 'auto', maxWidth: '100%' }} />
                        </div>
                    )}
                    <div className="flex items-center gap-2">
                        <ThemeToggle />
                        <button onClick={() => setSidebarOpen(!sidebarOpen)} className="menu-btn">
                            <Menu size={20} />
                        </button>
                    </div>
                </div>

                <nav className="sidebar-nav">
                    {navItems.map((item) => (
                        <NavLink
                            key={item.path}
                            to={item.path}
                            className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                            style={{
                                justifyContent: sidebarOpen ? 'flex-start' : 'center',
                                borderRadius: sidebarOpen ? '0 12px 12px 0' : '8px',
                                margin: sidebarOpen ? '0 12px 4px 0' : '0 8px 4px 8px'
                            }}
                        >
                            <item.icon size={20} />
                            {sidebarOpen && <span className="nav-link-label">{item.label}</span>}
                        </NavLink>
                    ))}
                </nav>

                <div className="sidebar-footer">
                    <div className="flex items-center mb-md" style={{ justifyContent: sidebarOpen ? 'flex-start' : 'center' }}>
                        <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
                            {UI_STRINGS.NAV.ADMIN.charAt(0)}
                        </div>
                        {sidebarOpen && (
                            <div style={{ marginLeft: '12px', overflow: 'hidden' }}>
                                <p style={{ margin: 0, color: 'var(--text-main)', fontSize: '0.9rem' }}>{UI_STRINGS.NAV.ADMIN}</p>
                                <p style={{ margin: 0, fontSize: '0.8rem' }}>{currentUser?.email}</p>
                            </div>
                        )}
                    </div>
                    <button onClick={handleLogout} className="logout-btn" style={{ justifyContent: sidebarOpen ? 'flex-start' : 'center' }}>
                        <LogOut size={20} />
                        {sidebarOpen && <span style={{ marginLeft: '12px' }}>{UI_STRINGS.NAV.LOGOUT}</span>}
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="main-content" style={{ marginLeft: sidebarOpen ? '260px' : '80px' }}>
                {children}
            </main>
        </div>
    );
}
