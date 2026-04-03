import { useState, useEffect } from 'react';
import { updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { IndianRupee, AlertTriangle, Clock } from 'lucide-react';
import { feeService } from '../services/feeService';
import { userService } from '../services/userService';
import type { Fee, User, FeeStatus } from '../types';
import { UI_STRINGS, FEE_STATUS, ADMIN_USER_ID, COLLECTIONS } from '../constants';
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

export default function FeesPage() {
    const { showToast } = useToast();
    const [fees, setFees] = useState<Fee[]>([]);
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [viewingStudent, setViewingStudent] = useState<StudentSummary | null>(null);
    const [newFee, setNewFee] = useState({
        userId: '',
        amount: '',
        dueDate: '',
        description: '',
        status: FEE_STATUS.PENDING as FeeStatus
    });
    const [editingFee, setEditingFee] = useState<Fee | null>(null);
    const [selectedFees, setSelectedFees] = useState<Set<string>>(new Set());
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [feeToDelete, setFeeToDelete] = useState<string | null>(null);

    // 1. Edit Fee Record
    const handleEditSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingFee) return;
        try {
            setError(null);
            const updatedAmount = Number(editingFee.amount);
            const updatedDueDate = new Date(editingFee.dueDate);
            const updatedDescription = editingFee.description;

            await updateDoc(doc(db, COLLECTIONS.FEES, editingFee.id), {
                amount: updatedAmount,
                dueDate: updatedDueDate,
                description: updatedDescription
            });

            // Update local state
            setFees(prev => prev.map(f => f.id === editingFee.id ? { 
                ...f, 
                amount: updatedAmount, 
                dueDate: updatedDueDate, 
                description: updatedDescription 
            } : f));

            if (viewingStudent) {
                setViewingStudent(prev => {
                    if (!prev) return null;
                    const updatedRecords = prev.records.map(f => f.id === editingFee.id ? { 
                        ...f, 
                        amount: updatedAmount, 
                        dueDate: updatedDueDate, 
                        description: updatedDescription 
                    } : f);

                    // Recalculate summary stats
                    const total = updatedRecords.reduce((acc, f) => acc + f.amount, 0);
                    const paid = updatedRecords.filter(f => f.status === 'paid').reduce((acc, f) => acc + f.amount, 0);
                    const pending = updatedRecords.filter(f => f.status !== 'paid').reduce((acc, f) => acc + f.amount, 0);

                    return {
                        ...prev,
                        records: updatedRecords,
                        total,
                        paid,
                        pending
                    };
                });
            }
            setEditingFee(null);
            showToast("saved record successfully", "success");
        } catch (err) {
            console.error("Error editing fee", err);
            setError("Failed to edit fee");
        }
    };

    // 2. Delete Fee Record
    const handleDeleteFee = (feeId: string) => {
        setFeeToDelete(feeId);
        setShowDeleteModal(true);
    };

    const confirmDeleteFee = async () => {
        if (!feeToDelete) return;
        try {
            await deleteDoc(doc(db, COLLECTIONS.FEES, feeToDelete));
            setFees(prev => prev.filter(f => f.id !== feeToDelete));
            if (viewingStudent) {
                setViewingStudent(prev => {
                    if (!prev) return null;
                    const updatedRecords = prev.records.filter(f => f.id !== feeToDelete);
                    const total = updatedRecords.reduce((acc, f) => acc + f.amount, 0);
                    const paid = updatedRecords.filter(f => f.status === 'paid').reduce((acc, f) => acc + f.amount, 0);
                    const pending = updatedRecords.filter(f => f.status !== 'paid').reduce((acc, f) => acc + f.amount, 0);
                    return { ...prev, records: updatedRecords, total, paid, pending };
                });
            }
            setShowDeleteModal(false);
            setFeeToDelete(null);
            showToast("Fee deleted successfully", "success");
        } catch (err) {
            console.error("Error deleting fee", err);
            setError("Failed to delete fee");
        }
    };

    // 3. Bulk Mark-as-Paid
    const handleBulkMarkPaid = async () => {
        if (selectedFees.size === 0) return;
        try {
            const promises = Array.from(selectedFees).map(id => 
                updateDoc(doc(db, COLLECTIONS.FEES, id), { status: FEE_STATUS.PAID, paidDate: new Date() })
            );
            await Promise.all(promises);
            
            const now = new Date();
            setFees(prev => prev.map(f => selectedFees.has(f.id) ? { ...f, status: FEE_STATUS.PAID, paidDate: now } : f));
            if (viewingStudent) {
                setViewingStudent(prev => {
                    if (!prev) return null;
                    const updatedRecords = prev.records.map(f => selectedFees.has(f.id) ? { ...f, status: FEE_STATUS.PAID, paidDate: now } : f);
                    const paid = updatedRecords.filter(f => f.status === FEE_STATUS.PAID).reduce((acc, f) => acc + f.amount, 0);
                    const pending = updatedRecords.filter(f => f.status !== FEE_STATUS.PAID).reduce((acc, f) => acc + f.amount, 0);
                    return { ...prev, records: updatedRecords, paid, pending };
                });
            }
            setSelectedFees(new Set());
            showToast("Fees marked as paid", "success");
        } catch (err) {
            console.error("Error in bulk update", err);
            setError("Failed to bulk update fees");
        }
    };

    // 4. Fee Reminder
    const handleSendReminder = (studentId: string, records: Fee[]) => {
        const pendingFees = records.filter(f => f.status !== 'paid');
        const pendingAmount = pendingFees.reduce((sum, f) => sum + f.amount, 0);
        const earliestDueDate = pendingFees
            .map(f => f.dueDate)
            .sort((a, b) => (a?.getTime() || 0) - (b?.getTime() || 0))[0];

        const reminderData = {
            userId: studentId,
            pendingAmount,
            dueDate: earliestDueDate?.toLocaleDateString() || 'N/A'
        };
        
        console.log("Preparing to send reminder:", reminderData);
        showToast(`Reminder ready for User: ${studentId}. Amount: ₹${pendingAmount}`, "success");
    };

    // 5. Export CSV
    const handleExportCSV = () => {
        const headers = ['Student Name', 'Email', 'Course', 'Description', 'Amount', 'Due Date', 'Status'];
        const rows = fees.map(f => [
            `"${f.studentName || ''}"`,
            `"${f.email || ''}"`,
            `"${f.course || ''}"`,
            `"${f.description || ''}"`,
            f.amount,
            f.dueDate?.toLocaleDateString() || '',
            f.status
        ]);
        
        const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `fees_export_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };

    // 6. Migrate Legacy Fees
    const handleMigrateLegacyFees = async () => {
        if (!window.confirm("This will scan and fix all legacy fee records to make them visible in the mobile app. Proceed?")) return;
        try {
            setLoading(true);
            let count = 0;
            for (const f of fees) {
                if (f.userId && !f.studentId) {
                    await updateDoc(doc(db, COLLECTIONS.FEES, f.id), {
                        studentId: f.userId
                    });
                    count++;
                }
            }
            showToast(`Migration Complete! Fixed ${count} legacy fee records.`, "success");
            const feesData = await feeService.fetchFees();
            setFees(feesData);
        } catch (err) {
            console.error("Migration failed:", err);
            showToast("Migration failed.", "error");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        async function fetchData() {
            try {
                setLoading(true);
                setError(null);
                const [feesData, usersData] = await Promise.all([
                    feeService.fetchFees(),
                    userService.fetchUsers()
                ]);
                setFees(feesData);
                setUsers(usersData);
            } catch (err) {
                console.error("Error fetching data: ", err);
                setError(UI_STRINGS.FEES.ERROR_LOAD);
            } finally {
                setLoading(false);
            }
        }
        fetchData();
    }, []);

    const handleUpdateStatus = async (feeId: string, newStatus: string) => {
        try {
            setError(null);
            const { status, paidDate } = await feeService.updateFeeStatus(feeId, newStatus);
            const updatedStatus = status as "paid" | "pending" | "overdue";

            setFees(prev => prev.map((f: Fee) => f.id === feeId ? {
                ...f,
                status: updatedStatus,
                paidDate: paidDate || f.paidDate
            } : f));

            if (viewingStudent) {
                setViewingStudent(prev => {
                    if (!prev) return null;
                    const updatedRecords = prev.records.map((r: Fee) => r.id === feeId ? {
                        ...r,
                        status: updatedStatus,
                        paidDate: paidDate || r.paidDate
                    } : r);
                    const paid = updatedRecords.filter(f => f.status === 'paid').reduce((acc, f) => acc + f.amount, 0);
                    const pending = updatedRecords.filter(f => f.status !== 'paid').reduce((acc, f) => acc + f.amount, 0);
                    return { ...prev, records: updatedRecords, paid, pending };
                });
            }
        } catch (err) {
            console.error("Error updating fee status: ", err);
            setError(UI_STRINGS.FEES.ERROR_UPDATE);
        }
    };

    const handleAddFee = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            setError(null);
            const selectedUser = users.find(u => u.id === newFee.userId);
            const feeData = {
                ...newFee,
                studentId: newFee.userId,
                studentName: selectedUser?.name || '',
                email: selectedUser?.email || '',
                course: selectedUser?.course || '',
            };
            const addedFee = await feeService.createFee(feeData as unknown as Fee);
            setFees([addedFee, ...fees]);
            setShowModal(false);
            setNewFee({ userId: '', amount: '', dueDate: '', description: '', status: FEE_STATUS.PENDING as FeeStatus });
            showToast("Fee added successfully", "success");
        } catch (err) {
            console.error("Error adding fee: ", err);
            setError(UI_STRINGS.FEES.ERROR_CREATE);
        }
    };

    // Aggregate fees by student
    const studentSummaries = users.filter((u: User) => u.id !== ADMIN_USER_ID).map((user: User) => {
        const userFees = fees.filter((f: Fee) => (f.studentId || f.userId) === user.id);
        const total = userFees.reduce((acc: number, f: Fee) => acc + f.amount, 0);
        const paid = userFees.filter((f: Fee) => f.status === FEE_STATUS.PAID).reduce((acc: number, f: Fee) => acc + f.amount, 0);
        const overdue = userFees.filter((f: Fee) => f.status === FEE_STATUS.OVERDUE).reduce((acc: number, f: Fee) => acc + f.amount, 0);
        const pending = userFees.filter((f: Fee) => f.status === FEE_STATUS.PENDING).reduce((acc: number, f: Fee) => acc + f.amount, 0);

        let status: string = UI_STRINGS.FEES.ALL_CLEAR;
        if (overdue > 0) status = UI_STRINGS.FEES.STATUS_OVERDUE;
        else if (pending > 0) status = UI_STRINGS.FEES.STATUS_PENDING;
        else if (total === 0) status = UI_STRINGS.FEES.NO_RECORDS;

        return {
            userId: user.id,
            userName: user.name,
            email: user.email,
            course: user.course,
            total,
            paid,
            pending: pending + overdue,
            status,
            records: userFees
        };
    });

    const filteredSummaries = studentSummaries.filter((s: StudentSummary) =>
        s.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.course.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const stats = {
        collected: fees.filter((f: Fee) => f.status === FEE_STATUS.PAID).reduce((acc: number, f: Fee) => acc + f.amount, 0),
        pending: fees.filter((f: Fee) => f.status === FEE_STATUS.PENDING).reduce((acc: number, f: Fee) => acc + f.amount, 0),
        overdue: fees.filter((f: Fee) => f.status === FEE_STATUS.OVERDUE).reduce((acc: number, f: Fee) => acc + f.amount, 0)
    };

    const summaryColumns: Column<StudentSummary>[] = [
        {
            key: 'student', header: UI_STRINGS.FEES.TH_STUDENT,
            render: (s) => (
                <div>
                    <div className="font-medium">{s.userName}</div>
                    <div className="text-xs text-muted">{s.email}</div>
                </div>
            ),
        },
        { key: 'course', header: UI_STRINGS.FEES.TH_COURSE, render: (s) => <span className="text-sm">{s.course}</span> },
        { key: 'total', header: UI_STRINGS.FEES.TH_TOTAL_FEE, render: (s) => `₹ ${s.total.toLocaleString()}` },
        { key: 'paid', header: UI_STRINGS.FEES.TH_PAID, render: (s) => <span style={{ color: 'var(--success)' }}>₹ {s.paid.toLocaleString()}</span> },
        { key: 'pending', header: UI_STRINGS.FEES.TH_PENDING, render: (s) => <span style={{ color: s.pending > 0 ? 'var(--error)' : undefined }}>₹ {s.pending.toLocaleString()}</span> },
        {
            key: 'status', header: UI_STRINGS.FEES.TH_STATUS,
            render: (s) => (
                <span className={`badge badge-${s.status === UI_STRINGS.FEES.ALL_CLEAR ? 'success' : s.status === UI_STRINGS.FEES.STATUS_OVERDUE ? 'error' : 'primary'}`}>
                    {s.status}
                </span>
            ),
        },
        {
            key: 'actions', header: UI_STRINGS.FEES.TH_ACTIONS,
            render: (s) => (
                <button className="btn btn-secondary" style={{ padding: '4px 12px', fontSize: '0.8rem' }} onClick={() => setViewingStudent(s)}>
                    {UI_STRINGS.FEES.DETAILS_BTN}
                </button>
            ),
        },
    ];

    const [viewMode, setViewMode] = useState<"students" | "all_fees">("all_fees");

    const allFeesColumns: Column<Fee>[] = [
        {
            key: 'select',
            header: 'Bulk',
            render: (r: Fee) => r.status !== FEE_STATUS.PAID ? (
                <input
                    type="checkbox"
                    checked={selectedFees.has(r.id)}
                    onChange={(e) => {
                        const newSet = new Set(selectedFees);
                        if (e.target.checked) {
                            newSet.add(r.id);
                        } else {
                            newSet.delete(r.id);
                        }
                        setSelectedFees(newSet);
                    }}
                />
            ) : null
        },
        { key: 'student', header: 'Student Name', render: (r: Fee) => <span className="font-medium">{r.studentName || 'Unknown'}</span> },
        { key: 'desc', header: UI_STRINGS.FEES.TH_DETAIL_DESCRIPTION, render: (r: Fee) => <span>{r.description}</span> },
        { key: 'amount', header: UI_STRINGS.FEES.TH_DETAIL_AMOUNT, render: (r: Fee) => `₹ ${r.amount.toLocaleString()}` },
        { key: 'due', header: UI_STRINGS.FEES.TH_DETAIL_DUE_DATE, render: (r: Fee) => <span className="text-sm text-muted">{r.dueDate?.toLocaleDateString()}</span> },
        {
            key: 'status', header: UI_STRINGS.FEES.TH_DETAIL_STATUS,
            render: (r: Fee) => (
                <span className={`badge badge-${r.status === FEE_STATUS.PAID ? 'success' : r.status === FEE_STATUS.OVERDUE ? 'error' : 'primary'}`}>
                    {r.status}
                </span>
            ),
        },
        {
            key: 'action', 
            header: UI_STRINGS.FEES.TH_DETAIL_ACTION,
            render: (r: Fee) => (
                <div className="flex items-center gap-2">
                    {r.status !== FEE_STATUS.PAID && (
                        <button className="btn btn-primary" style={{ padding: '4px 8px', fontSize: '0.75rem' }} onClick={() => handleUpdateStatus(r.id, FEE_STATUS.PAID)}>
                            Mark Paid
                        </button>
                    )}
                    <button className="btn btn-secondary" style={{ padding: '4px 8px', fontSize: '0.75rem' }} onClick={() => setEditingFee(r)}>
                        Edit
                    </button>
                    <button className="btn btn-error" style={{ padding: '4px 8px', fontSize: '0.75rem', backgroundColor: 'var(--error)' }} onClick={() => handleDeleteFee(r.id)}>
                        Delete
                    </button>
                </div>
            ),
        },
    ];

    const filteredAllFees = fees.filter(f => 
        (f.studentName || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
        (f.description || '').toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (loading) {
        return <LoadingState message={UI_STRINGS.FEES.LOADING} />;
    }

    return (
        <div>
            <ErrorAlert message={error} />
            <PageHeader
                title={UI_STRINGS.FEES.TITLE}
                subtitle={UI_STRINGS.FEES.SUBTITLE}
                actionLabel={UI_STRINGS.FEES.NEW_BTN}
                onAction={() => setShowModal(true)}
            />
            <div className="flex gap-2 mb-4" style={{ justifyContent: 'flex-end', marginTop: '-30px' }}>
                <button className="btn btn-primary" onClick={handleMigrateLegacyFees} style={{ backgroundColor: 'var(--primary)' }}>Fix Legacy Records</button>
                <button className="btn btn-secondary" onClick={handleExportCSV}>Export CSV</button>
            </div>

            <div className="grid-cards-sm mb-xl">
                <StatCard title={UI_STRINGS.FEES.STAT_COLLECTED} value={`₹ ${stats.collected.toLocaleString()}`} icon={IndianRupee} color="success" bordered />
                <StatCard title={UI_STRINGS.FEES.STAT_PENDING} value={`₹ ${stats.pending.toLocaleString()}`} icon={Clock} color="primary" bordered />
                <StatCard title={UI_STRINGS.FEES.STAT_OVERDUE} value={`₹ ${stats.overdue.toLocaleString()}`} icon={AlertTriangle} color="error" bordered />
            </div>

            <div className="card">
                <div className="flex items-center justify-between mb-md">
                    <SearchInput placeholder={UI_STRINGS.FEES.SEARCH} value={searchTerm} onChange={setSearchTerm} />
                    
                    <div className="flex gap-2">
                        <button 
                            className={`btn ${viewMode === 'all_fees' ? 'btn-primary' : 'btn-secondary'}`}
                            onClick={() => setViewMode('all_fees')}
                            style={{ padding: '6px 12px', fontSize: '0.9rem' }}
                        >
                            All Fees View
                        </button>
                        <button 
                            className={`btn ${viewMode === 'students' ? 'btn-primary' : 'btn-secondary'}`}
                            onClick={() => setViewMode('students')}
                            style={{ padding: '6px 12px', fontSize: '0.9rem' }}
                        >
                            Student Overview
                        </button>
                    </div>
                </div>

                {viewMode === 'all_fees' && selectedFees.size > 0 && (
                    <div className="mb-4 p-4 border border-primary rounded flex justify-between items-center" style={{ backgroundColor: 'rgba(56, 189, 248, 0.1)' }}>
                        <span>{selectedFees.size} fees selected</span>
                        <button className="btn btn-primary" onClick={handleBulkMarkPaid}>
                            Bulk Mark Paid
                        </button>
                    </div>
                )}

                {viewMode === 'students' ? (
                    <DataTable
                        columns={summaryColumns}
                        data={filteredSummaries}
                        emptyMessage={UI_STRINGS.FEES.EMPTY}
                        keyExtractor={(s) => s.userId}
                    />
                ) : (
                    <DataTable
                        columns={allFeesColumns}
                        data={filteredAllFees}
                        emptyMessage="No fee records found."
                        keyExtractor={(f) => f.id}
                    />
                )}
            </div>

            {/* Detailed History Modal (Only used in Student View now) */}
            {viewingStudent && (
                <Modal isOpen={true} onClose={() => setViewingStudent(null)} title={UI_STRINGS.FEES.TRANSACTION_HISTORY} maxWidth="850px">
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
                        <button 
                            className="btn btn-primary" 
                            disabled={selectedFees.size === 0} 
                            onClick={handleBulkMarkPaid}
                            style={{ padding: '6px 12px', fontSize: '0.85rem' }}
                        >
                            Bulk Mark Paid ({selectedFees.size})
                        </button>
                        <button 
                            className="btn btn-secondary"
                            onClick={() => handleSendReminder(viewingStudent.userId, viewingStudent.records)}
                            style={{ padding: '6px 12px', fontSize: '0.85rem' }}
                        >
                            <AlertTriangle size={14} style={{ marginRight: 4, display: 'inline' }} />
                            Send Reminder
                        </button>
                    </div>

                    <DataTable
                        columns={[
                            {
                                key: 'select',
                                header: 'Bulk',
                                render: (r: Fee) => r.status !== FEE_STATUS.PAID ? (
                                    <input
                                        type="checkbox"
                                        checked={selectedFees.has(r.id)}
                                        onChange={(e) => {
                                            const newSet = new Set(selectedFees);
                                            if (e.target.checked) {
                                                newSet.add(r.id);
                                            } else {
                                                newSet.delete(r.id);
                                            }
                                            setSelectedFees(newSet);
                                        }}
                                    />
                                ) : null
                            },
                            { key: 'desc', header: 'Description', render: (r: Fee) => <span>{r.description}</span> },
                            { key: 'amount', header: 'Amount', render: (r: Fee) => `₹ ${r.amount.toLocaleString()}` },
                            { key: 'due', header: 'Due Date', render: (r: Fee) => <span className="text-muted">{r.dueDate?.toLocaleDateString()}</span> },
                            { 
                                key: 'status', header: 'Status', render: (r: Fee) => (
                                    <span className={`badge badge-${r.status === FEE_STATUS.PAID ? 'success' : r.status === FEE_STATUS.OVERDUE ? 'error' : 'primary'}`}>
                                        {r.status}
                                    </span>
                                )
                            },
                            { 
                                key: 'actions', 
                                header: 'Action', 
                                render: (r: Fee) => (
                                    <div className="flex gap-2">
                                        <button className="btn btn-secondary" style={{ padding: '4px 8px', fontSize: '0.75rem' }} onClick={() => setEditingFee(r)}>Edit</button>
                                        <button className="btn btn-error" style={{ padding: '4px 8px', fontSize: '0.75rem', backgroundColor: 'var(--error)' }} onClick={() => handleDeleteFee(r.id)}>Delete</button>
                                    </div>
                                )
                            }
                        ]}
                        data={viewingStudent.records}
                        emptyMessage={(
                            <div className="text-center py-lg">
                                <p className="mb-md text-muted">No fee records found for this student.</p>
                                <button 
                                    className="btn btn-primary"
                                    onClick={() => {
                                        setNewFee({ ...newFee, userId: viewingStudent.userId });
                                        setShowModal(true);
                                    }}
                                >
                                    Add New Fee Record
                                </button>
                            </div>
                        )}
                        keyExtractor={(r) => r.id}
                    />
                    <div className="mt-md pt-sm border-t text-xs text-muted">
                        Total {viewingStudent.records.length} records found for this student.
                    </div>
                </Modal>
            )}

            {/* Create Fee Modal */}
            <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={UI_STRINGS.FEES.MODAL_TITLE}>
                <form onSubmit={handleAddFee} className="form-layout">
                    <FormField label={UI_STRINGS.FEES.FORM_SELECT_STUDENT}>
                        <select required value={newFee.userId} onChange={e => setNewFee({ ...newFee, userId: e.target.value })}>
                            <option value="">{UI_STRINGS.FEES.FORM_SELECT_STUDENT_PLACEHOLDER}</option>
                            {users.map(user => (
                                <option key={user.id} value={user.id}>{user.name} ({user.email})</option>
                            ))}
                        </select>
                    </FormField>
                    <FormRow>
                        <FormField label={UI_STRINGS.FEES.FORM_AMOUNT}>
                            <input type="number" required value={newFee.amount} onChange={e => setNewFee({ ...newFee, amount: e.target.value })} />
                        </FormField>
                        <FormField label={UI_STRINGS.FEES.FORM_DUE_DATE}>
                            <input type="date" required value={newFee.dueDate} onChange={e => setNewFee({ ...newFee, dueDate: e.target.value })} />
                        </FormField>
                    </FormRow>
                    <FormField label={UI_STRINGS.FEES.FORM_DESCRIPTION}>
                        <input type="text" required placeholder={UI_STRINGS.FEES.FORM_DESCRIPTION_PLACEHOLDER} value={newFee.description} onChange={e => setNewFee({ ...newFee, description: e.target.value })} />
                    </FormField>
                    <FormField label={UI_STRINGS.FEES.FORM_STATUS}>
                        <select value={newFee.status} onChange={e => setNewFee({ ...newFee, status: e.target.value as "paid" | "pending" | "overdue" })}>
                            <option value="pending">{UI_STRINGS.FEES.STATUS_PENDING}</option>
                            <option value="paid">{UI_STRINGS.FEES.STATUS_PAID}</option>
                            <option value="overdue">{UI_STRINGS.FEES.STATUS_OVERDUE}</option>
                        </select>
                    </FormField>
                    <FormActions>
                        <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>{UI_STRINGS.COMMON.CANCEL}</button>
                        <button type="submit" className="btn btn-primary">{UI_STRINGS.COMMON.SAVE}</button>
                    </FormActions>
                </form>
            </Modal>

            {/* Edit Fee Modal */}
            {editingFee && (
                <Modal isOpen={!!editingFee} onClose={() => setEditingFee(null)} title="Edit Fee Record">
                    <form onSubmit={handleEditSubmit} className="form-layout">
                        <FormRow>
                            <FormField label={UI_STRINGS.FEES.FORM_AMOUNT}>
                                <input type="number" required value={editingFee.amount || ''} onChange={e => setEditingFee({ ...editingFee, amount: Number(e.target.value) })} />
                            </FormField>
                            <FormField label={UI_STRINGS.FEES.FORM_DUE_DATE}>
                                <input type="date" required value={editingFee.dueDate instanceof Date ? editingFee.dueDate.toISOString().split('T')[0] : ''} onChange={e => setEditingFee({ ...editingFee, dueDate: new Date(e.target.value) })} />
                            </FormField>
                        </FormRow>
                        <FormField label={UI_STRINGS.FEES.FORM_DESCRIPTION}>
                            <input type="text" required value={editingFee.description} onChange={e => setEditingFee({ ...editingFee, description: e.target.value })} />
                        </FormField>
                        <FormActions>
                            <button type="button" className="btn btn-secondary" onClick={() => setEditingFee(null)}>{UI_STRINGS.COMMON.CANCEL}</button>
                            <button type="submit" className="btn btn-primary">{UI_STRINGS.COMMON.SAVE}</button>
                        </FormActions>
                    </form>
                </Modal>
            )}

            {/* Modal: Delete Confirmation */}
            <Modal
                isOpen={showDeleteModal}
                onClose={() => setShowDeleteModal(false)}
                title="Confirm Deletion"
            >
                <div className="py-md text-center">
                    <p className="mb-lg">Are you sure you want to delete this fee record?</p>
                    <div className="flex justify-center gap-md">
                        <button 
                            className="btn btn-secondary" 
                            onClick={() => setShowDeleteModal(false)}
                        >
                            Cancel
                        </button>
                        <button 
                            className="btn btn-primary" 
                            style={{ backgroundColor: 'var(--error)' }}
                            onClick={confirmDeleteFee}
                        >
                            Delete
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}
