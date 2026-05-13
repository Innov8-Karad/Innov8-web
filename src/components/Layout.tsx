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
    ClipboardCheck,
    LogOut,
    Menu,
    ClipboardList,
    FolderKanban,
    CalendarDays,
    Shield,
} from 'lucide-react';
import logo from '../assets/logo.png';
import { ThemeToggle } from './ThemeToggle';
import { UI_STRINGS, COLLECTIONS } from '../constants';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';

export default function Layout({ children }: { children: React.ReactNode }) {
    const { logout, currentUser } = useAuth()!;
    const { showToast } = useToast();
    const navigate = useNavigate();
    const [sidebarOpen, setSidebarOpen] = React.useState(true);
    const [pendingDeviceCount, setPendingDeviceCount] = React.useState(0);

    // Real-time pending device count for badge
    React.useEffect(() => {
        const q = query(
            collection(db, COLLECTIONS.DEVICES),
            where('status', '==', 'pending')
        );
        const unsub = onSnapshot(q, (snap) => {
            setPendingDeviceCount(snap.size);
        });
        return () => unsub();
    }, []);

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
        { icon: ClipboardCheck, label: UI_STRINGS.NAV.ATTENDANCE, path: '/attendance' },
        { icon: FileText, label: UI_STRINGS.NAV.EXAMS, path: '/exams' },
        { icon: ClipboardList, label: UI_STRINGS.EXAM_RESULTS.TITLE, path: '/exam-results' },
        { icon: Briefcase, label: UI_STRINGS.NAV.PLACEMENTS, path: '/placements' },
        { icon: FolderKanban, label: UI_STRINGS.NAV.JOBS, path: '/jobs' },
        { icon: CalendarDays, label: 'Interviews', path: '/interviews' },
        { icon: BookOpen, label: UI_STRINGS.NAV.COURSES, path: '/courses' },
        { icon: Award, label: UI_STRINGS.NAV.PROGRESS, path: '/progress' },
        { icon: Bell, label: UI_STRINGS.NAV.ANNOUNCEMENTS, path: '/announcements' },
        { icon: Shield, label: UI_STRINGS.DEVICE_APPROVALS.TITLE, path: '/device-approvals', badge: pendingDeviceCount },
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
                            {sidebarOpen && 'badge' in item && item.badge! > 0 && (
                                <span className="nav-link-badge">{item.badge}</span>
                            )}
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

