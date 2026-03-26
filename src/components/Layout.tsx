import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
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
    ];

    return (
        <div className="flex" style={{ minHeight: '100vh', backgroundColor: 'var(--dark-bg)' }}>
            {/* Sidebar */}
            <aside
                style={{
                    width: sidebarOpen ? '260px' : '80px',
                    backgroundColor: 'var(--dark-card)',
                    borderRight: '1px solid rgba(255,255,255,0.05)',
                    transition: 'width 0.3s',
                    display: 'flex',
                    flexDirection: 'column',
                    position: 'fixed',
                    height: '100vh',
                    zIndex: 10
                }}
            >
                <div style={{ padding: 'var(--space-md)', display: 'flex', alignItems: 'center', justifyContent: sidebarOpen ? 'space-between' : 'center', borderBottom: '1px solid var(--border-subtle)', marginBottom: 'var(--space-sm)' }}>
                    {sidebarOpen && (
                        <div style={{ display: 'flex', alignItems: 'center' }}>
                            <img src={logo} alt="Innov8 Logo" style={{ height: '100px', width: 'auto', maxWidth: '100%' }} />
                        </div>
                    )}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <ThemeToggle />
                        <button onClick={() => setSidebarOpen(!sidebarOpen)} className="menu-btn">
                            <Menu size={20} />
                        </button>
                    </div>
                </div>

                <nav style={{ flex: 1, padding: 'var(--space-md) 0' }}>
                    {navItems.map((item) => (
                        <NavLink
                            key={item.path}
                            to={item.path}
                            style={({ isActive }) => ({
                                display: 'flex',
                                alignItems: 'center',
                                padding: `var(--space-sm) var(--space-md)`,
                                color: isActive ? 'var(--primary)' : 'var(--text-secondary)',
                                backgroundColor: isActive ? 'rgba(var(--primary-rgb), 0.12)' : 'transparent',
                                textDecoration: 'none',
                                borderLeft: isActive ? '4px solid var(--primary)' : '4px solid transparent',
                                marginBottom: '4px',
                                justifyContent: sidebarOpen ? 'flex-start' : 'center',
                                transition: 'all 0.2s ease',
                                borderRadius: sidebarOpen ? '0 12px 12px 0' : '8px',
                                margin: sidebarOpen ? '0 12px 4px 0' : '0 8px 4px 8px'
                            })}
                        >
                            <item.icon size={20} />
                            {sidebarOpen && <span style={{ marginLeft: '12px', fontWeight: 500 }}>{item.label}</span>}
                        </NavLink>
                    ))}
                </nav>

                <div style={{ padding: 'var(--space-md)', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', marginBottom: 'var(--space-md)', justifyContent: sidebarOpen ? 'flex-start' : 'center' }}>
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
                    <button
                        onClick={handleLogout}
                        style={{
                            width: '100%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: sidebarOpen ? 'flex-start' : 'center',
                            backgroundColor: 'transparent',
                            border: 'none',
                            color: 'var(--error)',
                            cursor: 'pointer',
                            padding: '8px'
                        }}
                    >
                        <LogOut size={20} />
                        {sidebarOpen && <span style={{ marginLeft: '12px' }}>{UI_STRINGS.NAV.LOGOUT}</span>}
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main style={{
                flex: 1,
                marginLeft: sidebarOpen ? '260px' : '80px',
                padding: 'var(--space-lg)',
                transition: 'margin-left 0.3s'
            }}>
                {children}
            </main>
        </div>
    );
}
