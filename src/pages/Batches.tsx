import { useState, useEffect } from 'react';
import { 
    Layers, Plus, Edit2, Trash2, CheckCircle2, XCircle, Clock, 
    FileText, MoreVertical, Search, Users, ArrowLeft, X, 
    Video, UserPlus
} from 'lucide-react';
import { batchService } from '../services/batchService';
import { courseService } from '../services/courseService';
import { userService } from '../services/userService';
import { UI_STRINGS } from '../constants';
import type { Batch, EnrollmentRequest, Course, User } from '../types';
import PageHeader from '../components/PageHeader';
import LoadingState from '../components/LoadingState';
import ErrorAlert from '../components/ErrorAlert';
import Modal from '../components/Modal';
import { FormField, FormRow, FormActions } from '../components/FormField';
import CurriculumBuilder from '../components/CurriculumBuilder';
import AssignmentBuilder from '../components/AssignmentBuilder';
import { useToast } from '../hooks/useToast';
import './Batches.css';

export default function BatchesPage() {
    const { showToast } = useToast();
    const [activeTab, setActiveTab] = useState<'manage' | 'requests'>('manage');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    
    // Data states
    const [batches, setBatches] = useState<Batch[]>([]);
    const [requests, setRequests] = useState<EnrollmentRequest[]>([]);
    const [courses, setCourses] = useState<Course[]>([]);

    // Modal states
    const [showBatchModal, setShowBatchModal] = useState(false);
    const [editingBatch, setEditingBatch] = useState<Batch | null>(null);
    const [deletingBatch, setDeletingBatch] = useState<Batch | null>(null);
    const [actionMenuOpen, setActionMenuOpen] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterActive, setFilterActive] = useState<'all' | 'active' | 'inactive'>('all');
    
    // Students states
    const [expandedBatchId, setExpandedBatchId] = useState<string | null>(null);
    const [drawerTab, setDrawerTab] = useState<'students' | 'content' | 'assignments'>('students');
    const [batchStudents, setBatchStudents] = useState<User[]>([]);
    const [loadingStudents, setLoadingStudents] = useState(false);
    const [studentSearchQuery, setStudentSearchQuery] = useState('');
    
    // Add Student states
    const [showAddStudentModal, setShowAddStudentModal] = useState(false);
    const [findEmail, setFindEmail] = useState('');
    const [foundStudent, setFoundStudent] = useState<User | null>(null);
    const [searchingStudent, setSearchingStudent] = useState(false);
    const [addingStudent, setAddingStudent] = useState(false);
    
    const [newBatch, setNewBatch] = useState({
        name: '',
        batchCode: '',
        courseId: '',
        courseName: '',
        startDate: '',
        endDate: '',
        active: true,
        description: ''
    });

    useEffect(() => {
        let unsubscribeBatches: () => void;
        let unsubscribeRequests: () => void;

        const loadInitialData = async () => {
            try {
                setLoading(true);
                const fetchedCourses = await courseService.fetchCourses();
                setCourses(fetchedCourses);

                unsubscribeBatches = batchService.subscribeToBatches((data) => {
                    setBatches(data);
                    setLoading(false);
                });

                unsubscribeRequests = batchService.subscribeToPendingRequests((data) => {
                    setRequests(data);
                });

            } catch (err) {
                console.error("Error loading initial data:", err);
                setError(UI_STRINGS.BATCHES.ERROR_LOAD);
                setLoading(false);
            }
        };

        loadInitialData();

        return () => {
            if (unsubscribeBatches) unsubscribeBatches();
            if (unsubscribeRequests) unsubscribeRequests();
        };
    }, []);

    useEffect(() => {
        if (!expandedBatchId) {
            setBatchStudents([]);
            setStudentSearchQuery('');
            return;
        }
        
        const loadStudents = async () => {
            setLoadingStudents(true);
            try {
                const students = await userService.fetchUsersByBatch(expandedBatchId);
                setBatchStudents(students);
            } catch (err) {
                console.error("Error loading students:", err);
                showToast("Failed to load students for this batch", "error");
            } finally {
                setLoadingStudents(false);
            }
        };

        loadStudents();
    }, [expandedBatchId, showToast]);

    const handleSaveBatch = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const isDuplicate = batches.some(b => 
                b.name.trim().toLowerCase() === newBatch.name.trim().toLowerCase() && 
                (!editingBatch || b.id !== editingBatch.id)
            );
            if (isDuplicate) {
                showToast("A batch with this name already exists", "error");
                return;
            }

            const course = courses.find(c => c.id === newBatch.courseId);
            const batchData = {
                ...newBatch,
                courseName: course?.title || ''
            };

            if (editingBatch) {
                await batchService.updateBatch(editingBatch.id, batchData as Partial<Batch>);
                showToast(UI_STRINGS.BATCHES.APPROVE_SUCCESS, "success");
            } else {
                await batchService.createBatch(batchData as Omit<Batch, 'id' | 'createdAt' | 'studentCount'>);
                showToast("Batch created successfully", "success");
            }
            setShowBatchModal(false);
            resetForm();
        } catch (err) {
            console.error("Error saving batch:", err);
            showToast(UI_STRINGS.BATCHES.ERROR_CREATE, "error");
        }
    };

    const confirmDelete = async () => {
        if (!deletingBatch) return;
        try {
            await batchService.deleteBatch(deletingBatch.id);
            showToast("Batch deleted successfully", "success");
            setDeletingBatch(null);
        } catch (err) {
            console.error("Error deleting batch:", err);
            showToast("Failed to delete batch", "error");
        }
    };

    const handleApproveRequest = async (request: EnrollmentRequest) => {
        try {
            await batchService.approveEnrollment(request);
            showToast(UI_STRINGS.BATCHES.APPROVE_SUCCESS, "success");
        } catch (err) {
            console.error("Error approving request:", err);
            showToast("Failed to approve enrollment", "error");
        }
    };

    const handleRejectRequest = async (requestId: string) => {
        try {
            await batchService.rejectEnrollment(requestId);
            showToast(UI_STRINGS.BATCHES.REJECT_SUCCESS, "success");
        } catch (err) {
            console.error("Error rejecting request:", err);
            showToast("Failed to reject request", "error");
        }
    };

    const handleStudentStatusToggle = async (userId: string, currentStatus: string | undefined) => {
        try {
            const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
            await userService.updateStudentStatus(userId, newStatus);
            // Update local state
            setBatchStudents(prev => prev.map(s => s.id === userId ? { ...s, status: newStatus } : s));
            showToast(`Student marked as ${newStatus}`, "success");
        } catch (err) {
            console.error("Error updating student status:", err);
            showToast("Failed to update status", "error");
        }
    };

    const handleRemoveStudentFromBatch = async (userId: string) => {
        if (!expandedBatchId) return;
        if (!window.confirm("Are you sure you want to remove this student from the batch?")) return;
        try {
            await batchService.removeStudentFromBatch(userId, expandedBatchId);
            setBatchStudents(prev => prev.filter(s => s.id !== userId));
            showToast("Student removed from batch", "success");
        } catch (err) {
            console.error("Error removing student:", err);
            showToast("Failed to remove student", "error");
        }
    };

    const handleFindStudent = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!findEmail) return;
        setSearchingStudent(true);
        setFoundStudent(null);
        try {
            const student = await userService.findUserByEmail(findEmail);
            if (student) {
                setFoundStudent(student);
            } else {
                showToast("No student found with this email", "error");
            }
        } catch (err) {
            console.error("Error finding student:", err);
            showToast("Error searching for student", "error");
        } finally {
            setSearchingStudent(false);
        }
    };

    const handleAddStudentToBatch = async () => {
        if (!foundStudent || !expandedBatchId) return;
        setAddingStudent(true);
        try {
            await batchService.addStudentToBatch(foundStudent.id, expandedBatchId);
            showToast(`Added ${foundStudent.name} to batch`, "success");
            setShowAddStudentModal(false);
            setFindEmail('');
            setFoundStudent(null);
            
            // Refresh list
            const students = await userService.fetchUsersByBatch(expandedBatchId);
            setBatchStudents(students);
        } catch (err) {
            console.error("Error adding student:", err);
            showToast("Failed to add student to batch", "error");
        } finally {
            setAddingStudent(false);
        }
    };

    const resetForm = () => {
        setEditingBatch(null);
        setNewBatch({
            name: '',
            batchCode: '',
            courseId: '',
            courseName: '',
            startDate: '',
            endDate: '',
            active: true,
            description: ''
        });
    };

    const openEditModal = (batch: Batch) => {
        setEditingBatch(batch);
        setNewBatch({
            name: batch.name,
            batchCode: batch.batchCode || '',
            courseId: batch.courseId || '',
            courseName: batch.courseName || '',
            startDate: batch.startDate as string || '',
            endDate: batch.endDate as string || '',
            active: batch.active,
            description: batch.description || ''
        });
        setShowBatchModal(true);
    };

    // ── Grid Rendering and Search ──
    const filteredBatches = batches.filter(b => {
        const matchesSearch = b.name.toLowerCase().includes(searchQuery.toLowerCase()) || (b.courseName && b.courseName.toLowerCase().includes(searchQuery.toLowerCase()));
        const matchesActive = filterActive === 'all' || (filterActive === 'active' && b.active) || (filterActive === 'inactive' && !b.active);
        return matchesSearch && matchesActive;
    });

    const getPendingRequestsCount = (batchId: string) => {
        return requests.filter(r => r.batchId === batchId).length;
    };



    const filteredStudents = batchStudents.filter(s => 
        (s.name || '').toLowerCase().includes(studentSearchQuery.toLowerCase()) || 
        (s.email || '').toLowerCase().includes(studentSearchQuery.toLowerCase())
    );

    if (loading) return <LoadingState message={UI_STRINGS.BATCHES.LOADING} />;

    return (
        <div className="batches-container animate-fade-in">
            {error && <ErrorAlert message={error} />}

            <PageHeader 
                title={activeTab === 'manage' ? `Your Batches (${batches.length})` : 'Enrollment Requests'}
                subtitle={activeTab === 'manage' ? "Add / view batches of your institute" : "Review and approve student joining requests"}
                actionLabel={undefined}
                onAction={() => setShowBatchModal(true)}
            />

            {activeTab === 'requests' && (
                <button 
                    className="back-btn mb-4 fade-in-slide"
                    onClick={() => setActiveTab('manage')}
                >
                    <ArrowLeft size={18} /> Back to Batches
                </button>
            )}
            <div className="batches-toolbar fade-in-slide">
                <div className="search-container">
                    <Search size={20} className="search-icon" />
                    <input 
                        type="text" 
                        className="search-input" 
                        placeholder="Search batches by name or course..." 
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
                <div className="filter-group">
                    <div className="filter-select-wrapper">
                        <select 
                            className="filter-select"
                            value={filterActive}
                            onChange={(e) => setFilterActive(e.target.value as 'all' | 'active' | 'inactive')}
                        >
                            <option value="all">All Status</option>
                            <option value="active">Active Only</option>
                            <option value="inactive">Inactive Only</option>
                        </select>
                    </div>

                    <div className="tab-actions">
                        <button 
                            className={`tool-btn ${activeTab === 'requests' ? 'active' : ''}`}
                            onClick={() => setActiveTab(activeTab === 'manage' ? 'requests' : 'manage')}
                        >
                            <FileText size={18} /> 
                            <span>Join Requests</span>
                            {requests.length > 0 && (
                                <span className={`count-badge ${requests.length > 0 ? 'pulse' : ''}`}>
                                    {requests.length}
                                </span>
                            )}
                        </button>
                        
                        {activeTab === 'manage' && (
                            <button className="primary-tool-btn" onClick={() => setShowBatchModal(true)}>
                                <Plus size={18} /> <span>Create</span>
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="animate-slide-up" onClick={() => setActionMenuOpen(null)}>
                {activeTab === 'manage' ? (
                    <div className="batch-card-grid">
                        {filteredBatches.map(batch => {
                            const pendingReqCount = getPendingRequestsCount(batch.id);
                            return (
                                <div key={batch.id} className="batch-glass-card" onClick={() => setExpandedBatchId(batch.id)}>
                                    <div className="batch-card-tag">
                                        <div className={`status-badge ${batch.active ? 'status-active' : 'status-inactive'}`}>
                                            {batch.active ? 'Active' : 'Draft'}
                                        </div>
                                    </div>

                                    <div className="batch-card-header">
                                        <div className="batch-card-name">{batch.name}</div>
                                        {batch.batchCode && (
                                            <div className="batch-card-code">Code: {batch.batchCode}</div>
                                        )}
                                    </div>
                                    
                                    <div className="batch-card-stats">
                                        <div className="flex items-center gap-2">
                                            <div className="student-stack">
                                                {[...Array(Math.min(batch.studentCount, 3))].map((_, i) => (
                                                    <div key={i} className="student-mini-avatar" style={{ zIndex: 3-i }}>
                                                        S
                                                    </div>
                                                ))}
                                                {batch.studentCount > 3 && (
                                                    <div className="student-mini-avatar" style={{ zIndex: 0 }}>
                                                        +{batch.studentCount - 3}
                                                    </div>
                                                )}
                                            </div>
                                            <span className="student-count-text">
                                                {batch.studentCount > 0 ? `${batch.studentCount} Students` : 'Empty Batch'}
                                            </span>
                                        </div>

                                        <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                                            {pendingReqCount > 0 && (
                                                <button className="badge badge-primary pulse" onClick={() => setActiveTab('requests')} title="New requests">
                                                    <UserPlus size={12} /> {pendingReqCount}
                                                </button>
                                            )}
                                            <div style={{ position: 'relative' }}>
                                                <button className="action-dot-btn" onClick={(e) => { 
                                                    e.stopPropagation(); 
                                                    setActionMenuOpen(actionMenuOpen === batch.id ? null : batch.id); 
                                                }}>
                                                    <MoreVertical size={18} />
                                                </button>
                                                {actionMenuOpen === batch.id && (
                                                    <div className="context-menu animate-slide-up">
                                                        <button onClick={(e) => { e.stopPropagation(); openEditModal(batch); setActionMenuOpen(null); }}>
                                                            <Edit2 size={14} /> <span>Edit</span>
                                                        </button>
                                                        <button className="text-error" onClick={(e) => { e.stopPropagation(); setDeletingBatch(batch); setActionMenuOpen(null); }}>
                                                            <Trash2 size={14} /> <span>Delete</span>
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    
                                </div>
                            );
                        })}
                        {filteredBatches.length === 0 && (
                            <div className="text-center py-10" style={{ gridColumn: '1 / -1', color: 'var(--text-muted)' }}>
                                No batches found matching your criteria.
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="requests-grid">
                        {requests.length > 0 ? (
                            requests.map((req, index) => (
                                <div key={req.id} className="request-card glass-card fade-in-slide" style={{ animationDelay: `${index * 80}ms` }}>
                                    <div className="request-header">
                                        <div className="student-info">
                                            <div className="avatar-circle">
                                                {(req.userName || req.userEmail || 'S')[0].toUpperCase()}
                                            </div>
                                            <div>
                                                <div className="student-name">{req.userName || 'Unknown Student'}</div>
                                                <div className="student-email">{req.userEmail}</div>
                                            </div>
                                        </div>
                                        <div className="batch-badge">{req.batchName}</div>
                                    </div>

                                    <div className="request-details">
                                        {req.courseName ? (
                                            <div className="detail-item">
                                                <Layers size={14} className="text-primary" />
                                                <span>Course: <strong>{req.courseName}</strong></span>
                                            </div>
                                        ) : req.batchCode ? (
                                            <div className="detail-item">
                                                <Layers size={14} className="text-primary" />
                                                <span>Batch Code: <strong style={{ fontFamily: 'monospace' }}>{req.batchCode}</strong></span>
                                            </div>
                                        ) : null}
                                        <div className="detail-item">
                                            <Clock size={14} className="text-muted" />
                                            <span>Requested: <strong>{req.requestedAt instanceof Date ? req.requestedAt.toLocaleDateString() : 'Just now'}</strong></span>
                                        </div>
                                    </div>

                                    <div className="request-actions">
                                        <button 
                                            className="request-btn btn-approve"
                                            onClick={() => handleApproveRequest(req)}
                                        >
                                            <CheckCircle2 size={16} /> Approve
                                        </button>
                                        <button 
                                            className="request-btn btn-reject"
                                            onClick={() => handleRejectRequest(req.id)}
                                        >
                                            <XCircle size={16} /> Reject
                                        </button>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="glass-card p-xl text-center" style={{ gridColumn: '1 / -1', padding: '60px' }}>
                                <div className="stat-icon-wrapper" style={{ margin: '0 auto 20px', width: '64px', height: '64px' }}>
                                    <CheckCircle2 size={32} />
                                </div>
                                <h3>All Processed!</h3>
                                <p>There are no pending enrollment requests to review at this time.</p>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Batch Modal */}
            <Modal 
                isOpen={showBatchModal}
                onClose={() => { setShowBatchModal(false); resetForm(); }}
                title={editingBatch ? UI_STRINGS.BATCHES.EDIT_MODAL_TITLE : UI_STRINGS.BATCHES.MODAL_TITLE}
            >
                <form onSubmit={handleSaveBatch} className="form-layout p-4">
                    <FormRow>
                        <FormField label={UI_STRINGS.BATCHES.FORM_NAME}>
                            <input 
                                type="text" required 
                                placeholder={UI_STRINGS.BATCHES.FORM_NAME_PLACEHOLDER}
                                value={newBatch.name}
                                onChange={e => setNewBatch({ ...newBatch, name: e.target.value })}
                            />
                        </FormField>
                        <FormField label={UI_STRINGS.BATCHES.FORM_BATCH_CODE}>
                            <input 
                                type="text" required 
                                placeholder={UI_STRINGS.BATCHES.FORM_BATCH_CODE_PLACEHOLDER}
                                value={newBatch.batchCode}
                                onChange={e => setNewBatch({ ...newBatch, batchCode: e.target.value })}
                            />
                        </FormField>
                    </FormRow>
                    <FormRow>
                        <FormField label={UI_STRINGS.BATCHES.FORM_START_DATE}>
                            <input 
                                type="date" 
                                value={newBatch.startDate}
                                onChange={e => setNewBatch({ ...newBatch, startDate: e.target.value })}
                            />
                        </FormField>
                    </FormRow>
                    <FormField label={UI_STRINGS.BATCHES.FORM_DESCRIPTION}>
                        <textarea 
                            rows={3} 
                            value={newBatch.description}
                            onChange={e => setNewBatch({ ...newBatch, description: e.target.value })}
                        />
                    </FormField>
                    <div className="flex items-center gap-2 mb-4">
                        <input 
                            type="checkbox" id="active-check"
                            checked={newBatch.active}
                            onChange={e => setNewBatch({ ...newBatch, active: e.target.checked })}
                        />
                        <label htmlFor="active-check" className="text-sm font-medium">This batch is active and visible</label>
                    </div>
                    <FormActions>
                        <button type="button" className="btn btn-secondary" onClick={() => { setShowBatchModal(false); resetForm(); }}>
                            {UI_STRINGS.COMMON.CANCEL}
                        </button>
                        <button type="submit" className="btn btn-primary flex items-center gap-2">
                            {editingBatch ? <Clock size={18} /> : <Plus size={18} />}
                            {editingBatch ? UI_STRINGS.COMMON.SAVE : 'Create Batch'}
                        </button>
                    </FormActions>
                </form>
            </Modal>

            {/* Students View Side Drawer */}
            {expandedBatchId && (
                <>
                    <div className="drawer-backdrop" onClick={() => setExpandedBatchId(null)} />
                    <div className="side-drawer">
                        <div className="drawer-header">
                            <div className="drawer-title-row">
                                <div>
                                    <h3 className="drawer-title">Batch Intelligence</h3>
                                    <p className="text-sm text-muted mt-1">
                                        {batches.find(b => b.id === expandedBatchId)?.name} 
                                        <span className="mx-2 opacity-30">|</span>
                                        {batches.find(b => b.id === expandedBatchId)?.courseName}
                                    </p>
                                </div>
                                <button className="drawer-close" onClick={() => setExpandedBatchId(null)}>
                                    <X size={20} />
                                </button>
                            </div>

                            <div className="sliding-tab-nav">
                                <button 
                                    className={`tab-pill ${drawerTab === 'students' ? 'active' : ''}`}
                                    onClick={() => setDrawerTab('students')}
                                >
                                    <Users size={16} /> Students
                                </button>
                                <button 
                                    className={`tab-pill ${drawerTab === 'content' ? 'active' : ''}`}
                                    onClick={() => setDrawerTab('content')}
                                >
                                    <Video size={16} /> Content
                                </button>
                                <button 
                                    className={`tab-pill ${drawerTab === 'assignments' ? 'active' : ''}`}
                                    onClick={() => setDrawerTab('assignments')}
                                >
                                    <FileText size={16} /> Assignments
                                </button>
                            </div>
                        </div>
                        
                        <div className="drawer-content">
                            {drawerTab === 'students' ? (
                                <>
                                    <div className="flex items-center gap-3 mb-6">
                                        <div style={{ position: 'relative', flex: 1 }}>
                                            <Search size={16} style={{ position: 'absolute', top: '10px', left: '12px', color: 'var(--text-muted)' }} />
                                            <input 
                                                type="text" 
                                                className="form-input" 
                                                placeholder="Search students by name or email..." 
                                                style={{ paddingLeft: '36px', borderRadius: '10px', height: '40px', width: '100%', fontSize: '14px' }}
                                                value={studentSearchQuery}
                                                onChange={(e) => setStudentSearchQuery(e.target.value)}
                                            />
                                        </div>
                                        <button 
                                            className="btn btn-primary flex items-center gap-2"
                                            style={{ height: '40px', padding: '0 16px', borderRadius: '10px', fontSize: '14px' }}
                                            onClick={() => setShowAddStudentModal(true)}
                                        >
                                            <UserPlus size={18} />
                                            <span>Add Student</span>
                                        </button>
                                    </div>

                                    {loadingStudents ? (
                                        <div className="flex flex-col justify-center items-center h-60 text-muted">
                                            <Clock className="animate-spin mb-4" size={32} style={{ color: 'var(--primary)' }} />
                                            <p>Gathering student details...</p>
                                        </div>
                                    ) : filteredStudents.length > 0 ? (
                                        <div className="table-wrapper border border-divider rounded-xl overflow-hidden shadow-sm">
                                            <table className="table w-full" style={{ fontSize: '13px' }}>
                                                <thead style={{ backgroundColor: 'var(--card-accent)' }}>
                                                    <tr style={{ borderBottom: '1px solid var(--divider)' }}>
                                                        <th style={{ textAlign: 'left', padding: '16px', fontWeight: 700 }}>Student Details</th>
                                                        <th style={{ textAlign: 'center', padding: '16px', fontWeight: 700 }}>Status</th>
                                                        <th style={{ textAlign: 'right', padding: '16px', fontWeight: 700 }}>Action</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {filteredStudents.map(student => (
                                                        <tr key={student.id} style={{ borderBottom: '1px solid var(--divider)' }}>
                                                            <td style={{ padding: '16px' }}>
                                                                <div className="flex flex-col">
                                                                    <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>{student.name || 'Unknown'}</span>
                                                                    <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{student.email}</span>
                                                                </div>
                                                            </td>
                                                            <td style={{ padding: '16px', textAlign: 'center' }}>
                                                                <span className={`status-badge ${student.status === 'inactive' ? 'status-inactive' : 'status-active'}`}>
                                                                    {student.status === 'inactive' ? 'Inactive' : 'Active'}
                                                                </span>
                                                            </td>
                                                            <td style={{ padding: '16px', textAlign: 'right' }}>
                                                                <div className="flex justify-end gap-2">
                                                                    <button 
                                                                        className={`btn btn-sm ${student.status === 'inactive' ? 'btn-success' : 'btn-secondary'}`}
                                                                        style={{ height: '32px', fontSize: '11px', minWidth: '95px', padding: '0 12px' }}
                                                                        onClick={() => handleStudentStatusToggle(student.id, student.status)}
                                                                    >
                                                                        {student.status === 'inactive' ? 'Activate' : 'Deactivate'}
                                                                    </button>
                                                                    <button 
                                                                        className="btn btn-sm btn-outline-error"
                                                                        style={{ height: '32px', width: '32px', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                                                        onClick={() => handleRemoveStudentFromBatch(student.id)}
                                                                        title="Remove Student"
                                                                    >
                                                                        <Trash2 size={14} />
                                                                    </button>
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    ) : (
                                        <div className="text-center py-20 text-muted border rounded-xl border-divider" style={{ borderStyle: 'dashed', background: 'rgba(255,255,255,0.01)' }}>
                                            <div className="flex justify-center mb-4 opacity-30"><Users size={48} /></div>
                                            <p style={{ fontWeight: 500 }}>No students found in this batch</p>
                                            <p className="text-xs">Try searching for a different name or email</p>
                                        </div>
                                    )}
                                </>
                            ) : drawerTab === 'content' ? (
                                <CurriculumBuilder targetId={expandedBatchId} targetType="batch" />
                            ) : (
                                <AssignmentBuilder targetId={expandedBatchId} targetType="batch" />
                            )}
                        </div>
                    </div>
                </>
            )}

            {/* Delete Batch Confirmation Modal */}
            <Modal
                isOpen={!!deletingBatch}
                onClose={() => setDeletingBatch(null)}
                title="Delete Batch"
                maxWidth="400px"
            >
                <div className="p-6">
                    <p className="mb-6 text-muted">
                        Are you sure you want to delete <strong>{deletingBatch?.name}</strong>? Students assigned to this batch will lose their association.
                    </p>
                    <div className="flex justify-end gap-3">
                        <button className="btn btn-secondary" onClick={() => setDeletingBatch(null)}>Cancel</button>
                        <button className="btn btn-danger" onClick={confirmDelete}>Delete Batch</button>
                    </div>
                </div>
            </Modal>

            {/* Add Student Modal */}
            <Modal
                isOpen={showAddStudentModal}
                onClose={() => { setShowAddStudentModal(false); setFoundStudent(null); setFindEmail(''); }}
                title="Add Student to Batch"
                maxWidth="500px"
            >
                <div className="p-6">
                    <form onSubmit={handleFindStudent} className="flex gap-2 mb-6">
                        <div style={{ position: 'relative', flex: 1 }}>
                            <Search size={16} style={{ position: 'absolute', top: '12px', left: '12px', color: 'var(--text-muted)' }} />
                            <input 
                                type="email" 
                                className="form-input" 
                                placeholder="Search student email (e.g. name@example.com)" 
                                style={{ paddingLeft: '36px', height: '40px', fontSize: '14px' }}
                                value={findEmail}
                                onChange={(e) => setFindEmail(e.target.value)}
                                required
                            />
                        </div>
                        <button type="submit" className="btn btn-primary" disabled={searchingStudent}>
                            {searchingStudent ? '...' : 'Find'}
                        </button>
                    </form>

                    {foundStudent ? (
                        <div className="student-found-card glass-card p-4 animate-fade-in">
                            <div className="flex items-center gap-4 mb-4">
                                <div className="avatar-circle">
                                    {foundStudent.name[0].toUpperCase()}
                                </div>
                                <div className="flex-1">
                                    <div className="font-bold text-lg">{foundStudent.name}</div>
                                    <div className="text-sm text-muted">{foundStudent.email}</div>
                                </div>
                            </div>
                            
                            <div className="info-row-item mb-4">
                                <span className="label">Current Batch:</span>
                                <span className={foundStudent.batch ? "value text-primary" : "value text-muted"}>
                                    {foundStudent.batch || 'None (Unassigned)'}
                                </span>
                            </div>

                            <button 
                                className="btn btn-primary w-full flex items-center justify-center gap-2"
                                onClick={handleAddStudentToBatch}
                                disabled={addingStudent}
                            >
                                {addingStudent ? (
                                    <>
                                        <Clock className="animate-spin" size={18} />
                                        <span>Adding...</span>
                                    </>
                                ) : (
                                    <>
                                        <CheckCircle2 size={18} />
                                        <span>Confirm Enrollment</span>
                                    </>
                                )}
                            </button>
                        </div>
                    ) : (
                        <div className="text-center py-10 text-muted opacity-60">
                            <UserPlus size={48} className="mx-auto mb-4 opacity-20" />
                            <p>Search for a student by their registered email address</p>
                        </div>
                    )}
                </div>
            </Modal>
        </div>
    );
}
