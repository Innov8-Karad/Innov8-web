import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Search, Filter, Eye, CheckCircle, Clock, Undo, FileText, Image as ImageIcon, ArrowLeft, X, Award, AlertCircle } from 'lucide-react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { COLLECTIONS } from '../constants';
import { courseService } from '../services/courseService';
import { batchService } from '../services/batchService';
import { getUserDisplayName } from '../services/userService';
import type { AssignmentSubmission } from '../types';
import GradingPanel from './GradingPanel';
import CustomSelect from './CustomSelect';

interface SubmissionListProps {
    courseId: string;
    targetType?: 'course' | 'batch';
    assignmentId: string;
    assignmentTitle: string;
    onClose: () => void;
}

interface MappedSubmission extends AssignmentSubmission {
    fullName: string;
    profileImage: string | null;
    studentId: string;
}

export default function SubmissionList({ courseId, targetType = 'course', assignmentId, assignmentTitle, onClose }: SubmissionListProps) {
    const service = targetType === 'course' ? courseService : batchService;
    const [rawSubmissions, setRawSubmissions] = useState<AssignmentSubmission[]>([]);
    const [mappedSubmissions, setMappedSubmissions] = useState<MappedSubmission[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [selectedSubmission, setSelectedSubmission] = useState<AssignmentSubmission | null>(null);
    const [sidebarWidth, setSidebarWidth] = useState(260);

    // Track sidebar width dynamically to align content perfectly next to the sidebar
    useEffect(() => {
        const sidebar = document.querySelector('.sidebar');
        if (!sidebar) {
            setSidebarWidth(0);
            return;
        }

        const updateWidth = () => {
            const isOpen = sidebar.classList.contains('open');
            setSidebarWidth(isOpen ? 260 : 80);
        };

        // Initial check
        updateWidth();

        // Observe class changes
        const observer = new MutationObserver(updateWidth);
        observer.observe(sidebar, { attributes: true, attributeFilter: ['class'] });

        return () => observer.disconnect();
    }, []);

    // Subscribe to raw submissions
    useEffect(() => {
        const unsubscribe = service.subscribeToSubmissions(courseId, assignmentId, (data) => {
            setRawSubmissions(data);
        });
        return () => unsubscribe();
    }, [courseId, assignmentId, service]);

    // Map raw submissions with student data (fullName, profileImage, studentId)
    useEffect(() => {
        if (rawSubmissions.length === 0) {
            setMappedSubmissions([]);
            setLoading(false);
            return;
        }

        let isMounted = true;
        setLoading(true);

        const fetchStudentData = async () => {
            try {
                const userIds = Array.from(new Set(rawSubmissions.map(s => s.userId)));
                
                // Fetch student documents in parallel
                const userPromises = userIds.map(async (uid) => {
                    try {
                        const userDocSnap = await getDoc(doc(db, COLLECTIONS.USERS, uid));
                        if (userDocSnap.exists()) {
                            const userData = userDocSnap.data();
                            return {
                                uid,
                                fullName: userData.fullName || userData.name || getUserDisplayName(userData) || 'Unknown Student',
                                profileImage: userData.photoURL || userData.profileImage || null,
                                studentId: userData.studentId || uid
                            };
                        }
                    } catch (err) {
                        console.error(`Error fetching student document for ${uid}:`, err);
                    }
                    return { uid, fullName: null, profileImage: null, studentId: uid };
                });

                const usersList = await Promise.all(userPromises);
                const usersMap = usersList.reduce((acc, curr) => {
                    acc[curr.uid] = curr;
                    return acc;
                }, {} as Record<string, { uid: string; fullName: string | null; profileImage: string | null; studentId: string }>);

                if (!isMounted) return;

                const mapped = rawSubmissions.map(sub => {
                    const studentInfo = usersMap[sub.userId];
                    return {
                        ...sub,
                        fullName: studentInfo?.fullName || sub.userName || 'Unknown Student',
                        profileImage: studentInfo?.profileImage || null,
                        studentId: studentInfo?.studentId || sub.userId
                    };
                });

                setMappedSubmissions(mapped);
            } catch (error) {
                console.error("Error mapping submissions data:", error);
            } finally {
                if (isMounted) setLoading(false);
            }
        };

        fetchStudentData();

        return () => {
            isMounted = false;
        };
    }, [rawSubmissions]);

    // Search by student name only, case-insensitive, partial matching
    const filteredSubmissions = mappedSubmissions.filter(sub => {
        const matchesSearch = sub.fullName.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = statusFilter === 'all' || sub.status === statusFilter;
        return matchesSearch && matchesStatus;
    });

    const getStatusBadge = (status: AssignmentSubmission['status']) => {
        switch (status) {
            case 'graded':
                return <span className="badge badge-success" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}><CheckCircle size={12} /> Graded</span>;
            case 'returned':
                return <span className="badge badge-blue" style={{ display: 'inline-flex', alignItems: 'center', backgroundColor: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6', border: '1px solid rgba(59, 130, 246, 0.2)', gap: '4px' }}><Undo size={12} /> Returned</span>;
            default:
                return <span className="badge badge-warning" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}><Clock size={12} /> Submitted</span>;
        }
    };

    // Calculate metrics
    const totalCount = mappedSubmissions.length;
    const gradedCount = mappedSubmissions.filter(s => s.status === 'graded').length;
    const pendingCount = mappedSubmissions.filter(s => s.status === 'submitted').length;

    // Get up-to-date selected submission if it changes in real-time
    const currentSelectedSubmission = selectedSubmission 
        ? mappedSubmissions.find(s => s.id === selectedSubmission.id) || selectedSubmission 
        : null;

    return createPortal(
        <div style={{
            position: 'fixed',
            top: 0,
            left: `${sidebarWidth}px`,
            width: `calc(100vw - ${sidebarWidth}px)`,
            height: '100vh',
            backgroundColor: 'var(--bg-main)',
            zIndex: 9999, // Render on top of everything except maybe notifications
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            color: 'var(--text-main)',
            fontFamily: 'var(--font-family)',
            transition: 'left 0.3s cubic-bezier(0.4, 0, 0.2, 1), width 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        }}>
            <style dangerouslySetInnerHTML={{__html: `
                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                @keyframes slideIn {
                    from { transform: translateX(20px); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
                .kpi-row {
                    display: grid;
                    grid-template-columns: repeat(3, 1fr);
                    gap: 16px;
                    width: 100%;
                }
                .split-layout {
                    flex: 1;
                    display: flex;
                    gap: 24px;
                    min-height: 0;
                    overflow: hidden;
                    width: 100%;
                }
                .left-pane {
                    display: flex;
                    flex-direction: column;
                    gap: 16px;
                    min-width: 0;
                    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                }
                .left-pane-split {
                    flex: 1;
                }
                .left-pane-full {
                    flex: 1;
                }
                .right-pane {
                    flex: 0 0 40%;
                    background-color: var(--bg-card);
                    border: 1px solid var(--border-subtle);
                    border-radius: var(--radius-md);
                    display: flex;
                    flex-direction: column;
                    height: 100%;
                    overflow-y: auto;
                    box-shadow: 0 4px 20px rgba(0,0,0,0.15);
                    animation: slideIn 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                }
                .search-filter-container {
                    display: flex;
                    flex-direction: row;
                    align-items: center;
                    gap: 16px;
                    width: 100%;
                    margin-top: 8px;
                    margin-bottom: 8px;
                }
                .search-bar-wrapper {
                    position: relative;
                    flex: 1;
                    min-width: 0;
                }
                .filter-wrapper {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    flex-shrink: 0;
                }
                @media (max-width: 768px) {
                    .search-filter-container {
                        flex-direction: column !important;
                        align-items: stretch !important;
                        gap: 12px !important;
                    }
                    .filter-wrapper {
                        justify-content: flex-end !important;
                        width: 100% !important;
                    }
                }
                @media (max-width: 992px) {
                    .kpi-row {
                        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)) !important;
                    }
                    .split-layout {
                        flex-direction: column !important;
                        overflow-y: auto !important;
                    }
                    .left-pane-split {
                        flex: 1 1 auto !important;
                    }
                    .right-pane {
                        flex: 1 1 auto !important;
                        height: auto !important;
                        min-height: 480px;
                    }
                }
            `}} />

            {/* Top Navbar */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '16px 24px',
                borderBottom: '1px solid var(--border-subtle)',
                background: 'var(--glass-bg)',
                backdropFilter: 'var(--glass-blur)',
                WebkitBackdropFilter: 'var(--glass-blur)',
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <button 
                        onClick={onClose} 
                        style={{
                            background: 'transparent',
                            border: 'none',
                            color: 'var(--text-secondary)',
                            cursor: 'pointer',
                            padding: '8px',
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'all 0.2s',
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.05)';
                            e.currentTarget.style.color = 'var(--text-main)';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = 'transparent';
                            e.currentTarget.style.color = 'var(--text-secondary)';
                        }}
                    >
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <h1 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700, fontFamily: 'var(--font-headline)', color: 'var(--text-main)' }}>
                            Submissions Dashboard
                        </h1>
                        <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                            Assignment: <strong style={{ color: 'var(--primary)' }}>{assignmentTitle}</strong>
                        </p>
                    </div>
                </div>
                
                <button 
                    onClick={onClose} 
                    style={{
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--text-secondary)',
                        cursor: 'pointer',
                        padding: '8px',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'all 0.2s',
                    }}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.05)';
                        e.currentTarget.style.color = 'var(--text-main)';
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent';
                        e.currentTarget.style.color = 'var(--text-secondary)';
                    }}
                >
                    <X size={20} />
                </button>
            </div>

            {/* Dashboard Body */}
            <div style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
                padding: '24px',
                gap: '24px',
                animation: 'fadeIn 0.2s ease-out',
                width: '100%',
                boxSizing: 'border-box',
            }}>
                {/* KPI Cards Row */}
                <div className="kpi-row">
                    {/* Card 1: Total */}
                    <div style={{
                        background: 'linear-gradient(135deg, var(--bg-card) 0%, rgba(23, 31, 51, 0.4) 100%)',
                        border: '1px solid var(--border-subtle)',
                        borderRadius: 'var(--radius-lg)',
                        padding: '20px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '16px',
                        boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
                        boxSizing: 'border-box',
                    }}>
                        <div style={{
                            width: '48px',
                            height: '48px',
                            borderRadius: 'var(--radius-md)',
                            backgroundColor: 'rgba(99, 102, 241, 0.1)',
                            border: '1px solid rgba(99, 102, 241, 0.2)',
                            color: '#6366f1',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                        }}>
                            <FileText size={24} />
                        </div>
                        <div>
                            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Total Submissions</div>
                            <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-main)', marginTop: '2px', fontFamily: 'var(--font-headline)' }}>{totalCount}</div>
                        </div>
                    </div>

                    {/* Card 2: Graded */}
                    <div style={{
                        background: 'linear-gradient(135deg, var(--bg-card) 0%, rgba(23, 31, 51, 0.4) 100%)',
                        border: '1px solid var(--border-subtle)',
                        borderRadius: 'var(--radius-lg)',
                        padding: '20px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '16px',
                        boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
                        boxSizing: 'border-box',
                    }}>
                        <div style={{
                            width: '48px',
                            height: '48px',
                            borderRadius: 'var(--radius-md)',
                            backgroundColor: 'rgba(16, 185, 129, 0.1)',
                            border: '1px solid rgba(16, 185, 129, 0.2)',
                            color: 'var(--success)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                        }}>
                            <Award size={24} />
                        </div>
                        <div>
                            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Graded Submissions</div>
                            <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-main)', marginTop: '2px', fontFamily: 'var(--font-headline)' }}>{gradedCount}</div>
                        </div>
                    </div>

                    {/* Card 3: Pending */}
                    <div style={{
                        background: 'linear-gradient(135deg, var(--bg-card) 0%, rgba(23, 31, 51, 0.4) 100%)',
                        border: '1px solid var(--border-subtle)',
                        borderRadius: 'var(--radius-lg)',
                        padding: '20px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '16px',
                        boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
                        boxSizing: 'border-box',
                    }}>
                        <div style={{
                            width: '48px',
                            height: '48px',
                            borderRadius: 'var(--radius-md)',
                            backgroundColor: 'rgba(233, 80, 9, 0.1)',
                            border: '1px solid rgba(233, 80, 9, 0.2)',
                            color: 'var(--primary)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                        }}>
                            <AlertCircle size={24} />
                        </div>
                        <div>
                            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Pending Review</div>
                            <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-main)', marginTop: '2px', fontFamily: 'var(--font-headline)' }}>{pendingCount}</div>
                        </div>
                    </div>
                </div>

                {/* Split Layout Container */}
                <div className="split-layout">
                    {/* Left Pane / Table */}
                    <div className={`left-pane ${currentSelectedSubmission ? 'left-pane-split' : 'left-pane-full'}`}>
                        {/* Filters and Search */}
                        <div className="search-filter-container">
                            <div className="search-bar-wrapper">
                                <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
                                <input 
                                    type="text" 
                                    placeholder="Search student name..." 
                                    className="login-input"
                                    style={{ width: '100%', paddingLeft: '40px', height: '44px', boxSizing: 'border-box' }}
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                            <div className="filter-wrapper">
                                <Filter size={18} style={{ color: 'var(--text-secondary)', flexShrink: 0 }} />
                                <CustomSelect
                                    options={[
                                        { value: 'all', label: 'All Status' },
                                        { value: 'submitted', label: 'Submitted' },
                                        { value: 'graded', label: 'Graded' },
                                        { value: 'returned', label: 'Returned' }
                                    ]}
                                    value={statusFilter}
                                    onChange={setStatusFilter}
                                    style={{ width: '160px' }}
                                />
                            </div>
                        </div>

                        {/* Table Wrapper */}
                        <div className="table-wrapper border rounded-lg" style={{
                            flex: 1,
                            overflowY: 'auto',
                            backgroundColor: 'var(--bg-card)',
                            borderColor: 'var(--border-subtle)',
                            borderRadius: 'var(--radius-md)',
                            width: '100%',
                        }}>
                            <table className="table" style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
                                <thead>
                                    <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                                        <th style={{ textAlign: 'left', padding: '16px 20px', color: 'var(--text-secondary)', fontSize: '0.85rem', fontWeight: 600 }}>Student</th>
                                        <th style={{ textAlign: 'left', padding: '16px 20px', color: 'var(--text-secondary)', fontSize: '0.85rem', fontWeight: 600, width: '120px' }}>Submitted At</th>
                                        <th style={{ textAlign: 'left', padding: '16px 20px', color: 'var(--text-secondary)', fontSize: '0.85rem', fontWeight: 600, width: '200px' }}>File</th>
                                        <th style={{ textAlign: 'left', padding: '16px 20px', color: 'var(--text-secondary)', fontSize: '0.85rem', fontWeight: 600, width: '110px' }}>Status</th>
                                        <th style={{ textAlign: 'left', padding: '16px 20px', color: 'var(--text-secondary)', fontSize: '0.85rem', fontWeight: 600, width: '80px' }}>Grade</th>
                                        <th style={{ textAlign: 'right', padding: '16px 20px', color: 'var(--text-secondary)', fontSize: '0.85rem', fontWeight: 600, width: '100px' }}>Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {loading ? (
                                        <tr>
                                            <td colSpan={6} style={{ textAlign: 'center', padding: '48px', color: 'var(--text-secondary)' }}>
                                                Loading submissions...
                                            </td>
                                        </tr>
                                    ) : filteredSubmissions.length === 0 ? (
                                        <tr>
                                            <td colSpan={6} style={{ textAlign: 'center', padding: '48px', color: 'var(--text-secondary)' }}>
                                                No submissions found.
                                            </td>
                                        </tr>
                                    ) : (
                                        filteredSubmissions.map(sub => {
                                            const initial = sub.fullName ? sub.fullName.trim().charAt(0).toUpperCase() : 'S';
                                            const isSelected = currentSelectedSubmission?.id === sub.id;
                                            return (
                                                <tr 
                                                    key={sub.id} 
                                                    style={{ 
                                                        borderBottom: '1px solid var(--border-subtle)',
                                                        backgroundColor: isSelected ? 'rgba(233, 80, 9, 0.08)' : 'transparent',
                                                        transition: 'background-color 0.2s',
                                                        cursor: 'pointer',
                                                    }}
                                                    onClick={() => setSelectedSubmission(sub)}
                                                >
                                                    <td style={{ padding: '12px 20px', overflow: 'hidden' }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', overflow: 'hidden' }}>
                                                            {sub.profileImage ? (
                                                                <img 
                                                                    src={sub.profileImage} 
                                                                    alt={sub.fullName} 
                                                                    style={{
                                                                        width: '36px',
                                                                        height: '36px',
                                                                        borderRadius: '50%',
                                                                        objectFit: 'cover',
                                                                        flexShrink: 0,
                                                                        border: isSelected ? '1px solid var(--primary)' : '1px solid var(--border-subtle)',
                                                                    }}
                                                                />
                                                            ) : (
                                                                <div style={{
                                                                    width: '36px',
                                                                    height: '36px',
                                                                    borderRadius: '50%',
                                                                    background: isSelected 
                                                                        ? 'linear-gradient(135deg, var(--primary) 0%, #ea580c 100%)' 
                                                                        : 'linear-gradient(135deg, rgba(233, 80, 9, 0.2) 0%, rgba(233, 80, 9, 0.05) 100%)',
                                                                    border: isSelected ? '1px solid var(--primary)' : '1px solid rgba(233, 80, 9, 0.3)',
                                                                    color: isSelected ? '#fff' : 'var(--primary)',
                                                                    display: 'flex',
                                                                    alignItems: 'center',
                                                                    justifyContent: 'center',
                                                                    fontWeight: 600,
                                                                    fontSize: '1rem',
                                                                    flexShrink: 0,
                                                                }}>
                                                                    {initial}
                                                                </div>
                                                            )}
                                                            <span style={{ 
                                                                fontWeight: 600, 
                                                                color: 'var(--text-main)', 
                                                                fontSize: '0.95rem',
                                                                whiteSpace: 'nowrap',
                                                                overflow: 'hidden',
                                                                textOverflow: 'ellipsis'
                                                            }}>
                                                                {sub.fullName}
                                                            </span>
                                                        </div>
                                                    </td>
                                                    <td style={{ padding: '12px 20px', color: 'var(--text-secondary)', fontSize: '0.9rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                        {'seconds' in sub.submittedAt ? new Date(sub.submittedAt.seconds * 1000).toLocaleDateString() : new Date(sub.submittedAt).toLocaleDateString()}
                                                    </td>
                                                    <td style={{ padding: '12px 20px', overflow: 'hidden' }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--primary)', overflow: 'hidden' }}>
                                                            {sub.fileType === 'pdf' ? <FileText size={16} style={{ flexShrink: 0 }} /> : <ImageIcon size={16} style={{ flexShrink: 0 }} />}
                                                            <span style={{ 
                                                                fontSize: '0.9rem', 
                                                                whiteSpace: 'nowrap', 
                                                                overflow: 'hidden', 
                                                                textOverflow: 'ellipsis', 
                                                                display: 'inline-block',
                                                                width: '100%' 
                                                            }} title={sub.fileName}>
                                                                {sub.fileName}
                                                            </span>
                                                        </div>
                                                    </td>
                                                    <td style={{ padding: '12px 20px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                        {getStatusBadge(sub.status)}
                                                    </td>
                                                    <td style={{ padding: '12px 20px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                        <span style={{ fontWeight: 700, color: sub.grade !== undefined ? 'var(--text-main)' : 'var(--text-secondary)', fontSize: '0.95rem' }}>
                                                            {sub.grade !== undefined ? `${sub.grade}%` : '-'}
                                                        </span>
                                                    </td>
                                                    <td style={{ padding: '12px 20px', textAlign: 'right' }}>
                                                        <button 
                                                            className={`btn ${isSelected ? 'btn-primary' : 'btn-secondary'}`}
                                                            style={{ 
                                                                padding: '6px 12px', 
                                                                fontSize: '0.85rem', 
                                                                height: '32px',
                                                                background: isSelected ? 'linear-gradient(135deg, var(--primary) 0%, #ea580c 100%)' : undefined,
                                                                border: isSelected ? 'none' : undefined,
                                                                color: isSelected ? '#fff' : undefined,
                                                            }}
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setSelectedSubmission(sub);
                                                            }}
                                                        >
                                                            <Eye size={14} /> Grade
                                                        </button>
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Right Pane (40%) - Grading Sidebar */}
                    {currentSelectedSubmission && (
                        <div className="right-pane">
                            <GradingPanel 
                                courseId={courseId}
                                targetType={targetType}
                                assignmentId={assignmentId}
                                submission={currentSelectedSubmission}
                                isInline={true}
                                onClose={() => setSelectedSubmission(null)}
                            />
                        </div>
                    )}
                </div>
            </div>
        </div>,
        document.body
    );
}
