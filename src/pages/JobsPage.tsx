import { useState, useEffect, useContext, useMemo } from 'react';
import { 
  Briefcase, MapPin, DollarSign, Search, Pencil, Trash2, 
  ArrowLeft, Users, Building2, Filter, Plus, Calendar, 
  ChevronRight, AlertTriangle
} from 'lucide-react';
import { jobService } from '../services/jobService';
import { ToastContext } from '../contexts/ToastContext';
import type { Job, JobApplication, JobType } from '../types';
import { UI_STRINGS } from '../constants';
import LoadingState from '../components/LoadingState';
import ErrorAlert from '../components/ErrorAlert';
import Modal from '../components/Modal';
import { FormField, FormRow, FormActions } from '../components/FormField';
import CustomSelect from '../components/CustomSelect';

type ViewMode = 'list' | 'detail';

const JOB_TYPE_OPTIONS: JobType[] = ['Full-time', 'Internship'];
function formatDate(date: unknown): string {
  if (!date) return '—';
  const hasSeconds = typeof date === 'object' && date !== null && 'seconds' in date;
  const ms = hasSeconds ? (date as { seconds: number }).seconds * 1000 : (date as string | number | Date);
  const dObj = new Date(ms);
  return !isNaN(dObj.getTime()) ? dObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';
}

export default function JobsPage() {
  const toastContext = useContext(ToastContext);
  const showToast = toastContext?.showToast;

  // State
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // View mode
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [applications, setApplications] = useState<JobApplication[]>([]);
  const [applicantsLoading, setApplicantsLoading] = useState(false);
  const [selectedJobStats, setSelectedJobStats] = useState<Job | null>(null);
  const [selectedJobApplicationsCount, setSelectedJobApplicationsCount] = useState<number>(0);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<JobType | 'all'>('all');

  // Modals
  const [showJobModal, setShowJobModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [editingJobId, setEditingJobId] = useState<string | null>(null);
  const [jobToDelete, setJobToDelete] = useState<string | null>(null);

  // Job form
  const [jobForm, setJobForm] = useState({
    companyName: '',
    role: '',
    location: '',
    salary: '',
    jobType: 'Full-time' as JobType,
    requirements: '',
    description: '',
    eligibleBatches: '',
    applyLink: '',
    deadline: '',
    isActive: true,
  });

  // Subscribe to jobs
  useEffect(() => {
    setLoading(true);
    const unsub = jobService.subscribeToJobs(
      (data) => {
        setJobs(data);
        setLoading(false);
      },
      (err) => {
        console.error('Jobs subscription error:', err);
        setError(UI_STRINGS.JOBS.ERROR_LOAD);
        setLoading(false);
      }
    );
    return unsub;
  }, []);

  // Subscribe to applications when viewing a job's details
  useEffect(() => {
    if (viewMode !== 'detail' || !selectedJob) return;
    setApplicantsLoading(true);
    const unsub = jobService.subscribeToApplications(
      selectedJob.id,
      (data) => {
        setApplications(data);
        setApplicantsLoading(false);
      },
      (err) => {
        console.error('Applications subscription error:', err);
        setApplicantsLoading(false);
      }
    );
    return unsub;
  }, [viewMode, selectedJob]);

  // Subscribe to applications for dashboard stats
  useEffect(() => {
    if (!selectedJobStats) {
      setSelectedJobApplicationsCount(0);
      return;
    }
    const unsub = jobService.subscribeToApplications(
      selectedJobStats.id,
      (data) => {
        setSelectedJobApplicationsCount(data.length);
      },
      (err) => {
        console.error('Stats applications subscription error:', err);
      }
    );
    return unsub;
  }, [selectedJobStats]);

  // Filtered jobs
  const filteredJobs = useMemo(() => {
    return jobs.filter((job) => {
      const matchesSearch =
        (job?.companyName?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
        (job?.role?.toLowerCase() || '').includes(searchQuery.toLowerCase());
      const matchesType = typeFilter === 'all' || job.jobType === typeFilter;
      return matchesSearch && matchesType;
    });
  }, [jobs, searchQuery, typeFilter]);

  // Stats
  const stats = useMemo(() => ({
    total: jobs.length,
    active: jobs.filter(j => j.isActive).length,
    totalApplicants: 0, // In dynamic apps, this would be a separate query or computed from meta
  }), [jobs]);

  // Handlers
  const handleAddJob = () => {
    setEditingJobId(null);
    setJobForm({
      companyName: '', role: '', location: '', salary: '',
      jobType: 'Full-time', requirements: '', description: '',
      eligibleBatches: '', applyLink: '', deadline: '', isActive: true,
    });
    setShowJobModal(true);
  };

  const handleEditJob = (job: Job) => {
    const getDeadlineValue = (d: unknown) => {
      if (!d) return '';
      const hasSeconds = typeof d === 'object' && d !== null && 'seconds' in d;
      const ms = hasSeconds ? (d as { seconds: number }).seconds * 1000 : (d as string | number | Date);
      const dateObj = new Date(ms);
      return !isNaN(dateObj.getTime()) ? dateObj.toISOString().split('T')[0] : '';
    };

    setEditingJobId(job.id);
    setJobForm({
      companyName: job.companyName,
      role: job.role,
      location: job.location,
      salary: job.salary,
      jobType: job.jobType,
      requirements: (job.requirements || []).join('\n'),
      description: job.description || '',
      eligibleBatches: (job.eligibleBatches || []).join(', '),
      applyLink: job.applyLink || '',
      deadline: getDeadlineValue(job.deadline),
      isActive: job.isActive,
    });
    setShowJobModal(true);
  };

  const handleSaveJob = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      const data: Partial<Job> = {
        companyName: jobForm.companyName.trim(),
        role: jobForm.role.trim(),
        location: jobForm.location.trim(),
        salary: jobForm.salary.trim(),
        jobType: jobForm.jobType,
        requirements: jobForm.requirements.split('\n').map(r => r.trim()).filter(Boolean),
        description: jobForm.description.trim(),
        eligibleBatches: jobForm.eligibleBatches
          ? jobForm.eligibleBatches.split(',').map(b => b.trim()).filter(Boolean)
          : [],
        isActive: jobForm.isActive,
        postedDate: new Date(),
      };

      if (jobForm.applyLink.trim()) data.applyLink = jobForm.applyLink.trim();
      if (jobForm.deadline) data.deadline = new Date(jobForm.deadline);

      if (editingJobId) {
        await jobService.updateJob(editingJobId, data);
      } else {
        await jobService.createJob(data as Omit<Job, 'id' | 'createdAt' | 'updatedAt'>);
      }

      showToast?.(UI_STRINGS.JOBS.SAVE_SUCCESS, 'success');
      setShowJobModal(false);
    } catch (err) {
      console.error('Error saving job:', err);
      showToast?.(UI_STRINGS.JOBS.ERROR_SAVE, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!jobToDelete) return;
    try {
      setSaving(true);
      await jobService.deleteJob(jobToDelete);
      showToast?.(UI_STRINGS.JOBS.DELETE_SUCCESS, 'success');
      setShowDeleteModal(false);
      setJobToDelete(null);
      if (selectedJob?.id === jobToDelete) {
        setViewMode('list');
        setSelectedJob(null);
      }
    } catch {
      showToast?.(UI_STRINGS.JOBS.ERROR_DELETE, 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <LoadingState message="Synchronizing Career Portal..." />;

  /**
   * DETAIL VIEW: Applicant Tracking & Job Insights
   */
  if (viewMode === 'detail' && selectedJob) {
    return (
      <div className="job-detail-redesign">
        {renderStyles()}
        {error && <ErrorAlert message={error} />}
        <header className="flex justify-between items-center mb-xl">
          <button 
            onClick={() => { setViewMode('list'); setSelectedJob(null); }}
            className="back-button-premium"
          >
            <ArrowLeft size={20} />
            <span>Back to Dashboard</span>
          </button>
          <div className="flex gap-md">
            <button onClick={() => handleEditJob(selectedJob)} className="btn-amber-outline">
              <Pencil size={16} /> Edit Details
            </button>
            <button 
                onClick={() => { setJobToDelete(selectedJob.id); setShowDeleteModal(true); }}
                className="btn-danger-outline"
            >
              <Trash2 size={16} />
            </button>
          </div>
        </header>

        {/* Hero Card */}
        <section className="glass-hero-card mb-xl">
          <div className="hero-content">
            <div className="company-logo-large">
              <Building2 size={32} />
            </div>
            <div className="hero-info">
              <h1>{selectedJob.role}</h1>
              <p className="company-name-highlight">{selectedJob.companyName}</p>
              <div className="meta-tags">
                <span className="meta-tag"><MapPin size={14} /> {selectedJob.location}</span>
                <span className="meta-tag"><DollarSign size={14} /> {selectedJob.salary}</span>
                <span className="meta-tag"><Calendar size={14} /> Deadline: {formatDate(selectedJob.deadline)}</span>
              </div>
            </div>
            <div className="hero-badges">
              <span className={`badge-premium ${selectedJob.jobType === 'Full-time' ? 'fulltime' : 'intern'}`}>
                {selectedJob.jobType}
              </span>
            </div>
          </div>
        </section>

        {/* Applicant Section */}
        <section className="applicants-section">
          <div className="section-header">
            <h2>Applicants <span className="count-pill">{applications.length}</span></h2>
          </div>

          {applicantsLoading ? (
            <LoadingState message="Fetching enrollment data..." />
          ) : applications.length === 0 ? (
            <div className="empty-state-premium">
              <Users size={48} className="text-muted" />
              <p>No applications received yet for this opening.</p>
            </div>
          ) : (
            <div className="premium-table-container">
              <table className="premium-table">
                <thead>
                  <tr>
                    <th>APPLICANT</th>
                    <th>BATCH</th>
                    <th>APPLIED ON</th>
                    <th>STATUS</th>
                  </tr>
                </thead>
                <tbody>
                  {applications.map(app => (
                    <tr key={app.id}>
                      <td>
                        <div className="applicant-cell">
                          <div className="avatar-mini">{app.userName?.charAt(0)}</div>
                          <div>
                            <p className="applicant-name">{app.userName}</p>
                            <p className="applicant-email">{app.userEmail}</p>
                          </div>
                        </div>
                      </td>
                      <td><span className="batch-tag">{app.userBatch}</span></td>
                      <td><span className="date-cell">{formatDate(app.appliedAt)}</span></td>
                      <td>
                        <span className="status-badge-applied">
                          <span className="dot"></span>
                          Applied
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
        {renderModals()}
      </div>
    );
  }

  /**
   * LIST VIEW: Main Dashboard
   */
  return (
    <div className="jobs-dashboard-redesign">
      {error && <ErrorAlert message={error} />}
      <header className="dashboard-header mb-xl">
        <div className="header-text">
          <h1>Job Management</h1>
          <p>Orchestrate placement opportunities and track student engagement.</p>
        </div>
        <button className="btn btn-primary" onClick={handleAddJob}>
          <Plus size={20} /> Create Opening
        </button>
      </header>

      {/* Stats Summary */}
      <section className="dashboard-stats-grid mb-xl">
        <div className="stat-card-luminous">
          <div className="stat-icon blue"><Briefcase size={24} /></div>
          <div className="stat-values">
            <p className="stat-label">Total Postings</p>
            <p className="stat-number">{stats.total}</p>
          </div>
          <div className="stat-glow blue" />
        </div>

        <div className="stat-card-luminous">
          <div className="stat-icon green"><Users size={24} /></div>
          <div className="stat-values">
            <p className="stat-label">Total Applied {selectedJobStats ? `(${selectedJobStats.companyName})` : ''}</p>
            <p className="stat-number">{selectedJobStats ? selectedJobApplicationsCount : '-'}</p>
          </div>
          <div className="stat-glow green" />
        </div>
      </section>

      {/* Filters & Search */}
      <section className="controls-row mb-lg">
        <div className="search-box-premium">
          <Search size={18} />
          <input 
            type="text" 
            placeholder="Search by role or company..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="filter-group">
          <span className="control-label"><Filter size={14} /> Filter:</span>
          <CustomSelect
            options={[
              { value: 'all', label: 'All Types' },
              { value: 'Full-time', label: 'Full-time' },
              { value: 'Internship', label: 'Internship' }
            ]}
            value={typeFilter}
            onChange={(val) => setTypeFilter(val as JobType | 'all')}
            className="text-sm"
            placeholder="All Types"
          />
        </div>
      </section>

      {/* Job Grid */}
      <section className="jobs-luminous-grid">
        {filteredJobs.length === 0 ? (
          <div className="empty-state-large">
            <Briefcase size={64} />
            <h3>No results found</h3>
            <p>Adjust your search or filters to find what you're looking for.</p>
          </div>
        ) : (
          filteredJobs.map(job => (
            <div 
              key={job.id} 
              className={`job-card-luminous ${selectedJobStats?.id === job.id ? 'selected' : ''}`}
              onClick={() => setSelectedJobStats(job)}
              style={{ cursor: 'pointer' }}
            >
              <div className="job-card-header">
                <div className="company-logo-box">
                  <Building2 size={20} />
                </div>
                <div className="header-info">
                  <h3>{job.role}</h3>
                  <p>{job.companyName}</p>
                </div>
                <div className={`status-dot ${job.isActive ? 'on' : 'off'}`} title={job.isActive ? 'Post is Active' : 'Post is Hidden'} />
              </div>

              <div className="job-card-body">
                <div className="body-item">
                  <MapPin size={14} />
                  <span>{job.location}</span>
                </div>
                <div className="body-item">
                  <DollarSign size={14} />
                  <span>{job.salary}</span>
                </div>
                <div className="body-item">
                  <Calendar size={14} />
                  <span>Due {formatDate(job.deadline)}</span>
                </div>
              </div>

              <div className="job-card-footer">
                <span className={`tag-mini ${job.jobType === 'Full-time' ? 'full' : 'intern'}`}>
                  {job.jobType}
                </span>
                <div className="footer-actions">
                  <button className="btn-icon-circular delete" onClick={(e) => { e.stopPropagation(); setJobToDelete(job.id); setShowDeleteModal(true); }} title="Delete">
                    <Trash2 size={16} />
                  </button>
                  <button className="btn-icon-circular" onClick={(e) => { e.stopPropagation(); handleEditJob(job); }} title="Edit">
                    <Pencil size={16} />
                  </button>
                  <button className="btn-view-apps" onClick={(e) => { e.stopPropagation(); setSelectedJob(job); setViewMode('detail'); }}>
                    Applicants <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </section>

      {renderModals()}
      {renderStyles()}
    </div>
  );

  function renderStyles() {
    return (
      <style>{`
        /* Luminous Scholar Redesign Styles */
        .jobs-dashboard-redesign, .job-detail-redesign {
          max-width: 1200px;
          margin: 0 auto;
          color: var(--text-main);
        }

        .dashboard-header h1, .job-detail-redesign h1 {
          font-size: 2.5rem;
          font-weight: 800;
          margin: 0;
          color: var(--text-main);
        }

        .dashboard-header p {
          color: var(--text-secondary);
          margin-top: 0.5rem;
        }

        .btn-cancel {
          background: rgba(163, 170, 196, 0.1);
          color: var(--text-secondary);
          border: 1px solid rgba(163, 170, 196, 0.2);
          padding: 0.75rem 1.5rem;
          border-radius: 12px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }
        .btn-cancel:hover { background: rgba(163, 170, 196, 0.2); color: var(--text-main); }

        .btn-danger {
          background: #EF4444;
          color: #fff;
          border: none;
          padding: 0.75rem 1.5rem;
          border-radius: 12px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s;
          box-shadow: 0 0 15px rgba(239, 68, 68, 0.2);
        }
        .btn-danger:hover { transform: translateY(-2px); box-shadow: 0 0 25px rgba(239, 68, 68, 0.4); }
        .btn-danger:disabled { opacity: 0.5; cursor: not-allowed; }

        /* Stats Cards */
        .dashboard-stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: 1.5rem;
        }
        .stat-card-luminous {
          background: var(--bg-card);
          border: 1px solid var(--border-subtle);
          border-radius: 24px;
          padding: 1.5rem;
          display: flex;
          align-items: center;
          gap: 1.5rem;
          position: relative;
          overflow: hidden;
        }
        .stat-icon {
          width: 56px;
          height: 56px;
          border-radius: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
          z-index: 2;
        }
        .stat-icon.blue { background: rgba(59, 130, 246, 0.1); color: #3B82F6; }
        .stat-icon.amber { background: rgba(245, 158, 11, 0.1); color: #F59E0B; }
        .stat-icon.green { background: rgba(16, 185, 129, 0.1); color: #10B981; }
        
        .stat-values { z-index: 2; position: relative; }
        .stat-label { 
          font-size: 0.85rem; 
          color: var(--text-secondary); 
          margin-bottom: 0.25rem; 
          font-weight: 600;
        }
        .stat-number { 
          font-size: 1.75rem; 
          font-weight: 800; 
          color: var(--text-main); 
        }

        .stat-glow {
          position: absolute;
          top: -20px;
          right: -20px;
          width: 100px;
          height: 100px;
          border-radius: 50%;
          filter: blur(40px);
          opacity: 0.15;
          pointer-events: none;
        }
        .stat-glow.blue { background: #3B82F6; }
        .stat-glow.amber { background: #F59E0B; }
        .stat-glow.green { background: #10B981; }

        /* Controls */
        .controls-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 1rem;
        }
        .search-box-premium {
          background: var(--bg-card);
          border: 1px solid var(--border-subtle);
          border-radius: 14px;
          padding: 0 1rem;
          display: flex;
          align-items: center;
          gap: 0.75rem;
          flex: 1;
          color: var(--text-secondary);
          transition: all 0.2s;
        }
        .search-box-premium:focus-within {
          border-color: var(--primary);
          box-shadow: 0 0 0 3px rgba(var(--primary-rgb), 0.1);
        }
        .search-box-premium input {
          background: transparent;
          border: none;
          padding: 0.9rem 0;
          color: var(--text-main);
          width: 100%;
          outline: none;
          font-weight: 500;
        }

        .filter-group {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          background: var(--bg-card);
          padding: 0 1rem;
          border-radius: 14px;
          border: 1px solid var(--border-subtle);
          min-height: 48px;
        }
        .control-label {
          color: var(--text-secondary);
          font-weight: 600;
          font-size: 0.9rem;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }
        .control-select {
          background: transparent;
          border: none;
          color: var(--text-main);
          font-weight: 700;
          outline: none;
          cursor: pointer;
          padding: 0.5rem 0;
          font-size: 0.9rem;
        }
        .control-select option {
          background-color: var(--bg-card);
          color: var(--text-main);
        }

        /* Job Grid */
        .jobs-luminous-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
          gap: 1.5rem;
        }
        .job-card-luminous {
          background: var(--bg-card);
          border-radius: 24px;
          padding: 1.5rem;
          border: 1px solid var(--border-subtle);
          transition: all 0.3s ease;
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
        }
        .job-card-luminous.selected {
          border-color: rgba(16, 185, 129, 0.5);
          box-shadow: 0 0 20px rgba(16, 185, 129, 0.1);
          transform: translateY(-4px);
        }
        .job-card-luminous:hover {
          border-color: rgba(245, 158, 11, 0.3);
          transform: translateY(-4px);
        }

        .job-card-header {
          display: flex;
          align-items: center;
          gap: 1rem;
          position: relative;
        }
        .company-logo-box {
          width: 44px;
          height: 44px;
          background: #1f2b49;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #F59E0B;
        }
        .header-info h3 { font-size: 1.1rem; margin: 0; color: var(--text-main); }
        .header-info p { font-size: 0.85rem; color: var(--text-secondary); margin: 4px 0 0; }
        .status-dot {
          position: absolute;
          top: 0;
          right: 0;
          width: 10px;
          height: 10px;
          border-radius: 50%;
        }
        .status-dot.on { background: #10B981; box-shadow: 0 0 10px #10B981; }
        .status-dot.off { background: #EF4444; }

        .job-card-body {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }
        .body-item {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.9rem;
          color: var(--text-secondary);
        }

        .job-card-footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding-top: 1rem;
          border-top: 1px solid rgba(163, 170, 196, 0.05);
        }
        .tag-mini {
          font-size: 0.7rem;
          font-weight: 700;
          padding: 4px 10px;
          border-radius: 20px;
          text-transform: uppercase;
        }
        .tag-mini.full { background: rgba(16, 185, 129, 0.1); color: #10B981; }
        .tag-mini.intern { background: rgba(59, 130, 246, 0.1); color: #3B82F6; }

        .footer-actions { display: flex; gap: 0.5rem; }
        .btn-icon-circular {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          border: 1px solid rgba(163, 170, 196, 0.1);
          background: transparent;
          color: var(--text-secondary);
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.2s;
        }
        .btn-icon-circular:hover { border-color: #F59E0B; color: #F59E0B; }
        .btn-icon-circular.delete:hover { border-color: #EF4444; color: #EF4444; }

        .icon-warning-glow {
          width: 80px;
          height: 80px;
          background: rgba(239, 68, 68, 0.1);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto;
          box-shadow: 0 0 30px rgba(239, 68, 68, 0.1);
        }

        .btn-view-apps {
          background: rgba(245, 158, 11, 0.1);
          color: #F59E0B;
          border: none;
          padding: 4px 12px;
          border-radius: 8px;
          font-size: 0.85rem;
          font-weight: 600;
          display: flex;
          align-items: center;
          gap: 0.25rem;
          cursor: pointer;
          transition: all 0.2s;
        }
        .btn-view-apps:hover { background: #F59E0B; color: #000; }

        /* Detail View Styles */
        .back-button-premium {
          background: transparent;
          border: none;
          color: var(--text-secondary);
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-weight: 600;
          cursor: pointer;
          transition: color 0.2s;
        }
        .back-button-premium:hover { color: var(--text-main); }

        .glass-hero-card {
          background: linear-gradient(135deg, rgba(31, 43, 73, 0.4) 0%, rgba(15, 25, 48, 0.4) 100%);
          backdrop-filter: blur(24px);
          border-radius: 32px;
          padding: 2.5rem;
          border: 1px solid rgba(163, 170, 196, 0.1);
        }
        .hero-content {
          display: flex;
          align-items: flex-start;
          gap: 2rem;
        }
        .company-logo-large {
          width: 80px;
          height: 80px;
          background: #F59E0B;
          border-radius: 20px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #000;
        }
        .hero-info { flex: 1; }
        .company-name-highlight { color: #F59E0B; font-weight: 700; font-size: 1.25rem; margin-top: 0.25rem; }
        .meta-tags { display: flex; gap: 1.5rem; margin-top: 1.5rem; }
        .meta-tag { display: flex; align-items: center; gap: 0.5rem; font-size: 0.95rem; color: var(--text-secondary); }

        .badge-premium { padding: 4px 16px; border-radius: 12px; font-weight: 700; font-size: 0.8rem; }
        .badge-premium.fulltime { background: #D1FAE5; color: #065F46; }
        .badge-premium.intern { background: #EEF2FF; color: #3730A3; }

        .badge-status.active { color: #10B981; }
        .badge-status.inactive { color: #EF4444; }

        .premium-table-container {
          background: var(--bg-card);
          border-radius: 24px;
          overflow: hidden;
          border: 1px solid var(--border-subtle);
        }
        .premium-table { width: 100%; border-collapse: collapse; text-align: left; }
        .premium-table th { padding: 1.25rem; font-size: 0.8rem; font-weight: 700; color: var(--text-secondary); border-bottom: 1px solid var(--border-subtle); }
        .premium-table td { padding: 1.25rem; border-bottom: 1px solid rgba(163, 170, 196, 0.05); }

        .applicant-cell { display: flex; align-items: center; gap: 1rem; }
        .avatar-mini { width: 32px; height: 32px; border-radius: 10px; background: var(--bg-card-accent); display: flex; align-items: center; justify-content: center; font-weight: 700; color: #F59E0B; }
        .applicant-name { font-weight: 600; color: var(--text-main); margin: 0; }
        .applicant-email { font-size: 0.8rem; color: var(--text-secondary); margin: 0; }
        .batch-tag { background: rgba(59, 130, 246, 0.1); color: #3B82F6; padding: 4px 10px; border-radius: 8px; font-size: 0.85rem; font-weight: 600; }

        .premium-select {
          background: var(--bg-card-accent);
          border: 1px solid var(--border-subtle);
          color: var(--text-main);
          padding: 6px 12px;
          border-radius: 8px;
          outline: none;
          cursor: pointer;
        }

        .status-badge-applied {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: rgba(59, 130, 246, 0.1);
          color: #3B82F6;
          padding: 6px 12px;
          border-radius: 12px;
          font-weight: 700;
          font-size: 0.85rem;
        }
        .status-badge-applied .dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #3B82F6;
          box-shadow: 0 0 8px rgba(59, 130, 246, 0.8);
        }

        .btn-amber-outline {
          background: transparent;
          color: #F59E0B;
          border: 1px solid #F59E0B;
          padding: 0.5rem 1rem;
          border-radius: 8px;
          font-weight: 600;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          cursor: pointer;
          transition: all 0.2s;
        }
        .btn-amber-outline:hover { background: rgba(245, 158, 11, 0.1); }

        .btn-danger-outline {
          background: transparent;
          color: #EF4444;
          border: 1px solid #EF4444;
          padding: 0.5rem 1rem;
          border-radius: 8px;
          font-weight: 600;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          cursor: pointer;
          transition: all 0.2s;
        }
        .btn-danger-outline:hover { background: rgba(239, 68, 68, 0.1); }
      `}</style>
    );
  }

  function renderModals() {
    return (
      <>
        <Modal
          isOpen={showJobModal}
          onClose={() => setShowJobModal(false)}
          title={editingJobId ? 'Refine Posting' : 'New Career Posting'}
        >
          <form onSubmit={handleSaveJob} className="premium-form">
            <FormRow>
              <FormField label="Company Name">
                <input type="text" required placeholder="e.g. Google, Innov8 Labs" value={jobForm.companyName} onChange={e => setJobForm({ ...jobForm, companyName: e.target.value })} />
              </FormField>
              <FormField label="Target Role">
                <input type="text" required placeholder="e.g. Frontend Engineer" value={jobForm.role} onChange={e => setJobForm({ ...jobForm, role: e.target.value })} />
              </FormField>
            </FormRow>
            <FormRow>
              <FormField label="Location">
                <input type="text" required placeholder="e.g. Pune, Remote" value={jobForm.location} onChange={e => setJobForm({ ...jobForm, location: e.target.value })} />
              </FormField>
              <FormField label="Annual Compensation">
                <input type="text" required placeholder="e.g. 12 - 15 LPA" value={jobForm.salary} onChange={e => setJobForm({ ...jobForm, salary: e.target.value })} />
              </FormField>
            </FormRow>
            <FormRow>
              <FormField label="Opportunity Type">
                <select value={jobForm.jobType} onChange={e => setJobForm({ ...jobForm, jobType: e.target.value as JobType })}>
                  {JOB_TYPE_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </FormField>
              <FormField label="Application Deadline">
                <input type="date" value={jobForm.deadline} onChange={e => setJobForm({ ...jobForm, deadline: e.target.value })} />
              </FormField>
            </FormRow>
            <FormField label="Key Requirements (One per line)">
              <textarea rows={3} required placeholder="React, Node.js, 8+ CGPA..." value={jobForm.requirements} onChange={e => setJobForm({ ...jobForm, requirements: e.target.value })} />
            </FormField>
            <FormField label="Full Description">
              <textarea rows={2} placeholder="Detailed role responsibilities..." value={jobForm.description} onChange={e => setJobForm({ ...jobForm, description: e.target.value })} />
            </FormField>
            <FormRow>
              <FormField label="Eligible Batches (Comma separated)">
                <input type="text" placeholder="2024, 2025" value={jobForm.eligibleBatches} onChange={e => setJobForm({ ...jobForm, eligibleBatches: e.target.value })} />
              </FormField>
              <FormField label="External Link (Optional)">
                <input type="url" placeholder="https://careers.google.com/..." value={jobForm.applyLink} onChange={e => setJobForm({ ...jobForm, applyLink: e.target.value })} />
              </FormField>
            </FormRow>
            <FormActions>
              <button type="button" className="btn-cancel" onClick={() => setShowJobModal(false)}>Discard</button>
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? 'Synchronizing...' : (editingJobId ? 'Update Posting' : 'Publish Opportunity')}
              </button>
            </FormActions>
          </form>
        </Modal>

        <Modal
          isOpen={showDeleteModal}
          onClose={() => setShowDeleteModal(false)}
          title="Security Check: Permanent Removal"
        >
          <div className="py-lg text-center">
            <div className="icon-warning-glow mb-lg">
              <AlertTriangle size={48} color="#EF4444" />
            </div>
            <h3 style={{ fontSize: '1.25rem', marginBottom: '0.75rem' }}>Are you absolutely sure?</h3>
            <p className="mb-xl text-muted" style={{ lineHeight: 1.6 }}>
              This operation will <strong>permanently purge</strong> the job posting and all historical applicant data. This action cannot be undone.
            </p>
            <div className="flex justify-center gap-md">
              <button className="btn-cancel" disabled={saving} onClick={() => setShowDeleteModal(false)}>
                Stay Safe: Keep Posting
              </button>
              <button
                className="btn-danger"
                disabled={saving}
                onClick={handleConfirmDelete}
              >
                {saving ? 'Purging Data...' : 'Confirm Destruction'}
              </button>
            </div>
          </div>
        </Modal>
      </>
    );
  }
}
