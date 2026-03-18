import { useState, useEffect } from 'react';
import { Search, Plus, X, Check } from 'lucide-react';
import { feeService } from '../services/feeService';
import { userService } from '../services/userService';
import type { Fee, User } from '../types';
import { UI_STRINGS } from '../constants';

export default function FeesPage() {
    const [fees, setFees] = useState<Fee[]>([]);
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [viewingStudent, setViewingStudent] = useState<any>(null);
    const [newFee, setNewFee] = useState({
        userId: '',
        amount: '',
        dueDate: '',
        description: '',
        status: 'pending'
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
                status: status as any,
                paidDate: paidDate || f.paidDate
            } : f));

            if (viewingStudent && viewingStudent.userId === fees.find(f => f.id === feeId)?.userId) {
                setViewingStudent({
                    ...viewingStudent,
                    records: viewingStudent.records.map((r: Fee) => r.id === feeId ? {
                        ...r,
                        status: status as any,
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
            const addedFee = await feeService.createFee(newFee as any);
            setFees([addedFee, ...fees]);
            setShowModal(false);
            setNewFee({ userId: '', amount: '', dueDate: '', description: '', status: 'pending' });
        } catch (err) {
            console.error("Error adding fee: ", err);
            setError(UI_STRINGS.FEES.ERROR_CREATE);
        }
    };

    // Aggregate fees by student
    const studentSummaries = users.filter((u: User) => u.id !== 'admin').map((user: User) => {
        const userFees = fees.filter((f: Fee) => f.userId === user.id);
        const total = userFees.reduce((acc: number, f: Fee) => acc + f.amount, 0);
        const paid = userFees.filter((f: Fee) => f.status === 'paid').reduce((acc: number, f: Fee) => acc + f.amount, 0);
        const overdue = userFees.filter((f: Fee) => f.status === 'overdue').reduce((acc: number, f: Fee) => acc + f.amount, 0);
        const pending = userFees.filter((f: Fee) => f.status === 'pending').reduce((acc: number, f: Fee) => acc + f.amount, 0);

        let status = 'All Clear';
        if (overdue > 0) status = 'Overdue';
        else if (pending > 0) status = 'Pending';
        else if (total === 0) status = 'No Records';

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

    const filteredSummaries = studentSummaries.filter((s: any) =>
        s.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.course.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const stats = {
        collected: fees.filter((f: Fee) => f.status === 'paid').reduce((acc: number, f: Fee) => acc + f.amount, 0),
        pending: fees.filter((f: Fee) => f.status === 'pending').reduce((acc: number, f: Fee) => acc + f.amount, 0),
        overdue: fees.filter((f: Fee) => f.status === 'overdue').reduce((acc: number, f: Fee) => acc + f.amount, 0)
    };

    if (loading) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
                <div className="animate-pulse text-secondary">{UI_STRINGS.FEES.LOADING}</div>
            </div>
        );
    }

    return (
        <div>
            {error && (
                <div className="alert alert-error mb-4">
                    {error}
                </div>
            )}
            <div className="flex justify-between items-center" style={{ marginBottom: 'var(--space-lg)' }}>
                <div>
                    <h1>{UI_STRINGS.FEES.TITLE}</h1>
                    <p>{UI_STRINGS.FEES.SUBTITLE}</p>
                </div>
                <div className="flex gap-2">
                    <button className="btn btn-primary" onClick={() => setShowModal(true)}>
                        <Plus size={18} style={{ marginRight: '8px' }} />
                        {UI_STRINGS.FEES.NEW_BTN}
                    </button>
                </div>
            </div>

            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                gap: 'var(--space-md)',
                marginBottom: 'var(--space-xl)'
            }}>
                <div className="card stat-card-hover" style={{ borderLeft: '4px solid var(--success)', boxShadow: '0 4px 12px rgba(16, 185, 129, 0.1)' }}>
                    <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Total Collected</p>
                    <h2 style={{ color: 'var(--success)', fontSize: '1.75rem' }}>₹ {stats.collected.toLocaleString()}</h2>
                </div>
                <div className="card stat-card-hover" style={{ borderLeft: '4px solid var(--primary)', boxShadow: '0 4px 12px rgba(245, 158, 11, 0.1)' }}>
                    <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Pending</p>
                    <h2 style={{ color: 'var(--primary)', fontSize: '1.75rem' }}>₹ {stats.pending.toLocaleString()}</h2>
                </div>
                <div className="card stat-card-hover" style={{ borderLeft: '4px solid var(--error)', boxShadow: '0 4px 12px rgba(239, 68, 68, 0.1)' }}>
                    <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Overdue</p>
                    <h2 style={{ color: 'var(--error)', fontSize: '1.75rem' }}>₹ {stats.overdue.toLocaleString()}</h2>
                </div>
            </div>

            <div className="card">
                <div className="flex items-center gap-4" style={{ marginBottom: 'var(--space-md)' }}>
                    <div style={{ position: 'relative', flex: 1 }}>
                        <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
                        <input
                            type="text"
                            placeholder={UI_STRINGS.FEES.SEARCH}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            style={{ paddingLeft: '40px' }}
                        />
                    </div>
                </div>

                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                        <thead>
                            <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                                <th style={{ padding: 'var(--space-md)', color: 'var(--text-secondary)', fontWeight: 600 }}>Student</th>
                                <th style={{ padding: 'var(--space-md)', color: 'var(--text-secondary)', fontWeight: 600 }}>Course</th>
                                <th style={{ padding: 'var(--space-md)', color: 'var(--text-secondary)', fontWeight: 600 }}>Total Fee</th>
                                <th style={{ padding: 'var(--space-md)', color: 'var(--text-secondary)', fontWeight: 600 }}>Paid</th>
                                <th style={{ padding: 'var(--space-md)', color: 'var(--text-secondary)', fontWeight: 600 }}>Pending</th>
                                <th style={{ padding: 'var(--space-md)', color: 'var(--text-secondary)', fontWeight: 600 }}>Status</th>
                                <th style={{ padding: 'var(--space-md)', color: 'var(--text-secondary)', fontWeight: 600 }}>Actions</th>
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
                                                summary.status === 'All Clear' ? 'success' :
                                                summary.status === 'Overdue' ? 'error' : 'primary'
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
                                                Details
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
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    backgroundColor: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(4px)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999
                }}>
                    <div className="card" style={{ width: '100%', maxWidth: '700px', position: 'relative', maxHeight: '90vh', overflowY: 'auto' }}>
                        <button
                            onClick={() => setViewingStudent(null)}
                            style={{ position: 'absolute', top: '16px', right: '16px', border: 'none', background: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
                        >
                            <X size={20} />
                        </button>
                        <div style={{ marginBottom: 'var(--space-lg)' }}>
                            <h2 style={{ marginBottom: '4px' }}>Transaction History</h2>
                            <p style={{ color: 'var(--text-secondary)' }}>{viewingStudent.userName} • {viewingStudent.course}</p>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-md)', marginBottom: 'var(--space-lg)' }}>
                            <div style={{ padding: 'var(--space-md)', backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: '8px' }}>
                                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Total Paid</p>
                                <h3 style={{ color: 'var(--success)' }}>₹ {viewingStudent.paid.toLocaleString()}</h3>
                            </div>
                            <div style={{ padding: 'var(--space-md)', backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: '8px' }}>
                                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Balance Due</p>
                                <h3 style={{ color: 'var(--error)' }}>₹ {viewingStudent.pending.toLocaleString()}</h3>
                            </div>
                        </div>

                        <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                                <thead>
                                    <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                                        <th style={{ padding: '12px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Description</th>
                                        <th style={{ padding: '12px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Amount</th>
                                        <th style={{ padding: '12px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Due Date</th>
                                        <th style={{ padding: '12px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Status</th>
                                        <th style={{ padding: '12px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Action</th>
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
                                                    record.status === 'paid' ? 'success' :
                                                    record.status === 'overdue' ? 'error' : 'primary'
                                                }`} style={{ fontSize: '0.75rem', padding: '2px 8px' }}>
                                                    {record.status}
                                                </span>
                                            </td>
                                            <td style={{ padding: '12px' }}>
                                                {record.status !== 'paid' ? (
                                                    <button
                                                        className="btn btn-primary"
                                                        style={{ padding: '4px 8px', fontSize: '0.75rem' }}
                                                        onClick={() => handleUpdateStatus(record.id, 'paid')}
                                                    >
                                                        Mark Paid
                                                    </button>
                                                ) : (
                                                    <div className="flex items-center gap-1" style={{ color: 'var(--success)', fontSize: '0.75rem' }}>
                                                        <Check size={14} /> Paid
                                                    </div>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {showModal && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    backgroundColor: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(4px)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999
                }}>
                    <div className="card" style={{ width: '100%', maxWidth: '500px', position: 'relative' }}>
                        <button
                            onClick={() => setShowModal(false)}
                            style={{ position: 'absolute', top: '16px', right: '16px', border: 'none', background: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
                        >
                            <X size={20} />
                        </button>
                        <h2>{UI_STRINGS.FEES.MODAL_TITLE}</h2>
                        <form onSubmit={handleAddFee} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)', marginTop: 'var(--space-lg)' }}>
                            <div>
                                <label>Student</label>
                                <select required value={newFee.userId} onChange={e => setNewFee({ ...newFee, userId: e.target.value })}>
                                    <option value="">Select Student</option>
                                    {users.map(user => (
                                        <option key={user.id} value={user.id}>{user.name} ({user.email})</option>
                                    ))}
                                </select>
                            </div>
                            <div className="flex gap-4">
                                <div style={{ flex: 1 }}>
                                    <label>Amount (₹)</label>
                                    <input type="number" required value={newFee.amount} onChange={e => setNewFee({ ...newFee, amount: e.target.value })} />
                                </div>
                                <div style={{ flex: 1 }}>
                                    <label>Due Date</label>
                                    <input type="date" required value={newFee.dueDate} onChange={e => setNewFee({ ...newFee, dueDate: e.target.value })} />
                                </div>
                            </div>
                            <div>
                                <label>Description</label>
                                <input type="text" required placeholder="e.g. Monthly Tuition Fee - March" value={newFee.description} onChange={e => setNewFee({ ...newFee, description: e.target.value })} />
                            </div>
                            <div>
                                <label>Status</label>
                                <select value={newFee.status} onChange={e => setNewFee({ ...newFee, status: e.target.value as any })}>
                                    <option value="pending">Pending</option>
                                    <option value="paid">Paid</option>
                                    <option value="overdue">Overdue</option>
                                </select>
                            </div>
                            <div className="flex justify-end gap-2" style={{ marginTop: 'var(--space-md)' }}>
                                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>{UI_STRINGS.COMMON.CANCEL}</button>
                                <button type="submit" className="btn btn-primary">{UI_STRINGS.COMMON.SAVE}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
