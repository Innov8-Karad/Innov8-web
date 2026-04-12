import { useState, useEffect } from 'react';
import { Search, Plus, Edit2, Trash2, Calendar, MapPin, Building2, Filter, CheckCircle, Clock, XCircle } from 'lucide-react';
import { interviewService } from '../services/interviewService';
import type { Interview } from '../types';
import { useToast } from '../hooks/useToast';
import Modal from '../components/Modal';
import { FormField, FormActions } from '../components/FormField';

type InterviewStatus = 'scheduled' | 'completed' | 'cancelled';

export default function InterviewsPage() {
    const [interviews, setInterviews] = useState<Interview[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [showModal, setShowModal] = useState(false);
    const [editingInterview, setEditingInterview] = useState<Interview | null>(null);
    const [saving, setSaving] = useState(false);
    const { showToast } = useToast();

    // Form state
    const [company, setCompany] = useState('');
    const [role, setRole] = useState('');
    const [scheduledDate, setScheduledDate] = useState('');
    const [status, setStatus] = useState<InterviewStatus>('scheduled');
    const [eligibleBatches, setEligibleBatches] = useState('');
    const [location, setLocation] = useState('');
    const [notes, setNotes] = useState('');

    useEffect(() => {
        const unsubscribe = interviewService.subscribeToInterviews((data) => {
            setInterviews(data);
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    const filteredInterviews = interviews.filter(iv => {
        const matchesSearch = iv.company.toLowerCase().includes(searchTerm.toLowerCase()) ||
                              iv.role.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = statusFilter === 'all' || iv.status === statusFilter;
        return matchesSearch && matchesStatus;
    });

    const resetForm = () => {
        setCompany('');
        setRole('');
        setScheduledDate('');
        setStatus('scheduled');
        setEligibleBatches('');
        setLocation('');
        setNotes('');
        setEditingInterview(null);
    };

    const openCreateModal = () => {
        resetForm();
        setShowModal(true);
    };

    const openEditModal = (interview: Interview) => {
        setEditingInterview(interview);
        setCompany(interview.company);
        setRole(interview.role);
        setScheduledDate(interview.scheduledDate instanceof Date
            ? interview.scheduledDate.toISOString().split('T')[0]
            : new Date(interview.scheduledDate).toISOString().split('T')[0]);
        setStatus(interview.status);
        setEligibleBatches(interview.eligibleBatches.join(', '));
        setLocation(interview.location || '');
        setNotes(interview.notes || '');
        setShowModal(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);

        const interviewData = {
            company,
            role,
            scheduledDate: new Date(scheduledDate),
            status,
            eligibleBatches: eligibleBatches.split(',').map(b => b.trim()).filter(Boolean),
            location: location || undefined,
            notes: notes || undefined,
        };

        try {
            if (editingInterview) {
                await interviewService.updateInterview(editingInterview.id, interviewData);
                showToast('Interview updated successfully', 'success');
            } else {
                await interviewService.createInterview(interviewData as Omit<Interview, 'id'>);
                showToast('Interview scheduled successfully', 'success');
            }
            setShowModal(false);
            resetForm();
        } catch (error) {
            console.error('Error saving interview:', error);
            showToast('Failed to save interview', 'error');
        }
        setSaving(false);
    };

    const handleDelete = async (id: string) => {
        if (!window.confirm('Are you sure you want to delete this interview?')) return;
        try {
            await interviewService.deleteInterview(id);
            showToast('Interview deleted', 'success');
        } catch (error) {
            console.error('Error deleting interview:', error);
            showToast('Failed to delete interview', 'error');
        }
    };

    const getStatusBadge = (s: InterviewStatus) => {
        switch (s) {
            case 'completed':
                return <span className="badge badge-success"><CheckCircle size={12} className="mr-1" /> Completed</span>;
            case 'cancelled':
                return <span className="badge badge-error"><XCircle size={12} className="mr-1" /> Cancelled</span>;
            default:
                return <span className="badge badge-warning"><Clock size={12} className="mr-1" /> Scheduled</span>;
        }
    };

    const scheduledCount = interviews.filter(i => i.status === 'scheduled').length;
    const completedCount = interviews.filter(i => i.status === 'completed').length;

    return (
        <div className="page-container">
            {/* Header */}
            <div className="page-header">
                <div>
                    <h1 className="page-title">Interview Management</h1>
                    <p className="page-subtitle">
                        {scheduledCount} upcoming · {completedCount} completed · {interviews.length} total
                    </p>
                </div>
                <button className="btn btn-primary" onClick={openCreateModal} id="schedule-interview-btn">
                    <Plus size={20} className="mr-2" />
                    Schedule Interview
                </button>
            </div>

            {/* Filters */}
            <div className="card mb-lg">
                <div className="flex flex-wrap gap-3 items-center">
                    <div className="relative flex-1 min-w-[200px]">
                        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
                        <input
                            type="text"
                            placeholder="Search company or role..."
                            className="login-input w-full pl-10"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            id="interview-search"
                        />
                    </div>
                    <div className="flex items-center gap-2">
                        <Filter size={18} className="text-muted" />
                        <select
                            className="login-input py-2"
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            id="interview-status-filter"
                        >
                            <option value="all">All Status</option>
                            <option value="scheduled">Scheduled</option>
                            <option value="completed">Completed</option>
                            <option value="cancelled">Cancelled</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Interviews Table */}
            <div className="card">
                <div className="table-wrapper">
                    <table className="table">
                        <thead>
                            <tr>
                                <th>Company</th>
                                <th>Role</th>
                                <th>Date</th>
                                <th>Location</th>
                                <th>Batches</th>
                                <th>Status</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan={7} className="text-center py-8 text-muted">Loading interviews...</td></tr>
                            ) : filteredInterviews.length === 0 ? (
                                <tr><td colSpan={7} className="text-center py-8 text-muted">No interviews found.</td></tr>
                            ) : (
                                filteredInterviews.map(iv => (
                                    <tr key={iv.id}>
                                        <td>
                                            <div className="flex items-center gap-2">
                                                <Building2 size={16} className="text-primary" />
                                                <span className="font-semibold">{iv.company}</span>
                                            </div>
                                        </td>
                                        <td>{iv.role}</td>
                                        <td>
                                            <div className="flex items-center gap-1">
                                                <Calendar size={14} className="text-muted" />
                                                {iv.scheduledDate instanceof Date
                                                    ? iv.scheduledDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
                                                    : new Date(iv.scheduledDate).toLocaleDateString('en-IN')}
                                            </div>
                                        </td>
                                        <td>
                                            {iv.location ? (
                                                <div className="flex items-center gap-1 text-sm">
                                                    <MapPin size={14} className="text-muted" />
                                                    {iv.location}
                                                </div>
                                            ) : <span className="text-muted text-sm">—</span>}
                                        </td>
                                        <td>
                                            <div className="flex flex-wrap gap-1">
                                                {iv.eligibleBatches.map(b => (
                                                    <span key={b} className="badge badge-secondary text-xs">{b}</span>
                                                ))}
                                            </div>
                                        </td>
                                        <td>{getStatusBadge(iv.status)}</td>
                                        <td>
                                            <div className="flex items-center gap-1">
                                                <button className="btn btn-icon btn-secondary" onClick={() => openEditModal(iv)} title="Edit">
                                                    <Edit2 size={16} />
                                                </button>
                                                <button className="btn btn-icon btn-secondary text-red-500" onClick={() => handleDelete(iv.id)} title="Delete">
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Create/Edit Modal */}
            {showModal && (
                <Modal
                    isOpen={showModal}
                    onClose={() => { setShowModal(false); resetForm(); }}
                    title={editingInterview ? 'Edit Interview' : 'Schedule Interview'}
                    maxWidth="600px"
                >
                    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                        <div className="grid grid-cols-2 gap-4">
                            <FormField label="Company *">
                                <input
                                    type="text"
                                    required
                                    value={company}
                                    onChange={(e) => setCompany(e.target.value)}
                                    placeholder="e.g. TCS, Infosys..."
                                    id="interview-company"
                                />
                            </FormField>
                            <FormField label="Role *">
                                <input
                                    type="text"
                                    required
                                    value={role}
                                    onChange={(e) => setRole(e.target.value)}
                                    placeholder="e.g. Software Engineer"
                                    id="interview-role"
                                />
                            </FormField>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <FormField label="Scheduled Date *">
                                <input
                                    type="date"
                                    required
                                    value={scheduledDate}
                                    onChange={(e) => setScheduledDate(e.target.value)}
                                    id="interview-date"
                                />
                            </FormField>
                            <FormField label="Status">
                                <select
                                    value={status}
                                    onChange={(e) => setStatus(e.target.value as InterviewStatus)}
                                    id="interview-status"
                                >
                                    <option value="scheduled">Scheduled</option>
                                    <option value="completed">Completed</option>
                                    <option value="cancelled">Cancelled</option>
                                </select>
                            </FormField>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <FormField label="Location">
                                <input
                                    type="text"
                                    value={location}
                                    onChange={(e) => setLocation(e.target.value)}
                                    placeholder="e.g. Campus Hall A"
                                    id="interview-location"
                                />
                            </FormField>
                            <FormField label="Eligible Batches *">
                                <input
                                    type="text"
                                    required
                                    value={eligibleBatches}
                                    onChange={(e) => setEligibleBatches(e.target.value)}
                                    placeholder="e.g. 2024-A, 2024-B"
                                    id="interview-batches"
                                />
                            </FormField>
                        </div>

                        <FormField label="Notes">
                            <textarea
                                rows={3}
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                placeholder="Any additional details..."
                                className="login-input h-auto py-3"
                                id="interview-notes"
                            />
                        </FormField>

                        <FormActions>
                            <button type="button" className="btn btn-secondary" onClick={() => { setShowModal(false); resetForm(); }} disabled={saving}>
                                Cancel
                            </button>
                            <button type="submit" className="btn btn-primary" disabled={saving}>
                                {saving ? 'Saving...' : editingInterview ? 'Update Interview' : 'Schedule Interview'}
                            </button>
                        </FormActions>
                    </form>
                </Modal>
            )}
        </div>
    );
}
