// ═══════════════════════════════════════════════════════════════════════════════
// DeviceApprovals — Admin page for managing device login requests
// ═══════════════════════════════════════════════════════════════════════════════

import React, { useState, useEffect, useCallback } from 'react';
import {
    Shield,
    Clock,
    CheckCircle,
    XCircle,
    ShieldOff,
    Smartphone,
    Loader2,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../hooks/useToast';
import { UI_STRINGS } from '../constants';
import {
    subscribeToDevices,
    approveDevice,
    rejectDevice,
    deleteDevice,
} from '../services/deviceService';
import type { DeviceDocumentWithId } from '../services/deviceService';
import DeviceApprovalCard from '../components/DeviceApprovalCard';
import type { DeviceStatus } from '../types';

type FilterTab = DeviceStatus | 'all';

export default function DeviceApprovalsPage() {
    const { currentUser } = useAuth()!;
    const { showToast } = useToast();

    const [devices, setDevices] = useState<DeviceDocumentWithId[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<FilterTab>('pending');

    // Real-time subscription
    useEffect(() => {
        const unsubscribe = subscribeToDevices((data) => {
            setDevices(data);
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    // Filtered devices
    const filteredDevices = filter === 'all'
        ? devices
        : devices.filter((d) => d.status === filter);

    // Counts
    const pendingCount = devices.filter((d) => d.status === 'pending').length;
    const approvedCount = devices.filter((d) => d.status === 'approved').length;
    const rejectedCount = devices.filter((d) => d.status === 'rejected').length;
    const revokedCount = devices.filter((d) => d.status === 'revoked').length;

    const handleApprove = useCallback(async (deviceId: string) => {
        if (!currentUser) return;
        try {
            await approveDevice(deviceId, currentUser.uid);
            showToast(UI_STRINGS.DEVICE_APPROVALS.APPROVE_SUCCESS, 'success');
        } catch (err) {
            console.error('Approve error:', err);
            showToast(UI_STRINGS.DEVICE_APPROVALS.ERROR_UPDATE, 'error');
        }
    }, [currentUser, showToast]);

    const handleReject = useCallback(async (deviceId: string) => {
        if (!currentUser) return;
        try {
            await rejectDevice(deviceId, currentUser.uid);
            showToast(UI_STRINGS.DEVICE_APPROVALS.REJECT_SUCCESS, 'success');
        } catch (err) {
            console.error('Reject error:', err);
            showToast(UI_STRINGS.DEVICE_APPROVALS.ERROR_UPDATE, 'error');
        }
    }, [currentUser, showToast]);

    const handleDelete = useCallback(async (deviceId: string) => {
        try {
            await deleteDevice(deviceId);
            showToast(UI_STRINGS.DEVICE_APPROVALS.DELETE_SUCCESS, 'success');
        } catch (err) {
            console.error('Delete error:', err);
            showToast(UI_STRINGS.DEVICE_APPROVALS.ERROR_UPDATE, 'error');
        }
    }, [showToast]);

    const filterTabs: { key: FilterTab; label: string; count: number; icon: React.ElementType }[] = [
        { key: 'pending', label: 'Pending', count: pendingCount, icon: Clock },
        { key: 'approved', label: 'Approved', count: approvedCount, icon: CheckCircle },
        { key: 'rejected', label: 'Rejected', count: rejectedCount, icon: XCircle },
        { key: 'revoked', label: 'Revoked', count: revokedCount, icon: ShieldOff },
        { key: 'all', label: 'All', count: devices.length, icon: Smartphone },
    ];

    return (
        <div className="animate-fade-in">
            {/* Header */}
            <div className="flex items-center justify-between mb-lg">
                <div>
                    <div className="flex items-center gap-sm mb-sm">
                        <div
                            className="icon-container icon-container-accent"
                            style={{ width: '42px', height: '42px' }}
                        >
                            <Shield size={22} />
                        </div>
                        <h1>{UI_STRINGS.DEVICE_APPROVALS.TITLE}</h1>
                    </div>
                    <p style={{ margin: 0 }}>{UI_STRINGS.DEVICE_APPROVALS.SUBTITLE}</p>
                </div>
            </div>

            {/* Stat cards */}
            <div className="grid-cards-sm mb-lg">
                <div className="card stat-card-hover" style={{ borderLeft: '4px solid var(--warning)' }}>
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="stat-label">Pending Requests</p>
                            <p className="stat-value">{pendingCount}</p>
                        </div>
                        <div
                            className="stat-icon"
                            style={{ background: 'rgba(250, 204, 21, 0.12)' }}
                        >
                            <Clock size={24} style={{ color: 'var(--warning)' }} />
                        </div>
                    </div>
                </div>
                <div className="card stat-card-hover" style={{ borderLeft: '4px solid var(--success)' }}>
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="stat-label">Approved Devices</p>
                            <p className="stat-value">{approvedCount}</p>
                        </div>
                        <div
                            className="stat-icon"
                            style={{ background: 'rgba(16, 185, 129, 0.12)' }}
                        >
                            <CheckCircle size={24} style={{ color: 'var(--success)' }} />
                        </div>
                    </div>
                </div>
                <div className="card stat-card-hover" style={{ borderLeft: '4px solid var(--error)' }}>
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="stat-label">Rejected Devices</p>
                            <p className="stat-value">{rejectedCount}</p>
                        </div>
                        <div
                            className="stat-icon"
                            style={{ background: 'rgba(239, 68, 68, 0.12)' }}
                        >
                            <XCircle size={24} style={{ color: 'var(--error)' }} />
                        </div>
                    </div>
                </div>
                <div className="card stat-card-hover" style={{ borderLeft: '4px solid var(--text-secondary)' }}>
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="stat-label">Revoked Devices</p>
                            <p className="stat-value">{revokedCount}</p>
                        </div>
                        <div
                            className="stat-icon"
                            style={{ background: 'rgba(148, 163, 184, 0.12)' }}
                        >
                            <ShieldOff size={24} style={{ color: 'var(--text-secondary)' }} />
                        </div>
                    </div>
                </div>
            </div>

            {/* Filter tabs */}
            <div className="tab-navigation">
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
                                }}
                            >
                                {tab.count}
                            </span>
                        )}
                    </button>
                ))}
            </div>

            {/* Device list */}
            <div className="card">
                {loading ? (
                    <div className="flex items-center justify-center" style={{ padding: '48px 0' }}>
                        <Loader2 size={24} className="spin" style={{ color: 'var(--primary)' }} />
                        <span style={{ marginLeft: '12px', color: 'var(--text-secondary)' }}>
                            {UI_STRINGS.DEVICE_APPROVALS.LOADING}
                        </span>
                    </div>
                ) : filteredDevices.length === 0 ? (
                    <div className="empty-state" style={{ padding: '48px 0' }}>
                        <Smartphone
                            size={48}
                            style={{ color: 'var(--text-secondary)', opacity: 0.3, marginBottom: '12px' }}
                        />
                        <p>{UI_STRINGS.DEVICE_APPROVALS.EMPTY}</p>
                    </div>
                ) : (
                    filteredDevices.map((device) => (
                        <DeviceApprovalCard
                            key={device.id}
                            device={device}
                            onApprove={handleApprove}
                            onReject={handleReject}
                            onDelete={handleDelete}
                        />
                    ))
                )}
            </div>
        </div>
    );
}
