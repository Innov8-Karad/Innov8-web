// ═══════════════════════════════════════════════════════════════════════════════
// DeviceApprovalCard — Individual device request card for admin review
// ═══════════════════════════════════════════════════════════════════════════════

import { useState } from 'react';
import {
    Check,
    X,
    Smartphone,
    Clock,
    User,
    Loader2,
    Trash2,
    Monitor,
} from 'lucide-react';
import type { DeviceDocumentWithId } from '../services/deviceService';

interface DeviceApprovalCardProps {
    device: DeviceDocumentWithId;
    onApprove: (id: string) => Promise<void>;
    onReject: (id: string) => Promise<void>;
    onDelete: (id: string) => Promise<void>;
}

export default function DeviceApprovalCard({
    device,
    onApprove,
    onReject,
    onDelete,
}: DeviceApprovalCardProps) {
    const [approving, setApproving] = useState(false);
    const [rejecting, setRejecting] = useState(false);
    const [deleting, setDeleting] = useState(false);

    const handleApprove = async () => {
        setApproving(true);
        try {
            await onApprove(device.id);
        } finally {
            setApproving(false);
        }
    };

    const handleReject = async () => {
        setRejecting(true);
        try {
            await onReject(device.id);
        } finally {
            setRejecting(false);
        }
    };

    const handleDelete = async () => {
        if (!window.confirm('Are you sure you want to delete this device record? The user will need to re-register.')) return;
        setDeleting(true);
        try {
            await onDelete(device.id);
        } finally {
            setDeleting(false);
        }
    };

    // Format timestamp
    const formatDate = (ts: { toDate?: () => Date } | Date | number | string | null | undefined) => {
        if (!ts) return 'Unknown';
        
        let date: Date;
        if (ts instanceof Date) {
            date = ts;
        } else if (typeof ts === 'object' && 'toDate' in ts && typeof ts.toDate === 'function') {
            date = ts.toDate();
        } else {
            date = new Date(ts as string | number);
        }

        return date.toLocaleDateString('en-IN', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    const statusBadgeClass =
        device.status === 'approved'
            ? 'badge-success'
            : device.status === 'rejected' || device.status === 'revoked'
            ? 'badge-error'
            : 'badge-warning';

    return (
        <div className="device-card" id={`device-card-${device.id}`}>
            <div className="flex items-center justify-between" style={{ marginBottom: '12px' }}>
                <div className="flex items-center gap-sm">
                    <div
                        className="stat-icon"
                        style={{
                            width: '42px',
                            height: '42px',
                            background: 'rgba(var(--primary-rgb), 0.1)',
                            borderRadius: '10px',
                        }}
                    >
                        <Smartphone size={20} style={{ color: 'var(--primary)' }} />
                    </div>
                    <div>
                        <p style={{ margin: 0, fontWeight: 600, color: 'var(--text-main)', fontSize: '0.95rem' }}>
                            {device.userName || 'Unknown User'}
                        </p>
                        <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                            {device.userEmail}
                        </p>
                    </div>
                </div>
                <span className={`badge ${statusBadgeClass}`}>
                    {device.status}
                </span>
            </div>

            {/* Device info grid */}
            <div
                style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '8px',
                    padding: '12px',
                    background: 'var(--bg-card-accent)',
                    borderRadius: 'var(--radius-sm)',
                    marginBottom: '12px',
                    fontSize: '0.85rem',
                }}
            >
                <div className="flex items-center gap-sm">
                    <Monitor size={14} style={{ color: 'var(--text-secondary)', flexShrink: 0 }} />
                    <span style={{ color: 'var(--text-secondary)' }}>
                        {device.deviceMeta?.deviceName || 'Unknown'}
                    </span>
                </div>
                <div className="flex items-center gap-sm">
                    <Smartphone size={14} style={{ color: 'var(--text-secondary)', flexShrink: 0 }} />
                    <span style={{ color: 'var(--text-secondary)' }}>
                        {device.deviceMeta?.modelName || 'Unknown'}
                    </span>
                </div>
                <div className="flex items-center gap-sm">
                    <User size={14} style={{ color: 'var(--text-secondary)', flexShrink: 0 }} />
                    <span style={{ color: 'var(--text-secondary)' }}>
                        {device.deviceMeta?.osName} {device.deviceMeta?.osVersion}
                    </span>
                </div>
                <div className="flex items-center gap-sm">
                    <Clock size={14} style={{ color: 'var(--text-secondary)', flexShrink: 0 }} />
                    <span style={{ color: 'var(--text-secondary)' }}>
                        {formatDate(device.createdAt)}
                    </span>
                </div>
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-sm" style={{ justifyContent: 'flex-end' }}>
                {device.status === 'pending' && (
                    <>
                        <button
                            className="btn btn-secondary"
                            onClick={handleReject}
                            disabled={rejecting || approving}
                            style={{
                                padding: '6px 14px',
                                fontSize: '0.85rem',
                                color: 'var(--error)',
                                borderColor: 'rgba(239, 68, 68, 0.3)',
                            }}
                        >
                            {rejecting ? <Loader2 size={14} className="spin" /> : <X size={14} />}
                            <span style={{ marginLeft: '4px' }}>Reject</span>
                        </button>
                        <button
                            className="btn btn-primary"
                            onClick={handleApprove}
                            disabled={approving || rejecting}
                            style={{ padding: '6px 14px', fontSize: '0.85rem' }}
                        >
                            {approving ? <Loader2 size={14} className="spin" /> : <Check size={14} />}
                            <span style={{ marginLeft: '4px' }}>Approve</span>
                        </button>
                    </>
                )}
                {device.status !== 'pending' && (
                    <button
                        className="btn btn-secondary"
                        onClick={handleDelete}
                        disabled={deleting}
                        style={{
                            padding: '6px 14px',
                            fontSize: '0.85rem',
                            color: 'var(--error)',
                            borderColor: 'rgba(239, 68, 68, 0.3)',
                        }}
                    >
                        {deleting ? <Loader2 size={14} className="spin" /> : <Trash2 size={14} />}
                        <span style={{ marginLeft: '4px' }}>Remove</span>
                    </button>
                )}
            </div>
        </div>
    );
}
