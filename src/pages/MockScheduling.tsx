import { useState, useEffect } from 'react';
import {
    Calendar, Users, Clock, Trash2, X, 
    Check, Lock, Unlock, ChevronDown, ChevronUp, Info, ListOrdered, Download, Ban
} from 'lucide-react';
import { batchService } from '../services/batchService';
import { mockSchedulingService } from '../services/mockSchedulingService';
import { UI_STRINGS } from '../constants';
import type { Batch, MockSchedule, MockRegistration } from '../types';
import PageHeader from '../components/PageHeader';
import LoadingState from '../components/LoadingState';
import ConfirmModal from '../components/ConfirmModal';
import { useToast } from '../hooks/useToast';
import { useAuth } from '../contexts/AuthContext';
import CustomDatePicker from '../components/CustomDatePicker';
import './MockScheduling.css';

export default function MockSchedulingPage() {
    const { showToast } = useToast();
    const authContext = useAuth();
    const user = authContext?.currentUser;

    // ── Data state ──
    const [batches, setBatches] = useState<Batch[]>([]);
    const [schedules, setSchedules] = useState<MockSchedule[]>([]);
    const [registrationsMap, setRegistrationsMap] = useState<Record<string, MockRegistration[]>>({});

    // ── Form State ──
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [scheduledDate, setScheduledDate] = useState('');
    const [studentLimit, setStudentLimit] = useState<number | string>(12);
    const [targetAudience, setTargetAudience] = useState<'all' | 'batch'>('all');
    const [selectedBatches, setSelectedBatches] = useState<string[]>([]);

    // ── UI State ──
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [showBlockedPanel, setShowBlockedPanel] = useState(false);
    const [expandedScheduleId, setExpandedScheduleId] = useState<string | null>(null);
    const [scheduleToDelete, setScheduleToDelete] = useState<string | null>(null);

    // ── Global Block State ──
    const [globalBlockedStudents, setGlobalBlockedStudents] = useState<MockRegistration[]>([]);

    // ── Fetch batches and subscribe to schedules on mount ──
    useEffect(() => {
        const loadBatches = async () => {
            try {
                const fetchedBatches = await batchService.fetchBatches();
                setBatches(fetchedBatches);
            } catch (err) {
                console.error('Error fetching batches:', err);
            }
        };
        loadBatches();

        const unsub = mockSchedulingService.subscribeToMockSchedules((fetchedSchedules) => {
            setSchedules(fetchedSchedules);
            setLoading(false);
        });

        const unsubBlocked = mockSchedulingService.subscribeToGlobalBlockedStudents((blocked) => {
            setGlobalBlockedStudents(blocked);
        });

        return () => {
            unsub();
            unsubBlocked();
        };
    }, []);

    // ── Subscribe to registrations when a schedule card is expanded ──
    useEffect(() => {
        if (!expandedScheduleId) return;

        const unsub = mockSchedulingService.subscribeToRegistrations(expandedScheduleId, (regs) => {
            setRegistrationsMap((prev) => ({
                ...prev,
                [expandedScheduleId]: regs,
            }));
        });

        return () => {
            unsub();
        };
    }, [expandedScheduleId]);

    // ── Multi-select batches helper ──
    const handleBatchToggle = (batchId: string) => {
        setSelectedBatches((prev) =>
            prev.includes(batchId)
                ? prev.filter((id) => id !== batchId)
                : [...prev, batchId]
        );
    };

    // ── Create Schedule ──
    const handleCreateSchedule = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title.trim() || !scheduledDate || !studentLimit) {
            showToast('Please fill in all required fields.', 'error');
            return;
        }

        const limitNum = Number(studentLimit);
        if (isNaN(limitNum) || limitNum < 1) {
            showToast('Student Limit must be a number greater than or equal to 1.', 'error');
            return;
        }

        if (targetAudience === 'batch' && selectedBatches.length === 0) {
            showToast('Please select at least one batch.', 'error');
            return;
        }

        setSubmitting(true);
        try {
            await mockSchedulingService.createMockSchedule({
                title: title.trim(),
                description: description.trim(),
                scheduledDate: new Date(scheduledDate),
                studentLimit: Number(studentLimit),
                targetAudience,
                targetBatches: targetAudience === 'batch' ? selectedBatches : [],
                createdBy: user?.uid || 'admin',
            });

            showToast(UI_STRINGS.MOCK_SCHEDULING.SUCCESS_CREATE, 'success');
            
            // Reset form
            setTitle('');
            setDescription('');
            setScheduledDate('');
            setStudentLimit(12);
            setTargetAudience('all');
            setSelectedBatches([]);
            setShowCreateForm(false);
        } catch (err) {
            console.error('Error creating mock schedule:', err);
            showToast(UI_STRINGS.MOCK_SCHEDULING.ERROR_CREATE, 'error');
        } finally {
            setSubmitting(false);
        }
    };

    // ── Close Schedule ──
    const handleCloseSchedule = async (scheduleId: string) => {
        try {
            await mockSchedulingService.closeMockSchedule(scheduleId);
            showToast(UI_STRINGS.MOCK_SCHEDULING.SUCCESS_CLOSE, 'success');
        } catch (err) {
            console.error('Error closing schedule:', err);
            showToast('Failed to close registration.', 'error');
        }
    };

    // ── Global Block / Unblock ──
    const handleBlockStudentGlobally = async (reg: MockRegistration) => {
        try {
            await mockSchedulingService.blockStudentGlobally(reg);
            showToast('Student blocked globally across all mock sessions.', 'success');
        } catch (err: unknown) {
            console.error('Error blocking student:', err);
            showToast(err instanceof Error ? err.message : 'Failed to block student.', 'error');
        }
    };

    const handleUnblockStudentGlobally = async (userId: string) => {
        try {
            await mockSchedulingService.unblockStudentGlobally(userId);
            showToast('Student unblocked successfully. They can now register for mock sessions.', 'success');
        } catch (err: unknown) {
            console.error('Error unblocking student:', err);
            showToast(err instanceof Error ? err.message : 'Failed to unblock student.', 'error');
        }
    };

    // ── Delete Schedule ──
    const handleDeleteSchedule = async () => {
        if (!scheduleToDelete) return;
        try {
            await mockSchedulingService.deleteMockSchedule(scheduleToDelete);
            showToast('Mock schedule deleted successfully.', 'success');
            if (expandedScheduleId === scheduleToDelete) {
                setExpandedScheduleId(null);
            }
            setScheduleToDelete(null);
        } catch (err) {
            console.error('Error deleting schedule:', err);
            showToast('Failed to delete mock schedule.', 'error');
        }
    };

    // ── Export CSV ──
    const handleExportCSV = (scheduleId: string, scheduleTitle: string) => {
        const registrations = registrationsMap[scheduleId] || [];
        if (registrations.length === 0) {
            showToast('No registrations to export.', 'warning');
            return;
        }

        const headers = ['#', 'Student Name', 'Email', 'Batch', 'Registered At'];
        const rows = registrations.map((reg, index) => {
            const timeStr = `${reg.registeredAt.toLocaleDateString()} ${reg.registeredAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
            return [
                index + 1,
                `"${reg.userName || ''}"`,
                `"${reg.userEmail || ''}"`,
                `"${reg.userBatch || ''}"`,
                `"${timeStr}"`
            ];
        });

        const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        
        const cleanTitle = scheduleTitle.replace(/[^a-z0-9]/gi, '_').toLowerCase();
        a.download = `mock_registrations_${cleanTitle}_${new Date().toISOString().split('T')[0]}.csv`;
        
        a.click();
        URL.revokeObjectURL(url);
    };


    // ── Format date ──
    const formatDate = (date: Date) => {
        return date.toLocaleDateString('en-IN', {
            weekday: 'short',
            day: 'numeric',
            month: 'short',
            year: 'numeric',
        });
    };

    if (loading) return <LoadingState message={UI_STRINGS.MOCK_SCHEDULING.LOADING} />;

    return (
        <div className="mock-scheduling-container animate-fade-in">
            <PageHeader
                title={UI_STRINGS.MOCK_SCHEDULING.TITLE}
                subtitle={UI_STRINGS.MOCK_SCHEDULING.SUBTITLE}
            />

            <div className="mock-global-actions">
                <button
                    className="btn btn-primary"
                    onClick={() => {
                        setShowCreateForm(true);
                        setShowBlockedPanel(false);
                    }}
                >
                    <Calendar size={18} style={{ marginRight: '8px' }} />
                    {UI_STRINGS.MOCK_SCHEDULING.CREATE_BTN}
                </button>
                <button
                    className="btn btn-secondary blocked-students-btn"
                    onClick={() => {
                        setShowBlockedPanel(true);
                        setShowCreateForm(false);
                    }}
                >
                    <Ban size={18} color="#ef4444" style={{ marginRight: '8px' }} />
                    Blocked Students ({globalBlockedStudents.length})
                </button>
            </div>

            {/* Blocked Students Panel */}
            {showBlockedPanel && (
                <div className="mock-create-card fade-in-slide">
                    <div className="card-header-row">
                        <h3 style={{ color: '#ef4444' }}>
                            <Ban size={18} style={{ marginRight: '8px', verticalAlign: '-3px' }} />
                            Globally Blocked Students
                        </h3>
                        <button className="close-form-btn" onClick={() => setShowBlockedPanel(false)}>
                            <X size={18} />
                        </button>
                    </div>
                    <div className="registrants-section blocked-section" style={{ marginTop: '1rem', padding: 0, background: 'transparent' }}>
                        {globalBlockedStudents.length === 0 ? (
                            <div className="registrants-empty">No students are currently blocked.</div>
                        ) : (
                            <table className="registrants-table blocked-table">
                                <thead>
                                    <tr>
                                        <th>#</th>
                                        <th>Student Name</th>
                                        <th>Batch</th>
                                        <th>Mobile Number</th>
                                        <th>Blocked At</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {globalBlockedStudents.map((reg, index) => (
                                        <tr key={reg.id}>
                                            <td>{index + 1}</td>
                                            <td className="name-cell">
                                                {reg.userName}
                                            </td>
                                            <td className="batch-cell">{reg.userBatch}</td>
                                            <td className="email-cell">{reg.userPhone || 'N/A'}</td>
                                            <td className="time-cell">
                                                {reg.registeredAt.toLocaleDateString()} {reg.registeredAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </td>
                                            <td className="actions-cell">
                                                <button 
                                                    className="unblock-student-btn"
                                                    onClick={() => handleUnblockStudentGlobally(reg.userId)}
                                                    title="Unblock this student globally"
                                                >
                                                    <Check size={14} /> Unblock
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>
            )}

            {/* Create Mock Schedule Form Card */}
            {showCreateForm && (
                <div className="mock-create-card fade-in-slide">
                    <div className="card-header-row">
                        <h3>
                            <Calendar size={18} style={{ marginRight: '8px', verticalAlign: '-3px' }} />
                            {UI_STRINGS.MOCK_SCHEDULING.NEW_SCHEDULE}
                        </h3>
                        <button className="close-form-btn" onClick={() => setShowCreateForm(false)}>
                            <X size={18} />
                        </button>
                    </div>

                    <form onSubmit={handleCreateSchedule} className="mock-form">
                        <div className="form-group">
                            <label>{UI_STRINGS.MOCK_SCHEDULING.FORM_TITLE} *</label>
                            <input
                                type="text"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                placeholder="e.g. Frontend Architecture Mock Interview"
                                required
                            />
                        </div>

                        <div className="form-row-grid">
                            <div className="form-group">
                                <label>{UI_STRINGS.MOCK_SCHEDULING.FORM_DATE} *</label>
                                <CustomDatePicker
                                    value={scheduledDate}
                                    onChange={(e) => setScheduledDate(e.target.value)}
                                    required
                                />
                            </div>

                            <div className="form-group">
                                <label>
                                    {UI_STRINGS.MOCK_SCHEDULING.FORM_LIMIT} *
                                    <span className="tooltip-text">
                                        <Info size={12} /> {UI_STRINGS.MOCK_SCHEDULING.FORM_LIMIT_DESC}
                                    </span>
                                </label>
                                <input
                                    type="number"
                                    min="1"
                                    value={studentLimit}
                                    onChange={(e) => {
                                        const val = e.target.value;
                                        if (val === '') {
                                            setStudentLimit('');
                                        } else {
                                            const parsed = parseInt(val, 10);
                                            setStudentLimit(isNaN(parsed) ? '' : parsed);
                                        }
                                    }}
                                    required
                                />
                            </div>
                        </div>

                        <div className="form-group">
                            <label>{UI_STRINGS.MOCK_SCHEDULING.FORM_DESC}</label>
                            <textarea
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder="Instructions for students (e.g. topics to prepare, Zoom link, resume link required)"
                                rows={3}
                            />
                        </div>

                        <div className="form-group">
                            <label>Target Audience *</label>
                            <div className="audience-tabs">
                                <button
                                    type="button"
                                    className={`tab-btn ${targetAudience === 'all' ? 'active' : ''}`}
                                    onClick={() => setTargetAudience('all')}
                                >
                                    All Students
                                </button>
                                <button
                                    type="button"
                                    className={`tab-btn ${targetAudience === 'batch' ? 'active' : ''}`}
                                    onClick={() => setTargetAudience('batch')}
                                >
                                    Specific Batches
                                </button>
                            </div>
                        </div>

                        {targetAudience === 'batch' && (
                            <div className="form-group select-batches-group">
                                <label>Select Target Batches *</label>
                                <div className="batches-chips-container">
                                    {batches.map((batch) => {
                                        const isSelected = selectedBatches.includes(batch.id);
                                        return (
                                            <button
                                                key={batch.id}
                                                type="button"
                                                className={`batch-chip ${isSelected ? 'selected' : ''}`}
                                                onClick={() => handleBatchToggle(batch.id)}
                                            >
                                                {batch.name}
                                                {isSelected && <Check size={12} style={{ marginLeft: '4px' }} />}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        <div className="form-actions">
                            <button
                                type="button"
                                className="secondary-btn"
                                onClick={() => setShowCreateForm(false)}
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                className="primary-btn"
                                disabled={submitting}
                            >
                                {submitting ? 'Creating...' : 'Create & Notify'}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* Schedules Section */}
            <div className="mock-schedules-section">
                <h2>
                    <Clock size={20} />
                    {UI_STRINGS.MOCK_SCHEDULING.ACTIVE_SCHEDULES}
                </h2>

                {schedules.length === 0 ? (
                    <div className="mock-empty-state fade-in-slide">
                        <div className="empty-icon">
                            <Calendar size={36} />
                        </div>
                        <h3>No Mock Schedules</h3>
                        <p>{UI_STRINGS.MOCK_SCHEDULING.NO_SCHEDULES}</p>
                    </div>
                ) : (
                    <div className="mock-schedules-grid">
                        {schedules.map((schedule) => {
                            const isExpanded = expandedScheduleId === schedule.id;
                            const isClosed = schedule.status === 'closed' || schedule.registeredCount >= schedule.studentLimit;
                            const remainingSeats = Math.max(0, schedule.studentLimit - schedule.registeredCount);
                            const fillPercentage = Math.min(100, (schedule.registeredCount / schedule.studentLimit) * 100);

                            return (
                                <div key={schedule.id} className="mock-schedule-card">
                                    {/* Card Header Info */}
                                    <div className="card-header">
                                        <div className="title-section">
                                            <h3>{schedule.title}</h3>
                                            <span className="date-badge">
                                                <Calendar size={12} />
                                                {formatDate(schedule.scheduledDate)}
                                            </span>
                                        </div>

                                        <div className="status-actions">
                                            <span className={`status-badge ${isClosed ? 'closed' : 'open'}`}>
                                                {isClosed ? <Lock size={12} /> : <Unlock size={12} />}
                                                {isClosed ? 'Closed' : 'Open'}
                                            </span>
                                            
                                            <button 
                                                className="delete-card-btn"
                                                onClick={() => setScheduleToDelete(schedule.id)}
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </div>

                                    {/* Description */}
                                    {schedule.description && (
                                        <p className="schedule-desc">{schedule.description}</p>
                                    )}

                                    {/* Student Capacity Info & Progress Bar */}
                                    <div className="seats-tracker">
                                        <div className="seats-info">
                                            <span>
                                                <Users size={14} />
                                                Seats: <strong>{schedule.registeredCount} / {schedule.studentLimit}</strong>
                                            </span>
                                            {remainingSeats === 0 ? (
                                                <span className="no-seats-text">Seats Full!</span>
                                            ) : (
                                                <span className="seats-left-text">{remainingSeats} left</span>
                                            )}
                                        </div>
                                        <div className="progress-bar-bg">
                                            <div 
                                                className={`progress-bar-fill ${remainingSeats === 0 ? 'full' : ''}`}
                                                style={{ width: `${fillPercentage}%` }}
                                            />
                                        </div>
                                    </div>

                                    {/* Target Batches Info */}
                                    <div className="target-info">
                                        <strong>Audience: </strong>
                                        {schedule.targetAudience === 'all' ? (
                                            <span>All Batches</span>
                                        ) : (
                                            <span>
                                                {schedule.targetBatches?.map(id => batches.find(b => b.id === id)?.name || id).join(', ') || 'No batches'}
                                            </span>
                                        )}
                                    </div>

                                    {/* Expandable Accordion for registrations */}
                                    <div className="accordion-action-row">
                                        {!isClosed && (
                                            <button
                                                className="close-reg-btn"
                                                onClick={() => handleCloseSchedule(schedule.id)}
                                            >
                                                Close Registration
                                            </button>
                                        )}

                                        <div className="right-actions" style={{ display: 'flex', gap: '12px', marginLeft: 'auto' }}>
                                            {isExpanded && registrationsMap[schedule.id]?.length > 0 && (
                                                <button
                                                    className="export-csv-btn"
                                                    onClick={() => handleExportCSV(schedule.id, schedule.title)}
                                                >
                                                    <Download size={16} style={{ marginRight: '6px' }} />
                                                    Export CSV
                                                </button>
                                            )}

                                            <button
                                                className="toggle-expand-btn"
                                                onClick={() => setExpandedScheduleId(isExpanded ? null : schedule.id)}
                                            >
                                                {isExpanded ? (
                                                    <>
                                                        Hide Registrants <ChevronUp size={16} />
                                                    </>
                                                ) : (
                                                    <>
                                                        View Registrants ({schedule.registeredCount}) <ChevronDown size={16} />
                                                    </>
                                                )}
                                            </button>
                                        </div>
                                    </div>

                                    {isExpanded && (
                                        <div className="registrants-expanded-panel">
                                            {(() => {
                                                const allRegs = registrationsMap[schedule.id] || [];
                                                const activeRegs = allRegs.filter(r => r.status !== 'blocked');

                                                return (
                                                    <>
                                                        <div className="registrants-section">
                                                            <h4>
                                                                <ListOrdered size={16} />
                                                                Active Registrations ({activeRegs.length})
                                                            </h4>
                                                            
                                                            {activeRegs.length === 0 ? (
                                                                <div className="registrants-empty">No active registrations yet.</div>
                                                            ) : (
                                                                <table className="registrants-table">
                                                                    <thead>
                                                                        <tr>
                                                                            <th>#</th>
                                                                            <th>Student Name</th>
                                                                            <th>Batch</th>
                                                                            <th>Mobile Number</th>
                                                                            <th>Registered At</th>
                                                                            <th>Actions</th>
                                                                        </tr>
                                                                    </thead>
                                                                    <tbody>
                                                                        {activeRegs.map((reg, index) => (
                                                                            <tr key={reg.id}>
                                                                                <td>{index + 1}</td>
                                                                                <td className="name-cell">
                                                                                    {reg.userName}
                                                                                    <span className="status-badge-inline active">Active</span>
                                                                                </td>
                                                                                <td className="batch-cell">{reg.userBatch}</td>
                                                                                <td className="email-cell">{reg.userPhone || 'N/A'}</td>
                                                                                <td className="time-cell">
                                                                                    {reg.registeredAt.toLocaleDateString()} {reg.registeredAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                                                </td>
                                                                                <td className="actions-cell">
                                                                                    <button 
                                                                                        className="block-student-btn"
                                                                                        onClick={() => handleBlockStudentGlobally(reg)}
                                                                                        title="Block this student globally"
                                                                                    >
                                                                                        <Ban size={14} /> Block
                                                                                    </button>
                                                                                </td>
                                                                            </tr>
                                                                        ))}
                                                                    </tbody>
                                                                </table>
                                                            )}
                                                        </div>

                                                        {/* Blocked students per schedule section is removed as we now have a global list */}
                                                    </>
                                                );
                                            })()}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Delete Confirmation Modal */}
            <ConfirmModal
                isOpen={scheduleToDelete !== null}
                onClose={() => setScheduleToDelete(null)}
                onConfirm={handleDeleteSchedule}
                title={UI_STRINGS.MOCK_SCHEDULING.CONFIRM_DELETE_TITLE}
                message={UI_STRINGS.MOCK_SCHEDULING.CONFIRM_DELETE_DESC}
                confirmText="Yes, Delete Schedule"
                cancelText="Cancel"
                type="danger"
            />
        </div>
    );
}
