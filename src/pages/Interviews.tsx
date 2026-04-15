import { useState, useEffect } from 'react';
import { Search, Plus, Edit2, Trash2, Calendar, Building2, Filter, CheckCircle, Clock, XCircle } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { interviewService } from '../services/interviewService';
import type { Interview } from '../types';
import { useToast } from '../hooks/useToast';
import Modal from '../components/Modal';
import { FormField, FormActions } from '../components/FormField';

type InterviewStatus = 'scheduled' | 'completed' | 'cancelled';

const StatCard = ({ title, value, icon: Icon, glowColor }: { title: string, value: number, icon: LucideIcon, glowColor: string }) => (
  <div className="premium-stat-card">
    <div className={`stat-icon-box ${glowColor}`}>
      <Icon size={24} />
    </div>
    <div className="stat-info">
      <div className="stat-label-mini">{title}</div>
      <div className="stat-value-large">{value}</div>
    </div>
    <div className={`ambient-glow ${glowColor}`} />
  </div>
);

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

    const scheduledCount = interviews.filter(i => i.status === 'scheduled').length;
    const completedCount = interviews.filter(i => i.status === 'completed').length;
    const cancelledCount = interviews.filter(i => i.status === 'cancelled').length;

    function renderStyles() {
      return (
        <style>{`
          .interviews-luminous-container {
            padding-bottom: 3rem;
            animation: fadeIn 0.6s ease-out;
          }

          .luminous-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 2rem;
          }

          .stats-grid-premium {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
            gap: 1.5rem;
            margin-bottom: 2.5rem;
          }

          .premium-stat-card {
            background: var(--bg-card);
            border: 1px solid var(--border-subtle);
            border-radius: 24px;
            padding: 1.5rem;
            display: flex;
            align-items: center;
            gap: 1.25rem;
            position: relative;
            overflow: hidden;
            transition: transform 0.3s ease, border-color 0.3s ease;
          }
          .premium-stat-card:hover {
            transform: translateY(-4px);
            border-color: rgba(var(--primary-rgb), 0.3);
          }

          .stat-icon-box {
            width: 52px;
            height: 52px;
            border-radius: 14px;
            display: flex;
            align-items: center;
            justify-content: center;
            position: relative;
            z-index: 2;
          }
          .stat-icon-box.blue { background: rgba(59, 130, 246, 0.1); color: #3B82F6; }
          .stat-icon-box.green { background: rgba(16, 185, 129, 0.1); color: #10B981; }
          .stat-icon-box.amber { background: rgba(245, 158, 11, 0.1); color: #F59E0B; }

          .stat-info { z-index: 2; }
          .stat-label-mini { font-size: 0.8rem; color: var(--text-secondary); margin-bottom: 2px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; }
          .stat-value-large { font-size: 1.75rem; font-weight: 800; color: var(--text-main); line-height: 1; }

          .ambient-glow {
            position: absolute;
            top: -20px;
            right: -20px;
            width: 80px;
            height: 80px;
            border-radius: 50%;
            filter: blur(40px);
            opacity: 0.12;
          }
          .ambient-glow.blue { background: #3B82F6; }
          .ambient-glow.green { background: #10B981; }
          .ambient-glow.amber { background: #F59E0B; }

          /* Enhanced Controls Row */
          .controls-glass-row {
            display: flex;
            align-items: center;
            gap: 1rem;
            background: var(--bg-card);
            padding: 0.75rem 1.25rem;
            border-radius: 18px;
            border: 1px solid var(--border-subtle);
            margin-bottom: 2rem;
            flex-wrap: wrap;
          }

          .premium-search-container {
            flex: 1;
            min-width: 280px;
            display: flex;
            align-items: center;
            gap: 0.75rem;
            color: var(--text-secondary);
          }
          .premium-search-container input {
            background: transparent;
            border: none;
            width: 100%;
            outline: none;
            color: var(--text-main);
            font-size: 0.95rem;
            font-weight: 500;
          }

          .vertical-divider {
            width: 1px;
            height: 24px;
            background: var(--border-subtle);
          }

          .filter-select-premium {
            background: var(--bg-card);
            border: 1px solid var(--border-subtle);
            color: var(--text-main);
            font-weight: 600;
            outline: none;
            cursor: pointer;
            padding: 0.5rem 1rem;
            border-radius: 12px;
            color-scheme: dark;
          }
          .filter-select-premium option {
            background-color: var(--bg-card);
            color: var(--text-main);
          }

          /* Premium Table Styling */
          .table-premium-card {
            background: var(--bg-card);
            border-radius: 24px;
            border: 1px solid var(--border-subtle);
            overflow: hidden;
          }
          .premium-table {
            width: 100%;
            border-collapse: collapse;
          }
          .premium-table th {
            padding: 1.25rem 1.5rem;
            text-align: left;
            font-size: 0.75rem;
            font-weight: 700;
            color: var(--text-secondary);
            text-transform: uppercase;
            letter-spacing: 1px;
            border-bottom: 1px solid var(--border-subtle);
          }
          .premium-table td {
            padding: 1.25rem 1.5rem;
            border-bottom: 1px solid rgba(255, 255, 255, 0.03);
            color: var(--text-main);
          }

          .company-logo-mini {
            width: 40px;
            height: 40px;
            background: #1f2b49;
            border-radius: 10px;
            display: flex;
            align-items: center;
            justify-content: center;
            color: #F59E0B;
            border: 1px solid rgba(245, 158, 11, 0.2);
          }

          .badge-luminous {
            padding: 4px 12px;
            border-radius: 10px;
            font-size: 0.75rem;
            font-weight: 700;
            text-transform: uppercase;
          }
          .badge-luminous.scheduled { background: rgba(245, 158, 11, 0.1); color: #F59E0B; }
          .badge-luminous.completed { background: rgba(16, 185, 129, 0.1); color: #10B981; }
          .badge-luminous.cancelled { background: rgba(239, 68, 68, 0.1); color: #EF4444; }

          .action-btn-circular {
            width: 34px;
            height: 34px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            background: rgba(255, 255, 255, 0.03);
            border: 1px solid var(--border-subtle);
            color: var(--text-secondary);
            cursor: pointer;
            transition: all 0.2s;
          }
          .action-btn-circular:hover {
            border-color: var(--primary);
            color: var(--primary);
            background: rgba(var(--primary-rgb), 0.1);
          }
          .action-btn-circular.delete:hover {
            border-color: #EF4444;
            color: #EF4444;
            background: rgba(239, 68, 68, 0.1);
          }

          .btn-schedule-luminous {
            background: var(--primary);
            color: #000;
            padding: 0.6rem 1.25rem;
            border-radius: 12px;
            font-weight: 700;
            display: flex;
            align-items: center;
            gap: 0.5rem;
            cursor: pointer;
            border: none;
            transition: all 0.2s;
            box-shadow: 0 4px 15px rgba(var(--primary-rgb), 0.3);
          }
          .btn-schedule-luminous:hover {
            transform: translateY(-2px);
            box-shadow: 0 8px 25px rgba(var(--primary-rgb), 0.5);
          }

          @keyframes fadeIn {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
          }
        `}</style>
      );
    }


    return (
        <div className="interviews-luminous-container">
            {renderStyles()}

            {/* Header Area */}
            <div className="luminous-header">
                <div>
                    <h1 style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '0.25rem' }}>
                      Interview Management
                    </h1>
                    <p style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>
                      Optimize your placement process and student connections.
                    </p>
                </div>
                <button className="btn-schedule-luminous" onClick={openCreateModal}>
                    <Plus size={20} />
                    Schedule Interview
                </button>
            </div>

            {/* Stats Overview */}
            <div className="stats-grid-premium">
                <StatCard title="Upcoming" value={scheduledCount} icon={Clock} glowColor="blue" />
                <StatCard title="Completed" value={completedCount} icon={CheckCircle} glowColor="green" />
                <StatCard title="Cancelled" value={cancelledCount} icon={XCircle} glowColor="amber" />
                <StatCard title="Total Volume" value={interviews.length} icon={Building2} glowColor="blue" />
            </div>

            {/* Consolidated Controls Row */}
            <div className="controls-glass-row">
                <div className="premium-search-container">
                    <Search size={20} />
                    <input
                        type="text"
                        placeholder="Search company or role..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                <div className="vertical-divider" />

                <div className="flex items-center gap-2">
                    <Filter size={18} className="text-muted" />
                    <select
                        className="filter-select-premium"
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                    >
                        <option value="all">Global Status</option>
                        <option value="scheduled">Scheduled</option>
                        <option value="completed">Completed</option>
                        <option value="cancelled">Cancelled</option>
                    </select>
                </div>
            </div>

            {/* Interviews Table */}
            <div className="table-premium-card">
              <div className="table-wrapper">
                <table className="premium-table">
                  <thead>
                    <tr>
                      <th>Partner Company</th>
                      <th>Target Role</th>
                      <th>Scheduled Date</th>
                      <th>Location</th>
                      <th>Batch Range</th>
                      <th>Live Status</th>
                      <th style={{ textAlign: 'right' }}>Management</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr><td colSpan={7} className="text-center py-8 text-muted">Synchronizing data...</td></tr>
                    ) : filteredInterviews.length === 0 ? (
                      <tr><td colSpan={7} className="text-center py-8 text-muted">No interviews matching criteria.</td></tr>
                    ) : (
                      filteredInterviews.map(iv => (
                        <tr key={iv.id}>
                          <td>
                            <div className="flex items-center gap-3">
                              <div className="company-logo-mini">
                                <Building2 size={18} />
                              </div>
                              <span style={{ fontWeight: 700, fontSize: '1rem' }}>{iv.company}</span>
                            </div>
                          </td>
                          <td style={{ fontWeight: 600 }}>{iv.role}</td>
                          <td>
                            <div className="flex items-center gap-2">
                              <Calendar size={16} style={{ color: 'var(--primary)' }} />
                              {iv.scheduledDate instanceof Date
                                ? iv.scheduledDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
                                : new Date(iv.scheduledDate).toLocaleDateString('en-IN')}
                            </div>
                          </td>
                          <td style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                            {iv.location || 'Not Specified'}
                          </td>
                          <td>
                            <div className="flex flex-wrap gap-1">
                              {iv.eligibleBatches.map(b => (
                                <span key={b} className="badge badge-secondary text-xs">{b}</span>
                              ))}
                            </div>
                          </td>
                          <td>
                            <span className={`badge-luminous ${iv.status}`}>
                              {iv.status}
                            </span>
                          </td>
                          <td>
                            <div className="flex justify-end gap-2">
                              <button className="action-btn-circular" onClick={() => openEditModal(iv)} title="Edit Configuration">
                                <Edit2 size={16} />
                              </button>
                              <button className="action-btn-circular delete" onClick={() => handleDelete(iv.id)} title="Purge Data">
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
