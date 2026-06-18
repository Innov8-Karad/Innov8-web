import { useState, useEffect } from 'react';
import { Send, Clock, Users, Radio, X, Trash2 } from 'lucide-react';
import { userService } from '../services/userService';
import { announcementService } from '../services/announcementService';
import { batchService } from '../services/batchService';
import {
    sendNotification,
    fetchNotificationHistory,
    deleteNotification,
    type NotificationRecord,
    type SendNotificationPayload,
} from '../services/notificationService';
import { UI_STRINGS } from '../constants';
import type { User } from '../types';
import PageHeader from '../components/PageHeader';
import LoadingState from '../components/LoadingState';
import ErrorAlert from '../components/ErrorAlert';
import { FormField } from '../components/FormField';
import ConfirmModal from '../components/ConfirmModal';
import { useToast } from '../hooks/useToast';

export default function NotificationsPage() {
    const { showToast } = useToast();

    // ── Form State ──
    const [title, setTitle] = useState('');
    const [body, setBody] = useState('');
    const [targetAudience, setTargetAudience] = useState<'all' | 'batch' | 'students'>('all');
    const [selectedBatches, setSelectedBatches] = useState<string[]>([]);
    const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [sending, setSending] = useState(false);

    // ── Data State ──
    const [history, setHistory] = useState<NotificationRecord[]>([]);
    const [students, setStudents] = useState<User[]>([]);
    const [uniqueBatches, setUniqueBatches] = useState<string[]>([]);
    const [batchMap, setBatchMap] = useState<Record<string, string>>({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // ── Delete State ──
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [deleteId, setDeleteId] = useState<string | null>(null);

    // ── Load initial data ──
    useEffect(() => {
        const loadData = async () => {
            try {
                setLoading(true);
                setError(null);
                const [historyData, usersData, batches, allBatches] = await Promise.all([
                    fetchNotificationHistory(),
                    userService.fetchUsers(),
                    announcementService.fetchUniqueBatches(),
                    batchService.fetchBatches(),
                ]);
                setHistory(historyData);
                setStudents(usersData.filter(u => u.role !== 'admin'));
                setUniqueBatches(batches);
                // Build a map of batchId -> batchName for resolving IDs in history
                const map: Record<string, string> = {};
                allBatches.forEach(b => { map[b.id] = b.name; });
                setBatchMap(map);
            } catch (err) {
                console.error('Error loading notification data:', err);
                setError(UI_STRINGS.NOTIFICATIONS.ERROR_LOAD);
            } finally {
                setLoading(false);
            }
        };
        loadData();
    }, []);

    // ── Handlers ──
    const resetForm = () => {
        setTitle('');
        setBody('');
        setTargetAudience('all');
        setSelectedBatches([]);
        setSelectedStudentIds([]);
        setSearchQuery('');
    };

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title.trim() || !body.trim()) return;

        try {
            setSending(true);
            setError(null);

            const payload: SendNotificationPayload = {
                title: title.trim(),
                body: body.trim(),
                targetAudience,
                targetBatches: targetAudience === 'batch' ? selectedBatches : [],
                targetStudentIds: targetAudience === 'students' ? selectedStudentIds : [],
            };

            const result = await sendNotification(payload);
            showToast(`${UI_STRINGS.NOTIFICATIONS.SUCCESS} (${result.tokenCount} devices)`, 'success');
            resetForm();

            // Refresh history
            const updatedHistory = await fetchNotificationHistory();
            setHistory(updatedHistory);
        } catch (err) {
            console.error('Error sending notification:', err);
            setError(UI_STRINGS.NOTIFICATIONS.ERROR_SEND);
            showToast(UI_STRINGS.NOTIFICATIONS.ERROR_SEND, 'error');
        } finally {
            setSending(false);
        }
    };

    const handleOpenDelete = (id: string) => {
        setDeleteId(id);
        setShowDeleteModal(true);
    };

    const confirmDelete = async () => {
        if (!deleteId) return;
        try {
            setError(null);
            await deleteNotification(deleteId);
            setHistory(prev => prev.filter(item => item.id !== deleteId));
            showToast('Notification deleted successfully', 'success');
        } catch (err) {
            console.error('Error deleting notification:', err);
            setError('Failed to delete notification.');
            showToast('Failed to delete notification.', 'error');
        } finally {
            setDeleteId(null);
            setShowDeleteModal(false);
        }
    };

    const toggleBatch = (batch: string) => {
        if (batch === 'All') {
            setSelectedBatches(prev => prev.includes('All') ? [] : ['All']);
            return;
        }
        setSelectedBatches(prev => {
            const withoutAll = prev.filter(b => b !== 'All');
            return withoutAll.includes(batch)
                ? withoutAll.filter(b => b !== batch)
                : [...withoutAll, batch];
        });
    };

    const toggleStudent = (studentId: string) => {
        setSelectedStudentIds(prev =>
            prev.includes(studentId)
                ? prev.filter(id => id !== studentId)
                : [...prev, studentId]
        );
    };

    const getTargetLabel = (record: NotificationRecord): string => {
        if (record.targetAudience === 'all') return 'All Students';
        if (record.targetAudience === 'batch') {
            if (!record.targetBatches.length) return 'All Batches';
            // Resolve batch IDs to names using the batchMap; fall back to the raw value
            return record.targetBatches
                .map(b => batchMap[b] || b)
                .join(', ');
        }
        return `${record.targetStudentIds.length} student(s)`;
    };

    const isFormValid = () => {
        if (!title.trim() || !body.trim()) return false;
        if (targetAudience === 'batch' && selectedBatches.length === 0) return false;
        if (targetAudience === 'students' && selectedStudentIds.length === 0) return false;
        return true;
    };

    if (loading) return <LoadingState message={UI_STRINGS.NOTIFICATIONS.LOADING} />;

    return (
        <div>
            <ErrorAlert message={error} />
            <PageHeader
                title={UI_STRINGS.NOTIFICATIONS.TITLE}
                subtitle={UI_STRINGS.NOTIFICATIONS.SUBTITLE}
            />

            <div className="grid-2col" style={{ gap: 'var(--space-xl)', alignItems: 'start' }}>
                {/* ── Compose Form ── */}
                <div className="card" style={{ padding: 'var(--space-lg)' }}>
                    <div className="flex items-center gap-2" style={{ marginBottom: 'var(--space-lg)' }}>
                        <div style={{
                            width: 36,
                            height: 36,
                            borderRadius: '50%',
                            background: 'var(--primary)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                        }}>
                            <Send size={16} color="#fff" />
                        </div>
                        <h3 style={{ margin: 0 }}>Compose Notification</h3>
                    </div>

                    <form onSubmit={handleSend} className="form-layout" style={{ marginTop: 0 }}>
                        <FormField label={UI_STRINGS.NOTIFICATIONS.FORM_TITLE}>
                            <input
                                type="text"
                                value={title}
                                onChange={e => setTitle(e.target.value)}
                                placeholder={UI_STRINGS.NOTIFICATIONS.FORM_TITLE_PLACEHOLDER}
                                required
                            />
                        </FormField>

                        <FormField label={UI_STRINGS.NOTIFICATIONS.FORM_BODY}>
                            <textarea
                                rows={4}
                                value={body}
                                onChange={e => setBody(e.target.value)}
                                placeholder={UI_STRINGS.NOTIFICATIONS.FORM_BODY_PLACEHOLDER}
                                required
                            />
                        </FormField>

                        <FormField label={UI_STRINGS.NOTIFICATIONS.TARGET_LABEL}>
                            <div className="target-mode-selector">
                                <button
                                    type="button"
                                    className={`target-mode-btn ${targetAudience === 'all' ? 'active' : ''}`}
                                    onClick={() => setTargetAudience('all')}
                                >
                                    {UI_STRINGS.NOTIFICATIONS.TARGET_ALL}
                                </button>
                                <button
                                    type="button"
                                    className={`target-mode-btn ${targetAudience === 'batch' ? 'active' : ''}`}
                                    onClick={() => setTargetAudience('batch')}
                                >
                                    {UI_STRINGS.NOTIFICATIONS.TARGET_BATCH}
                                </button>
                                <button
                                    type="button"
                                    className={`target-mode-btn ${targetAudience === 'students' ? 'active' : ''}`}
                                    onClick={() => setTargetAudience('students')}
                                >
                                    {UI_STRINGS.NOTIFICATIONS.TARGET_STUDENTS}
                                </button>
                            </div>

                            {/* Batch multi-select */}
                            {targetAudience === 'batch' && (
                                <div className="batch-multi-select" style={{ marginTop: 'var(--space-sm)' }}>
                                    <label className="batch-checkbox-item">
                                        <input
                                            type="checkbox"
                                            checked={selectedBatches.includes('All')}
                                            onChange={() => toggleBatch('All')}
                                        />
                                        All Batches
                                    </label>
                                    {uniqueBatches.map(batch => (
                                        <label key={batch} className="batch-checkbox-item">
                                            <input
                                                type="checkbox"
                                                checked={selectedBatches.includes(batch)}
                                                onChange={() => toggleBatch(batch)}
                                            />
                                            {batch}
                                        </label>
                                    ))}
                                </div>
                            )}

                            {/* Student picker */}
                            {targetAudience === 'students' && (
                                <div className="student-picker-container" style={{ marginTop: 'var(--space-sm)' }}>
                                    {selectedStudentIds.length > 0 && (
                                        <div className="selected-students-chips">
                                            {selectedStudentIds.map(id => {
                                                const student = students.find(s => s.id === id);
                                                return (
                                                    <div key={id} className="student-chip">
                                                        {student ? student.name : id}
                                                        <div
                                                            className="student-chip-remove"
                                                            onClick={(e) => { e.stopPropagation(); toggleStudent(id); }}
                                                        >
                                                            <X size={12} />
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                    <input
                                        type="text"
                                        className="student-search-input"
                                        placeholder={UI_STRINGS.NOTIFICATIONS.STUDENT_SEARCH_PLACEHOLDER}
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                    />
                                    <div className="student-list" style={{ marginTop: 'var(--space-sm)' }}>
                                        {students
                                            .filter(s =>
                                                s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                                s.email.toLowerCase().includes(searchQuery.toLowerCase())
                                            )
                                            .map(student => (
                                                <div
                                                    key={student.id}
                                                    className="student-list-item"
                                                    onClick={() => toggleStudent(student.id)}
                                                >
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedStudentIds.includes(student.id)}
                                                        readOnly
                                                    />
                                                    <div className="student-list-info" style={{ marginLeft: '8px' }}>
                                                        <div className="student-list-name">{student.name}</div>
                                                        <div className="student-list-meta">
                                                            <span>{student.batch}</span>
                                                            <span>&bull;</span>
                                                            <span>{student.email}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        {students.length === 0 && (
                                            <div className="text-muted text-sm text-center py-2">No students found</div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </FormField>

                        {/* Send Button */}
                        <button
                            type="submit"
                            className="btn btn-primary"
                            disabled={sending || !isFormValid()}
                            style={{ width: '100%', marginTop: 'var(--space-md)', justifyContent: 'center' }}
                        >
                            {sending ? (
                                <>
                                    <Radio size={18} style={{ marginRight: '8px', animation: 'pulse 1s infinite' }} />
                                    {UI_STRINGS.NOTIFICATIONS.SENDING}
                                </>
                            ) : (
                                <>
                                    <Send size={18} style={{ marginRight: '8px' }} />
                                    {UI_STRINGS.NOTIFICATIONS.SEND_BTN}
                                </>
                            )}
                        </button>
                    </form>
                </div>

                {/* ── Notification History ── */}
                <div>
                    <div className="flex items-center gap-2" style={{ marginBottom: 'var(--space-md)' }}>
                        <Clock size={18} style={{ color: 'var(--text-secondary)' }} />
                        <h3 style={{ margin: 0 }}>{UI_STRINGS.NOTIFICATIONS.HISTORY_TITLE}</h3>
                    </div>

                    {history.length === 0 ? (
                        <div className="empty-state">{UI_STRINGS.NOTIFICATIONS.HISTORY_EMPTY}</div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
                            {history.map(record => (
                                <div key={record.id} className="card" style={{ padding: 'var(--space-md)' }}>
                                    <div className="flex justify-between items-start">
                                        <div style={{ flex: 1 }}>
                                            <h4 style={{ margin: '0 0 4px 0', fontSize: '0.95rem' }}>{record.title}</h4>
                                            <p className="text-sm" style={{
                                                color: 'var(--text-secondary)',
                                                margin: '0 0 8px 0',
                                                lineHeight: 1.5,
                                            }}>
                                                {record.body}
                                            </p>
                                            <div className="flex items-center gap-2 text-xs text-muted">
                                                <Users size={12} />
                                                <span>{getTargetLabel(record)}</span>
                                                <span style={{ margin: '0 4px' }}>•</span>
                                                <span>{record.tokenCount} device{record.tokenCount !== 1 ? 's' : ''}</span>
                                                <span style={{ margin: '0 4px' }}>•</span>
                                                <Clock size={12} />
                                                <span>
                                                    {record.createdAt.toLocaleDateString('en-IN', {
                                                        day: 'numeric',
                                                        month: 'short',
                                                        year: 'numeric',
                                                        hour: '2-digit',
                                                        minute: '2-digit',
                                                    })}
                                                </span>
                                            </div>
                                        </div>
                                        <button
                                            type="button"
                                            className="icon-btn text-error"
                                            title="Delete Notification"
                                            onClick={() => handleOpenDelete(record.id)}
                                            style={{
                                                marginLeft: 'var(--space-md)',
                                                padding: '4px',
                                            }}
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
            <ConfirmModal
                isOpen={showDeleteModal}
                onClose={() => {
                    setShowDeleteModal(false);
                    setDeleteId(null);
                }}
                onConfirm={confirmDelete}
                title="Delete Notification History"
                message="Are you sure you want to delete this notification record from the audit history? This action cannot be undone."
                confirmText="Delete"
                cancelText="Cancel"
                type="danger"
            />
        </div>
    );
}
