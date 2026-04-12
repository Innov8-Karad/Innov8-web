import { useState, useEffect } from 'react';
import { Search, Filter, Eye, CheckCircle, Clock, Undo, FileText, Image as ImageIcon } from 'lucide-react';
import { courseService } from '../services/courseService';
import type { AssignmentSubmission } from '../types';
import Modal from './Modal';
import GradingPanel from './GradingPanel';

interface SubmissionListProps {
    courseId: string;
    assignmentId: string;
    assignmentTitle: string;
    onClose: () => void;
}

export default function SubmissionList({ courseId, assignmentId, assignmentTitle, onClose }: SubmissionListProps) {
    const [submissions, setSubmissions] = useState<AssignmentSubmission[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [selectedSubmission, setSelectedSubmission] = useState<AssignmentSubmission | null>(null);

    useEffect(() => {
        const unsubscribe = courseService.subscribeToSubmissions(courseId, assignmentId, (data) => {
            setSubmissions(data);
            setLoading(false);
        });
        return () => unsubscribe();
    }, [courseId, assignmentId]);

    const filteredSubmissions = submissions.filter(sub => {
        const matchesSearch = sub.userName.toLowerCase().includes(searchTerm.toLowerCase()) || 
                             sub.userEmail.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = statusFilter === 'all' || sub.status === statusFilter;
        return matchesSearch && matchesStatus;
    });

    const getStatusBadge = (status: AssignmentSubmission['status']) => {
        switch (status) {
            case 'graded':
                return <span className="badge badge-success"><CheckCircle size={12} className="mr-1" /> Graded</span>;
            case 'returned':
                return <span className="badge badge-blue" style={{ backgroundColor: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6', border: '1px solid rgba(59, 130, 246, 0.2)' }}><Undo size={12} className="mr-1" /> Returned</span>;
            default:
                return <span className="badge badge-warning"><Clock size={12} className="mr-1" /> Submitted</span>;
        }
    };

    return (
        <Modal isOpen={true} onClose={onClose} title={`Submissions: ${assignmentTitle}`} maxWidth="1000px">
            <div className="flex flex-col gap-4 p-1">
                <div className="flex flex-wrap gap-3 items-center justify-between">
                    <div className="relative flex-1 min-w-[200px]">
                        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
                        <input 
                            type="text" 
                            placeholder="Search student name or email..." 
                            className="login-input w-full pl-10 h-10"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <div className="flex items-center gap-2">
                        <Filter size={18} className="text-muted" />
                        <select 
                            className="login-input h-10 py-0" 
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            style={{ width: '150px' }}
                        >
                            <option value="all">All Status</option>
                            <option value="submitted">Submitted</option>
                            <option value="graded">Graded</option>
                            <option value="returned">Returned</option>
                        </select>
                    </div>
                </div>

                <div className="table-wrapper border rounded-lg overflow-hidden">
                    <table className="table">
                        <thead>
                            <tr>
                                <th>Student</th>
                                <th>Submitted At</th>
                                <th>File</th>
                                <th>Status</th>
                                <th>Grade</th>
                                <th>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan={6} className="text-center py-8 text-muted">Loading submissions...</td></tr>
                            ) : filteredSubmissions.length === 0 ? (
                                <tr><td colSpan={6} className="text-center py-8 text-muted">No submissions found.</td></tr>
                            ) : (
                                filteredSubmissions.map(sub => (
                                    <tr key={sub.id}>
                                        <td>
                                            <div className="flex flex-col">
                                                <span className="font-semibold">{sub.userName}</span>
                                                <span className="text-xs text-muted">{sub.userEmail}</span>
                                            </div>
                                        </td>
                                        <td>
                                            {'seconds' in sub.submittedAt ? new Date(sub.submittedAt.seconds * 1000).toLocaleDateString() : new Date(sub.submittedAt).toLocaleDateString()}
                                        </td>
                                        <td>
                                            <div className="flex items-center gap-1 text-primary">
                                                {sub.fileType === 'pdf' ? <FileText size={16} /> : <ImageIcon size={16} />}
                                                <span className="text-sm truncate max-w-[100px]">{sub.fileName}</span>
                                            </div>
                                        </td>
                                        <td>{getStatusBadge(sub.status)}</td>
                                        <td>
                                            <span className="font-bold">{sub.grade !== undefined ? `${sub.grade}%` : '-'}</span>
                                        </td>
                                        <td>
                                            <button 
                                                className="btn btn-secondary btn-sm"
                                                onClick={() => setSelectedSubmission(sub)}
                                            >
                                                <Eye size={14} className="mr-1" /> Grade
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {selectedSubmission && (
                <GradingPanel 
                    courseId={courseId}
                    assignmentId={assignmentId}
                    submission={selectedSubmission}
                    onClose={() => setSelectedSubmission(null)}
                />
            )}
        </Modal>
    );
}
