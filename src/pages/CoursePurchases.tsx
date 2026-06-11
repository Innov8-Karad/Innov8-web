// ═══════════════════════════════════════════════════════════════════════════════
// CoursePurchases — Admin page for managing paid course purchase requests
// ═══════════════════════════════════════════════════════════════════════════════

import React, { useState, useEffect, useCallback } from 'react';
import {
    CreditCard,
    Clock,
    CheckCircle,
    XCircle,
    Coins,
    User,
    Mail,
    BookOpen,
    Loader2,
    Settings,
    DollarSign,
    Check,
    X,
    Trash2,
    MessageSquare,
    Phone,
    Eye,
    Download,
    FileText,
} from 'lucide-react';
import { useToast } from '../hooks/useToast';
import {
    subscribeToPurchaseRequests,
    approvePurchaseRequest,
    rejectPurchaseRequest,
    deletePurchaseRequest,
    fetchPaymentSettings,
    savePaymentSettings,
} from '../services/purchaseService';
import type { PurchaseRequest, PaymentSettings } from '../services/purchaseService';
import CloudinaryUpload from '../components/CloudinaryUpload';
import Modal from '../components/Modal';
import { Timestamp } from 'firebase/firestore';

type MainTab = 'requests' | 'settings';
type FilterTab = 'pending' | 'approved' | 'rejected' | 'all';

const isPdfUrl = (url: string) => {
    const lower = url.toLowerCase();
    return lower.includes('.pdf') || lower.includes('/raw/upload/');
};

export default function CoursePurchasesPage() {
    const { showToast } = useToast();

    // Navigation and filtering
    const [activeMainTab, setActiveMainTab] = useState<MainTab>('requests');
    const [filter, setFilter] = useState<FilterTab>('pending');

    // Requests state
    const [requests, setRequests] = useState<PurchaseRequest[]>([]);
    const [loadingRequests, setLoadingRequests] = useState(true);

    // Settings state
    const [settings, setSettings] = useState<PaymentSettings>({
        upiId: '',
        qrCodeUrl: '',
        instructionsText: 'Please scan the below QR Code or pay on the given UPI ID. Your course will be activated within 24 hours of payment. If not activated, please contact: 8830795649',
    });
    const [loadingSettings, setLoadingSettings] = useState(false);
    const [savingSettings, setSavingSettings] = useState(false);

    // Rejection Modal state
    const [rejectingRequestId, setRejectingRequestId] = useState<string | null>(null);
    const [rejectingRequestCourseId, setRejectingRequestCourseId] = useState<string | null>(null);
    const [rejectingRequestUserId, setRejectingRequestUserId] = useState<string | null>(null);
    const [rejectionReason, setRejectionReason] = useState('');
    const [submittingRejection, setSubmittingRejection] = useState(false);

    // Fullscreen Screenshot Verification Modal state
    const [fullscreenScreenshot, setFullscreenScreenshot] = useState<string | null>(null);
    const [fullscreenType, setFullscreenType] = useState<'image' | 'pdf' | null>(null);

    const handleOpenScreenshot = (url: string, type: 'image' | 'pdf') => {
        setFullscreenScreenshot(url);
        setFullscreenType(type);
    };

    // Delete Modal state
    const [deleteRequestId, setDeleteRequestId] = useState<string | null>(null);
    const [deletingRequest, setDeletingRequest] = useState(false);

    // Real-time requests subscription
    useEffect(() => {
        const unsubscribe = subscribeToPurchaseRequests((data) => {
            setRequests(data);
            setLoadingRequests(false);
        });

        return () => unsubscribe();
    }, []);

    // Load payment settings
    const loadSettings = useCallback(async () => {
        setLoadingSettings(true);
        try {
            const data = await fetchPaymentSettings();
            if (data) {
                setSettings({
                    upiId: data.upiId || '',
                    qrCodeUrl: data.qrCodeUrl || '',
                    instructionsText: data.instructionsText || 'Please scan the below QR Code or pay on the given UPI ID. Your course will be activated within 24 hours of payment. If not activated, please contact: 8830795649',
                });
            }
        } catch (err) {
            console.error('Failed to load settings:', err);
            showToast('Failed to load payment settings.', 'error');
        } finally {
            setLoadingSettings(false);
        }
    }, [showToast]);

    useEffect(() => {
        if (activeMainTab === 'settings') {
            loadSettings();
        }
    }, [activeMainTab, loadSettings]);

    // Handle settings save
    const handleSaveSettings = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!settings.upiId) {
            showToast('UPI ID is required.', 'error');
            return;
        }
        setSavingSettings(true);
        try {
            await savePaymentSettings(settings);
            showToast('Payment settings saved successfully.', 'success');
        } catch (err) {
            console.error('Failed to save settings:', err);
            showToast('Failed to save payment settings.', 'error');
        } finally {
            setSavingSettings(false);
        }
    };

    // Filter requests
    const filteredRequests = filter === 'all'
        ? requests
        : requests.filter((r) => r.status === filter);

    // Count states
    const pendingCount = requests.filter((r) => r.status === 'pending').length;
    const approvedCount = requests.filter((r) => r.status === 'approved').length;
    const rejectedCount = requests.filter((r) => r.status === 'rejected').length;

    // Approve handler
    const handleApprove = async (request: PurchaseRequest) => {
        try {
            await approvePurchaseRequest(request.id);
            showToast(`Purchase approved for ${request.userName}`, 'success');
        } catch (err) {
            console.error('Approval error:', err);
            showToast('Failed to approve request.', 'error');
        }
    };

    // Open rejection modal
    const handleOpenReject = (request: PurchaseRequest) => {
        setRejectingRequestId(request.id);
        setRejectingRequestCourseId(request.courseId);
        setRejectingRequestUserId(request.userId);
        setRejectionReason('');
    };

    // Confirm rejection
    const handleConfirmReject = async () => {
        if (!rejectingRequestId || !rejectingRequestCourseId || !rejectingRequestUserId) return;
        setSubmittingRejection(true);
        try {
            await rejectPurchaseRequest(
                rejectingRequestId,
                rejectionReason
            );
            showToast('Purchase request rejected.', 'success');
            setRejectingRequestId(null);
            setRejectingRequestCourseId(null);
            setRejectingRequestUserId(null);
        } catch (err) {
            console.error('Rejection error:', err);
            showToast('Failed to reject request.', 'error');
        } finally {
            setSubmittingRejection(false);
        }
    };

    // Delete handler
    const handleDelete = (request: PurchaseRequest) => {
        setDeleteRequestId(request.id);
    };

    const handleConfirmDelete = async () => {
        if (!deleteRequestId) return;
        setDeletingRequest(true);
        try {
            await deletePurchaseRequest(deleteRequestId);
            showToast('Purchase record removed.', 'success');
            setDeleteRequestId(null);
        } catch (err) {
            console.error('Delete error:', err);
            showToast('Failed to delete request record.', 'error');
        } finally {
            setDeletingRequest(false);
        }
    };

    // Format timestamp
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const formatDate = (ts: any) => {
        if (!ts) return 'N/A';
        let date: Date;
        if (ts instanceof Timestamp) {
            date = ts.toDate();
        } else if (ts && typeof ts === 'object' && 'seconds' in ts) {
            date = new Date(ts.seconds * 1000);
        } else if (ts instanceof Date) {
            date = ts;
        } else {
            date = new Date(ts);
        }
        return date.toLocaleDateString('en-IN', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    const filterTabs: { key: FilterTab; label: string; count: number; icon: React.ElementType }[] = [
        { key: 'pending', label: 'Pending', count: pendingCount, icon: Clock },
        { key: 'approved', label: 'Approved', count: approvedCount, icon: CheckCircle },
        { key: 'rejected', label: 'Rejected', count: rejectedCount, icon: XCircle },
        { key: 'all', label: 'All', count: requests.length, icon: CreditCard },
    ];

    return (
        <div className="animate-fade-in">
            {/* Header */}
            <div className="flex items-center justify-between mb-lg" style={{ flexWrap: 'wrap', gap: '16px' }}>
                <div>
                    <div className="flex items-center gap-sm mb-sm">
                        <div
                            className="icon-container icon-container-accent"
                            style={{ width: '42px', height: '42px' }}
                        >
                            <CreditCard size={22} />
                        </div>
                        <h1>Course Purchase Requests</h1>
                    </div>
                    <p style={{ margin: 0 }}>Review and approve paid course enrollment requests and configure UPI details.</p>
                </div>

                {/* Main Tab Controls */}
                <div className="flex gap-2">
                    <button
                        className={`btn ${activeMainTab === 'requests' ? 'btn-primary' : 'btn-secondary'}`}
                        onClick={() => setActiveMainTab('requests')}
                        style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                    >
                        <CreditCard size={16} />
                        Requests
                    </button>
                    <button
                        className={`btn ${activeMainTab === 'settings' ? 'btn-primary' : 'btn-secondary'}`}
                        onClick={() => setActiveMainTab('settings')}
                        style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                    >
                        <Settings size={16} />
                        Payment Settings
                    </button>
                </div>
            </div>

            {/* Requests Tab Dashboard */}
            {activeMainTab === 'requests' && (
                <>
                    {/* Stat Cards */}
                    <div className="grid-cards-sm mb-lg">
                        <div className="card stat-card-hover" style={{ borderLeft: '4px solid var(--warning)' }}>
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="stat-label">Pending Requests</p>
                                    <p className="stat-value">{pendingCount}</p>
                                </div>
                                <div className="stat-icon" style={{ background: 'rgba(250, 204, 21, 0.12)' }}>
                                    <Clock size={24} style={{ color: 'var(--warning)' }} />
                                </div>
                            </div>
                        </div>
                        <div className="card stat-card-hover" style={{ borderLeft: '4px solid var(--success)' }}>
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="stat-label">Approved Requests</p>
                                    <p className="stat-value">{approvedCount}</p>
                                </div>
                                <div className="stat-icon" style={{ background: 'rgba(16, 185, 129, 0.12)' }}>
                                    <CheckCircle size={24} style={{ color: 'var(--success)' }} />
                                </div>
                            </div>
                        </div>
                        <div className="card stat-card-hover" style={{ borderLeft: '4px solid var(--error)' }}>
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="stat-label">Rejected Requests</p>
                                    <p className="stat-value">{rejectedCount}</p>
                                </div>
                                <div className="stat-icon" style={{ background: 'rgba(239, 68, 68, 0.12)' }}>
                                    <XCircle size={24} style={{ color: 'var(--error)' }} />
                                </div>
                            </div>
                        </div>
                        <div className="card stat-card-hover" style={{ borderLeft: '4px solid var(--primary)' }}>
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="stat-label">Total Requests</p>
                                    <p className="stat-value">{requests.length}</p>
                                </div>
                                <div className="stat-icon" style={{ background: 'rgba(var(--primary-rgb), 0.12)' }}>
                                    <Coins size={24} style={{ color: 'var(--primary)' }} />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Filter Tabs */}
                    <div className="tab-navigation mb-md">
                        {filterTabs.map((tab) => (
                            <button
                                key={tab.key}
                                className={`tab-btn ${filter === tab.key ? 'active' : ''}`}
                                onClick={() => setFilter(tab.key)}
                            >
                                <tab.icon size={16} />
                                {tab.label}
                                {tab.count > 0 && (
                                    <span
                                        style={{
                                            background: filter === tab.key
                                                ? 'rgba(var(--primary-rgb), 0.2)'
                                                : 'rgba(255,255,255,0.08)',
                                            padding: '2px 8px',
                                            borderRadius: '10px',
                                            fontSize: '0.75rem',
                                            fontWeight: 700,
                                            marginLeft: '6px',
                                        }}
                                    >
                                        {tab.count}
                                    </span>
                                )}
                            </button>
                        ))}
                    </div>

                    {/* Requests Cards List */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        {loadingRequests ? (
                            <div className="card flex items-center justify-center" style={{ padding: '48px 0' }}>
                                <Loader2 size={24} className="spin" style={{ color: 'var(--primary)' }} />
                                <span style={{ marginLeft: '12px', color: 'var(--text-secondary)' }}>
                                    Loading purchase requests...
                                </span>
                            </div>
                        ) : filteredRequests.length === 0 ? (
                            <div className="card empty-state" style={{ padding: '48px 0', textAlign: 'center' }}>
                                <CreditCard
                                    size={48}
                                    style={{ color: 'var(--text-secondary)', opacity: 0.3, marginBottom: '12px' }}
                                />
                                <p style={{ color: 'var(--text-secondary)', margin: 0 }}>No purchase requests found for this status.</p>
                            </div>
                        ) : (
                            filteredRequests.map((request) => {
                                const statusBadgeClass =
                                    request.status === 'approved'
                                        ? 'badge-success'
                                        : request.status === 'rejected'
                                        ? 'badge-error'
                                        : 'badge-warning';

                                return (
                                    <div key={request.id} className="card device-card" style={{ border: '1px solid var(--border)', padding: '16px', borderRadius: '12px' }}>
                                        <div className="flex items-center justify-between" style={{ marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
                                            <div className="flex items-center gap-sm">
                                                <div
                                                    className="stat-icon"
                                                    style={{
                                                        width: '42px',
                                                        height: '42px',
                                                        background: 'rgba(var(--primary-rgb), 0.1)',
                                                        borderRadius: '10px',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                    }}
                                                >
                                                    <User size={20} style={{ color: 'var(--primary)' }} />
                                                </div>
                                                <div>
                                                    <p style={{ margin: 0, fontWeight: 600, color: 'var(--text-main)', fontSize: '0.95rem' }}>
                                                        {request.userName || 'Unknown Student'}
                                                    </p>
                                                    <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                        <Mail size={12} />
                                                        {request.userEmail}
                                                    </p>
                                                    {request.userPhone && (
                                                        <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                                                            <Phone size={12} />
                                                            {request.userPhone}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                            <span className={`badge ${statusBadgeClass}`} style={{ textTransform: 'capitalize' }}>
                                                {request.status}
                                            </span>
                                        </div>

                                        {/* Request Details Grid */}
                                        <div
                                            style={{
                                                display: 'grid',
                                                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                                                gap: '12px',
                                                padding: '12px',
                                                background: 'var(--bg-card-accent)',
                                                borderRadius: 'var(--radius-sm)',
                                                marginBottom: '12px',
                                                fontSize: '0.85rem',
                                            }}
                                        >
                                            <div className="flex items-center gap-sm">
                                                <BookOpen size={14} style={{ color: 'var(--text-secondary)', flexShrink: 0 }} />
                                                <span style={{ color: 'var(--text-secondary)' }}>
                                                    <strong>Course:</strong> {request.courseName || 'N/A'}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-sm">
                                                <DollarSign size={14} style={{ color: 'var(--text-secondary)', flexShrink: 0 }} />
                                                <span style={{ color: 'var(--text-secondary)' }}>
                                                    <strong>Price:</strong> ₹{request.amount}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-sm">
                                                <Clock size={14} style={{ color: 'var(--text-secondary)', flexShrink: 0 }} />
                                                <span style={{ color: 'var(--text-secondary)' }}>
                                                    <strong>Requested:</strong> {formatDate(request.purchasedAt)}
                                                </span>
                                            </div>
                                            {request.transactionId && (
                                                <div className="flex items-center gap-sm">
                                                    <CreditCard size={14} style={{ color: 'var(--text-secondary)', flexShrink: 0 }} />
                                                    <span style={{ color: 'var(--text-secondary)' }}>
                                                        <strong>TXN ID:</strong> {request.transactionId}
                                                    </span>
                                                </div>
                                            )}
                                        </div>

                                        {/* Payment Screenshot Preview */}
                                        {request.screenshotUrl && (
                                            <div 
                                                style={{ 
                                                    marginTop: '12px', 
                                                    padding: '12px', 
                                                    background: 'rgba(255, 255, 255, 0.02)', 
                                                    border: '1px solid var(--border)', 
                                                    borderRadius: '8px',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '16px',
                                                    flexWrap: 'wrap'
                                                }}
                                            >
                                                <div 
                                                    style={{ 
                                                        width: '70px', 
                                                        height: '70px', 
                                                        border: '1px solid var(--border)', 
                                                        borderRadius: '6px', 
                                                        overflow: 'hidden', 
                                                        background: 'var(--bg-card-accent)', 
                                                        display: 'flex', 
                                                        alignItems: 'center', 
                                                        justifyContent: 'center',
                                                        cursor: 'pointer'
                                                    }}
                                                    onClick={() => handleOpenScreenshot(request.screenshotUrl!, isPdfUrl(request.screenshotUrl!) ? 'pdf' : 'image')}
                                                    title="Click to view full screen"
                                                >
                                                    {isPdfUrl(request.screenshotUrl) ? (
                                                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px', color: 'var(--text-secondary)' }}>
                                                            <FileText size={24} style={{ color: '#ef4444' }} />
                                                            <span style={{ fontSize: '9px', fontWeight: 600 }}>PDF Doc</span>
                                                        </div>
                                                    ) : (
                                                        <img 
                                                            src={request.screenshotUrl} 
                                                            alt="Payment Screenshot Preview" 
                                                            style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                                                        />
                                                    )}
                                                </div>
                                                <div style={{ flex: 1, minWidth: '150px' }}>
                                                    <p style={{ margin: 0, fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)' }}>
                                                        Payment Screenshot Verification
                                                    </p>
                                                    <p style={{ margin: '2px 0 0 0', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                                                        Verify the transaction screenshot before approval.
                                                    </p>
                                                    <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                                                        <a
                                                            href={request.screenshotUrl}
                                                            download={`screenshot_${request.userName || 'student'}_${request.courseName || 'course'}`}
                                                            target="_blank"
                                                            rel="noreferrer"
                                                            className="btn btn-secondary"
                                                            style={{ padding: '4px 10px', fontSize: '0.75rem', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                                                        >
                                                            <Download size={12} />
                                                            Download
                                                        </a>
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {/* Rejection Message if exists */}
                                        {request.status === 'rejected' && request.rejectionReason && (
                                            <div
                                                style={{
                                                    padding: '8px 12px',
                                                    background: 'rgba(239, 68, 68, 0.08)',
                                                    borderRadius: '8px',
                                                    borderLeft: '3px solid var(--error)',
                                                    marginBottom: '12px',
                                                    fontSize: '0.85rem',
                                                    display: 'flex',
                                                    gap: '8px',
                                                    alignItems: 'flex-start',
                                                }}
                                            >
                                                <MessageSquare size={14} style={{ color: 'var(--error)', marginTop: '2px', flexShrink: 0 }} />
                                                <span style={{ color: 'var(--text-main)' }}>
                                                    <strong>Rejection Reason:</strong> {request.rejectionReason}
                                                </span>
                                            </div>
                                        )}

                                        {/* Action buttons row */}
                                        <div className="flex items-center justify-between" style={{ marginTop: '16px', borderTop: '1px solid var(--border)', paddingTop: '12px' }}>
                                            {/* Left side: View Screenshot button */}
                                            <div>
                                                {request.screenshotUrl ? (
                                                    <button
                                                        className="btn"
                                                        onClick={() => handleOpenScreenshot(request.screenshotUrl!, isPdfUrl(request.screenshotUrl!) ? 'pdf' : 'image')}
                                                        style={{
                                                            padding: '6px 14px',
                                                            fontSize: '0.85rem',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            gap: '6px',
                                                            color: 'var(--primary)',
                                                            borderColor: 'rgba(var(--primary-rgb), 0.3)',
                                                            background: 'rgba(var(--primary-rgb), 0.05)',
                                                            borderRadius: '8px',
                                                            cursor: 'pointer',
                                                            transition: 'all 0.2s',
                                                        }}
                                                        onMouseEnter={(e) => {
                                                            e.currentTarget.style.background = 'rgba(var(--primary-rgb), 0.1)';
                                                            e.currentTarget.style.borderColor = 'var(--primary)';
                                                        }}
                                                        onMouseLeave={(e) => {
                                                            e.currentTarget.style.background = 'rgba(var(--primary-rgb), 0.05)';
                                                            e.currentTarget.style.borderColor = 'rgba(var(--primary-rgb), 0.3)';
                                                        }}
                                                    >
                                                        {isPdfUrl(request.screenshotUrl) ? <FileText size={14} /> : <Eye size={14} />}
                                                        <strong>View Screenshot</strong>
                                                    </button>
                                                ) : (
                                                    <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                                                        No screenshot uploaded
                                                    </span>
                                                )}
                                            </div>

                                            {/* Right side: Approve/Reject or Delete */}
                                            <div className="flex items-center gap-sm">
                                                {request.status === 'pending' && (
                                                    <>
                                                        <button
                                                            className="btn btn-secondary"
                                                            onClick={() => handleOpenReject(request)}
                                                            style={{
                                                                padding: '6px 14px',
                                                                fontSize: '0.85rem',
                                                                color: 'var(--error)',
                                                                borderColor: 'rgba(239, 68, 68, 0.3)',
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                gap: '4px',
                                                            }}
                                                        >
                                                            <X size={14} />
                                                            Reject
                                                        </button>
                                                        <button
                                                            className="btn btn-primary"
                                                            onClick={() => handleApprove(request)}
                                                            style={{
                                                                padding: '6px 14px',
                                                                fontSize: '0.85rem',
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                gap: '4px',
                                                                backgroundColor: 'var(--success)',
                                                                borderColor: 'var(--success)',
                                                                color: '#fff',
                                                            }}
                                                        >
                                                            <Check size={14} />
                                                            Approve
                                                        </button>
                                                    </>
                                                )}
                                                {request.status !== 'pending' && (
                                                    <button
                                                        className="btn btn-secondary"
                                                        onClick={() => handleDelete(request)}
                                                        style={{
                                                            padding: '6px 12px',
                                                            fontSize: '0.85rem',
                                                            color: 'var(--error)',
                                                            borderColor: 'rgba(239, 68, 68, 0.3)',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            gap: '4px',
                                                        }}
                                                    >
                                                        <Trash2 size={14} />
                                                        Remove Record
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </>
            )}

            {/* Payment Settings Tab */}
            {activeMainTab === 'settings' && (
                <div className="card" style={{ maxWidth: '700px', margin: '0 auto', padding: '24px' }}>
                    <h2 style={{ fontSize: '1.25rem', marginBottom: '16px', fontWeight: 600 }}>UPI Payment Configuration</h2>
                    
                    {loadingSettings ? (
                        <div className="flex items-center justify-center" style={{ padding: '48px 0' }}>
                            <Loader2 size={24} className="spin" style={{ color: 'var(--primary)' }} />
                            <span style={{ marginLeft: '12px', color: 'var(--text-secondary)' }}>Loading settings...</span>
                        </div>
                    ) : (
                        <form onSubmit={handleSaveSettings} className="flex flex-col gap-4">
                            <div className="form-group">
                                <label className="form-field-label">UPI ID</label>
                                <input
                                    type="text"
                                    className="form-control"
                                    placeholder="e.g. business@upi"
                                    value={settings.upiId}
                                    onChange={(e) => setSettings({ ...settings, upiId: e.target.value })}
                                    required
                                />
                            </div>

                            <div className="form-group">
                                <CloudinaryUpload
                                    preset={import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET}
                                    folder="innov8/payment"
                                    onUploadComplete={(result) => {
                                        setSettings({ ...settings, qrCodeUrl: result.url });
                                    }}
                                    label="UPI QR Code Image"
                                    previewMode="image"
                                    existingUrl={settings.qrCodeUrl}
                                />
                            </div>

                            <div className="form-group">
                                <label className="form-field-label">Payment Instructions Text</label>
                                <textarea
                                    className="form-control"
                                    style={{ minHeight: '100px', resize: 'vertical' }}
                                    placeholder="Enter instructions for students..."
                                    value={settings.instructionsText}
                                    onChange={(e) => setSettings({ ...settings, instructionsText: e.target.value })}
                                    required
                                />
                                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '4px', display: 'block' }}>
                                    Default recommended: "Please scan the below QR Code or pay on the given UPI ID. Your course will be activated within 24 hours of payment. If not activated, please contact: 8830795649"
                                </span>
                            </div>

                            <div className="flex justify-end gap-2" style={{ marginTop: '16px' }}>
                                <button
                                    type="submit"
                                    className="btn btn-primary"
                                    disabled={savingSettings}
                                    style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                                >
                                    {savingSettings && <Loader2 size={14} className="spin" />}
                                    <span>Save Settings</span>
                                </button>
                            </div>
                        </form>
                    )}
                </div>
            )}

            {/* Rejection Reasons Dialog */}
            <Modal
                isOpen={rejectingRequestId !== null}
                onClose={() => setRejectingRequestId(null)}
                title="Reject Purchase Request"
                maxWidth="450px"
            >
                <div style={{ marginTop: '16px' }}>
                    <label className="form-field-label">Reason for Rejection (Optional)</label>
                    <textarea
                        className="form-control"
                        style={{ minHeight: '80px', resize: 'vertical', width: '100%', padding: '8px', border: '1px solid var(--border)', borderRadius: '6px' }}
                        placeholder="e.g. Transaction Reference could not be verified"
                        value={rejectionReason}
                        onChange={(e) => setRejectionReason(e.target.value)}
                    />
                    <div className="flex justify-end gap-2" style={{ marginTop: '20px' }}>
                        <button
                            className="btn btn-secondary"
                            onClick={() => setRejectingRequestId(null)}
                            disabled={submittingRejection}
                        >
                            Cancel
                        </button>
                        <button
                            className="btn btn-danger"
                            onClick={handleConfirmReject}
                            disabled={submittingRejection}
                            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                        >
                            {submittingRejection && <Loader2 size={14} className="spin" />}
                            <span>Reject Request</span>
                        </button>
                    </div>
                </div>
            </Modal>

            {/* Delete Record Confirmation Modal */}
            <Modal
                isOpen={deleteRequestId !== null}
                onClose={() => setDeleteRequestId(null)}
                title="Remove Purchase Record"
                maxWidth="400px"
            >
                <div style={{ marginTop: '16px' }}>
                    <p style={{ margin: 0, lineHeight: '1.5', color: 'var(--text-secondary)' }}>
                        Are you sure you want to remove this purchase request record? This action will not affect course access, but it will remove the purchase history from this dashboard.
                    </p>
                    <div className="flex justify-end gap-2" style={{ marginTop: '20px' }}>
                        <button
                            className="btn btn-secondary"
                            onClick={() => setDeleteRequestId(null)}
                            disabled={deletingRequest}
                        >
                            Cancel
                        </button>
                        <button
                            className="btn btn-danger"
                            onClick={handleConfirmDelete}
                            disabled={deletingRequest}
                            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                        >
                            {deletingRequest && <Loader2 size={14} className="spin" />}
                            <span>Remove</span>
                        </button>
                    </div>
                </div>
            </Modal>

            {/* Fullscreen Screenshot Modal */}
            <Modal
                isOpen={fullscreenScreenshot !== null}
                onClose={() => {
                    setFullscreenScreenshot(null);
                    setFullscreenType(null);
                }}
                title="Payment Screenshot Verification"
                maxWidth="800px"
            >
                <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '16px', alignItems: 'center' }}>
                    <div 
                        style={{ 
                            width: '100%', 
                            maxHeight: '60vh', 
                            overflow: 'auto', 
                            display: 'flex', 
                            justifyContent: 'center', 
                            background: '#090d16', 
                            borderRadius: '8px',
                            padding: '8px',
                            border: '1px solid var(--border)'
                        }}
                    >
                        {fullscreenType === 'pdf' ? (
                            <iframe
                                src={fullscreenScreenshot || ''}
                                title="PDF Screenshot View"
                                style={{ width: '100%', height: '550px', border: 'none', borderRadius: '4px' }}
                            />
                        ) : (
                            <img
                                src={fullscreenScreenshot || ''}
                                alt="Payment Screenshot Full Resolution"
                                style={{ maxWidth: '100%', height: 'auto', objectFit: 'contain', borderRadius: '4px' }}
                            />
                        )}
                    </div>
                    <div style={{ display: 'flex', gap: '8px', width: '100%', justifyContent: 'flex-end' }}>
                        <a
                            href={fullscreenScreenshot || ''}
                            download="payment_screenshot"
                            target="_blank"
                            rel="noreferrer"
                            className="btn btn-primary"
                            style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                        >
                            <Download size={14} />
                            Download Original
                        </a>
                        <button
                            className="btn btn-secondary"
                            onClick={() => {
                                setFullscreenScreenshot(null);
                                setFullscreenType(null);
                            }}
                        >
                            Close
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}
