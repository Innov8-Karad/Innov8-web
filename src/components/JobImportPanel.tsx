import { useState, useEffect, useContext } from 'react';
import {
  CheckCircle2, AlertCircle, Clock,
  Loader2, Pencil, Check, X, ExternalLink, Globe, MapPin,
  DollarSign, Building2, Calendar, Search, Sparkles, Plus,
  Layers
} from 'lucide-react';
import {
  jobService,
  type AdzunaSearchResult
} from '../services/jobService';
import { ToastContext } from '../contexts/ToastContext';
import type { Job } from '../types';

interface JobImportPanelProps {
  onEditJob: (job: Job) => void;
}

const TARGET_ROLES = [
  'Application Support',
  'Data Analyst',
  'System Engineer',
  'SQL Developer',
  'Associate Consultant',
  'Production Support',
];

const QUICK_LOCATIONS = ['Pune', 'Mumbai', 'Bangalore', 'Hyderabad', 'Remote'];

function formatDate(date: unknown): string {
  if (!date) return '—';
  const hasSeconds = typeof date === 'object' && date !== null && 'seconds' in date;
  const ms = hasSeconds ? (date as { seconds: number }).seconds * 1000 : (date as string | number | Date);
  const dObj = new Date(ms);
  if (isNaN(dObj.getTime())) return '—';
  return dObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function JobImportPanel({ onEditJob }: JobImportPanelProps) {
  const toastContext = useContext(ToastContext);
  const showToast = toastContext?.showToast;

  // ── Adzuna Live Search State ────────────────────────────────────────────
  const [selectedRole, setSelectedRole] = useState<string>('Application Support');
  const [customRoleQuery, setCustomRoleQuery] = useState<string>('Application Support');
  const [searchLocation, setSearchLocation] = useState<string>('Pune');
  const [searching, setSearching] = useState<boolean>(false);
  const [searchResults, setSearchResults] = useState<AdzunaSearchResult[]>([]);
  const [totalMatches, setTotalMatches] = useState<number | null>(null);
  const [hasSearched, setHasSearched] = useState<boolean>(false);
  const [importedJobIds, setImportedJobIds] = useState<Set<string>>(new Set());
  const [importingCardId, setImportingCardId] = useState<string | null>(null);
  const [bulkImporting, setBulkImporting] = useState<boolean>(false);

  // ── Pending Review State ────────────────────────────────────────────────
  const [pendingJobs, setPendingJobs] = useState<Job[]>([]);
  const [pendingLoading, setPendingLoading] = useState(true);
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);

  // Subscribe to pending jobs
  useEffect(() => {
    const unsub = jobService.subscribeToPendingJobs(
      (jobs) => {
        setPendingJobs(jobs);
        setPendingLoading(false);
      },
      (err) => {
        console.error('Pending jobs subscription error:', err);
        setPendingLoading(false);
      }
    );
    return unsub;
  }, []);

  // ── Adzuna Search Handler ───────────────────────────────────────────────
  const handleAdzunaSearch = async (roleToSearch?: string, locToSearch?: string) => {
    const query = (roleToSearch !== undefined ? roleToSearch : customRoleQuery).trim();
    const loc = (locToSearch !== undefined ? locToSearch : searchLocation).trim();

    if (!query) {
      showToast?.('Please enter or select a job role.', 'error');
      return;
    }

    setSearching(true);
    setHasSearched(true);

    try {
      const resp = await jobService.searchAdzunaJobs({
        query: query,
        location: loc || 'Pune',
        resultsPerPage: 12,
      });

      setSearchResults(resp.results || []);
      setTotalMatches(resp.totalCount || resp.results.length);

      if ((resp.results || []).length === 0) {
        showToast?.(`No active jobs found for "${query}" in "${loc}".`, 'warning');
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Search failed';
      showToast?.(message, 'error');
    } finally {
      setSearching(false);
    }
  };

  // Quick Role pill clicked
  const handleRolePillClick = (role: string) => {
    setSelectedRole(role);
    setCustomRoleQuery(role);
    handleAdzunaSearch(role, searchLocation);
  };

  // Quick Location pill clicked
  const handleLocationPillClick = (loc: string) => {
    setSearchLocation(loc);
    handleAdzunaSearch(customRoleQuery, loc);
  };

  // ── Single Adzuna Job Import ────────────────────────────────────────────
  const handleImportSingleAdzunaJob = async (job: AdzunaSearchResult) => {
    try {
      setImportingCardId(job.id);
      await jobService.importAdzunaJob(job);
      setImportedJobIds((prev) => new Set([...prev, job.id]));
      showToast?.(`"${job.role}" added to Pending Review!`, 'success');
    } catch {
      showToast?.('Failed to import job.', 'error');
    } finally {
      setImportingCardId(null);
    }
  };

  // ── Bulk Import All Search Results ──────────────────────────────────────
  const handleBulkImportAdzuna = async () => {
    const unimported = searchResults.filter(
      (j) => !j.isAlreadyImported && !importedJobIds.has(j.id)
    );

    if (unimported.length === 0) {
      showToast?.('All results are already imported.', 'warning');
      return;
    }

    setBulkImporting(true);
    try {
      const { importedCount } = await jobService.bulkImportAdzunaJobs(unimported);
      const newlyImportedIds = unimported.map((j) => j.id);
      setImportedJobIds((prev) => new Set([...prev, ...newlyImportedIds]));
      showToast?.(`${importedCount} job(s) added to Pending Review!`, 'success');
    } catch {
      showToast?.('Failed to bulk import jobs.', 'error');
    } finally {
      setBulkImporting(false);
    }
  };

  // ── Approve / Reject Handlers ──────────────────────────────────────────
  const handleApprove = async (jobId: string) => {
    try {
      setActionInProgress(jobId);
      await jobService.approveJob(jobId);
      showToast?.('Job approved and published!', 'success');
    } catch {
      showToast?.('Failed to approve job.', 'error');
    } finally {
      setActionInProgress(null);
    }
  };

  const handleReject = async (jobId: string) => {
    try {
      setActionInProgress(jobId);
      await jobService.rejectJob(jobId);
      showToast?.('Job rejected and removed.', 'success');
    } catch {
      showToast?.('Failed to reject job.', 'error');
    } finally {
      setActionInProgress(null);
    }
  };

  // ── Source Badge Helper ─────────────────────────────────────────────────
  const getSourceBadge = (source?: string) => {
    switch (source) {
      case 'adzuna':
        return <span className="import-source-badge adzuna"><Globe size={12} /> Adzuna</span>;
      default:
        return <span className="import-source-badge manual">Manual</span>;
    }
  };

  const unimportedCount = searchResults.filter(
    (j) => !j.isAlreadyImported && !importedJobIds.has(j.id)
  ).length;

  return (
    <div className="job-import-panel">
      {renderStyles()}

      {/* ── Adzuna Live Role Search & Sourcing Section ─────────────────── */}
      <section className="import-section adzuna-search-section">
        <div className="section-intro">
          <div className="intro-badge">
            <Sparkles size={13} />
            <span>Direct Sourcing & Role Search</span>
          </div>
          <h3>Search & Import Jobs by Role</h3>
          <p>
            Click any of your target job roles below or enter a custom query to search live job postings and import them for admin review.
          </p>
        </div>

        {/* ── 6 Core Target Roles Quick Filters ───────────────────────── */}
        <div className="role-pills-container">
          <span className="role-pills-label">Target Roles:</span>
          <div className="role-pills-grid">
            {TARGET_ROLES.map((role) => {
              const isSelected = selectedRole === role;
              return (
                <button
                  key={role}
                  type="button"
                  className={`role-pill-btn ${isSelected ? 'active' : ''}`}
                  onClick={() => handleRolePillClick(role)}
                  disabled={searching}
                >
                  <span className="pill-dot" />
                  <span>{role}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Search Form Bar ──────────────────────────────────────────── */}
        <div className="search-form-row">
          <div className="search-input-group role-input-wrap">
            <Search size={16} className="input-icon" />
            <input
              type="text"
              placeholder="Job role / keyword (e.g. Application Support, SQL Developer)"
              value={customRoleQuery}
              onChange={(e) => {
                setCustomRoleQuery(e.target.value);
                setSelectedRole('');
              }}
              onKeyDown={(e) => e.key === 'Enter' && handleAdzunaSearch()}
              disabled={searching}
              className="search-control"
            />
          </div>

          <div className="search-input-group loc-input-wrap">
            <MapPin size={16} className="input-icon" />
            <input
              type="text"
              placeholder="City / Location (e.g. Pune, Mumbai)"
              value={searchLocation}
              onChange={(e) => setSearchLocation(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAdzunaSearch()}
              disabled={searching}
              className="search-control"
            />
          </div>

          <button
            className="btn btn-primary search-submit-btn"
            onClick={() => handleAdzunaSearch()}
            disabled={searching || !customRoleQuery.trim()}
          >
            {searching ? (
              <><Loader2 size={16} className="spin" /> Searching...</>
            ) : (
              <><Search size={16} /> Search Live</>
            )}
          </button>
        </div>

        {/* ── Quick City Chips ─────────────────────────────────────────── */}
        <div className="quick-cities-row">
          <span className="quick-cities-label">Popular Locations:</span>
          <div className="quick-cities-list">
            {QUICK_LOCATIONS.map((loc) => (
              <button
                key={loc}
                type="button"
                className={`city-chip ${searchLocation.toLowerCase() === loc.toLowerCase() ? 'active' : ''}`}
                onClick={() => handleLocationPillClick(loc)}
                disabled={searching}
              >
                {loc}
              </button>
            ))}
          </div>
        </div>

        {/* ── Search Results Grid ──────────────────────────────────────── */}
        {searching && (
          <div className="search-loading-state">
            <Loader2 size={24} className="spin" />
            <span>Fetching verified live jobs from Adzuna...</span>
          </div>
        )}

        {!searching && hasSearched && (
          <div className="search-results-wrapper">
            <div className="results-header-bar">
              <div className="results-count-text">
                <Layers size={16} />
                <span>
                  Found <strong>{totalMatches || searchResults.length}</strong> matching postings for "<strong>{customRoleQuery}</strong>" in <strong>{searchLocation || 'India'}</strong>
                </span>
              </div>

              {unimportedCount > 0 && (
                <button
                  className="btn btn-primary bulk-import-btn"
                  onClick={handleBulkImportAdzuna}
                  disabled={bulkImporting}
                >
                  {bulkImporting ? (
                    <><Loader2 size={14} className="spin" /> Importing All...</>
                  ) : (
                    <><Plus size={14} /> Import All New ({unimportedCount})</>
                  )}
                </button>
              )}
            </div>

            {searchResults.length === 0 ? (
              <div className="no-results-box">
                <AlertCircle size={24} />
                <h4>No jobs found matching "{customRoleQuery}" in {searchLocation}</h4>
                <p>Try clicking on one of the target role pills above or adjusting your location.</p>
              </div>
            ) : (
              <div className="adzuna-results-grid">
                {searchResults.map((job) => {
                  const isImported = job.isAlreadyImported || importedJobIds.has(job.id);
                  const isThisImporting = importingCardId === job.id;

                  return (
                    <div key={job.id} className={`adzuna-job-card ${isImported ? 'imported' : ''}`}>
                      <div className="card-top">
                        <div className="company-logo-avatar">
                          <Building2 size={20} />
                        </div>
                        <div className="card-title-group">
                          <h4 title={job.role}>{job.role}</h4>
                          <p title={job.companyName}>{job.companyName}</p>
                        </div>
                        <span className={`contract-badge ${job.jobType.toLowerCase()}`}>
                          {job.jobType}
                        </span>
                      </div>

                      <div className="card-meta-list">
                        <div className="meta-pill">
                          <MapPin size={13} />
                          <span>{job.location}</span>
                        </div>
                        <div className="meta-pill">
                          <DollarSign size={13} />
                          <span>{job.salary}</span>
                        </div>
                        <div className="meta-pill">
                          <Calendar size={13} />
                          <span>{formatDate(job.created)}</span>
                        </div>
                      </div>

                      {job.description && (
                        <p className="card-description">
                          {job.description.length > 130
                            ? job.description.slice(0, 130) + '...'
                            : job.description}
                        </p>
                      )}

                      <div className="card-actions-row">
                        <a
                          href={job.sourceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="view-source-btn"
                          title="View authentic posting on employer/Adzuna site"
                        >
                          <ExternalLink size={13} />
                          <span>View Original</span>
                        </a>

                        {isImported ? (
                          <span className="already-imported-badge">
                            <CheckCircle2 size={14} />
                            <span>In Database</span>
                          </span>
                        ) : (
                          <button
                            className="import-card-btn"
                            onClick={() => handleImportSingleAdzunaJob(job)}
                            disabled={isThisImporting || bulkImporting}
                          >
                            {isThisImporting ? (
                              <><Loader2 size={13} className="spin" /> Adding...</>
                            ) : (
                              <><Plus size={13} /> Import to Review</>
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </section>

      {/* ── Pending Review Section (Universal Queue) ───────────────────── */}
      <section className="pending-section">
        <div className="pending-header">
          <div className="pending-title">
            <Clock size={18} />
            <h3>Pending Review Queue</h3>
            {pendingJobs.length > 0 && (
              <span className="pending-count">{pendingJobs.length}</span>
            )}
          </div>
          <p className="pending-subtitle">
            Imported jobs are held here until you approve them for students to view.
          </p>
        </div>

        {pendingLoading ? (
          <div className="pending-loading">
            <Loader2 size={20} className="spin" />
            <span>Loading pending jobs...</span>
          </div>
        ) : pendingJobs.length === 0 ? (
          <div className="empty-pending-box">
            <CheckCircle2 size={24} className="empty-icon" />
            <h4>All Caught Up!</h4>
            <p>No jobs currently pending review. Use the search tool above to import new openings.</p>
          </div>
        ) : (
          <div className="pending-grid">
            {pendingJobs.map((job) => (
              <div key={job.id} className="pending-card">
                <div className="pending-card-header">
                  <div className="company-logo-box">
                    <Building2 size={20} />
                  </div>
                  <div className="header-info">
                    <h4>{job.role}</h4>
                    <p>{job.companyName}</p>
                  </div>
                  {getSourceBadge(job.source)}
                </div>

                <div className="pending-card-meta">
                  <div className="meta-item">
                    <MapPin size={13} />
                    <span>{job.location}</span>
                  </div>
                  <div className="meta-item">
                    <DollarSign size={13} />
                    <span>{job.salary}</span>
                  </div>
                  {job.deadline && (
                    <div className="meta-item">
                      <Calendar size={13} />
                      <span>Deadline: {formatDate(job.deadline)}</span>
                    </div>
                  )}
                  {job.sourceUrl && (
                    <div className="meta-item">
                      <ExternalLink size={13} />
                      <a
                        href={job.sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="source-link"
                        onClick={(e) => e.stopPropagation()}
                      >
                        View Original
                      </a>
                    </div>
                  )}
                </div>

                {job.description && (
                  <p className="pending-description">
                    {job.description.length > 150 ? job.description.slice(0, 150) + '...' : job.description}
                  </p>
                )}

                <div className="pending-card-actions">
                  <button
                    className="pending-btn edit"
                    onClick={() => onEditJob(job)}
                    disabled={actionInProgress === job.id}
                    title="Edit before approving"
                  >
                    <Pencil size={14} /> Edit
                  </button>
                  <button
                    className="pending-btn reject"
                    onClick={() => handleReject(job.id)}
                    disabled={actionInProgress === job.id}
                    title="Reject and delete"
                  >
                    {actionInProgress === job.id ? (
                      <Loader2 size={14} className="spin" />
                    ) : (
                      <><X size={14} /> Reject</>
                    )}
                  </button>
                  <button
                    className="pending-btn approve"
                    onClick={() => handleApprove(job.id)}
                    disabled={actionInProgress === job.id}
                    title="Approve and publish"
                  >
                    {actionInProgress === job.id ? (
                      <Loader2 size={14} className="spin" />
                    ) : (
                      <><Check size={14} /> Approve</>
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );

  function renderStyles() {
    return (
      <style>{`
        .job-import-panel {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        /* ── Import Section Box ─────────────────────────────────────── */
        .import-section {
          background: var(--bg-card);
          border: 1px solid var(--border-subtle);
          border-radius: 20px;
          padding: 1.5rem;
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
        }

        .section-intro {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }
        .intro-badge {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          width: fit-content;
          padding: 3px 8px;
          background: rgba(99, 102, 241, 0.1);
          color: #6366F1;
          border-radius: 20px;
          font-size: 0.72rem;
          font-weight: 700;
          text-transform: uppercase;
          margin-bottom: 4px;
        }
        .section-intro h3 {
          margin: 0;
          font-size: 1.15rem;
          font-weight: 800;
          color: var(--text-main);
        }
        .section-intro p {
          margin: 0;
          font-size: 0.85rem;
          color: var(--text-secondary);
        }

        /* ── Target Role Pills ──────────────────────────────────────── */
        .role-pills-container {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
          background: rgba(163, 170, 196, 0.03);
          padding: 1rem;
          border-radius: 16px;
          border: 1px solid var(--border-subtle);
        }
        .role-pills-label {
          font-size: 0.78rem;
          font-weight: 700;
          color: var(--text-secondary);
          text-transform: uppercase;
          letter-spacing: 0.03em;
        }
        .role-pills-grid {
          display: flex;
          flex-wrap: wrap;
          gap: 0.5rem;
        }
        .role-pill-btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 0.5rem 1rem;
          background: var(--bg-card);
          border: 1px solid var(--border-subtle);
          border-radius: 12px;
          font-size: 0.82rem;
          font-weight: 700;
          color: var(--text-secondary);
          cursor: pointer;
          transition: all 0.2s;
        }
        .role-pill-btn:hover:not(:disabled) {
          border-color: #6366F1;
          color: var(--text-main);
          transform: translateY(-1px);
        }
        .role-pill-btn.active {
          background: rgba(99, 102, 241, 0.1);
          border-color: #6366F1;
          color: #6366F1;
          box-shadow: 0 2px 8px rgba(99, 102, 241, 0.15);
        }
        .pill-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #6366F1;
          opacity: 0.5;
        }
        .role-pill-btn.active .pill-dot {
          opacity: 1;
          box-shadow: 0 0 8px #6366F1;
        }

        /* ── Search Form Row ────────────────────────────────────────── */
        .search-form-row {
          display: flex;
          gap: 0.75rem;
          align-items: center;
        }
        .search-input-group {
          position: relative;
          display: flex;
          align-items: center;
        }
        .role-input-wrap {
          flex: 2;
        }
        .loc-input-wrap {
          flex: 1;
        }
        .input-icon {
          position: absolute;
          left: 1rem;
          color: var(--text-secondary);
          pointer-events: none;
        }
        .search-control {
          width: 100%;
          background: rgba(163, 170, 196, 0.05);
          border: 1px solid var(--border-subtle);
          border-radius: 12px;
          padding: 0.75rem 1rem 0.75rem 2.5rem;
          color: var(--text-main);
          font-size: 0.88rem;
          outline: none;
          transition: all 0.2s;
        }
        .search-control:focus {
          border-color: #6366F1;
          box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
          background: var(--bg-card);
        }
        .search-submit-btn {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.75rem 1.5rem;
          white-space: nowrap;
          border-radius: 12px;
          font-weight: 700;
        }

        /* ── Quick Cities Row ───────────────────────────────────────── */
        .quick-cities-row {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          flex-wrap: wrap;
        }
        .quick-cities-label {
          font-size: 0.78rem;
          color: var(--text-secondary);
          font-weight: 600;
        }
        .quick-cities-list {
          display: flex;
          gap: 0.4rem;
          flex-wrap: wrap;
        }
        .city-chip {
          background: transparent;
          border: 1px solid var(--border-subtle);
          padding: 3px 10px;
          border-radius: 20px;
          font-size: 0.75rem;
          color: var(--text-secondary);
          cursor: pointer;
          transition: all 0.15s;
        }
        .city-chip:hover {
          border-color: #6366F1;
          color: var(--text-main);
        }
        .city-chip.active {
          background: rgba(99, 102, 241, 0.1);
          border-color: #6366F1;
          color: #6366F1;
          font-weight: 700;
        }

        /* ── Results Container ──────────────────────────────────────── */
        .search-loading-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 0.75rem;
          padding: 3rem;
          color: var(--text-secondary);
        }

        .search-results-wrapper {
          display: flex;
          flex-direction: column;
          gap: 1rem;
          padding-top: 1rem;
          border-top: 1px solid var(--border-subtle);
        }

        .results-header-bar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 0.5rem;
        }
        .results-count-text {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.88rem;
          color: var(--text-secondary);
        }
        .results-count-text strong {
          color: var(--text-main);
        }
        .bulk-import-btn {
          display: flex;
          align-items: center;
          gap: 0.4rem;
          padding: 0.5rem 1rem;
          font-size: 0.8rem;
          border-radius: 10px;
        }

        .no-results-box {
          text-align: center;
          padding: 2.5rem;
          background: rgba(163, 170, 196, 0.03);
          border-radius: 16px;
          border: 1px dashed var(--border-subtle);
          color: var(--text-secondary);
        }
        .no-results-box h4 {
          margin: 0.5rem 0 0.25rem;
          color: var(--text-main);
        }
        .no-results-box p {
          margin: 0;
          font-size: 0.85rem;
        }

        /* ── Adzuna Job Cards Grid ──────────────────────────────────── */
        .adzuna-results-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
          gap: 1rem;
        }

        .adzuna-job-card {
          background: rgba(163, 170, 196, 0.03);
          border: 1px solid var(--border-subtle);
          border-radius: 16px;
          padding: 1.25rem;
          display: flex;
          flex-direction: column;
          gap: 0.85rem;
          transition: all 0.2s;
        }
        .adzuna-job-card:hover {
          border-color: #6366F1;
          transform: translateY(-2px);
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.05);
        }
        .adzuna-job-card.imported {
          border-color: rgba(16, 185, 129, 0.3);
          background: rgba(16, 185, 129, 0.02);
        }

        .card-top {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }
        .company-logo-avatar {
          width: 38px;
          height: 38px;
          background: rgba(99, 102, 241, 0.1);
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #6366F1;
          flex-shrink: 0;
        }
        .card-title-group {
          flex: 1;
          min-width: 0;
        }
        .card-title-group h4 {
          margin: 0;
          font-size: 0.95rem;
          font-weight: 700;
          color: var(--text-main);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .card-title-group p {
          margin: 2px 0 0;
          font-size: 0.82rem;
          color: var(--text-secondary);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .contract-badge {
          font-size: 0.7rem;
          font-weight: 700;
          padding: 2px 8px;
          border-radius: 20px;
          text-transform: uppercase;
        }
        .contract-badge.full-time {
          background: rgba(99, 102, 241, 0.1);
          color: #6366F1;
        }
        .contract-badge.internship {
          background: rgba(245, 158, 11, 0.1);
          color: #F59E0B;
        }

        .card-meta-list {
          display: flex;
          flex-wrap: wrap;
          gap: 0.4rem;
        }
        .meta-pill {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 3px 8px;
          background: rgba(163, 170, 196, 0.06);
          border-radius: 8px;
          font-size: 0.78rem;
          color: var(--text-secondary);
        }

        .card-description {
          font-size: 0.8rem;
          color: var(--text-secondary);
          line-height: 1.45;
          margin: 0;
        }

        .card-actions-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding-top: 0.75rem;
          border-top: 1px solid var(--border-subtle);
          margin-top: auto;
        }
        .view-source-btn {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          font-size: 0.8rem;
          color: #6366F1;
          text-decoration: none;
          font-weight: 600;
        }
        .view-source-btn:hover {
          text-decoration: underline;
        }

        .import-card-btn {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 0.4rem 0.85rem;
          background: #10B981;
          color: #000;
          border: none;
          border-radius: 8px;
          font-size: 0.78rem;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.15s;
        }
        .import-card-btn:hover:not(:disabled) {
          filter: brightness(1.1);
          transform: translateY(-1px);
        }
        .import-card-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .already-imported-badge {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 3px 8px;
          background: rgba(16, 185, 129, 0.1);
          color: #10B981;
          border-radius: 8px;
          font-size: 0.75rem;
          font-weight: 700;
        }

        /* ── Pending Section ────────────────────────────────────────── */
        .pending-section {
          background: var(--bg-card);
          border: 1px solid var(--border-subtle);
          border-radius: 20px;
          padding: 1.5rem;
        }

        .pending-header {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
          margin-bottom: 1.25rem;
        }
        .pending-title {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          color: #F59E0B;
        }
        .pending-title h3 {
          margin: 0;
          font-size: 1.15rem;
          font-weight: 800;
          color: var(--text-main);
        }
        .pending-subtitle {
          margin: 0;
          font-size: 0.82rem;
          color: var(--text-secondary);
        }
        .pending-count {
          background: #F59E0B;
          color: #000;
          font-size: 0.75rem;
          font-weight: 800;
          padding: 2px 10px;
          border-radius: 20px;
          min-width: 24px;
          text-align: center;
        }

        .pending-loading {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.75rem;
          padding: 2rem;
          color: var(--text-secondary);
        }

        .empty-pending-box {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 2.5rem;
          background: rgba(163, 170, 196, 0.02);
          border-radius: 16px;
          border: 1px dashed var(--border-subtle);
          text-align: center;
          color: var(--text-secondary);
        }
        .empty-icon {
          color: #10B981;
          margin-bottom: 0.5rem;
        }
        .empty-pending-box h4 {
          margin: 0 0 0.25rem;
          color: var(--text-main);
        }
        .empty-pending-box p {
          margin: 0;
          font-size: 0.85rem;
        }

        .pending-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
          gap: 1rem;
        }

        .pending-card {
          background: rgba(163, 170, 196, 0.03);
          border: 1px solid rgba(245, 158, 11, 0.18);
          border-radius: 16px;
          padding: 1.25rem;
          display: flex;
          flex-direction: column;
          gap: 1rem;
          transition: all 0.2s;
        }
        .pending-card:hover {
          border-color: rgba(245, 158, 11, 0.35);
          transform: translateY(-2px);
        }

        .pending-card-header {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }
        .pending-card-header .header-info {
          flex: 1;
          min-width: 0;
        }
        .pending-card-header h4 {
          margin: 0;
          font-size: 1rem;
          font-weight: 700;
          color: var(--text-main);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .pending-card-header p {
          margin: 2px 0 0;
          font-size: 0.85rem;
          color: var(--text-secondary);
        }

        .import-source-badge {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 3px 10px;
          border-radius: 20px;
          font-size: 0.7rem;
          font-weight: 700;
          white-space: nowrap;
          text-transform: uppercase;
        }
        .import-source-badge.adzuna {
          background: rgba(16, 185, 129, 0.1);
          color: #10B981;
        }
        .import-source-badge.manual {
          background: rgba(163, 170, 196, 0.1);
          color: var(--text-secondary);
        }

        .pending-card-meta {
          display: flex;
          flex-direction: column;
          gap: 0.35rem;
        }
        .meta-item {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.85rem;
          color: var(--text-secondary);
        }
        .source-link {
          color: #6366F1;
          text-decoration: none;
          font-weight: 600;
        }
        .source-link:hover {
          text-decoration: underline;
        }

        .pending-description {
          font-size: 0.8rem;
          color: var(--text-secondary);
          line-height: 1.5;
          margin: 0;
        }

        .pending-card-actions {
          display: flex;
          gap: 0.5rem;
          padding-top: 0.75rem;
          border-top: 1px solid rgba(163, 170, 196, 0.08);
          margin-top: auto;
        }

        .pending-btn {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.35rem;
          padding: 0.5rem 0.75rem;
          border-radius: 10px;
          font-size: 0.8rem;
          font-weight: 700;
          border: none;
          cursor: pointer;
          transition: all 0.2s;
        }
        .pending-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .pending-btn.edit {
          background: rgba(163, 170, 196, 0.08);
          color: var(--text-secondary);
        }
        .pending-btn.edit:hover:not(:disabled) {
          background: rgba(163, 170, 196, 0.15);
          color: var(--text-main);
        }

        .pending-btn.reject {
          background: rgba(239, 68, 68, 0.08);
          color: #EF4444;
        }
        .pending-btn.reject:hover:not(:disabled) {
          background: rgba(239, 68, 68, 0.15);
        }

        .pending-btn.approve {
          background: rgba(16, 185, 129, 0.1);
          color: #10B981;
        }
        .pending-btn.approve:hover:not(:disabled) {
          background: #10B981;
          color: #000;
        }

        /* ── Responsive adjustments ─────────────────────────────────── */
        @media (max-width: 768px) {
          .search-form-row {
            flex-direction: column;
            align-items: stretch;
          }
          .role-pills-grid {
            flex-direction: column;
          }
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .spin {
          animation: spin 1s linear infinite;
        }
      `}</style>
    );
  }
}
