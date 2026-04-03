import { useState, useEffect, useMemo, useCallback } from 'react';
import { 
    Download, 
    Edit2, 
    Search, 
    BarChart3, 
    Users, 
    CheckCircle2, 
    ExternalLink,
    TrendingUp
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
import type { StudentProgress } from '../types';
import LoadingState from '../components/LoadingState';
import Avatar from '../components/Avatar';
import PageHeader from '../components/PageHeader';
import Modal from '../components/Modal';
import { FormField, FormRow, FormActions } from '../components/FormField';
import { useToast } from '../hooks/useToast';
import { useNavigate } from 'react-router-dom';

export default function ProgressPage() {
    const navigate = useNavigate();
    const { showToast } = useToast();
    const [progressData, setProgressData] = useState<StudentProgress[]>([]);
    const [batchStats, setBatchStats] = useState<{ name: string; avgScore: number; avgAttendance: number; avgCompletion: number }[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedBatch, setSelectedBatch] = useState('All');
    
    const [showEditModal, setShowEditModal] = useState(false);
    const [editingProgress, setEditingProgress] = useState<StudentProgress | null>(null);
    const [editForm, setEditForm] = useState({
        attendancePercentage: 0,
        overallScore: 0,
        currentModule: '',
        completedModules: [] as string[]
    });

    const fetchData = useCallback(async () => {
        try {
            setLoading(true);
            const [data, stats] = await Promise.all([
                progressService.fetchProgress(),
                progressService.getBatchProgress()
            ]);
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
        fetchData();
    }, [fetchData]);

    const handleEdit = (student: StudentProgress) => {
        setEditingProgress(student);
        setEditForm({
            attendancePercentage: student.attendancePercentage,
            overallScore: student.overallScore,
            currentModule: student.currentModule,
            completedModules: student.completedModules
        });
        setShowEditModal(true);
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingProgress) return;

        try {
            setLoading(true);
            await progressService.updateProgress(editingProgress.id as string, editForm);
            showToast("Progress updated successfully");
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
        return progressData.filter(p => {
            const searchLower = searchTerm.toLowerCase();
            const matchesSearch = 
                p.studentName.toLowerCase().includes(searchLower) ||
                (p.email && p.email.toLowerCase().includes(searchLower)) ||
                p.batch.toLowerCase().includes(searchLower) ||
                p.currentModule.toLowerCase().includes(searchLower);

            const matchesBatch = selectedBatch === 'All' || p.batch === selectedBatch;
            return matchesSearch && matchesBatch;
        });
    }, [progressData, searchTerm, selectedBatch]);

    const batchesList = useMemo(() => {
        const unique = Array.from(new Set(progressData.map(p => p.batch)));
        return ['All', ...unique];
    }, [progressData]);

    if (loading && progressData.length === 0) return <LoadingState message={UI_STRINGS.PROGRESS.LOADING} />;

    const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

    return (
        <div className="animate-in">
            <PageHeader
                title={UI_STRINGS.PROGRESS.TITLE}
                subtitle={UI_STRINGS.PROGRESS.SUBTITLE}
            />

            {/* Analytics Dashboard */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                <div className="card shadow-sm">
                    <div className="flex items-center gap-2 mb-6">
                        <BarChart3 className="text-primary" size={20} />
                        <h3 className="text-lg font-semibold">Average Score by Batch</h3>
                    </div>
                    <div style={{ width: '100%', height: 350, display: 'flex', flexDirection: 'column' }}>
                        <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0} debounce={100}>
                            <BarChart 
                                data={batchStats}
                                margin={{
                                    top: 20,
                                    right: 30,
                                    left: 20,
                                    bottom: 50
                                }}
                            >
                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                <XAxis 
                                    dataKey="name" 
                                    axisLine={true} 
                                    tickLine={true}
                                />
                                <YAxis axisLine={true} tickLine={true} />
                                <Tooltip 
                                    contentStyle={{ 
                                        borderRadius: '12px', 
                                        border: 'none', 
                                        boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                                        padding: '12px'
                                    }}
                                />
                                <Bar dataKey="avgScore" name="Avg Score" radius={[6, 6, 0, 0]} barSize={40}>
                                    {batchStats.map((_, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                        {batchStats.length === 0 && (
                            <div className="flex items-center justify-center h-full text-muted italic">
                                No Progress Data Available
                            </div>
                        )}
                    </div>
                </div>

                <div className="card shadow-sm">
                    <div className="flex items-center gap-2 mb-6">
                        <TrendingUp className="text-success" size={20} />
                        <h3 className="text-lg font-semibold">Avg Attendance & Completion (%)</h3>
                    </div>
                    <div style={{ width: '100%', height: 350, display: 'flex', flexDirection: 'column' }}>
                        <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0} debounce={100}>
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
                                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                                <XAxis type="number" hide />
                                <YAxis 
                                    dataKey="name" 
                                    type="category" 
                                    axisLine={true} 
                                    tickLine={true} 
                                    width={80}
                                />
                                <Tooltip 
                                    contentStyle={{ 
                                        borderRadius: '12px', 
                                        border: 'none', 
                                        boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                                        padding: '12px'
                                    }}
                                />
                                <Legend wrapperStyle={{ paddingTop: '20px' }} />
                                <Bar dataKey="avgAttendance" name="Attendance" fill="var(--primary)" radius={[0, 4, 4, 0]} barSize={20} />
                                <Bar dataKey="avgCompletion" name="Completion Rate" fill="#10B981" radius={[0, 4, 4, 0]} barSize={20} />
                            </BarChart>
                        </ResponsiveContainer>
                        {batchStats.length === 0 && (
                            <div className="flex items-center justify-center h-full text-muted italic">
                                No Progress Data Available
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Management Section */}
            <div className="card shadow-sm overflow-hidden">
                <div className="p-6 border-b border-divider bg-light/30">
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
                                style={{ paddingLeft: '40px', width: '100%' }}
                                className="rounded-lg border border-divider focus:ring-2 focus:ring-primary/20 outline-none"
                                placeholder="Search student name..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <select 
                            style={{ width: '120px', flexShrink: 0 }}
                            className="rounded-lg border border-divider focus:ring-2 focus:ring-primary/20 outline-none"
                            value={selectedBatch}
                            onChange={(e) => setSelectedBatch(e.target.value)}
                        >
                            {batchesList.map(b => <option key={b} value={b}>{b}</option>)}
                        </select>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: 'auto', whiteSpace: 'nowrap' }} className="text-sm text-muted">
                            <Users size={18} />
                            <span>Showing {filteredData.length} Students</span>
                        </div>
                    </div>
                </div>

                <div className="table-wrapper">
                    <table className="table">
                        <thead className="bg-light/50">
                            <tr>
                                <th className="px-6 py-4">Student</th>
                                <th className="px-6 py-4">Batch</th>
                                <th className="px-6 py-4">Attendance</th>
                                <th className="px-6 py-4">Score</th>
                                <th className="px-6 py-4">Current Module</th>
                                <th className="px-6 py-4">Progress</th>
                                <th className="px-6 py-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-divider text-main">
                            {filteredData.map(student => (
                                <tr key={student.id} className="hover:bg-light/20 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center">
                                            <Avatar 
                                                src={student.profilePhoto} 
                                                fallback={student.studentName.charAt(0) || '?'} 
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
                                                <div className="bg-primary h-2 rounded-full" style={{ width: `${student.attendancePercentage}%` }}></div>
                                            </div>
                                            <span className="text-sm font-semibold">{student.attendancePercentage}%</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 font-semibold">{student.overallScore}</td>
                                    <td className="px-6 py-4 text-sm">{student.currentModule}</td>
                                    <td className="px-6 py-4 text-sm">
                                        <span className="flex items-center gap-1 text-success font-medium">
                                            <CheckCircle2 size={14} /> {student.completedModules.length} Modules
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
                                onChange={(e) => setEditForm({...editForm, attendancePercentage: Number(e.target.value)})}
                                required
                            />
                        </FormField>
                        <FormField label="Overall Score">
                            <input 
                                type="number" 
                                min="0" 
                                value={editForm.overallScore} 
                                onChange={(e) => setEditForm({...editForm, overallScore: Number(e.target.value)})}
                                required
                            />
                        </FormField>
                    </FormRow>
                    
                    <FormField label="Current Module">
                        <input 
                            type="text" 
                            value={editForm.currentModule} 
                            onChange={(e) => setEditForm({...editForm, currentModule: e.target.value})}
                            required
                        />
                    </FormField>

                    <FormField label="Completed Modules (Comma separated)">
                        <textarea 
                            rows={3} 
                            value={editForm.completedModules.join(', ')} 
                            onChange={(e) => setEditForm({...editForm, completedModules: e.target.value.split(',').map(s => s.trim()).filter(s => s)})}
                        />
                    </FormField>

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