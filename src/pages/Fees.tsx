import { useState, useEffect } from 'react';
import { Check } from 'lucide-react';
import { feeService } from '../services/feeService';
import { userService } from '../services/userService';
import type { Fee, User } from '../types';
import { UI_STRINGS, FEE_STATUS, ADMIN_USER_ID } from '../constants';
import PageHeader from '../components/PageHeader';
import LoadingState from '../components/LoadingState';
import ErrorAlert from '../components/ErrorAlert';
import SearchInput from '../components/SearchInput';
import Modal from '../components/Modal';

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

            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                gap: 'var(--space-md)',
                marginBottom: 'var(--space-xl)'
            }}>
                <div className="card stat-card-hover" style={{ borderLeft: '4px solid var(--success)', boxShadow: '0 4px 12px rgba(16, 185, 129, 0.1)' }}>
                    <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>{UI_STRINGS.FEES.STAT_COLLECTED}</p>
                    <h2 style={{ color: 'var(--success)', fontSize: '1.75rem' }}>₹ {stats.collected.toLocaleString()}</h2>
                </div>
                <div className="card stat-card-hover" style={{ borderLeft: '4px solid var(--primary)', boxShadow: '0 4px 12px rgba(245, 158, 11, 0.1)' }}>
                    <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>{UI_STRINGS.FEES.STAT_PENDING}</p>
                    <h2 style={{ color: 'var(--primary)', fontSize: '1.75rem' }}>₹ {stats.pending.toLocaleString()}</h2>
                </div>
                <div className="card stat-card-hover" style={{ borderLeft: '4px solid var(--error)', boxShadow: '0 4px 12px rgba(239, 68, 68, 0.1)' }}>
                    <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>{UI_STRINGS.FEES.STAT_OVERDUE}</p>
                    <h2 style={{ color: 'var(--error)', fontSize: '1.75rem' }}>₹ {stats.overdue.toLocaleString()}</h2>
                </div>
            </div>

            <div className="card">
                <div className="flex items-center gap-4" style={{ marginBottom: 'var(--space-md)' }}>
                    <SearchInput
                        placeholder={UI_STRINGS.FEES.SEARCH}
                        value={searchTerm}
                        onChange={setSearchTerm}
                    />
                </div>

                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                        <thead>
                            <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                                <th style={{ padding: 'var(--space-md)', color: 'var(--text-secondary)', fontWeight: 600 }}>{UI_STRINGS.FEES.TH_STUDENT}</th>
                                <th style={{ padding: 'var(--space-md)', color: 'var(--text-secondary)', fontWeight: 600 }}>{UI_STRINGS.FEES.TH_COURSE}</th>
                                <th style={{ padding: 'var(--space-md)', color: 'var(--text-secondary)', fontWeight: 600 }}>{UI_STRINGS.FEES.TH_TOTAL_FEE}</th>
                                <th style={{ padding: 'var(--space-md)', color: 'var(--text-secondary)', fontWeight: 600 }}>{UI_STRINGS.FEES.TH_PAID}</th>
                                <th style={{ padding: 'var(--space-md)', color: 'var(--text-secondary)', fontWeight: 600 }}>{UI_STRINGS.FEES.TH_PENDING}</th>
                                <th style={{ padding: 'var(--space-md)', color: 'var(--text-secondary)', fontWeight: 600 }}>{UI_STRINGS.FEES.TH_STATUS}</th>
                                <th style={{ padding: 'var(--space-md)', color: 'var(--text-secondary)', fontWeight: 600 }}>{UI_STRINGS.FEES.TH_ACTIONS}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredSummaries.length > 0 ? (
                                filteredSummaries.map(summary => (
                                    <tr key={summary.userId} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                        <td style={{ padding: 'var(--space-md)' }}>
                                            <div style={{ fontWeight: 500 }}>{summary.userName}</div>
                                            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{summary.email}</div>
                                        </td>
                                        <td style={{ padding: 'var(--space-md)' }}>
                                            <span style={{ fontSize: '0.9rem', color: 'var(--text-main)' }}>{summary.course}</span>
                                        </td>
                                        <td style={{ padding: 'var(--space-md)' }}>₹ {summary.total.toLocaleString()}</td>
                                        <td style={{ padding: 'var(--space-md)', color: 'var(--success)' }}>₹ {summary.paid.toLocaleString()}</td>
                                        <td style={{ padding: 'var(--space-md)', color: summary.pending > 0 ? 'var(--error)' : 'var(--text-main)' }}>₹ {summary.pending.toLocaleString()}</td>
                                        <td style={{ padding: 'var(--space-md)' }}>
                                            <span className={`badge badge-${
                                                summary.status === UI_STRINGS.FEES.ALL_CLEAR ? 'success' :
                                                summary.status === UI_STRINGS.FEES.STATUS_OVERDUE ? 'error' : 'primary'
                                            }`}>
                                                {summary.status}
                                            </span>
                                        </td>
                                        <td style={{ padding: 'var(--space-md)' }}>
                                            <button 
                                                className="btn btn-secondary" 
                                                style={{ padding: '4px 12px', fontSize: '0.8rem' }}
                                                onClick={() => setViewingStudent(summary)}
                                            >
                                                {UI_STRINGS.FEES.DETAILS_BTN}
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={7} style={{ padding: 'var(--space-xl)', textAlign: 'center', color: 'var(--text-secondary)' }}>
                                        {UI_STRINGS.FEES.EMPTY}
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Detailed History Modal */}
            {viewingStudent && (
                <Modal isOpen={true} onClose={() => setViewingStudent(null)} title={UI_STRINGS.FEES.TRANSACTION_HISTORY} maxWidth="700px">
                    <p style={{ color: 'var(--text-secondary)' }}>{viewingStudent.userName} • {viewingStudent.course}</p>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-md)', marginTop: 'var(--space-lg)', marginBottom: 'var(--space-lg)' }}>
                        <div style={{ padding: 'var(--space-md)', backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: '8px' }}>
                            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{UI_STRINGS.FEES.TOTAL_PAID}</p>
                            <h3 style={{ color: 'var(--success)' }}>₹ {viewingStudent.paid.toLocaleString()}</h3>
                        </div>
                        <div style={{ padding: 'var(--space-md)', backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: '8px' }}>
                            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{UI_STRINGS.FEES.BALANCE_DUE}</p>
                            <h3 style={{ color: 'var(--error)' }}>₹ {viewingStudent.pending.toLocaleString()}</h3>
                        </div>
                    </div>

                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                            <thead>
                                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                                    <th style={{ padding: '12px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{UI_STRINGS.FEES.TH_DETAIL_DESCRIPTION}</th>
                                    <th style={{ padding: '12px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{UI_STRINGS.FEES.TH_DETAIL_AMOUNT}</th>
                                    <th style={{ padding: '12px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{UI_STRINGS.FEES.TH_DETAIL_DUE_DATE}</th>
                                    <th style={{ padding: '12px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{UI_STRINGS.FEES.TH_DETAIL_STATUS}</th>
                                    <th style={{ padding: '12px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{UI_STRINGS.FEES.TH_DETAIL_ACTION}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {viewingStudent.records.map((record: Fee) => (
                                    <tr key={record.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                        <td style={{ padding: '12px' }}>
                                            <div style={{ fontWeight: 500 }}>{record.description}</div>
                                        </td>
                                        <td style={{ padding: '12px' }}>₹ {record.amount.toLocaleString()}</td>
                                        <td style={{ padding: '12px', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                                            {record.dueDate?.toLocaleDateString()}
                                        </td>
                                        <td style={{ padding: '12px' }}>
                                            <span className={`badge badge-${
                                                record.status === FEE_STATUS.PAID ? 'success' :
                                                record.status === FEE_STATUS.OVERDUE ? 'error' : 'primary'
                                            }`} style={{ fontSize: '0.75rem', padding: '2px 8px' }}>
                                                {record.status}
                                            </span>
                                        </td>
                                        <td style={{ padding: '12px' }}>
                                            {record.status !== FEE_STATUS.PAID ? (
                                                <button
                                                    className="btn btn-primary"
                                                    style={{ padding: '4px 8px', fontSize: '0.75rem' }}
                                                    onClick={() => handleUpdateStatus(record.id, FEE_STATUS.PAID)}
                                                >
                                                    {UI_STRINGS.FEES.MARK_PAID}
                                                </button>
                                            ) : (
                                                <div className="flex items-center gap-1" style={{ color: 'var(--success)', fontSize: '0.75rem' }}>
                                                    <Check size={14} /> {UI_STRINGS.FEES.PAID_CONFIRMED}
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </Modal>
            )}

            {/* Create Fee Modal */}
            <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={UI_STRINGS.FEES.MODAL_TITLE}>
                <form onSubmit={handleAddFee} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)', marginTop: 'var(--space-lg)' }}>
                    <div>
                        <label>{UI_STRINGS.FEES.FORM_SELECT_STUDENT}</label>
                        <select required value={newFee.userId} onChange={e => setNewFee({ ...newFee, userId: e.target.value })}>
                            <option value="">{UI_STRINGS.FEES.FORM_SELECT_STUDENT_PLACEHOLDER}</option>
                            {users.map(user => (
                                <option key={user.id} value={user.id}>{user.name} ({user.email})</option>
                            ))}
                        </select>
                    </div>
                    <div className="flex gap-4">
                        <div style={{ flex: 1 }}>
                            <label>{UI_STRINGS.FEES.FORM_AMOUNT}</label>
                            <input type="number" required value={newFee.amount} onChange={e => setNewFee({ ...newFee, amount: e.target.value })} />
                        </div>
                        <div style={{ flex: 1 }}>
                            <label>{UI_STRINGS.FEES.FORM_DUE_DATE}</label>
                            <input type="date" required value={newFee.dueDate} onChange={e => setNewFee({ ...newFee, dueDate: e.target.value })} />
                        </div>
                    </div>
                    <div>
                        <label>{UI_STRINGS.FEES.FORM_DESCRIPTION}</label>
                        <input type="text" required placeholder={UI_STRINGS.FEES.FORM_DESCRIPTION_PLACEHOLDER} value={newFee.description} onChange={e => setNewFee({ ...newFee, description: e.target.value })} />
                    </div>
                    <div>
                        <label>{UI_STRINGS.FEES.FORM_STATUS}</label>
                        <select value={newFee.status} onChange={e => setNewFee({ ...newFee, status: e.target.value as "paid" | "pending" | "overdue" })}>
                            <option value="pending">{UI_STRINGS.FEES.STATUS_PENDING}</option>
                            <option value="paid">{UI_STRINGS.FEES.STATUS_PAID}</option>
                            <option value="overdue">{UI_STRINGS.FEES.STATUS_OVERDUE}</option>
                        </select>
                    </div>
                    <div className="flex justify-end gap-2" style={{ marginTop: 'var(--space-md)' }}>
                        <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>{UI_STRINGS.COMMON.CANCEL}</button>
                        <button type="submit" className="btn btn-primary">{UI_STRINGS.COMMON.SAVE}</button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}
