import { useState, useEffect } from 'react';
import { Check, IndianRupee, AlertTriangle, Clock } from 'lucide-react';
import { feeService } from '../services/feeService';
import { userService } from '../services/userService';
import type { Fee, User } from '../types';
import { UI_STRINGS, FEE_STATUS, ADMIN_USER_ID } from '../constants';
import PageHeader from '../components/PageHeader';
import LoadingState from '../components/LoadingState';
import ErrorAlert from '../components/ErrorAlert';
import SearchInput from '../components/SearchInput';
import Modal from '../components/Modal';
import DataTable from '../components/DataTable';
import type { Column } from '../components/DataTable';
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
        status: FEE_STATUS.PENDING as string
    });

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

            setFees(fees.map((f: Fee) => f.id === feeId ? {
                ...f,
                status: status as "paid" | "pending" | "overdue",
                paidDate: paidDate || f.paidDate
            } : f));

            if (viewingStudent && viewingStudent.userId === fees.find(f => f.id === feeId)?.userId) {
                setViewingStudent({
                    ...viewingStudent,
                    records: viewingStudent.records.map((r: Fee) => r.id === feeId ? {
                        ...r,
                        status: status as "paid" | "pending" | "overdue",
                        paidDate: paidDate || r.paidDate
                    } : r)
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
            const addedFee = await feeService.createFee(newFee as unknown as Omit<Fee, 'id' | 'createdAt'>);
            setFees([addedFee, ...fees]);
            setShowModal(false);
            setNewFee({ userId: '', amount: '', dueDate: '', description: '', status: FEE_STATUS.PENDING as string });
        } catch (err) {
            console.error("Error adding fee: ", err);
            setError(UI_STRINGS.FEES.ERROR_CREATE);
        }
    };

    // Aggregate fees by student
    const studentSummaries = users.filter((u: User) => u.id !== ADMIN_USER_ID).map((user: User) => {
        const userFees = fees.filter((f: Fee) => f.userId === user.id);
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

            <div className="grid-cards-sm mb-xl">
                <StatCard title={UI_STRINGS.FEES.STAT_COLLECTED} value={`₹ ${stats.collected.toLocaleString()}`} icon={IndianRupee} color="success" bordered />
                <StatCard title={UI_STRINGS.FEES.STAT_PENDING} value={`₹ ${stats.pending.toLocaleString()}`} icon={Clock} color="primary" bordered />
                <StatCard title={UI_STRINGS.FEES.STAT_OVERDUE} value={`₹ ${stats.overdue.toLocaleString()}`} icon={AlertTriangle} color="error" bordered />
            </div>

            <div className="card">
                <div className="flex items-center gap-4 mb-md">
                    <SearchInput placeholder={UI_STRINGS.FEES.SEARCH} value={searchTerm} onChange={setSearchTerm} />
                </div>

                <DataTable
                    columns={summaryColumns}
                    data={filteredSummaries}
                    emptyMessage={UI_STRINGS.FEES.EMPTY}
                    keyExtractor={(s) => s.userId}
                />
            </div>

            {/* Detailed History Modal */}
            {viewingStudent && (
                <Modal isOpen={true} onClose={() => setViewingStudent(null)} title={UI_STRINGS.FEES.TRANSACTION_HISTORY} maxWidth="700px">
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

                    <DataTable
                        columns={[
                            { key: 'desc', header: UI_STRINGS.FEES.TH_DETAIL_DESCRIPTION, render: (r: Fee) => <div className="font-medium">{r.description}</div> },
                            { key: 'amount', header: UI_STRINGS.FEES.TH_DETAIL_AMOUNT, render: (r: Fee) => `₹ ${r.amount.toLocaleString()}` },
                            { key: 'due', header: UI_STRINGS.FEES.TH_DETAIL_DUE_DATE, render: (r: Fee) => <span className="text-sm text-muted">{r.dueDate?.toLocaleDateString()}</span> },
                            {
                                key: 'status', header: UI_STRINGS.FEES.TH_DETAIL_STATUS,
                                render: (r: Fee) => (
                                    <span className={`badge badge-${r.status === FEE_STATUS.PAID ? 'success' : r.status === FEE_STATUS.OVERDUE ? 'error' : 'primary'}`} style={{ fontSize: '0.75rem', padding: '2px 8px' }}>
                                        {r.status}
                                    </span>
                                ),
                            },
                            {
                                key: 'action', header: UI_STRINGS.FEES.TH_DETAIL_ACTION,
                                render: (r: Fee) => r.status !== FEE_STATUS.PAID ? (
                                    <button className="btn btn-primary" style={{ padding: '4px 8px', fontSize: '0.75rem' }} onClick={() => handleUpdateStatus(r.id, FEE_STATUS.PAID)}>
                                        {UI_STRINGS.FEES.MARK_PAID}
                                    </button>
                                ) : (
                                    <div className="flex items-center gap-1" style={{ color: 'var(--success)', fontSize: '0.75rem' }}>
                                        <Check size={14} /> {UI_STRINGS.FEES.PAID_CONFIRMED}
                                    </div>
                                ),
                            },
                        ]}
                        data={viewingStudent.records}
                        emptyMessage="No records found."
                        keyExtractor={(r) => r.id}
                    />
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
        </div>
    );
}
