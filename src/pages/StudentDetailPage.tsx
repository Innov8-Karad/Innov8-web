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
import PageHeader from '../components/PageHeader';
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
                    // This is a safety fallback for any student IDs that might not be in the Progress list
                    console.log("No student found in progress list, this shouldn't happen after refactoring");
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

    if (loading) return <LoadingState message="Loading student details..." />;
    if (!student) return null;

    return (
        <div className="animate-in">
            <button 
                onClick={() => navigate('/progress')} 
                className="btn btn-text flex items-center gap-2 mb-6 p-0 hover:bg-transparent"
            >
                <ArrowLeft size={18} /> Back to Progress
            </button>

            <div className="flex items-center gap-6 mb-2">
                <div style={{ marginTop: '-24px' }}>
                    <Avatar 
                        src={student.profilePhoto} 
                        fallback={student.studentName.charAt(0)} 
                        size="lg" 
                    />
                </div>
                <div style={{ flex: 1 }}>
                    <PageHeader
                        title={student.studentName}
                        subtitle={`Batch: ${student.batch}`}
                    >
                        <button className="btn btn-primary" onClick={handleExport}>
                            <Download size={18} style={{ marginRight: '8px' }} />
                            Export Report
                        </button>
                    </PageHeader>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="card shadow-sm p-6 flex items-center gap-4">
                    <div className="bg-primary/10 p-4 rounded-xl text-primary">
                        <User size={24} />
                    </div>
                    <div>
                        <p className="text-sm text-muted">Attendance</p>
                        <h3 className="text-2xl font-bold">{student.attendancePercentage}%</h3>
                    </div>
                </div>
                <div className="card shadow-sm p-6 flex items-center gap-4">
                    <div className="bg-success/10 p-4 rounded-xl text-success">
                        <Award size={24} />
                    </div>
                    <div>
                        <p className="text-sm text-muted">Overall Score</p>
                        <h3 className="text-2xl font-bold">{student.overallScore}</h3>
                    </div>
                </div>
                <div className="card shadow-sm p-6 flex items-center gap-4">
                    <div className="bg-warning/10 p-4 rounded-xl text-warning">
                        <Layers size={24} />
                    </div>
                    <div>
                        <p className="text-sm text-muted">Modules Done</p>
                        <h3 className="text-2xl font-bold">{student.completedModules.length}</h3>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="card shadow-sm">
                    <div className="border-b border-divider p-6">
                        <h3 className="text-lg font-semibold flex items-center gap-2">
                            <BookOpen size={20} className="text-primary" />
                            Academic Status
                        </h3>
                    </div>
                    <div className="p-6">
                        <div className="flex flex-col gap-6">
                            <div className="flex justify-between items-center">
                                <span className="text-muted">Current Module</span>
                                <span className="font-medium bg-light px-3 py-1 rounded-full text-sm">{student.currentModule}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-muted">Completion Rate</span>
                                <span className="font-semibold text-primary">{Math.round((student.completedModules.length / 10) * 100)}%</span>
                            </div>
                            <div className="w-full bg-light rounded-full h-2">
                                <div className="bg-primary h-2 rounded-full" style={{ width: `${(student.completedModules.length / 10) * 100}%` }}></div>
                            </div>
                            <div className="flex justify-between items-center text-xs text-muted italic">
                                <span>Based on 10 core modules</span>
                                <span>Updated: {student.updatedAt instanceof Date ? student.updatedAt.toLocaleDateString() : 'N/A'}</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="card shadow-sm">
                    <div className="border-b border-divider p-6">
                        <h3 className="text-lg font-semibold flex items-center gap-2">
                            <CheckCircle2 size={20} className="text-success" />
                            Completed Modules list
                        </h3>
                    </div>
                    <div className="p-6">
                        <div className="flex flex-col gap-4 max-h-[300px] overflow-y-auto pr-2">
                            {student.completedModules.map((m, i) => (
                                <div key={i} className="flex items-center gap-3 p-3 bg-light/30 rounded-lg border border-divider/50">
                                    <CheckCircle2 size={16} className="text-success" />
                                    <span className="text-sm font-medium">{m}</span>
                                </div>
                            ))}
                            {student.completedModules.length === 0 && (
                                <div className="text-center py-10 opacity-50">
                                    <Circle size={40} className="mx-auto mb-2 text-muted" />
                                    <p>No modules completed yet.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
