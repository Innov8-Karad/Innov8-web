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
    Layers
} from 'lucide-react';
import { progressService } from '../services/progressService';
import type { StudentProgress } from '../types';
import LoadingState from '../components/LoadingState';
import Avatar from '../components/Avatar';
import { useToast } from '../hooks/useToast';

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
        <div className="animate-in" style={{ paddingBottom: '40px' }}>
            <button 
                onClick={() => navigate('/progress')} 
                className="flex items-center gap-2 mb-6 text-sm text-secondary hover:text-primary transition-all duration-200"
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
            >
                <ArrowLeft size={16} /> Back to Progress
            </button>

            {/* Profile Header Card */}
            <div className="card mb-8 p-6 overflow-hidden relative" style={{
                background: 'linear-gradient(135deg, var(--bg-card), var(--bg-card-accent))',
                border: '1px solid var(--border-subtle)',
                backdropFilter: 'blur(12px)',
                boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.1)',
                borderRadius: '20px'
            }}>
                {/* Decorative background glow */}
                <div style={{
                    position: 'absolute',
                    top: '-20%',
                    right: '-10%',
                    width: '300px',
                    height: '300px',
                    background: 'radial-gradient(circle, rgba(var(--primary-rgb), 0.15) 0%, transparent 70%)',
                    pointerEvents: 'none',
                    filter: 'blur(40px)',
                    zIndex: 0
                }} />

                <div className="flex flex-col md:flex-row items-center gap-6 relative z-10">
                    <div style={{
                        border: '3px solid rgba(var(--primary-rgb), 0.6)',
                        boxShadow: '0 0 20px rgba(var(--primary-rgb), 0.25)',
                        transform: 'scale(1.02)',
                        borderRadius: '9999px',
                        display: 'inline-block',
                        lineHeight: 0
                    }}>
                        <Avatar 
                            src={student.profilePhoto} 
                            fallback={(student.studentName || '?').charAt(0)} 
                            size="lg" 
                        />
                    </div>
                    <div className="flex-1 text-center md:text-left">
                        <span className="badge badge-primary mb-2" style={{
                            background: 'rgba(var(--primary-rgb), 0.15)',
                            border: '1px solid rgba(var(--primary-rgb), 0.3)',
                            color: 'var(--primary)',
                            fontSize: '0.8rem',
                            padding: '4px 12px',
                            borderRadius: '30px',
                            fontWeight: 600,
                            display: 'inline-block'
                        }}>
                            Batch: {student.batch || 'Unassigned'}
                        </span>
                        <h1 className="text-3xl font-extrabold text-main tracking-tight" style={{ 
                            margin: '8px 0',
                            color: 'var(--text-main)'
                        }}>
                            {student.studentName || 'Student'}
                        </h1>
                        <p className="text-sm text-secondary flex items-center justify-center md:justify-start gap-2">
                            <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                            Active Student Profile
                        </p>
                    </div>
                    <button 
                        className="btn btn-primary flex items-center gap-2 px-6 py-3 rounded-xl transition-all duration-300 transform hover:scale-[1.02] shadow-lg shadow-primary/20" 
                        onClick={handleExport}
                        style={{
                            background: 'linear-gradient(135deg, var(--primary), rgba(var(--primary-rgb), 0.85))',
                            border: 'none',
                            fontWeight: 600
                        }}
                    >
                        <Download size={18} />
                        Export Report
                    </button>
                </div>
            </div>

            {/* Metric Grid Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                {/* Attendance Metric */}
                <div className="card relative overflow-hidden group hover:translate-y-[-2px] transition-all duration-300" style={{
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: '16px',
                    padding: '24px'
                }}>
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-secondary font-medium mb-1">Attendance</p>
                            <h3 className="text-3xl font-extrabold text-main">{student.attendancePercentage}%</h3>
                        </div>
                        <div className="p-4 rounded-2xl transition-all duration-300" style={{
                            background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.15), rgba(59, 130, 246, 0.05))',
                            border: '1px solid rgba(59, 130, 246, 0.25)',
                            color: '#3b82f6'
                        }}>
                            <User size={24} />
                        </div>
                    </div>
                    <div style={{
                        position: 'absolute',
                        bottom: 0,
                        left: 0,
                        right: 0,
                        height: '3px',
                        background: 'linear-gradient(to right, #3b82f6, transparent)'
                    }} />
                </div>

                {/* Overall Score Metric */}
                <div className="card relative overflow-hidden group hover:translate-y-[-2px] transition-all duration-300" style={{
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: '16px',
                    padding: '24px'
                }}>
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-secondary font-medium mb-1">Overall Score</p>
                            <h3 className="text-3xl font-extrabold text-main">{student.overallScore}</h3>
                        </div>
                        <div className="p-4 rounded-2xl transition-all duration-300" style={{
                            background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.15), rgba(16, 185, 129, 0.05))',
                            border: '1px solid rgba(16, 185, 129, 0.25)',
                            color: '#10b981'
                        }}>
                            <Award size={24} />
                        </div>
                    </div>
                    <div style={{
                        position: 'absolute',
                        bottom: 0,
                        left: 0,
                        right: 0,
                        height: '3px',
                        background: 'linear-gradient(to right, #10b981, transparent)'
                    }} />
                </div>

                {/* Modules Done Metric */}
                <div className="card relative overflow-hidden group hover:translate-y-[-2px] transition-all duration-300" style={{
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: '16px',
                    padding: '24px'
                }}>
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-secondary font-medium mb-1">Modules Done</p>
                            <h3 className="text-3xl font-extrabold text-main">
                                {(student.completedModules ?? []).length}
                            </h3>
                        </div>
                        <div className="p-4 rounded-2xl transition-all duration-300" style={{
                            background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.15), rgba(245, 158, 11, 0.05))',
                            border: '1px solid rgba(245, 158, 11, 0.25)',
                            color: '#f59e0b'
                        }}>
                            <Layers size={24} />
                        </div>
                    </div>
                    <div style={{
                        position: 'absolute',
                        bottom: 0,
                        left: 0,
                        right: 0,
                        height: '3px',
                        background: 'linear-gradient(to right, #f59e0b, transparent)'
                    }} />
                </div>
            </div>

            {/* Academic Detail & Lists Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Academic Status Card */}
                <div className="card overflow-hidden" style={{
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: '20px',
                    padding: '24px'
                }}>
                    <h3 className="text-lg font-bold flex items-center gap-2 mb-6 pb-4" style={{
                        borderBottom: '1px solid var(--border-subtle)',
                        color: 'var(--text-main)'
                    }}>
                        <BookOpen size={20} className="text-primary" />
                        Academic Status
                    </h3>
                    <div className="flex flex-col gap-6">
                        <div className="flex justify-between items-center p-4 rounded-xl" style={{ background: 'var(--bg-card-accent)', border: '1px solid var(--border-subtle)' }}>
                            <span className="text-sm text-secondary">Current Module</span>
                            <span className="font-semibold bg-primary/10 border border-primary/20 px-3 py-1 rounded-full text-xs text-primary">
                                {student.currentModule || 'None'}
                            </span>
                        </div>

                        <div>
                            <div className="flex justify-between items-center mb-2">
                                <span className="text-sm text-secondary">Completion Rate</span>
                                <span className="text-sm font-bold text-primary">
                                    {Math.round(((student.completedModules ?? []).length / 10) * 100)}%
                                </span>
                            </div>
                            <div className="w-full rounded-full h-3 overflow-hidden p-[2px]" style={{ background: 'var(--bg-card-accent)' }}>
                                <div 
                                    className="h-full rounded-full transition-all duration-500" 
                                    style={{ 
                                        width: `${Math.min(100, ((student.completedModules ?? []).length / 10) * 100)}%`,
                                        background: 'linear-gradient(90deg, var(--primary), #60a5fa)',
                                        boxShadow: '0 0 8px rgba(59, 130, 246, 0.4)'
                                    }} 
                                />
                            </div>
                        </div>

                        <div className="flex justify-between items-center text-xs text-secondary mt-2">
                            <span>Based on 10 core modules</span>
                            <span>Updated: {formatUpdatedDate(student.updatedAt)}</span>
                        </div>
                    </div>
                </div>

                {/* Completed Modules list */}
                <div className="card overflow-hidden" style={{
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: '20px',
                    padding: '24px'
                }}>
                    <h3 className="text-lg font-bold flex items-center gap-2 mb-6 pb-4" style={{
                        borderBottom: '1px solid var(--border-subtle)',
                        color: 'var(--text-main)'
                    }}>
                        <CheckCircle2 size={20} className="text-emerald-500" />
                        Completed Modules list
                    </h3>
                    <div className="flex flex-col gap-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                        {(student.completedModules ?? []).map((m, i) => (
                            <div key={i} className="flex items-center justify-between p-4 rounded-xl transition-all duration-200" style={{ background: 'var(--bg-card-accent)', border: '1px solid var(--border-subtle)' }}>
                                <div className="flex items-center gap-3">
                                    <div className="w-6 h-6 rounded-full bg-emerald-500/10 flex items-center justify-center border border-emerald-500/25">
                                        <CheckCircle2 size={12} className="text-emerald-500" />
                                    </div>
                                    <span className="text-sm font-semibold text-main">{m}</span>
                                </div>
                                <span className="text-xs text-secondary font-medium">Module {i + 1}</span>
                            </div>
                        ))}
                        {(student.completedModules ?? []).length === 0 && (
                            <div className="text-center py-12 flex flex-col items-center justify-center opacity-70">
                                <div className="w-16 h-16 rounded-full flex items-center justify-center mb-4 text-secondary" style={{ background: 'var(--bg-card-accent)', border: '1px solid var(--border-subtle)' }}>
                                    <Circle size={32} />
                                </div>
                                <p className="text-sm font-semibold text-main">No modules completed yet</p>
                                <p className="text-xs text-secondary mt-1">Modules will appear here once marked as complete.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
