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
    BellRing,

    LogOut,
    Menu,
    ClipboardList,
    FolderKanban,
    Shield,
    Layers,
    TrendingUp,
    CalendarCheck,
    GraduationCap,
    ClipboardCheck
} from 'lucide-react';
import logo from '../assets/logo.png';
import { ThemeToggle } from './ThemeToggle';
import { UI_STRINGS, COLLECTIONS } from '../constants';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';

export default function Layout({ children }: { children: React.ReactNode }) {
    const { logout } = useAuth()!;
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

    const [pendingPurchasesCount, setPendingPurchasesCount] = React.useState(0);
    // Real-time pending purchase requests count for badge
    React.useEffect(() => {
        const q = query(
            collection(db, COLLECTIONS.COURSE_PURCHASES),
            where('status', '==', 'pending')
        );
        const unsub = onSnapshot(q, (snap) => {
            setPendingPurchasesCount(snap.size);
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
        { icon: Layers, label: UI_STRINGS.NAV.BATCHES, path: '/batches' },
        { icon: ClipboardCheck, label: UI_STRINGS.NAV.ATTENDANCE, path: '/attendance' },
        { icon: CreditCard, label: UI_STRINGS.NAV.FEES, path: '/fees' },
        { icon: BookOpen, label: UI_STRINGS.NAV.COURSES, path: '/courses' },
        { icon: FileText, label: UI_STRINGS.NAV.EXAMS, path: '/exams' },
        { icon: ClipboardList, label: UI_STRINGS.EXAM_RESULTS.TITLE, path: '/exam-results' },
        { icon: CalendarCheck, label: UI_STRINGS.NAV.MOCK_SCHEDULING, path: '/mock-scheduling' },
        { icon: CreditCard, label: 'Purchase Requests', path: '/course-purchases', badge: pendingPurchasesCount },
        { icon: FolderKanban, label: UI_STRINGS.NAV.JOBS, path: '/jobs' },
        { icon: GraduationCap, label: UI_STRINGS.NAV.CERTIFICATIONS, path: '/certifications' },
        { icon: TrendingUp, label: 'Placement Tally', path: '/placement-tally' },
        { icon: Briefcase, label: UI_STRINGS.NAV.PLACEMENTS, path: '/placements' },

        { icon: Award, label: UI_STRINGS.NAV.PROGRESS, path: '/progress' },
        { icon: Bell, label: UI_STRINGS.NAV.ANNOUNCEMENTS, path: '/announcements' },
        { icon: BellRing, label: UI_STRINGS.NAV.NOTIFICATIONS, path: '/notifications' },
        { icon: Shield, label: UI_STRINGS.DEVICE_APPROVALS.TITLE, path: '/device-approvals', badge: pendingDeviceCount },
    ];

    return (
        <div className="flex" style={{ minHeight: '100vh', position: 'relative' }}>
            {/* Sidebar */}
            <aside className={`sidebar ${sidebarOpen ? 'open' : 'collapsed'}`}>
                {/* Header - Fixed height */}
                <div className="sidebar-header" style={{ justifyContent: sidebarOpen ? 'space-between' : 'center' }}>
                    {sidebarOpen && (
                        <div className="flex items-center">
                            <img src={logo} alt="Innov8 Logo" style={{ height: '48px', width: 'auto', maxWidth: '100%' }} />
                        </div>
                    )}
                    <div className="flex items-center gap-2">
                        <ThemeToggle />
                        <button onClick={() => setSidebarOpen(!sidebarOpen)} className="menu-btn">
                            <Menu size={18} />
                        </button>
                    </div>
                </div>

                {/* Navigation - Scrollable area */}
                <nav className="sidebar-nav custom-scrollbar">
                    {navItems.map((item) => (
                        <NavLink
                            key={item.path}
                            to={item.path}
                            className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                            style={{
                                justifyContent: sidebarOpen ? 'flex-start' : 'center',
                                borderRadius: sidebarOpen ? '0 12px 12px 0' : '10px',
                                margin: sidebarOpen ? '0 12px 6px 0' : '0 8px 6px 8px'
                            }}
                        >
                            <div className="nav-icon-wrapper">
                                <item.icon size={20} />
                            </div>
                            {sidebarOpen && <span className="nav-link-label">{item.label}</span>}
                            {sidebarOpen && 'badge' in item && item.badge! > 0 && (
                                <span className="nav-link-badge animate-bounce-slow">{item.badge}</span>
                            )}
                            {/* Tooltip for collapsed state */}
                            {!sidebarOpen && <div className="nav-tooltip">{item.label}</div>}
                        </NavLink>
                    ))}
                </nav>

                {/* Footer - Fixed height */}
                <div className="sidebar-footer">
                    <button onClick={handleLogout} className="logout-btn-premium" style={{ justifyContent: sidebarOpen ? 'flex-start' : 'center' }}>
                        <LogOut size={18} />
                        {sidebarOpen && <span>{UI_STRINGS.NAV.LOGOUT}</span>}
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="main-content" style={{ marginLeft: sidebarOpen ? '260px' : '80px' }}>
                <div className="content-container">
                    {children}
                </div>
            </main>
        </div>
    );
}

