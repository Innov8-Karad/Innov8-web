import React, { useState, useEffect, useCallback } from 'react';
import './Fees.css';
import { IndianRupee, AlertTriangle, Clock, ChevronDown, ChevronUp } from 'lucide-react';
import { feeService } from '../services/feeService';
import { userService } from '../services/userService';
import { announcementService } from '../services/announcementService';
import type { Fee, User, InstallmentPayment } from '../types';
import { UI_STRINGS, FEE_STATUS, ADMIN_USER_ID, PAYMENT_METHODS } from '../constants';
import LoadingState from '../components/LoadingState';
import ErrorAlert from '../components/ErrorAlert';
import SearchInput from '../components/SearchInput';
import Modal from '../components/Modal';
import DataTable from '../components/DataTable';
import type { Column } from '../components/DataTable';
import { useToast } from '../hooks/useToast';
import { FormField, FormRow, FormActions } from '../components/FormField';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════
interface StudentSummary {
    userId: string;
    userName: string;
    email: string;
    course: string;
    total: number;
    paid: number;
    pending: number;
    status: string;
    records: Fee[];
}

// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════
export default function FeesPage() {
    const { showToast } = useToast();

    // ── Core state ────────────────────────────────────────────────────────────
    const [fees, setFees] = useState<Fee[]>([]);
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [viewMode, setViewMode] = useState<'students' | 'all_fees'>('all_fees');

    // ── Modals ────────────────────────────────────────────────────────────────
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [editingFee, setEditingFee] = useState<Fee | null>(null);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [feeToDelete, setFeeToDelete] = useState<string | null>(null);
    const [showInstallmentModal, setShowInstallmentModal] = useState(false);
    const [installmentFee, setInstallmentFee] = useState<Fee | null>(null);
    const [viewingStudent, setViewingStudent] = useState<StudentSummary | null>(null);

    // ── Form state ────────────────────────────────────────────────────────────
    const [newFee, setNewFee] = useState({ userId: '', amount: '', dueDate: '', description: '' });
    const [editForm, setEditForm] = useState({ amount: '', dueDate: '', description: '' });
    const [newInstallment, setNewInstallment] = useState({
        amount: '',
        paidDate: new Date().toISOString().split('T')[0],
        method: 'Cash' as 'Cash' | 'Bank' | 'Manual',
        notes: '',
    });

    // ── Selection & expansion ─────────────────────────────────────────────────
    const [selectedFees, setSelectedFees] = useState<Set<string>>(new Set());
    const [expandedFeeId, setExpandedFeeId] = useState<string | null>(null);
    const [installmentsMap, setInstallmentsMap] = useState<Record<string, InstallmentPayment[]>>({});
    const [loadingInstallments, setLoadingInstallments] = useState<string | null>(null);
    const [isBulkSending, setIsBulkSending] = useState(false);

    // ═════════════════════════════════════════════════════════════════════════
    // DATA LOADING — single source of truth refresh
    // ═════════════════════════════════════════════════════════════════════════
    const refreshFees = useCallback(async () => {
        try {
            const data = await feeService.fetchFees();
            setFees(data);
            // Also refresh the viewingStudent if one is open
            if (viewingStudent) {
                const studentFees = data.filter(f => (f.studentId || f.userId) === viewingStudent.userId);
                const total = studentFees.reduce((a, f) => a + f.amount, 0);
                const paid = studentFees.filter(f => f.status === FEE_STATUS.PAID).reduce((a, f) => a + f.amount, 0);
                const pending = total - paid;
                setViewingStudent(prev => prev ? { ...prev, records: studentFees, total, paid, pending } : null);
            }
        } catch (err) {
            console.error('Error refreshing fees:', err);
        }
    }, [viewingStudent]);

    useEffect(() => {
        async function fetchData() {
            try {
                setLoading(true);
                setError(null);
                const [feesData, usersData] = await Promise.all([
                    feeService.fetchFees(),
                    userService.fetchUsers(),
                ]);
                setFees(feesData);
                setUsers(usersData);
            } catch (err) {
                console.error('Error fetching data:', err);
                setError(UI_STRINGS.FEES.ERROR_LOAD);
            } finally {
                setLoading(false);
            }
        }
        fetchData();
    }, []);

    // ═════════════════════════════════════════════════════════════════════════
    // INSTALLMENT HISTORY EXPANSION
    // ═════════════════════════════════════════════════════════════════════════
    const toggleInstallments = async (feeId: string) => {
        if (expandedFeeId === feeId) {
            setExpandedFeeId(null);
            return;
        }
        setExpandedFeeId(feeId);
        // Always fetch fresh
        setLoadingInstallments(feeId);
        try {
            const installments = await feeService.fetchInstallments(feeId);
            setInstallmentsMap(prev => ({ ...prev, [feeId]: installments }));
        } catch (err) {
            console.error('Error fetching installments:', err);
        } finally {
            setLoadingInstallments(null);
        }
    };

    // ═════════════════════════════════════════════════════════════════════════
    // CREATE FEE
    // ═════════════════════════════════════════════════════════════════════════
    const handleAddFee = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            setError(null);
            const selectedUser = users.find(u => u.id === newFee.userId);
            await feeService.createFee({
                userId: newFee.userId,
                studentId: newFee.userId,
                studentName: selectedUser?.name || '',
                email: selectedUser?.email || '',
                course: selectedUser?.course || '',
                description: newFee.description,
                amount: newFee.amount,
                dueDate: newFee.dueDate,
            });
            await refreshFees();
            setShowCreateModal(false);
            setNewFee({ userId: '', amount: '', dueDate: '', description: '' });
            showToast('Fee added successfully', 'success');
        } catch (err) {
            console.error('Error adding fee:', err);
            setError(UI_STRINGS.FEES.ERROR_CREATE);
        }
    };

    // ═════════════════════════════════════════════════════════════════════════
    // EDIT FEE
    // ═════════════════════════════════════════════════════════════════════════
    const openEditModal = (fee: Fee) => {
        setEditForm({
            amount: String(fee.amount),
            dueDate: fee.dueDate instanceof Date ? fee.dueDate.toISOString().split('T')[0] : '',
            description: fee.description || '',
        });
        setEditingFee(fee);
    };

    const handleEditSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingFee) return;
        try {
            setError(null);
            await feeService.updateFee(editingFee.id, {
                amount: Number(editForm.amount),
                dueDate: new Date(editForm.dueDate),
                description: editForm.description,
            });
            await refreshFees();
            setEditingFee(null);
            showToast('Fee updated successfully', 'success');
        } catch (err) {
            console.error('Error editing fee:', err);
            setError('Failed to edit fee');
        }
    };

    // ═════════════════════════════════════════════════════════════════════════
    // DELETE FEE
    // ═════════════════════════════════════════════════════════════════════════
    const handleDeleteFee = (feeId: string) => {
        setFeeToDelete(feeId);
        setShowDeleteModal(true);
    };

    const confirmDeleteFee = async () => {
        if (!feeToDelete) return;
        try {
            await feeService.deleteFee(feeToDelete);
            await refreshFees();
            setShowDeleteModal(false);
            setFeeToDelete(null);
            showToast('Fee deleted successfully', 'success');
        } catch (err) {
            console.error('Error deleting fee:', err);
            setError('Failed to delete fee');
        }
    };

    // ═════════════════════════════════════════════════════════════════════════
    // MARK PAID (single)
    // ═════════════════════════════════════════════════════════════════════════
    const handleMarkPaid = async (fee: Fee) => {
        try {
            setError(null);
            await feeService.markFullyPaid(fee.id);
            await refreshFees();
            // Clear cached installments so they re-fetch
            setInstallmentsMap(prev => { const m = { ...prev }; delete m[fee.id]; return m; });
            showToast('Fee marked as fully paid', 'success');
        } catch (err) {
            console.error('Error marking fee paid:', err);
            setError('Failed to mark fee as paid.');
        }
    };

    // ═════════════════════════════════════════════════════════════════════════
    // BULK MARK PAID
    // ═════════════════════════════════════════════════════════════════════════
    const handleBulkMarkPaid = async () => {
        if (selectedFees.size === 0) return;
        try {
            const promises = Array.from(selectedFees).map(id => feeService.markFullyPaid(id));
            await Promise.all(promises);
            await refreshFees();
            // Clear cached installments
            setInstallmentsMap(prev => {
                const m = { ...prev };
                selectedFees.forEach(id => delete m[id]);
                return m;
            });
            setSelectedFees(new Set());
            showToast('Fees marked as paid', 'success');
        } catch (err) {
            console.error('Error in bulk update:', err);
            setError('Failed to bulk update fees');
        }
    };

    // ═════════════════════════════════════════════════════════════════════════
    // ADD INSTALLMENT
    // ═════════════════════════════════════════════════════════════════════════
    const handleAddInstallment = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!installmentFee) return;
        try {
            setError(null);
            await feeService.addInstallment(installmentFee.id, {
                amount: Number(newInstallment.amount),
                paidDate: new Date(newInstallment.paidDate),
                method: newInstallment.method,
                notes: newInstallment.notes,
                recordedBy: 'admin',
            });
            await refreshFees();
            // Clear cached installments for this fee
            setInstallmentsMap(prev => { const m = { ...prev }; delete m[installmentFee.id]; return m; });
            setShowInstallmentModal(false);
            setInstallmentFee(null);
            setNewInstallment({ amount: '', paidDate: new Date().toISOString().split('T')[0], method: 'Cash', notes: '' });
            showToast('Installment recorded successfully', 'success');
        } catch (err) {
            console.error('Error adding installment:', err);
            setError('Failed to add installment.');
        }
    };

    // ═════════════════════════════════════════════════════════════════════════
    // SEND REMINDER (stub)
    // ═════════════════════════════════════════════════════════════════════════
    const handleSendReminder = async (studentId: string, records: Fee[]) => {
        try {
            const pendingFees = records.filter(f => f.status !== FEE_STATUS.PAID);
            if (pendingFees.length === 0) {
                showToast('No pending fees for this student.', 'success');
                return;
            }

            const totalPending = pendingFees.reduce((sum, f) => sum + (f.amount - (f.totalPaid || 0)), 0);
            const nearestDueDate = pendingFees
                .sort((a, b) => (a.dueDate?.getTime?.() || 0) - (b.dueDate?.getTime?.() || 0))[0]?.dueDate;
            
            const dueDateStr = nearestDueDate?.toLocaleDateString() || 'N/A';

            await announcementService.createAnnouncement({
                title: 'Fee Payment Reminder',
                content: `You have a total pending balance of ₹${totalPending.toLocaleString()}. The next due date is ${dueDateStr}. Please clear your dues of ₹${totalPending.toLocaleString()} to avoid penalties.`,
                priority: 'high',
                targetAudience: 'students',
                targetStudentIds: [studentId],
                targetBatches: [],
            });

            showToast(`Reminder sent successfully to ${studentId}`, 'success');
        } catch (err) {
            console.error('Error sending reminder:', err);
            showToast('Failed to send reminder.', 'error');
        }
    };

    // ═════════════════════════════════════════════════════════════════════════
    // EXPORT CSV
    // ═════════════════════════════════════════════════════════════════════════
    const handleExportCSV = () => {
        const headers = ['Student Name', 'Email', 'Course', 'Description', 'Amount', 'Total Paid', 'Due Date', 'Status'];
        const rows = fees.map(f => [
            `"${f.studentName || ''}"`, `"${f.email || ''}"`, `"${f.course || ''}"`,
            `"${f.description || ''}"`, f.amount, f.totalPaid || 0,
            f.dueDate?.toLocaleDateString() || '', f.status,
        ]);
        const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `fees_export_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };

    // ═════════════════════════════════════════════════════════════════════════
    // BULK REMINDERS
    // ═════════════════════════════════════════════════════════════════════════
    const handleBulkSendReminders = async () => {
        const pendingStudents = studentSummaries.filter(s => s.pending > 0);
        if (pendingStudents.length === 0) {
            showToast('No students have pending fees.', 'success');
            return;
        }

        try {
            showToast(`Sending reminders to ${pendingStudents.length} students...`, 'success');
            setIsBulkSending(true);
            let sentCount = 0;
            
            const promises = pendingStudents.map(async (student) => {
                const totalPending = student.pending;
                const nearestDueDate = student.records
                    .filter(f => f.status !== FEE_STATUS.PAID)
                    .sort((a, b) => (a.dueDate?.getTime?.() || 0) - (b.dueDate?.getTime?.() || 0))[0]?.dueDate;
                
                const dueDateStr = nearestDueDate?.toLocaleDateString() || 'N/A';

                await announcementService.createAnnouncement({
                    title: 'Fee Payment Reminder',
                    content: `You have a total pending balance of ₹${totalPending.toLocaleString()}. The next due date is ${dueDateStr}. Please clear your dues at the earliest.`,
                    priority: 'high',
                    targetAudience: 'students',
                    targetStudentIds: [student.userId],
                    targetBatches: [],
                });
                sentCount++;
            });

            await Promise.all(promises);
            showToast(`Successfully sent reminders to ${sentCount} students.`, 'success');
        } catch (err) {
            console.error('Bulk reminder failed:', err);
            showToast('Failed to send some reminders.', 'error');
        } finally {
            setIsBulkSending(false);
        }
    };

    // ═════════════════════════════════════════════════════════════════════════
    // DERIVED DATA
    // ═════════════════════════════════════════════════════════════════════════
    const getStatusBadgeClass = (status: string) => {
        switch (status) {
            case FEE_STATUS.PAID: return 'badge-success';
            case FEE_STATUS.OVERDUE: return 'badge-error';
            case FEE_STATUS.PARTIAL: return 'badge-warning';
            default: return 'badge-primary';
        }
    };

    const studentSummaries: StudentSummary[] = users
        .filter(u => u.id !== ADMIN_USER_ID)
        .map(user => {
            const userFees = fees.filter(f => (f.studentId || f.userId) === user.id);
            const total = userFees.reduce((a, f) => a + f.amount, 0);
            const paid = userFees.reduce((a, f) => a + (f.totalPaid || 0), 0);
            const overdue = userFees.filter(f => f.status === FEE_STATUS.OVERDUE).reduce((a, f) => a + (f.amount - (f.totalPaid || 0)), 0);
            const pending = userFees.filter(f => f.status === FEE_STATUS.PENDING || f.status === FEE_STATUS.PARTIAL).reduce((a, f) => a + (f.amount - (f.totalPaid || 0)), 0);

            let status: string = UI_STRINGS.FEES.ALL_CLEAR;
            if (overdue > 0) status = UI_STRINGS.FEES.STATUS_OVERDUE;
            else if (pending > 0) status = UI_STRINGS.FEES.STATUS_PENDING;
            else if (total === 0) status = UI_STRINGS.FEES.NO_RECORDS;

            return { userId: user.id, userName: user.name, email: user.email, course: user.course, total, paid, pending: pending + overdue, status, records: userFees };
        });

    const filteredSummaries = studentSummaries.filter(s =>
        s.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.course.toLowerCase().includes(searchTerm.toLowerCase()),
    );

    const filteredAllFees = fees.filter(f =>
        (f.studentName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (f.description || '').toLowerCase().includes(searchTerm.toLowerCase()),
    );

    const stats = {
        collected: fees.reduce((a, f) => a + (f.totalPaid || 0), 0),
        pending: fees.filter(f => f.status === FEE_STATUS.PENDING || f.status === FEE_STATUS.PARTIAL).reduce((a, f) => a + (f.amount - (f.totalPaid || 0)), 0),
        overdue: fees.filter(f => f.status === FEE_STATUS.OVERDUE).reduce((a, f) => a + (f.amount - (f.totalPaid || 0)), 0),
    };

    // ═════════════════════════════════════════════════════════════════════════
    // TABLE COLUMNS
    // ═════════════════════════════════════════════════════════════════════════
    const summaryColumns: Column<StudentSummary>[] = [
        {
            key: 'student', header: UI_STRINGS.FEES.TH_STUDENT,
            render: s => (<div><div className="font-medium">{s.userName}</div><div className="text-xs text-muted">{s.email}</div></div>),
        },
        { key: 'course', header: UI_STRINGS.FEES.TH_COURSE, render: s => <span className="text-sm">{s.course}</span> },
        { key: 'total', header: UI_STRINGS.FEES.TH_TOTAL_FEE, render: s => `₹ ${s.total.toLocaleString()}` },
        { key: 'paid', header: UI_STRINGS.FEES.TH_PAID, render: s => <span style={{ color: 'var(--success)' }}>₹ {s.paid.toLocaleString()}</span> },
        { key: 'pending', header: UI_STRINGS.FEES.TH_PENDING, render: s => <span style={{ color: s.pending > 0 ? 'var(--error)' : undefined }}>₹ {s.pending.toLocaleString()}</span> },
        {
            key: 'status', header: UI_STRINGS.FEES.TH_STATUS,
            render: s => (<span className={`badge badge-${s.status === UI_STRINGS.FEES.ALL_CLEAR ? 'success' : s.status === UI_STRINGS.FEES.STATUS_OVERDUE ? 'error' : 'primary'}`}>{s.status}</span>),
        },
        {
            key: 'actions', header: UI_STRINGS.FEES.TH_ACTIONS,
            render: s => (<button className="btn btn-secondary" style={{ padding: '4px 12px', fontSize: '0.8rem' }} onClick={() => setViewingStudent(s)}>{UI_STRINGS.FEES.DETAILS_BTN}</button>),
        },
    ];

    const allFeesColumns: Column<Fee>[] = [
        {
            key: 'select', header: 'Bulk',
            render: (r: Fee) => r.status !== FEE_STATUS.PAID ? (
                <input type="checkbox" checked={selectedFees.has(r.id)} onChange={e => {
                    const s = new Set(selectedFees);
                    if (e.target.checked) { s.add(r.id); } else { s.delete(r.id); }
                    setSelectedFees(s);
                }} />
            ) : null,
        },
        { key: 'student', header: 'Student Name', render: (r: Fee) => <span className="font-medium">{r.studentName || 'Unknown'}</span> },
        { key: 'desc', header: UI_STRINGS.FEES.TH_DETAIL_DESCRIPTION, render: (r: Fee) => <span>{r.description}</span> },
        { key: 'amount', header: UI_STRINGS.FEES.TH_DETAIL_AMOUNT, render: (r: Fee) => `₹ ${r.amount.toLocaleString()}` },
        {
            key: 'progress', header: 'Paid / Total',
            render: (r: Fee) => {
                const tp = r.totalPaid || 0;
                const pct = r.amount > 0 ? Math.min((tp / r.amount) * 100, 100) : 0;
                const fillClass = pct >= 100 ? 'complete' : pct > 0 ? 'partial' : 'empty';
                return (
                    <div className="fees-progress-wrap">
                        <div className="fees-progress-text">₹{tp.toLocaleString()} / ₹{r.amount.toLocaleString()}</div>
                        <div className="fees-progress-bar">
                            <div className={`fees-progress-fill ${fillClass}`} style={{ width: `${pct}%` }} />
                        </div>
                    </div>
                );
            },
        },
        { key: 'due', header: UI_STRINGS.FEES.TH_DETAIL_DUE_DATE, render: (r: Fee) => <span className="text-sm text-muted">{r.dueDate?.toLocaleDateString()}</span> },
        {
            key: 'status', header: UI_STRINGS.FEES.TH_DETAIL_STATUS,
            render: (r: Fee) => <span className={`badge ${getStatusBadgeClass(r.status)}`}>{r.status}</span>,
        },
        {
            key: 'action', header: UI_STRINGS.FEES.TH_DETAIL_ACTION,
            render: (r: Fee) => (
                <div className="fees-actions">
                    {r.status !== FEE_STATUS.PAID && (
                        <>
                            <button className="fees-action-btn action-paid" onClick={() => handleMarkPaid(r)}>✓ Mark Paid</button>
                            <button className="fees-action-btn action-install" onClick={() => { setInstallmentFee(r); setShowInstallmentModal(true); }}>+ Installment</button>
                        </>
                    )}
                    <button className="fees-action-btn action-history" onClick={() => toggleInstallments(r.id)}>
                        {expandedFeeId === r.id ? 'Hide' : '⏱ History'}
                    </button>
                    <button className="fees-action-btn action-edit" onClick={() => openEditModal(r)}>✎ Edit</button>
                    <button className="fees-action-btn action-delete" onClick={() => handleDeleteFee(r.id)}>✕ Delete</button>
                </div>
            ),
        },
    ];

    // ═════════════════════════════════════════════════════════════════════════
    // INLINE INSTALLMENT HISTORY
    // ═════════════════════════════════════════════════════════════════════════
    const renderInstallmentHistory = (feeId: string) => {
        if (expandedFeeId !== feeId) return null;
        const installments = installmentsMap[feeId];
        const isLoading = loadingInstallments === feeId;

        return (
            <tr>
                <td colSpan={9} style={{ padding: 0, border: 'none' }}>
                    <div className="fees-installment-panel">
                        <h4><Clock size={14} /> {UI_STRINGS.FEES.INSTALLMENT_HISTORY}</h4>
                        {isLoading ? (
                            <p className="text-muted text-sm">Loading installments...</p>
                        ) : !installments || installments.length === 0 ? (
                            <p className="text-muted text-sm">{UI_STRINGS.FEES.INSTALLMENT_EMPTY}</p>
                        ) : (
                            <table className="fees-installment-table">
                                <thead>
                                    <tr>
                                        <th>Date</th>
                                        <th>Amount</th>
                                        <th>Method</th>
                                        <th>Notes</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {installments.map(inst => (
                                        <tr key={inst.id}>
                                            <td>{inst.paidDate?.toLocaleDateString?.() || 'N/A'}</td>
                                            <td className="inst-amount">₹{inst.amount.toLocaleString()}</td>
                                            <td><span className="badge badge-secondary">{inst.method}</span></td>
                                            <td className="text-muted">{inst.notes || '—'}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                </td>
            </tr>
        );
    };

    // ═════════════════════════════════════════════════════════════════════════
    // RENDER
    // ═════════════════════════════════════════════════════════════════════════
    if (loading) return <LoadingState message={UI_STRINGS.FEES.LOADING} />;

    return (
        <div className="fees-page">
            <ErrorAlert message={error} />

            {/* Header */}
            <div className="fees-header">
                <div className="fees-header-left">
                    <h1>{UI_STRINGS.FEES.TITLE}</h1>
                    <p>{UI_STRINGS.FEES.SUBTITLE}</p>
                </div>
                <div className="fees-header-actions">
                    <button
                        className="btn btn-secondary"
                        onClick={handleBulkSendReminders}
                        disabled={isBulkSending}
                    >
                        <AlertTriangle size={14} />
                        {isBulkSending ? 'Sending...' : 'Send Bulk Reminders'}
                    </button>
                    <button className="btn btn-secondary" onClick={handleExportCSV}>Export CSV</button>
                    <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>+ New Fee Record</button>
                </div>
            </div>

            {/* Stats */}
            <div className="fees-stats">
                <div className="fees-stat-card stat-collected">
                    <div className="fees-stat-info">
                        <div className="fees-stat-label">{UI_STRINGS.FEES.STAT_COLLECTED}</div>
                        <div className="fees-stat-value">₹ {stats.collected.toLocaleString()}</div>
                    </div>
                    <div className="fees-stat-icon"><IndianRupee size={22} /></div>
                </div>
                <div className="fees-stat-card stat-pending">
                    <div className="fees-stat-info">
                        <div className="fees-stat-label">{UI_STRINGS.FEES.STAT_PENDING}</div>
                        <div className="fees-stat-value">₹ {stats.pending.toLocaleString()}</div>
                    </div>
                    <div className="fees-stat-icon"><Clock size={22} /></div>
                </div>
                <div className="fees-stat-card stat-overdue">
                    <div className="fees-stat-info">
                        <div className="fees-stat-label">{UI_STRINGS.FEES.STAT_OVERDUE}</div>
                        <div className="fees-stat-value">₹ {stats.overdue.toLocaleString()}</div>
                    </div>
                    <div className="fees-stat-icon"><AlertTriangle size={22} /></div>
                </div>
            </div>

            {/* Main Table Card */}
            <div className="fees-table-card">
                <div className="fees-table-toolbar">
                    <SearchInput placeholder={UI_STRINGS.FEES.SEARCH} value={searchTerm} onChange={setSearchTerm} />
                    <div className="fees-view-tabs">
                        <button className={`fees-view-tab ${viewMode === 'all_fees' ? 'active' : ''}`} onClick={() => setViewMode('all_fees')}>All Fees View</button>
                        <button className={`fees-view-tab ${viewMode === 'students' ? 'active' : ''}`} onClick={() => setViewMode('students')}>Student Overview</button>
                    </div>
                </div>

                {viewMode === 'all_fees' && selectedFees.size > 0 && (
                    <div className="fees-bulk-banner">
                        <span>{selectedFees.size} fee{selectedFees.size > 1 ? 's' : ''} selected</span>
                        <button className="btn btn-primary" onClick={handleBulkMarkPaid}>Bulk Mark Paid</button>
                    </div>
                )}

                <div className="fees-table-content">
                    {viewMode === 'students' ? (
                        <DataTable columns={summaryColumns} data={filteredSummaries} emptyMessage={UI_STRINGS.FEES.EMPTY} keyExtractor={s => s.userId} pageSize={10} />
                    ) : (
                        <DataTable columns={allFeesColumns} data={filteredAllFees} emptyMessage="No fee records found." keyExtractor={f => f.id} renderAfterRow={f => renderInstallmentHistory(f.id)} pageSize={10} />
                    )}
                </div>
            </div>

            {/* ═══ STUDENT DETAIL MODAL ═══ */}
            {viewingStudent && (
                <Modal isOpen={true} onClose={() => { setViewingStudent(null); setExpandedFeeId(null); }} title={UI_STRINGS.FEES.TRANSACTION_HISTORY} maxWidth="900px">
                    <p className="text-muted">{viewingStudent.userName} • {viewingStudent.course}</p>

                    <div className="fees-student-stats">
                        <div className="fees-student-stat">
                            <div className="label">{UI_STRINGS.FEES.TOTAL_PAID}</div>
                            <h3 style={{ color: 'var(--success)' }}>₹ {viewingStudent.paid.toLocaleString()}</h3>
                        </div>
                        <div className="fees-student-stat">
                            <div className="label">{UI_STRINGS.FEES.BALANCE_DUE}</div>
                            <h3 style={{ color: 'var(--error)' }}>₹ {viewingStudent.pending.toLocaleString()}</h3>
                        </div>
                    </div>

                    <div className="flex gap-2 mb-md">
                        <button className="btn btn-secondary" onClick={() => handleSendReminder(viewingStudent.userId, viewingStudent.records)}>
                            <AlertTriangle size={14} /> Send Reminder
                        </button>
                    </div>

                    {viewingStudent.records.map((r: Fee) => {
                        const pct = r.amount > 0 ? Math.min(((r.totalPaid || 0) / r.amount) * 100, 100) : 0;
                        const fillColor = (r.totalPaid || 0) >= r.amount ? 'var(--success)' : (r.totalPaid || 0) > 0 ? '#F59E0B' : 'var(--error)';
                        return (
                            <div key={r.id} className="fees-record-card">
                                <div className="fees-record-header">
                                    <div className="fees-record-info">
                                        <div className="title-row">
                                            <span className="font-medium">{r.description}</span>
                                            <span className={`badge ${getStatusBadgeClass(r.status)}`}>{r.status}</span>
                                        </div>
                                        <div className="meta">
                                            Due: {r.dueDate?.toLocaleDateString()} • ₹{(r.totalPaid || 0).toLocaleString()} / ₹{r.amount.toLocaleString()}
                                        </div>
                                        <div className="fees-record-progress">
                                            <div className="fill" style={{ width: `${pct}%`, backgroundColor: fillColor }} />
                                        </div>
                                    </div>
                                    <div className="fees-actions">
                                        {r.status !== FEE_STATUS.PAID && (
                                            <>
                                                <button className="fees-action-btn action-paid" onClick={() => handleMarkPaid(r)}>✓ Paid</button>
                                                <button className="fees-action-btn action-install" onClick={() => { setInstallmentFee(r); setShowInstallmentModal(true); }}>+ Install</button>
                                            </>
                                        )}
                                        <button className="fees-action-btn action-history" onClick={() => toggleInstallments(r.id)}>
                                            {expandedFeeId === r.id ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                                        </button>
                                        <button className="fees-action-btn action-edit" onClick={() => openEditModal(r)}>✎</button>
                                        <button className="fees-action-btn action-delete" onClick={() => handleDeleteFee(r.id)}>✕</button>
                                    </div>
                                </div>
                                {expandedFeeId === r.id && (
                                    <div className="fees-timeline">
                                        <h5><Clock size={12} /> Installment History</h5>
                                        {loadingInstallments === r.id ? (
                                            <p className="text-muted text-sm">Loading...</p>
                                        ) : (!installmentsMap[r.id] || installmentsMap[r.id].length === 0) ? (
                                            <p className="text-muted text-sm">{UI_STRINGS.FEES.INSTALLMENT_EMPTY}</p>
                                        ) : (
                                            installmentsMap[r.id].map(inst => (
                                                <div key={inst.id} className="fees-timeline-item">
                                                    <div className="fees-timeline-dot" />
                                                    <div className="fees-timeline-content">
                                                        <div>
                                                            <span style={{ fontWeight: 600, color: 'var(--success)' }}>₹{inst.amount.toLocaleString()}</span>
                                                            <span className="text-muted text-sm" style={{ marginLeft: 8 }}>{inst.paidDate?.toLocaleDateString?.() || 'N/A'}</span>
                                                        </div>
                                                        <div className="flex gap-2 items-center">
                                                            <span className="badge badge-secondary">{inst.method}</span>
                                                            {inst.notes && <span className="text-muted text-xs">{inst.notes}</span>}
                                                        </div>
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                    <div className="mt-md pt-sm border-t text-xs text-muted">
                        Total {viewingStudent.records.length} records found for this student.
                    </div>
                </Modal>
            )}

            {/* ═══ CREATE FEE MODAL ═══ */}
            <Modal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} title={UI_STRINGS.FEES.MODAL_TITLE}>
                <form onSubmit={handleAddFee} className="form-layout">
                    <FormField label={UI_STRINGS.FEES.FORM_SELECT_STUDENT}>
                        <select required value={newFee.userId} onChange={e => setNewFee({ ...newFee, userId: e.target.value })}>
                            <option value="">{UI_STRINGS.FEES.FORM_SELECT_STUDENT_PLACEHOLDER}</option>
                            {users.map(u => <option key={u.id} value={u.id}>{u.name} ({u.email})</option>)}
                        </select>
                    </FormField>
                    <FormRow>
                        <FormField label={UI_STRINGS.FEES.FORM_AMOUNT}>
                            <input type="number" required min="1" value={newFee.amount} onChange={e => setNewFee({ ...newFee, amount: e.target.value })} placeholder="0" />
                        </FormField>
                        <FormField label={UI_STRINGS.FEES.FORM_DUE_DATE}>
                            <input type="date" required value={newFee.dueDate} onChange={e => setNewFee({ ...newFee, dueDate: e.target.value })} />
                        </FormField>
                    </FormRow>
                    <FormField label={UI_STRINGS.FEES.FORM_DESCRIPTION}>
                        <input type="text" required placeholder={UI_STRINGS.FEES.FORM_DESCRIPTION_PLACEHOLDER} value={newFee.description} onChange={e => setNewFee({ ...newFee, description: e.target.value })} />
                    </FormField>
                    <FormActions>
                        <button type="button" className="btn btn-secondary" onClick={() => setShowCreateModal(false)}>{UI_STRINGS.COMMON.CANCEL}</button>
                        <button type="submit" className="btn btn-primary">{UI_STRINGS.COMMON.SAVE}</button>
                    </FormActions>
                </form>
            </Modal>

            {/* ═══ EDIT FEE MODAL ═══ */}
            {editingFee && (
                <Modal isOpen={!!editingFee} onClose={() => setEditingFee(null)} title="Edit Fee Record">
                    <form onSubmit={handleEditSubmit} className="form-layout">
                        <FormRow>
                            <FormField label={UI_STRINGS.FEES.FORM_AMOUNT}>
                                <input type="number" required min="0" value={editForm.amount} onChange={e => setEditForm({ ...editForm, amount: e.target.value })} />
                            </FormField>
                            <FormField label={UI_STRINGS.FEES.FORM_DUE_DATE}>
                                <input type="date" required value={editForm.dueDate} onChange={e => setEditForm({ ...editForm, dueDate: e.target.value })} />
                            </FormField>
                        </FormRow>
                        <FormField label={UI_STRINGS.FEES.FORM_DESCRIPTION}>
                            <input type="text" required value={editForm.description} onChange={e => setEditForm({ ...editForm, description: e.target.value })} />
                        </FormField>
                        <FormActions>
                            <button type="button" className="btn btn-secondary" onClick={() => setEditingFee(null)}>{UI_STRINGS.COMMON.CANCEL}</button>
                            <button type="submit" className="btn btn-primary">{UI_STRINGS.COMMON.SAVE}</button>
                        </FormActions>
                    </form>
                </Modal>
            )}

            {/* ═══ ADD INSTALLMENT MODAL ═══ */}
            <Modal isOpen={showInstallmentModal} onClose={() => { setShowInstallmentModal(false); setInstallmentFee(null); }} title={UI_STRINGS.FEES.ADD_INSTALLMENT}>
                {installmentFee && (
                    <div>
                        <div className="fees-installment-info">
                            <p>{installmentFee.description}</p>
                            <p className="text-muted text-sm">
                                Total: ₹{installmentFee.amount.toLocaleString()} • Paid: ₹{(installmentFee.totalPaid || 0).toLocaleString()} • Remaining: ₹{(installmentFee.amount - (installmentFee.totalPaid || 0)).toLocaleString()}
                            </p>
                        </div>
                        <form onSubmit={handleAddInstallment} className="form-layout">
                            <FormRow>
                                <FormField label={UI_STRINGS.FEES.INSTALLMENT_AMOUNT}>
                                    <input type="number" required min="1" max={installmentFee.amount - (installmentFee.totalPaid || 0)}
                                        value={newInstallment.amount} onChange={e => setNewInstallment({ ...newInstallment, amount: e.target.value })}
                                        placeholder={`Max: ₹${(installmentFee.amount - (installmentFee.totalPaid || 0)).toLocaleString()}`} />
                                </FormField>
                                <FormField label={UI_STRINGS.FEES.INSTALLMENT_DATE}>
                                    <input type="date" required value={newInstallment.paidDate} onChange={e => setNewInstallment({ ...newInstallment, paidDate: e.target.value })} />
                                </FormField>
                            </FormRow>
                            <FormField label={UI_STRINGS.FEES.INSTALLMENT_METHOD}>
                                <select value={newInstallment.method} onChange={e => setNewInstallment({ ...newInstallment, method: e.target.value as 'Cash' | 'Bank' | 'Manual' })}>
                                    {PAYMENT_METHODS.map(m => <option key={m.id} value={m.id}>{m.label}</option>)}
                                </select>
                            </FormField>
                            <FormField label={UI_STRINGS.FEES.INSTALLMENT_NOTES}>
                                <input type="text" placeholder="e.g. 1st installment" value={newInstallment.notes} onChange={e => setNewInstallment({ ...newInstallment, notes: e.target.value })} />
                            </FormField>
                            <FormActions>
                                <button type="button" className="btn btn-secondary" onClick={() => { setShowInstallmentModal(false); setInstallmentFee(null); }}>{UI_STRINGS.COMMON.CANCEL}</button>
                                <button type="submit" className="btn btn-primary">Record Payment</button>
                            </FormActions>
                        </form>
                    </div>
                )}
            </Modal>

            {/* ═══ DELETE CONFIRMATION ═══ */}
            <Modal isOpen={showDeleteModal} onClose={() => setShowDeleteModal(false)} title="Confirm Deletion">
                <div className="py-md text-center">
                    <p className="mb-lg">Are you sure you want to delete this fee record?</p>
                    <div className="flex justify-center gap-md">
                        <button className="btn btn-secondary" onClick={() => setShowDeleteModal(false)}>Cancel</button>
                        <button className="fees-action-btn action-delete" style={{ padding: '8px 20px', fontSize: '0.9rem' }} onClick={confirmDeleteFee}>Delete</button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}
