import { useState, useEffect, useContext, useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';
import { 
    Building2, Pencil, Trash2, Users, Search, MapPin, 
    Briefcase, Calendar, DollarSign, TrendingUp, 
    Plus, ExternalLink, ChevronRight, Upload
} from 'lucide-react';
import { jobService } from '../services/jobService';
import { ToastContext } from '../contexts/ToastContext';
import type { Job, JobApplication } from '../types';
import { UI_STRINGS } from '../constants';
import LoadingState from '../components/LoadingState';
import ErrorAlert from '../components/ErrorAlert';
import Modal from '../components/Modal';
import { FormField, FormRow, FormActions, Badge } from '../components/FormField';

export default function JobsPage() {
    const toastContext = useContext(ToastContext);
    const showToast = toastContext?.showToast;

    const [jobs, setJobs] = useState<Job[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [showJobModal, setShowJobModal] = useState(false);
    const [showApplicantsModal, setShowApplicantsModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [editingJobId, setEditingJobId] = useState<string | null>(null);
    const [jobToDelete, setJobToDelete] = useState<string | null>(null);
    const [selectedJob, setSelectedJob] = useState<Job | null>(null);
    const [applicants, setApplicants] = useState<JobApplication[]>([]);

    // Filter states
    const [searchQuery, setSearchQuery] = useState('');
    const [typeFilter, setTypeFilter] = useState<'All' | 'Full-time' | 'Internship'>('All');

    const [jobForm, setJobForm] = useState({
        companyName: '',
        companyLogo: '',
        role: '',
        location: '',
        salary: '',
        jobType: 'Full-time' as 'Full-time' | 'Internship',
        eligibleBatches: '',
        requirements: '',
        description: '',
        link: ''
    });
    const [logoFile, setLogoFile] = useState<File | null>(null);
    const [logoPreview, setLogoPreview] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const unsub = jobService.subscribeToJobs((data) => {
            setJobs(data);
            setLoading(false);
        }, (err) => {
            console.error("Jobs subscription error:", err);
            setError("Failed to load jobs.");
            setLoading(false);
        });
        return () => unsub();
    }, []);

    useEffect(() => {
        let unsubApplicants: (() => void) | undefined;
        if (selectedJob && showApplicantsModal) {
            unsubApplicants = jobService.subscribeToApplicants(selectedJob.id, (data) => {
                setApplicants(data);
            });
        }
        return () => unsubApplicants?.();
    }, [selectedJob, showApplicantsModal]);

    const filteredJobs = useMemo(() => {
        return jobs.filter(job => {
            const matchesSearch = job.companyName.toLowerCase().includes(searchQuery.toLowerCase()) || 
                                 job.role.toLowerCase().includes(searchQuery.toLowerCase());
            const matchesType = typeFilter === 'All' || job.jobType === typeFilter;
            return matchesSearch && matchesType;
        });
    }, [jobs, searchQuery, typeFilter]);

    const stats = useMemo(() => {
        return {
            total: jobs.length,
            fullTime: jobs.filter(j => j.jobType === 'Full-time').length,
            internship: jobs.filter(j => j.jobType === 'Internship').length,
        };
    }, [jobs]);

    const handleAddJob = () => {
        setEditingJobId(null);
        setJobForm({
            companyName: '',
            companyLogo: '',
            role: '',
            location: '',
            salary: '',
            jobType: 'Full-time',
            eligibleBatches: '',
            requirements: '',
            description: '',
            link: ''
        });
        setLogoFile(null);
        setLogoPreview(null);
        setShowJobModal(true);
    };

    const handleEditJob = (job: Job) => {
        setEditingJobId(job.id);
        setJobForm({
            companyName: job.companyName,
            companyLogo: job.companyLogo || '',
            role: job.role,
            location: job.location,
            salary: job.salary,
            jobType: job.jobType,
            eligibleBatches: job.eligibleBatches.join(', '),
            requirements: job.requirements.join('\n'),
            description: job.description || '',
            link: job.link || ''
        });
        setLogoFile(null);
        setLogoPreview(job.companyLogo || null);
        setShowJobModal(true);
    };

    const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setLogoFile(file);
            const reader = new FileReader();
            reader.onloadend = () => {
                setLogoPreview(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSaveJob = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            let logoUrl = jobForm.companyLogo;
            if (logoFile) {
                logoUrl = await jobService.uploadJobLogo(logoFile);
            }

            const data: Partial<Job> = {
                companyName: jobForm.companyName,
                companyLogo: logoUrl,
                role: jobForm.role,
                location: jobForm.location,
                salary: jobForm.salary,
                jobType: jobForm.jobType,
                eligibleBatches: jobForm.eligibleBatches.split(',').map(s => s.trim()).filter(Boolean),
                requirements: jobForm.requirements.split('\n').map(s => s.trim()).filter(Boolean),
                description: jobForm.description,
                link: jobForm.link
            };

            if (editingJobId) {
                await jobService.updateJob(editingJobId, data);
                showToast?.("Job updated successfully!", "success");
            } else {
                await jobService.createJob(data);
                showToast?.("Job posted successfully!", "success");
            }
            setShowJobModal(false);
        } catch (err) {
            console.error(err);
            showToast?.("Failed to save job.", "error");
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteJob = (id: string) => {
        setJobToDelete(id);
        setShowDeleteModal(true);
    };

    const handleConfirmDelete = async () => {
        if (!jobToDelete) return;
        setSaving(true);
        try {
            await jobService.deleteJob(jobToDelete);
            showToast?.("Job deleted successfully!", "success");
            setShowDeleteModal(false);
        } catch {
            showToast?.("Failed to delete job.", "error");
        } finally {
            setSaving(false);
        }
    };


    if (loading) return <LoadingState message={UI_STRINGS.JOBS.LOADING} />;

    return (
        <div className="pb-xl max-w-[1400px] mx-auto animate-fade-in px-4">
            {error && <ErrorAlert message={error} />}

            <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-xl gap-6">
                <div>
                    <h1 className="text-3xl font-bold mb-2 flex items-center gap-3">
                        <Briefcase className="text-primary" size={32} />
                        {UI_STRINGS.JOBS.TITLE}
                    </h1>
                    <p className="text-muted text-lg">{UI_STRINGS.JOBS.SUBTITLE}</p>
                </div>
                <button 
                    onClick={handleAddJob}
                    className="btn btn-primary px-8 py-3 rounded-xl shadow-lg ring-1 ring-white/10"
                >
                    <Plus size={20} />
                    {UI_STRINGS.JOBS.NEW_BTN}
                </button>
            </div>

            {/* Stats Dashboard */}
            <div className="grid grid-cards-sm mb-xl">
                <div className="job-card !p-6 animate-fade-slide-up delay-100">
                    <div className="flex justify-between items-center mb-2">
                        <TrendingUp size={20} className="text-primary" />
                        <span className="text-xs font-bold text-primary/80 uppercase tracking-wider">Growth</span>
                    </div>
                    <p className="text-sm text-muted mb-1">Total Openings</p>
                    <h3 className="text-3xl font-bold">{stats.total}</h3>
                </div>
                <div className="job-card !p-6 animate-fade-slide-up delay-200" style={{'--gradient-card': 'var(--gradient-stats-blue)'} as React.CSSProperties}>
                    <div className="flex justify-between items-center mb-2">
                        <Briefcase size={20} className="text-accent-blue" />
                        <span className="text-xs font-bold text-accent-blue/80 uppercase tracking-wider">Active</span>
                    </div>
                    <p className="text-sm text-muted mb-1">Full-time Roles</p>
                    <h3 className="text-3xl font-bold">{stats.fullTime}</h3>
                </div>
                <div className="job-card !p-6 animate-fade-slide-up delay-300" style={{'--gradient-card': 'var(--gradient-stats-teal)'} as React.CSSProperties}>
                    <div className="flex justify-between items-center mb-2">
                        <Calendar size={20} className="text-teal-accent" />
                        <span className="text-xs font-bold text-teal-accent/80 uppercase tracking-wider">Opportunity</span>
                    </div>
                    <p className="text-sm text-muted mb-1">Internship Programs</p>
                    <h3 className="text-3xl font-bold">{stats.internship}</h3>
                </div>
            </div>

            {/* Search and Filters */}
            <div className="search-container animate-fade-slide-up delay-400">
                <div className="search-input-wrapper">
                    <Search className="search-icon" size={20} />
                    <input 
                        type="text" 
                        placeholder="Search by company or role..." 
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
                <div className="flex gap-2">
                    <select 
                        className="btn btn-secondary !py-0 px-4 min-w-[160px] rounded-lg"
                        value={typeFilter}
                        onChange={(e) => setTypeFilter(e.target.value as 'All' | 'Full-time' | 'Internship')}
                    >
                        <option value="All">All Types</option>
                        <option value="Full-time">Full-time</option>
                        <option value="Internship">Internship</option>
                    </select>
                </div>
            </div>

            {/* Job Grid */}
            {filteredJobs.length === 0 ? (
                <div className="job-card !p-20 text-center animate-fade-in shadow-xl">
                    <Building2 size={64} className="mx-auto text-muted mb-4 opacity-20" />
                    <h3 className="text-xl font-semibold mb-2">{UI_STRINGS.JOBS.EMPTY}</h3>
                    <p className="text-muted">Try adjusting your search or filters to find what you're looking for.</p>
                </div>
            ) : (
                <div className="grid grid-cards-wide">
                    {filteredJobs.map((job, index) => (
                        <div 
                            key={job.id} 
                            className="job-card animate-fade-slide-up"
                            style={{ animationDelay: `${(index % 6) * 100}ms` }}
                        >
                            <div className="job-card-header">
                                <div className="flex gap-4">
                                    <div className="job-company-logo overflow-hidden border-2 border-white/10">
                                        {job.companyLogo ? (
                                            <img src={job.companyLogo} alt={job.companyName} className="w-full h-full object-cover" />
                                        ) : (
                                            <Building2 size={24} />
                                        )}
                                    </div>
                                    <div>
                                        <h3 className="job-card-title">{job.role}</h3>
                                        <p className="job-card-company">{job.companyName}</p>
                                    </div>
                                </div>
                                <div className="flex gap-1">
                                    <button onClick={() => handleEditJob(job)} className="icon-btn !w-8 !h-8" title="Edit"><Pencil size={14} /></button>
                                    <button onClick={() => handleDeleteJob(job.id)} className="icon-btn !w-8 !h-8 text-error" title="Delete"><Trash2 size={14} /></button>
                                </div>
                            </div>

                            <div className="job-card-details">
                                <div className="job-detail-tag">
                                    <MapPin size={14} className="text-primary" />
                                    {job.location}
                                </div>
                                <div className="job-detail-tag">
                                    <DollarSign size={14} className="text-success" />
                                    {job.salary}
                                </div>
                                <Badge color={job.jobType === 'Full-time' ? 'success' : 'accent-blue'}>
                                    {job.jobType}
                                </Badge>
                            </div>

                            <div className="mt-4">
                                <p className="text-xs font-bold text-muted uppercase tracking-wider mb-2">Key Requirements</p>
                                <div className="flex flex-wrap gap-2">
                                    {job.requirements.slice(0, 3).map((req, i) => (
                                        <span key={i} className="text-[11px] bg-white/5 px-2 py-1 rounded border border-white/10 text-secondary">
                                            {req}
                                        </span>
                                    ))}
                                    {job.requirements.length > 3 && (
                                        <span className="text-[11px] text-muted flex items-center">+{job.requirements.length - 3} more</span>
                                    )}
                                </div>
                            </div>

                            <div className="job-card-footer">
                                <div className="flex items-center gap-2 text-xs text-muted">
                                    <Calendar size={12} />
                                    {job.postedAt?.toDate ? job.postedAt.toDate().toLocaleDateString() : 'N/A'}
                                </div>
                                <button 
                                    onClick={() => { setSelectedJob(job); setShowApplicantsModal(true); }}
                                    className="btn btn-secondary !py-2 !px-4 !text-xs group hover:!border-primary/50 transition-all font-bold"
                                >
                                    Applicants
                                    <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Post/Edit Job Modal */}
            <Modal
                isOpen={showJobModal}
                onClose={() => setShowJobModal(false)}
                title={editingJobId ? UI_STRINGS.JOBS.EDIT_MODAL_TITLE : UI_STRINGS.JOBS.MODAL_TITLE}
            >
                <form onSubmit={handleSaveJob} className="form-layout">
                    <FormRow>
                        <FormField label={UI_STRINGS.JOBS.FORM_COMPANY}>
                            <input type="text" required value={jobForm.companyName} onChange={e => setJobForm({...jobForm, companyName: e.target.value})} placeholder="e.g. Google" />
                        </FormField>
                        <FormField label={UI_STRINGS.JOBS.FORM_ROLE}>
                            <input type="text" required value={jobForm.role} onChange={e => setJobForm({...jobForm, role: e.target.value})} placeholder="e.g. Software Engineer" />
                        </FormField>
                    </FormRow>
                    <FormRow>
                        <FormField label={UI_STRINGS.JOBS.FORM_LOCATION}>
                            <input type="text" required value={jobForm.location} onChange={e => setJobForm({...jobForm, location: e.target.value})} placeholder="e.g. Bangalore, Remote" />
                        </FormField>
                        <FormField label={UI_STRINGS.JOBS.FORM_SALARY}>
                            <input type="text" required value={jobForm.salary} onChange={e => setJobForm({...jobForm, salary: e.target.value})} placeholder="e.g. 12-15 LPA" />
                        </FormField>
                    </FormRow>
                    <FormRow>
                        <FormField label={UI_STRINGS.JOBS.FORM_TYPE}>
                            <select value={jobForm.jobType} onChange={e => setJobForm({...jobForm, jobType: e.target.value as 'Full-time' | 'Internship'})}>
                                <option value="Full-time">Full-time</option>
                                <option value="Internship">Internship</option>
                            </select>
                        </FormField>
                        <FormField label={UI_STRINGS.JOBS.FORM_BATCHES}>
                            <input type="text" required value={jobForm.eligibleBatches} onChange={e => setJobForm({...jobForm, eligibleBatches: e.target.value})} placeholder="e.g. 2024, 2025" />
                        </FormField>
                    </FormRow>
                    <FormField label={UI_STRINGS.JOBS.FORM_REQUIREMENTS}>
                        <textarea rows={3} value={jobForm.requirements} onChange={e => setJobForm({...jobForm, requirements: e.target.value})} placeholder="React.js&#10;Node.js&#10;3+ years experience" />
                    </FormField>
                    <FormField label={UI_STRINGS.JOBS.FORM_DESCRIPTION}>
                        <textarea rows={3} value={jobForm.description} onChange={e => setJobForm({...jobForm, description: e.target.value})} placeholder="Briefly describe the role..." />
                    </FormField>
                    <FormField label="Company Logo">
                        <div className="flex items-center gap-4 p-4 bg-white/5 rounded-xl border border-white/10">
                            <div className="w-16 h-16 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center overflow-hidden">
                                {logoPreview ? (
                                    <img src={logoPreview} alt="Preview" className="w-full h-full object-cover" />
                                ) : (
                                    <Building2 size={24} className="text-muted" />
                                )}
                            </div>
                            <div className="flex flex-col gap-2">
                                <button 
                                    type="button" 
                                    className="btn btn-secondary !py-2 !px-4 text-xs flex items-center gap-2"
                                    onClick={() => fileInputRef.current?.click()}
                                >
                                    <Upload size={14} />
                                    {logoPreview ? 'Change Logo' : 'Upload Logo'}
                                </button>
                                <input 
                                    type="file" 
                                    ref={fileInputRef} 
                                    className="hidden" 
                                    accept="image/*" 
                                    onChange={handleLogoChange} 
                                />
                                {logoPreview && (
                                    <button 
                                        type="button" 
                                        className="text-[10px] text-error hover:underline text-left px-1"
                                        onClick={() => { setLogoFile(null); setLogoPreview(null); setJobForm({...jobForm, companyLogo: ''}); }}
                                    >
                                        Remove Logo
                                    </button>
                                )}
                            </div>
                        </div>
                    </FormField>
                    <FormField label="Application Link (Optional)">
                        <input type="url" value={jobForm.link} onChange={e => setJobForm({...jobForm, link: e.target.value})} placeholder="https://careers.company.com/job" />
                    </FormField>
                    <FormActions>
                        <button type="button" className="btn btn-secondary" onClick={() => setShowJobModal(false)}>{UI_STRINGS.COMMON.CANCEL}</button>
                        <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? UI_STRINGS.COMMON.LOADING : UI_STRINGS.COMMON.SAVE}</button>
                    </FormActions>
                </form>
            </Modal>

            {/* Applicants Modal */}
            <Modal
                isOpen={showApplicantsModal}
                onClose={() => setShowApplicantsModal(false)}
                title={selectedJob ? `${UI_STRINGS.JOBS.APPLICANTS_TITLE}: ${selectedJob.companyName}` : UI_STRINGS.JOBS.APPLICANTS_TITLE}
                maxWidth="960px"
            >
                <div className="flex items-center gap-4 mb-6 p-4 bg-white/5 rounded-xl border border-white/10 animate-fade-in">
                    <div className="w-12 h-12 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center overflow-hidden">
                        {selectedJob?.companyLogo ? (
                            <img src={selectedJob.companyLogo} alt={selectedJob.companyName} className="w-full h-full object-cover" />
                        ) : (
                            <Building2 size={24} className="text-primary" />
                        )}
                    </div>
                    <div>
                        <h3 className="text-xl font-bold">{selectedJob?.role}</h3>
                        <p className="text-sm text-muted">{selectedJob?.companyName} • {selectedJob?.location}</p>
                    </div>
                </div>
                <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
                    {applicants.length === 0 ? (
                        <div className="py-20 text-center glass-card border-dashed border-white/10 rounded-2xl">
                            <Users size={48} className="mx-auto mb-4 opacity-10" />
                            <p className="text-muted text-lg">No applicants found yet.</p>
                        </div>
                    ) : (
                        <div className="grid gap-3">
                            {applicants.map((app, appIndex) => (
                                <div 
                                    key={app.userId} 
                                    className="glass-card hover:bg-white/5 p-4 rounded-xl border border-white/5 flex flex-col sm:flex-row items-center justify-between gap-4 transition-all duration-300 animate-fade-slide-up"
                                    style={{ animationDelay: `${appIndex * 50}ms` }}
                                >
                                    <div className="flex items-center gap-4 flex-1">
                                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary/30 to-primary/10 border border-primary/20 flex items-center justify-center shadow-inner overflow-hidden">
                                            {app.studentPhoto ? (
                                                <img src={app.studentPhoto} alt={app.studentName} className="w-full h-full object-cover" />
                                            ) : (
                                                <span className="text-lg font-bold text-primary">{(app.studentName || 'U')[0]}</span>
                                            )}
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-main text-lg">{app.studentName || 'Unknown Student'}</h4>
                                            <p className="text-sm text-muted">{app.studentEmail}</p>
                                        </div>
                                    </div>
                                    
                                    <div className="flex flex-col items-end gap-2 text-right">
                                        <div className="flex items-center gap-3">
                                            <span className="text-[10px] text-muted uppercase tracking-widest font-bold">Applied On</span>
                                            <span className="text-sm font-medium text-main">
                                                {app.appliedAt?.toDate ? app.appliedAt.toDate().toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : 'N/A'}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Badge color="accent-blue" className="!px-3 !py-1 !text-[11px] font-black uppercase tracking-tighter shadow-sm">
                                                Applied
                                            </Badge>
                                            <Link 
                                                to={`/progress/${app.userId}`}
                                                className="btn btn-secondary !p-2 !h-9 !w-9 rounded-lg hover:!bg-primary/20 hover:!border-primary/50 transition-all shadow-lg"
                                                title="View Profile"
                                            >
                                                <ExternalLink size={14} className="text-primary" />
                                            </Link>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
                <FormActions className="mt-8">
                    {selectedJob?.link && (
                        <a href={selectedJob.link} target="_blank" rel="noopener noreferrer" className="btn btn-secondary gap-2 mr-auto !border-primary/20">
                            <ExternalLink size={16} /> Job Portal
                        </a>
                    )}
                    <button type="button" className="btn btn-primary px-12 rounded-xl" onClick={() => setShowApplicantsModal(false)}>Close</button>
                </FormActions>
            </Modal>

            {/* Delete Modal */}
            <Modal
                isOpen={showDeleteModal}
                onClose={() => setShowDeleteModal(false)}
                title="Confirm Deletion"
            >
                <div className="py-8 text-center animate-fade-in px-4">
                    <div className="w-20 h-20 bg-error/10 text-error rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
                        <Trash2 size={40} />
                    </div>
                    <h3 className="text-2xl font-bold mb-3">Delete Job Posting?</h3>
                    <p className="text-muted mb-10 max-w-xs mx-auto text-lg">This action will permanently remove the posting for <strong>{jobs.find(j => j.id === jobToDelete)?.role}</strong>. This action cannot be undone.</p>
                    <div className="flex justify-center gap-4">
                        <button className="btn btn-secondary px-10 py-3 rounded-xl" disabled={saving} onClick={() => setShowDeleteModal(false)}>Cancel</button>
                        <button className="btn btn-primary !bg-error !shadow-error/30 px-10 py-3 rounded-xl border-none" disabled={saving} onClick={handleConfirmDelete}>
                            {saving ? UI_STRINGS.COMMON.LOADING : "Confirm Delete"}
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}
