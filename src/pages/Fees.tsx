import React, { useState, useEffect, useCallback } from 'react';
import { IndianRupee, AlertTriangle, Clock, ChevronDown, ChevronUp } from 'lucide-react';
import { feeService } from '../services/feeService';
import { userService } from '../services/userService';
import { announcementService } from '../services/announcementService';
import type { Fee, User, InstallmentPayment } from '../types';
import { UI_STRINGS, FEE_STATUS, ADMIN_USER_ID, PAYMENT_METHODS } from '../constants';
import PageHeader from '../components/PageHeader';
import LoadingState from '../components/LoadingState';
import ErrorAlert from '../components/ErrorAlert';
import SearchInput from '../components/SearchInput';
import Modal from '../components/Modal';
import DataTable from '../components/DataTable';
import type { Column } from '../components/DataTable';
import { useToast } from '../hooks/useToast';
import StatCard from '../components/StatCard';
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
                    if (e.target.checked) {
                        s.add(r.id);
                    } else {
                        s.delete(r.id);
                    }
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
                return (
                    <div style={{ minWidth: '120px' }}>
                        <div style={{ fontSize: '0.8rem', marginBottom: '4px' }}>₹{tp.toLocaleString()} / ₹{r.amount.toLocaleString()}</div>
                        <div style={{ width: '100%', height: '6px', backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: '3px', overflow: 'hidden' }}>
                            <div style={{ width: `${pct}%`, height: '100%', backgroundColor: pct >= 100 ? 'var(--success)' : pct > 0 ? '#F59E0B' : 'var(--error)', borderRadius: '3px', transition: 'width 0.3s ease' }} />
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
                <div className="flex items-center gap-2" style={{ flexWrap: 'wrap' }}>
                    {r.status !== FEE_STATUS.PAID && (
                        <>
                            <button className="btn btn-primary" style={{ padding: '4px 8px', fontSize: '0.7rem' }} onClick={() => handleMarkPaid(r)}>Mark Paid</button>
                            <button className="btn btn-secondary" style={{ padding: '4px 8px', fontSize: '0.7rem', backgroundColor: '#F59E0B', color: '#000' }}
                                onClick={() => { setInstallmentFee(r); setShowInstallmentModal(true); }}>+ Installment</button>
                        </>
                    )}
                    <button className="btn btn-secondary" style={{ padding: '4px 8px', fontSize: '0.7rem' }} onClick={() => toggleInstallments(r.id)}>
                        {expandedFeeId === r.id ? 'Hide' : 'History'}
                    </button>
                    <button className="btn btn-secondary" style={{ padding: '4px 8px', fontSize: '0.7rem' }} onClick={() => openEditModal(r)}>Edit</button>
                    <button className="btn btn-error" style={{ padding: '4px 8px', fontSize: '0.7rem', backgroundColor: 'var(--error)' }} onClick={() => handleDeleteFee(r.id)}>Delete</button>
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
                    <div style={{ backgroundColor: 'rgba(56, 189, 248, 0.05)', borderLeft: '3px solid var(--primary)', padding: '16px 24px' }}>
                        <h4 style={{ fontSize: '0.9rem', fontWeight: '600', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Clock size={14} /> {UI_STRINGS.FEES.INSTALLMENT_HISTORY}
                        </h4>
                        {isLoading ? (
                            <p className="text-muted" style={{ fontSize: '0.85rem' }}>Loading installments...</p>
                        ) : !installments || installments.length === 0 ? (
                            <p className="text-muted" style={{ fontSize: '0.85rem' }}>{UI_STRINGS.FEES.INSTALLMENT_EMPTY}</p>
                        ) : (
                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                <thead>
                                    <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                                        <th style={{ padding: '6px 12px', fontSize: '0.75rem', textAlign: 'left', color: 'var(--text-muted)' }}>Date</th>
                                        <th style={{ padding: '6px 12px', fontSize: '0.75rem', textAlign: 'left', color: 'var(--text-muted)' }}>Amount</th>
                                        <th style={{ padding: '6px 12px', fontSize: '0.75rem', textAlign: 'left', color: 'var(--text-muted)' }}>Method</th>
                                        <th style={{ padding: '6px 12px', fontSize: '0.75rem', textAlign: 'left', color: 'var(--text-muted)' }}>Notes</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {installments.map(inst => (
                                        <tr key={inst.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                            <td style={{ padding: '8px 12px', fontSize: '0.85rem' }}>{inst.paidDate?.toLocaleDateString?.() || 'N/A'}</td>
                                            <td style={{ padding: '8px 12px', fontSize: '0.85rem', color: 'var(--success)', fontWeight: '600' }}>₹{inst.amount.toLocaleString()}</td>
                                            <td style={{ padding: '8px 12px', fontSize: '0.85rem' }}><span className="badge badge-secondary" style={{ fontSize: '0.7rem', padding: '2px 8px' }}>{inst.method}</span></td>
                                            <td style={{ padding: '8px 12px', fontSize: '0.85rem', color: 'var(--text-muted)' }}>{inst.notes || '—'}</td>
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
        <div>
            <ErrorAlert message={error} />
            <PageHeader title={UI_STRINGS.FEES.TITLE} subtitle={UI_STRINGS.FEES.SUBTITLE} actionLabel={UI_STRINGS.FEES.NEW_BTN} onAction={() => setShowCreateModal(true)} />

            <div className="flex gap-2 mb-4" style={{ justifyContent: 'flex-end', marginTop: '-30px' }}>
                <button 
                    className="btn btn-primary" 
                    onClick={handleBulkSendReminders} 
                    disabled={isBulkSending}
                    style={{ backgroundColor: isBulkSending ? 'var(--text-muted)' : 'var(--primary)', display: 'flex', alignItems: 'center' }}
                >
                    <AlertTriangle size={14} style={{ marginRight: 6 }} />
                    {isBulkSending ? 'Sending Reminders...' : 'Send Bulk Reminders'}
                </button>
                <button className="btn btn-secondary" onClick={handleExportCSV}>Export CSV</button>
            </div>

            {/* Stats */}
            <div className="grid-cards-sm mb-xl">
                <StatCard title={UI_STRINGS.FEES.STAT_COLLECTED} value={`₹ ${stats.collected.toLocaleString()}`} icon={IndianRupee} color="success" bordered />
                <StatCard title={UI_STRINGS.FEES.STAT_PENDING} value={`₹ ${stats.pending.toLocaleString()}`} icon={Clock} color="primary" bordered />
                <StatCard title={UI_STRINGS.FEES.STAT_OVERDUE} value={`₹ ${stats.overdue.toLocaleString()}`} icon={AlertTriangle} color="error" bordered />
            </div>

            {/* Main table card */}
            <div className="card">
                <div className="flex items-center justify-between mb-md">
                    <SearchInput placeholder={UI_STRINGS.FEES.SEARCH} value={searchTerm} onChange={setSearchTerm} />
                    <div className="flex gap-2">
                        <button className={`btn ${viewMode === 'all_fees' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setViewMode('all_fees')} style={{ padding: '6px 12px', fontSize: '0.9rem' }}>All Fees View</button>
                        <button className={`btn ${viewMode === 'students' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setViewMode('students')} style={{ padding: '6px 12px', fontSize: '0.9rem' }}>Student Overview</button>
                    </div>
                </div>

                {viewMode === 'all_fees' && selectedFees.size > 0 && (
                    <div className="mb-4 p-4 border border-primary rounded flex justify-between items-center" style={{ backgroundColor: 'rgba(56, 189, 248, 0.1)' }}>
                        <span>{selectedFees.size} fees selected</span>
                        <button className="btn btn-primary" onClick={handleBulkMarkPaid}>Bulk Mark Paid</button>
                    </div>
                )}

                {viewMode === 'students' ? (
                    <DataTable columns={summaryColumns} data={filteredSummaries} emptyMessage={UI_STRINGS.FEES.EMPTY} keyExtractor={s => s.userId} pageSize={10} />
                ) : (
                    <DataTable columns={allFeesColumns} data={filteredAllFees} emptyMessage="No fee records found." keyExtractor={f => f.id} renderAfterRow={f => renderInstallmentHistory(f.id)} pageSize={10} />
                )}
            </div>

            {/* ═══ STUDENT DETAIL MODAL ═══ */}
            {viewingStudent && (
                <Modal isOpen={true} onClose={() => { setViewingStudent(null); setExpandedFeeId(null); }} title={UI_STRINGS.FEES.TRANSACTION_HISTORY} maxWidth="900px">
                    <p className="text-muted">{viewingStudent.userName} • {viewingStudent.course}</p>

                    <div className="grid-2col mt-lg mb-lg">
                        <div style={{ padding: 'var(--space-md)', backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: '8px' }}>
                            <p className="stat-label">{UI_STRINGS.FEES.TOTAL_PAID}</p>
                            <h3 style={{ color: 'var(--success)' }}>₹ {viewingStudent.paid.toLocaleString()}</h3>
                        </div>
                        <div style={{ padding: 'var(--space-md)', backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: '8px' }}>
                            <p className="stat-label">{UI_STRINGS.FEES.BALANCE_DUE}</p>
                            <h3 style={{ color: 'var(--error)' }}>₹ {viewingStudent.pending.toLocaleString()}</h3>
                        </div>
                    </div>

                    <div className="flex gap-2 mb-md mt-sm">
                        <button className="btn btn-secondary" onClick={() => handleSendReminder(viewingStudent.userId, viewingStudent.records)} style={{ padding: '6px 12px', fontSize: '0.85rem' }}>
                            <AlertTriangle size={14} style={{ marginRight: 4, display: 'inline' }} /> Send Reminder
                        </button>
                    </div>

                    {viewingStudent.records.map((r: Fee) => (
                        <div key={r.id} style={{ marginBottom: '12px', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', overflow: 'hidden' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', backgroundColor: 'rgba(255,255,255,0.02)' }}>
                                <div style={{ flex: 1 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                                        <span className="font-medium">{r.description}</span>
                                        <span className={`badge ${getStatusBadgeClass(r.status)}`} style={{ fontSize: '0.7rem' }}>{r.status}</span>
                                    </div>
                                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                        Due: {r.dueDate?.toLocaleDateString()} • ₹{(r.totalPaid || 0).toLocaleString()} / ₹{r.amount.toLocaleString()}
                                    </div>
                                    <div style={{ width: '200px', height: '4px', backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: '2px', marginTop: '6px', overflow: 'hidden' }}>
                                        <div style={{ width: `${r.amount > 0 ? Math.min(((r.totalPaid || 0) / r.amount) * 100, 100) : 0}%`, height: '100%', backgroundColor: (r.totalPaid || 0) >= r.amount ? 'var(--success)' : (r.totalPaid || 0) > 0 ? '#F59E0B' : 'var(--error)', borderRadius: '2px', transition: 'width 0.3s ease' }} />
                                    </div>
                                </div>
                                <div className="flex gap-2" style={{ alignItems: 'center' }}>
                                    {r.status !== FEE_STATUS.PAID && (
                                        <>
                                            <button className="btn btn-primary" style={{ padding: '4px 8px', fontSize: '0.7rem' }} onClick={() => handleMarkPaid(r)}>Mark Paid</button>
                                            <button className="btn btn-secondary" style={{ padding: '4px 8px', fontSize: '0.7rem', backgroundColor: '#F59E0B', color: '#000' }}
                                                onClick={() => { setInstallmentFee(r); setShowInstallmentModal(true); }}>+ Installment</button>
                                        </>
                                    )}
                                    <button className="btn btn-secondary" style={{ padding: '4px 8px', fontSize: '0.7rem' }} onClick={() => toggleInstallments(r.id)}>
                                        {expandedFeeId === r.id ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                                    </button>
                                    <button className="btn btn-secondary" style={{ padding: '4px 8px', fontSize: '0.7rem' }} onClick={() => openEditModal(r)}>Edit</button>
                                    <button className="btn btn-error" style={{ padding: '4px 8px', fontSize: '0.7rem', backgroundColor: 'var(--error)' }} onClick={() => handleDeleteFee(r.id)}>Delete</button>
                                </div>
                            </div>
                            {/* Inline installment timeline */}
                            {expandedFeeId === r.id && (
                                <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', padding: '12px 16px', backgroundColor: 'rgba(56, 189, 248, 0.03)' }}>
                                    <h5 style={{ fontSize: '0.8rem', fontWeight: '600', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <Clock size={12} /> Installment History
                                    </h5>
                                    {loadingInstallments === r.id ? (
                                        <p className="text-muted" style={{ fontSize: '0.8rem' }}>Loading...</p>
                                    ) : (!installmentsMap[r.id] || installmentsMap[r.id].length === 0) ? (
                                        <p className="text-muted" style={{ fontSize: '0.8rem' }}>{UI_STRINGS.FEES.INSTALLMENT_EMPTY}</p>
                                    ) : (
                                        <div>
                                            {installmentsMap[r.id].map((inst, idx) => (
                                                <div key={inst.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '8px 0', borderBottom: idx < installmentsMap[r.id].length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}>
                                                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--success)', flexShrink: 0 }} />
                                                    <div style={{ flex: 1 }}>
                                                        <span style={{ fontWeight: '600', color: 'var(--success)' }}>₹{inst.amount.toLocaleString()}</span>
                                                        <span className="text-muted" style={{ marginLeft: '8px', fontSize: '0.8rem' }}>{inst.paidDate?.toLocaleDateString?.() || 'N/A'}</span>
                                                    </div>
                                                    <span className="badge badge-secondary" style={{ fontSize: '0.65rem', padding: '2px 6px' }}>{inst.method}</span>
                                                    {inst.notes && <span className="text-muted" style={{ fontSize: '0.75rem' }}>{inst.notes}</span>}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    ))}
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
                        <div style={{ backgroundColor: 'rgba(56, 189, 248, 0.08)', padding: '12px 16px', borderRadius: '8px', marginBottom: '16px' }}>
                            <p style={{ fontSize: '0.85rem', fontWeight: '600' }}>{installmentFee.description}</p>
                            <p className="text-muted" style={{ fontSize: '0.8rem' }}>
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
                        <button className="btn btn-primary" style={{ backgroundColor: 'var(--error)' }} onClick={confirmDeleteFee}>Delete</button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}
