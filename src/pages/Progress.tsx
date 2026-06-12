import { useState, useEffect, useMemo, useCallback } from 'react';
import {
    Download,
    Edit2,
    Search,
    BarChart3,
    Users,
    CheckCircle2,
    ExternalLink,
    TrendingUp,
    Clock,
    PlayCircle,
    Activity
} from 'lucide-react';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Legend,
    Cell
} from 'recharts';
import { UI_STRINGS } from '../constants';
import { progressService } from '../services/progressService';
import { attendanceService } from '../services/attendanceService';
import type { StudentProgress, AttendanceRecord } from '../types';
import LoadingState from '../components/LoadingState';
import Avatar from '../components/Avatar';
import PageHeader from '../components/PageHeader';
import Modal from '../components/Modal';
import { FormField, FormRow, FormActions } from '../components/FormField';
import CustomSelect from '../components/CustomSelect';
import { useToast } from '../hooks/useToast';
import { useNavigate } from 'react-router-dom';

/** Relative time formatter (e.g. "2h ago", "3d ago") */
function timeAgo(date: Date | null | undefined): string {
    if (!date) return '—';
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 30) return `${diffDays}d ago`;
    const diffMonths = Math.floor(diffDays / 30);
    return `${diffMonths}mo ago`;
}

export default function ProgressPage() {
    const navigate = useNavigate();
    const { showToast } = useToast();
    const [progressData, setProgressData] = useState<StudentProgress[]>([]);
    const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
    const [batchStats, setBatchStats] = useState<{ name: string; avgScore: number; avgAttendance: number; avgCompletion: number }[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedBatch, setSelectedBatch] = useState('All');
    const [isMounted, setIsMounted] = useState(false);

    const [showEditModal, setShowEditModal] = useState(false);
    const [editingProgress, setEditingProgress] = useState<StudentProgress | null>(null);
    const [editForm, setEditForm] = useState({
        attendancePercentage: 0,
        overallScore: 0,
    });

    const fetchData = useCallback(async () => {
        try {
            setLoading(true);
            const [data, stats] = await Promise.all([
                progressService.fetchProgress(),
                progressService.getBatchProgress()
            ]);

            const allAttendance = await attendanceService.fetchAll();
            setAttendanceRecords(allAttendance);

            setProgressData(data);
            setBatchStats(stats);
        } catch (err) {
            console.error("Error fetching progress:", err);
            showToast("Failed to load progress data", "error");
        } finally {
            setLoading(false);
        }
    }, [showToast]);

    useEffect(() => {
        setIsMounted(true);
        fetchData();
    }, [fetchData]);

    const handleEdit = (student: StudentProgress) => {
        setEditingProgress(student);
        setEditForm({
            attendancePercentage: student.attendancePercentage ?? 0,
            overallScore: student.overallScore ?? 0,
        });
        setShowEditModal(true);
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingProgress) return;

        try {
            setLoading(true);
            await progressService.updateProgress(editingProgress.id as string, {
                ...editForm,
                email: editingProgress.email,
                studentName: editingProgress.studentName,
            });
            showToast("Progress Updated Successfully");
            setShowEditModal(false);
            fetchData();
        } catch (err) {
            console.error("Error updating progress:", err);
            showToast("Failed to update progress", "error");
        } finally {
            setLoading(false);
        }
    };

    const handleExport = (student: StudentProgress) => {
        try {
            progressService.exportProgressReport(student);
            showToast("Report generated successfully");
        } catch (err) {
            console.error("Export error:", err);
            showToast("Failed to generate PDF", "error");
        }
    };

    const filteredData = useMemo(() => {
        return progressData.map(p => {
            const studentAttendance = attendanceRecords.filter(r => r.studentId === p.studentId);
            const present = studentAttendance.filter(r => r.status === 'present').length;
            const late = studentAttendance.filter(r => r.status === 'late').length;
            const absent = studentAttendance.filter(r => r.status === 'absent').length;

            const totalClasses = present + late + absent;
            const realTimePercentage = totalClasses > 0
                ? Math.round(((present + late) / totalClasses) * 100)
                : p.attendancePercentage;

            return { ...p, attendancePercentage: realTimePercentage };
        }).filter(p => {
            const searchLower = searchTerm.toLowerCase();
            const matchesSearch =
                (p.studentName || '').toLowerCase().includes(searchLower) ||
                (p.email && p.email.toLowerCase().includes(searchLower)) ||
                (p.batch || '').toLowerCase().includes(searchLower);

            const matchesBatch = selectedBatch === 'All' || p.batch === selectedBatch;
            return matchesSearch && matchesBatch;
        });
    }, [progressData, attendanceRecords, searchTerm, selectedBatch]);

    const batchesList = useMemo(() => {
        const unique = Array.from(new Set(progressData.map(p => p.batch).filter((b): b is string => !!b)));
        return ['All', ...unique];
    }, [progressData]);

    // Summary stats derived from filtered data
    const summaryStats = useMemo(() => {
        const total = filteredData.length;
        const avgCompletion = total > 0
            ? Math.round(filteredData.reduce((sum, s) => sum + (s.overallProgress || 0), 0) / total)
            : 0;
        const avgAttendance = total > 0
            ? Math.round(filteredData.reduce((sum, s) => sum + (s.attendancePercentage || 0), 0) / total)
            : 0;
        const now = new Date();
        const activeToday = filteredData.filter(s => {
            const lastActive = s.lastAccessed || s.updatedAt;
            if (!lastActive) return false;
            const d = lastActive instanceof Date ? lastActive : new Date();
            return (now.getTime() - d.getTime()) < 86400000; // 24h
        }).length;
        return { total, avgCompletion, avgAttendance, activeToday };
    }, [filteredData]);

    if (loading && progressData.length === 0) return <LoadingState message={UI_STRINGS.PROGRESS.LOADING} />;

    const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

    return (
        <div className="animate-in" style={{ paddingBottom: '40px' }}>
            <PageHeader
                title={UI_STRINGS.PROGRESS.TITLE}
                subtitle={UI_STRINGS.PROGRESS.SUBTITLE}
            />

            {/* Summary Stat Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                {[
                    { label: 'Total Students', value: summaryStats.total, icon: <Users size={20} />, color: 'var(--primary)', bg: 'rgba(99, 102, 241, 0.08)' },
                    { label: 'Avg Completion', value: `${summaryStats.avgCompletion}%`, icon: <CheckCircle2 size={20} />, color: '#10B981', bg: 'rgba(16, 185, 129, 0.08)' },
                    { label: 'Avg Attendance', value: `${summaryStats.avgAttendance}%`, icon: <Activity size={20} />, color: '#F59E0B', bg: 'rgba(245, 158, 11, 0.08)' },
                    { label: 'Active Today', value: summaryStats.activeToday, icon: <Clock size={20} />, color: '#6366F1', bg: 'rgba(99, 102, 241, 0.08)' },
                ].map((stat, i) => (
                    <div key={i} className="card" style={{
                        background: 'var(--bg-card)',
                        border: '1px solid var(--border-subtle)',
                        borderRadius: '16px',
                        padding: '20px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '16px',
                    }}>
                        <div style={{
                            width: 44, height: 44, borderRadius: 12,
                            background: stat.bg,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            color: stat.color, flexShrink: 0
                        }}>
                            {stat.icon}
                        </div>
                        <div>
                            <div className="text-xs text-muted font-medium" style={{ marginBottom: 2 }}>{stat.label}</div>
                            <div className="text-xl font-bold text-main">{stat.value}</div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Analytics Dashboard */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                <div className="card relative overflow-hidden" style={{
                    background: 'var(--glass-bg)',
                    backdropFilter: 'var(--glass-blur)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: '20px',
                    boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.08)',
                    padding: '24px'
                }}>
                    <div className="flex items-center gap-2 mb-6">
                        <BarChart3 className="text-primary" size={20} />
                        <h3 className="text-lg font-bold text-main">Average Score by Batch</h3>
                    </div>
                    <div style={{ width: '100%', height: 350, display: 'flex', flexDirection: 'column' }}>
                        <div style={{ height: '300px', minHeight: '300px', position: 'relative' }}>
                            {isMounted && (
                                <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={300} debounce={100}>
                                    <BarChart
                                        data={batchStats}
                                        margin={{
                                            top: 20,
                                            right: 30,
                                            left: 20,
                                            bottom: 50
                                        }}
                                    >
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--chart-grid)" />
                                        <XAxis
                                            dataKey="name"
                                            axisLine={false}
                                            tickLine={false}
                                            stroke="var(--chart-axis)"
                                            fontSize={12}
                                        />
                                        <YAxis axisLine={false} tickLine={false} stroke="var(--chart-axis)" fontSize={12} />
                                        <Tooltip
                                            contentStyle={{
                                                backgroundColor: 'var(--bg-card)',
                                                borderRadius: '12px',
                                                border: '1px solid var(--border-subtle)',
                                                boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                                                padding: '12px',
                                                color: 'var(--text-main)'
                                            }}
                                        />
                                        <Bar dataKey="avgScore" name="Avg Score" radius={[6, 6, 0, 0]} barSize={40}>
                                            {batchStats.map((_, index) => (
                                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            )}
                        </div>
                        {batchStats.length === 0 && (
                            <div className="flex items-center justify-center h-full text-muted italic">
                                No Progress Data Available
                            </div>
                        )}
                    </div>
                </div>

                <div className="card relative overflow-hidden" style={{
                    background: 'var(--glass-bg)',
                    backdropFilter: 'var(--glass-blur)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: '20px',
                    boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.08)',
                    padding: '24px'
                }}>
                    <div className="flex items-center gap-2 mb-6">
                        <TrendingUp className="text-success" size={20} />
                        <h3 className="text-lg font-bold text-main">Avg Attendance & Completion (%)</h3>
                    </div>
                    <div style={{ width: '100%', height: 350, display: 'flex', flexDirection: 'column' }}>
                        <div style={{ height: '300px', minHeight: '300px', position: 'relative' }}>
                            {isMounted && (
                                <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={300} debounce={100}>
                                    <BarChart
                                        data={batchStats}
                                        layout="vertical"
                                        margin={{
                                            top: 20,
                                            right: 30,
                                            left: 40,
                                            bottom: 20
                                        }}
                                    >
                                        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--chart-grid)" />
                                        <XAxis type="number" hide />
                                        <YAxis
                                            dataKey="name"
                                            type="category"
                                            axisLine={false}
                                            tickLine={false}
                                            width={80}
                                            stroke="var(--chart-axis)"
                                            fontSize={12}
                                        />
                                        <Tooltip
                                            contentStyle={{
                                                backgroundColor: 'var(--bg-card)',
                                                borderRadius: '12px',
                                                border: '1px solid var(--border-subtle)',
                                                boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                                                padding: '12px',
                                                color: 'var(--text-main)'
                                            }}
                                        />
                                        <Legend wrapperStyle={{ paddingTop: '20px' }} />
                                        <Bar dataKey="avgAttendance" name="Attendance" fill="var(--primary)" radius={[0, 4, 4, 0]} barSize={20} />
                                        <Bar dataKey="avgCompletion" name="Completion Rate" fill="#10B981" radius={[0, 4, 4, 0]} barSize={20} />
                                    </BarChart>
                                </ResponsiveContainer>
                            )}
                        </div>
                        {batchStats.length === 0 && (
                            <div className="flex items-center justify-center h-full text-muted italic">
                                No Progress Data Available
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Management Section */}
            <div className="card shadow-sm overflow-hidden" style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--border-subtle)',
                borderRadius: '20px'
            }}>
                <div className="p-6" style={{ borderBottom: '1px solid var(--border-subtle)', background: 'var(--bg-card-accent)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px', width: '100%' }}>
                        <div style={{ position: 'relative', flex: 1 }}>
                            <Search
                                style={{
                                    position: 'absolute',
                                    left: '12px',
                                    top: '50%',
                                    transform: 'translateY(-50%)',
                                    color: 'var(--text-secondary)'
                                }}
                                size={18}
                            />
                            <input
                                type="text"
                                style={{
                                    paddingLeft: '40px',
                                    width: '100%',
                                    background: 'var(--input-bg)',
                                    border: '1px solid var(--border-subtle)',
                                    color: 'var(--text-main)',
                                    height: '42px'
                                }}
                                className="rounded-lg focus:ring-2 focus:ring-primary/20 outline-none transition-all duration-200"
                                placeholder="Search student name..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <CustomSelect
                            options={batchesList.map(b => ({ value: b, label: b }))}
                            value={selectedBatch}
                            onChange={(val) => setSelectedBatch(val)}
                            placeholder="Batch"
                            className="text-sm"
                            style={{ width: '150px' }}
                        />
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: 'auto', whiteSpace: 'nowrap' }} className="text-sm text-muted">
                            <Users size={18} />
                            <span>Showing {filteredData.length} Students</span>
                        </div>
                    </div>
                </div>

                <div className="table-wrapper">
                    <table className="table">
                        <thead style={{ background: 'var(--bg-card-accent)', borderBottom: '1px solid var(--border-subtle)' }}>
                            <tr>
                                <th className="px-6 py-4" style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>Student</th>
                                <th className="px-6 py-4" style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>Batch</th>
                                <th className="px-6 py-4" style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>Integrated Progress</th>
                                <th className="px-6 py-4" style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>Score</th>
                                <th className="px-6 py-4" style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>Items Done</th>
                                <th className="px-6 py-4" style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>Last Active</th>
                                <th className="px-6 py-4 text-right" style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5 text-main">
                            {filteredData.map(student => (
                                <tr key={student.id} className="transition-colors" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center">
                                            <Avatar
                                                src={student.profilePhoto}
                                                fallback={(student.studentName || '?').charAt(0)}
                                                size="sm"
                                            />
                                            <div style={{ marginLeft: '12px' }}>
                                                <div className="font-medium text-sm">{student.studentName}</div>
                                                {student.email && (
                                                    <div className="text-xs text-muted" style={{ fontSize: '0.75rem' }}>
                                                        {student.email}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="badge badge-primary">{student.batch}</span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2">
                                            <div className="w-16 bg-divider rounded-full h-2">
                                                <div className="bg-success h-2 rounded-full" style={{ width: `${student.overallProgress || 0}%` }}></div>
                                            </div>
                                            <span className="text-sm font-semibold">{student.overallProgress || 0}%</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 font-semibold">{student.overallScore}</td>
                                    <td className="px-6 py-4 text-sm">
                                        <div className="flex items-center gap-1">
                                            <PlayCircle size={14} className="text-primary" />
                                            <span>
                                                {student.completedItems ?? 0}
                                                {student.totalItems ? ` / ${student.totalItems}` : ''}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-sm">
                                        <span className="flex items-center gap-1 text-muted">
                                            <Clock size={14} /> {timeAgo(student.lastAccessed instanceof Date ? student.lastAccessed : (student.updatedAt instanceof Date ? student.updatedAt : null))}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex justify-end gap-1">
                                            <button
                                                className="icon-btn"
                                                title="View Details"
                                                onClick={() => navigate(`/progress/${student.studentId}`)}
                                            >
                                                <ExternalLink size={16} />
                                            </button>
                                            <button
                                                className="icon-btn"
                                                title="Export PDF"
                                                onClick={() => handleExport(student)}
                                            >
                                                <Download size={16} />
                                            </button>
                                            <button
                                                className="icon-btn"
                                                title="Edit Progress"
                                                onClick={() => handleEdit(student)}
                                            >
                                                <Edit2 size={16} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {filteredData.length === 0 && (
                    <div className="py-20 text-center">
                        <div className="bg-light/30 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 border border-divider">
                            <Search className="text-muted" size={24} />
                        </div>
                        <p className="text-muted font-medium">No students found</p>
                        <p className="text-xs text-muted/60 mt-1">Try adjusting your search or filters</p>
                    </div>
                )}
            </div>

            {/* Edit Modal */}
            <Modal isOpen={showEditModal} onClose={() => setShowEditModal(false)} title="Update Student Progress" maxWidth="500px">
                <form onSubmit={handleSave} className="form-layout p-2">
                    <p className="text-sm text-muted mb-4">Updating progress for <span className="text-text font-bold">{editingProgress?.studentName}</span></p>

                    <FormRow>
                        <FormField label="Attendance (%)">
                            <input
                                type="number"
                                min="0" max="100"
                                value={editForm.attendancePercentage}
                                onChange={(e) => setEditForm({ ...editForm, attendancePercentage: Number(e.target.value) })}
                                required
                            />
                        </FormField>
                        <FormField label="Overall Score">
                            <input
                                type="number"
                                min="0"
                                value={editForm.overallScore}
                                onChange={(e) => setEditForm({ ...editForm, overallScore: Number(e.target.value) })}
                                required
                            />
                        </FormField>
                    </FormRow>



                    <FormActions>
                        <button type="button" className="btn btn-secondary" onClick={() => setShowEditModal(false)}>Cancel</button>
                        <button type="submit" className="btn btn-primary" disabled={loading}>
                            {loading ? "Saving..." : "Update Progress"}
                        </button>
                    </FormActions>
                </form>
            </Modal>
        </div>
    );
}