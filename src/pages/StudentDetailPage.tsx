import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
    ArrowLeft, 
    Download, 
    Award, 
    BookOpen, 
    CheckCircle2, 
    Circle,
    User,
    Activity
} from 'lucide-react';
import { progressService } from '../services/progressService';
import type { StudentProgress } from '../types';
import LoadingState from '../components/LoadingState';
import Avatar from '../components/Avatar';
import { useToast } from '../hooks/useToast';
import './StudentDetailPage.css';

export default function StudentDetailPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { showToast } = useToast();
    const [student, setStudent] = useState<StudentProgress | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchStudent() {
            try {
                setLoading(true);
                const allProgress = await progressService.fetchProgress();
                const found = allProgress.find(p => p.studentId === id);
                if (found) {
                    setStudent(found);
                } else {
                    console.log("No student found in progress list");
                    showToast("No progress record for this student", "error");
                    navigate('/progress');
                }
            } catch (err) {
                console.error("Error fetching student detail:", err);
                showToast("Failed to load student details", "error");
            } finally {
                setLoading(false);
            }
        }
        fetchStudent();
    }, [id, navigate, showToast]);

    const handleExport = () => {
        if (!student) return;
        try {
            progressService.exportProgressReport(student);
            showToast("Report generated successfully");
        } catch (err) {
            console.error("Export error:", err);
            showToast("Failed to generate PDF", "error");
        }
    };

    const formatUpdatedDate = (updatedAt: { toDate?: () => Date; seconds?: number } | Date | string | number | null | undefined) => {
        if (!updatedAt) return 'N/A';
        if (updatedAt instanceof Date) return updatedAt.toLocaleDateString();
        
        if (typeof updatedAt === 'object') {
            if ('toDate' in updatedAt && typeof updatedAt.toDate === 'function') {
                return updatedAt.toDate().toLocaleDateString();
            }
            if ('seconds' in updatedAt && typeof updatedAt.seconds === 'number') {
                return new Date(updatedAt.seconds * 1000).toLocaleDateString();
            }
        }
        
        try {
            return new Date(updatedAt as string | number).toLocaleDateString();
        } catch {
            return 'N/A';
        }
    };

    if (loading) return <LoadingState message="Loading student details..." />;
    if (!student) return null;


    return (
        <div className="std-container">
            {/* Back Button */}
            <button
                onClick={() => navigate('/progress')}
                className="std-back-btn"
            >
                <ArrowLeft size={16} className="std-back-icon" />
                Back to Progress
            </button>

            {/* Profile Header Card */}
            <div className="std-header-card">
                <div className="std-header-glow" />

                <div className="std-profile-layout">
                    <div className="std-avatar-border">
                        <Avatar
                            src={student.profilePhoto}
                            fallback={(student.studentName || '?').charAt(0)}
                            size="lg"
                        />
                    </div>

                    <div className="std-profile-info">
                        <span className="std-batch-badge">
                            Batch: {student.batch || 'Unassigned'}
                        </span>
                        <h1 className="std-student-name">
                            {student.studentName || 'Student'}
                        </h1>
                        <p className="std-status-subtext">
                            <span className="std-pulse-dot" />
                            Active Student Profile
                        </p>
                    </div>

                    <button className="std-export-btn" onClick={handleExport}>
                        <Download size={18} className="std-export-icon" />
                        Export Report
                    </button>
                </div>
            </div>

            {/* 3-Column Metric Cards */}
            <div className="std-metrics-grid">
                {/* Attendance */}
                <div className="std-metric-card">
                    <div className="std-metric-body">
                        <span className="std-metric-label">Attendance</span>
                        <span className="std-metric-value">{student.attendancePercentage}%</span>
                    </div>
                    <div className="std-metric-icon std-color-blue">
                        <User size={24} />
                    </div>
                    <div className="std-metric-bar std-bar-blue" />
                </div>

                {/* Overall Score */}
                <div className="std-metric-card">
                    <div className="std-metric-body">
                        <span className="std-metric-label">Overall Score</span>
                        <span className="std-metric-value">{student.overallScore}</span>
                    </div>
                    <div className="std-metric-icon std-color-green">
                        <Award size={24} />
                    </div>
                    <div className="std-metric-bar std-bar-green" />
                </div>

                {/* Goal Progress */}
                <div className="std-metric-card">
                    <div className="std-metric-body">
                        <span className="std-metric-label">Goal Progress</span>
                        <span className="std-metric-value">{student.overallProgress || 0}%</span>
                    </div>
                    <div className="std-metric-icon std-color-amber">
                        <Activity size={24} />
                    </div>
                    <div className="std-metric-bar std-bar-amber" />
                </div>
            </div>

            {/* Academic Details + Modules Grid */}
            <div className="std-academic-grid">
                {/* Academic Status Card */}
                <div className="std-detail-card">
                    <h3 className="std-card-title">
                        <BookOpen size={20} style={{ color: 'var(--primary)' }} />
                        Academic Status
                    </h3>

                    <div className="std-status-row">
                        <span className="std-status-label">Primary Course</span>
                        <span className="std-status-val">Full Stack Development</span>
                    </div>

                    <div className="std-progress-container" style={{ margin: '20px 0' }}>
                        <div className="std-progress-info">
                            <span className="std-progress-label">Integrated Progress</span>
                            <span className="std-progress-pct">{student.overallProgress || 0}%</span>
                        </div>
                        <div className="std-progress-track">
                            <div
                                className="std-progress-fill"
                                style={{ width: `${student.overallProgress || 0}%` }}
                            />
                        </div>
                        <div className="flex justify-between items-center mt-2 text-[10px] text-muted uppercase tracking-wider font-bold">
                            <span>Real-time Sync</span>
                            <span>{student.completedItems || 0} / {student.totalItems || 0} ITEMS</span>
                        </div>
                    </div>

                    <div className="space-y-3 mt-6 pt-4 border-t border-divider">
                        <div className="flex justify-between items-center">
                            <div className="flex items-center gap-2 text-sm text-secondary">
                                <Activity size={14} className="text-primary" />
                                <span>Videos Watched</span>
                            </div>
                            <span className="text-sm font-bold text-main">{(student.completedVideoIds || []).length}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <div className="flex items-center gap-2 text-sm text-secondary">
                                <Activity size={14} className="text-success" />
                                <span>Notes Read</span>
                            </div>
                            <span className="text-sm font-bold text-main">{(student.completedNoteIds || []).length}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <div className="flex items-center gap-2 text-sm text-secondary">
                                <Activity size={14} className="text-amber-500" />
                                <span>Assignments Done</span>
                            </div>
                            <span className="text-sm font-bold text-main">{(student.completedAssignmentIds || []).length}</span>
                        </div>
                    </div>

                    <div className="std-card-footer mt-4 pt-4 border-t border-divider">
                        <span>Synced from mobile</span>
                        <span>Active: {formatUpdatedDate(student.lastAccessed || student.updatedAt)}</span>
                    </div>
                </div>

                {/* Activity Breakdown Card */}
                <div className="std-detail-card">
                    <h3 className="std-card-title">
                        <CheckCircle2 size={20} style={{ color: '#10b981' }} />
                        Learning Breakdown
                    </h3>

                    <div className="std-modules-list">
                        <div className="std-module-item">
                            <div className="std-module-left">
                                <div className="std-module-check" style={{ background: 'var(--primary-light)', color: 'var(--primary)' }}>
                                    <Activity size={14} />
                                </div>
                                <span className="std-module-name">Video Completion</span>
                            </div>
                            <span className="std-module-index" style={{ color: 'var(--primary)', fontWeight: 'bold' }}>
                                {Math.round(((student.completedVideoIds || []).length / (student.totalItems || 1)) * 100)}%
                            </span>
                        </div>

                        <div className="std-module-item">
                            <div className="std-module-left">
                                <div className="std-module-check" style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981' }}>
                                    <Activity size={14} />
                                </div>
                                <span className="std-module-name">Attendance Rate</span>
                            </div>
                            <span className="std-module-index" style={{ color: '#10b981', fontWeight: 'bold' }}>
                                {student.attendancePercentage}%
                            </span>
                        </div>

                        <div className="std-module-item">
                            <div className="std-module-left">
                                <div className="std-module-check" style={{ background: 'rgba(245, 158, 11, 0.1)', color: '#F59E0B' }}>
                                    <Activity size={14} />
                                </div>
                                <span className="std-module-name">Assignment Score</span>
                            </div>
                            <span className="std-module-index" style={{ color: '#F59E0B', fontWeight: 'bold' }}>
                                {student.overallScore} Pts
                            </span>
                        </div>

                        {(student.totalItems || 0) === 0 && (
                            <div className="std-empty-state">
                                <div className="std-empty-icon">
                                    <Circle size={28} />
                                </div>
                                <p className="std-empty-title">No activity tracked yet</p>
                                <p className="std-empty-sub">Progress will sync automatically from the mobile app.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
