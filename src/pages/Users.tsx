import { useState, useEffect, useMemo } from 'react';
import type { User, Batch } from '../types';
import { Edit2, Trash2, Ban, ShieldCheck, ShieldOff, AlertTriangle, CheckCircle } from 'lucide-react';
import { userService } from '../services/userService';
import { batchService } from '../services/batchService';
import { UI_STRINGS } from '../constants';
import PageHeader from '../components/PageHeader';
import LoadingState from '../components/LoadingState';
import ErrorAlert from '../components/ErrorAlert';
import Modal from '../components/Modal';
import DataTable from '../components/DataTable';
import type { Column } from '../components/DataTable';
import Avatar from '../components/Avatar';
import CloudinaryUpload from '../components/CloudinaryUpload';
import { FormField, FormRow, FormActions } from '../components/FormField';
import CustomSelect from '../components/CustomSelect';
import { useUser } from '../hooks/useUser';
import { useToast } from '../hooks/useToast';

export default function UsersPage() {
    const { students: users, loading: usersLoading, error: usersError } = useUser();
    const [localUsers, setLocalUsers] = useState<User[]>([]);
    const loading = false;
    const [error, setError] = useState<string | null>(null);
    const [showModal, setShowModal] = useState(false);
    const [viewingUser, setViewingUser] = useState<User | null>(null);
    const [deletingUser, setDeletingUser] = useState<User | null>(null);
    const [activeTab, setActiveTab] = useState<'active' | 'blocked'>('active');

    // Photo upload states
    const [uploadedPhotoUrl, setUploadedPhotoUrl] = useState<string | null>(null);
    const [uploadingPhoto, setUploadingPhoto] = useState(false);

    // Block/Unblock states
    const [blockingUser, setBlockingUser] = useState<User | null>(null);
    const [unblockingUser, setUnblockingUser] = useState<User | null>(null);
    const [blockReason, setBlockReason] = useState('');
    const [blockLoading, setBlockLoading] = useState(false);

    const [batches, setBatches] = useState<Batch[]>([]);

    const [newUser, setNewUser] = useState({
        name: '',
        email: '',
        phone: '',
        batch: '',
        batchId: '',
        course: '',
        skills: '',
        profilePhoto: ''
    });
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const { showToast } = useToast();

    // Subscribe to batches in real-time
    useEffect(() => {
        const unsubscribe = batchService.subscribeToBatches((data) => {
            setBatches(data);
        });
        return () => unsubscribe();
    }, []);

    // Keep localUsers synchronized with Firebase Context
    useEffect(() => {
        setLocalUsers(users);
    }, [users]);

    // Split users into active and blocked using localUsers for instant updates
    const activeUsers = useMemo(() => localUsers.filter(u => !u.isBlocked), [localUsers]);
    const blockedUsers = useMemo(() => localUsers.filter(u => u.isBlocked), [localUsers]);



    const handleAddStudent = async (e: React.FormEvent) => {
        e.preventDefault();
        const phoneRegex = /^[0-9]{10}$/;
        if (!phoneRegex.test(newUser.phone)) {
            setError("Mobile number must be exactly 10 digits");
            showToast("Mobile number must be exactly 10 digits", "error");
            return;
        }
        if (!newUser.batchId) {
            setError("Please select a batch for the student");
            showToast("Please select a batch for the student", "error");
            return;
        }

        const selectedBatch = batches.find(b => b.id === newUser.batchId);
        if (!selectedBatch) {
            setError("Selected batch is invalid");
            showToast("Selected batch is invalid", "error");
            return;
        }

        try {
            setUploadingPhoto(true);
            const photoUrl = uploadedPhotoUrl || newUser.profilePhoto;
            const parsedSkills = newUser.skills
                ? newUser.skills.split(',').map(s => s.trim()).filter(Boolean)
                : [];
                
            const studentCourse = selectedBatch.courseName || '';
            const studentCourseId = selectedBatch.courseId || '';

            if (editingUser) {
                await userService.updateUser(editingUser.id, {
                    ...newUser,
                    batch: selectedBatch.name,
                    course: studentCourse,
                    courseId: studentCourseId,
                    skills: parsedSkills,
                    profilePhoto: photoUrl
                }, editingUser.batchId);
                showToast("Student updated successfully", "success");
            } else {
                await userService.createUser({
                    ...newUser,
                    batch: selectedBatch.name,
                    course: studentCourse,
                    courseId: studentCourseId,
                    profilePhoto: photoUrl,
                    skills: parsedSkills,
                    status: 'active',
                    isBlocked: false
                } as unknown as Omit<User, 'id' | 'enrollmentDate' | 'createdAt'>);
                showToast(`Student added! Welcome email will be sent to ${newUser.email}`, "success");
            }
            setShowModal(false);
            resetForm();
        } catch (err) {
            console.error("Error saving student: ", err);
            const errorMessage = (err as Error).message || UI_STRINGS.USERS.ERROR_CREATE;
            setError(errorMessage);
            showToast(errorMessage, "error");
        } finally {
            setUploadingPhoto(false);
        }
    };

    const resetForm = () => {
        setEditingUser(null);
        setUploadedPhotoUrl(null);
        setNewUser({ name: '', email: '', phone: '', batch: '', batchId: '', course: '', skills: '', profilePhoto: '' });
    };

    const handleBlockUser = async () => {
        if (!blockingUser) return;
        setBlockLoading(true);
        const previousUsers = [...localUsers];
        
        // Optimistically update state
        setLocalUsers(prev => prev.map(u => 
            u.id === blockingUser.id 
                ? { ...u, isBlocked: true, blockedReason: blockReason, blockedAt: new Date() } 
                : u
        ));

        try {
            await userService.blockUser(blockingUser.id, blockReason);
            showToast(UI_STRINGS.USERS.BLOCK_SUCCESS, "success");
            setBlockingUser(null);
            setBlockReason('');
        } catch {
            showToast(UI_STRINGS.USERS.BLOCK_ERROR, "error");
            // Rollback optimistic state update on failure
            setLocalUsers(previousUsers);
        } finally {
            setBlockLoading(false);
        }
    };

    const handleUnblockUser = async () => {
        if (!unblockingUser) return;
        setBlockLoading(true);
        const previousUsers = [...localUsers];

        // Optimistically update state
        setLocalUsers(prev => prev.map(u => 
            u.id === unblockingUser.id 
                ? { ...u, isBlocked: false, blockedReason: undefined, blockedAt: undefined } 
                : u
        ));

        try {
            await userService.unblockUser(unblockingUser.id);
            showToast(UI_STRINGS.USERS.UNBLOCK_SUCCESS, "success");
            setUnblockingUser(null);
        } catch {
            showToast(UI_STRINGS.USERS.BLOCK_ERROR, "error");
            // Rollback optimistic state update on failure
            setLocalUsers(previousUsers);
        } finally {
            setBlockLoading(false);
        }
    };

    const confirmDelete = async () => {
        if (!deletingUser) return;
        try {
            await userService.deleteUser(deletingUser.id, deletingUser.batchId);
            showToast("Student deleted successfully", "success");
            setDeletingUser(null);
        } catch {
            showToast("Failed to delete student", "error");
        }
    };

    const openEditModal = (user: User) => {
        setEditingUser(user);
        setNewUser({
            name: user.name || '',
            email: user.email || '',
            phone: user.phone || '',
            batch: user.batch || '',
            batchId: user.batchId || '',
            course: user.course || '',
            skills: user.skills ? (Array.isArray(user.skills) ? user.skills.join(', ') : user.skills) : '',
            profilePhoto: user.profilePhoto || ''
        });
        setUploadedPhotoUrl(null);
        setShowModal(true);
    };

    // Active students columns
    const activeColumns: Column<User>[] = [
        {
            key: 'name',
            header: UI_STRINGS.USERS.TH_NAME,
            width: '30%',
            render: (user) => (
                <div className="flex items-center">
                    <Avatar src={user.profilePhoto} fallback={user.name?.charAt(0) || '?'} size="sm" className="mr-3" />
                    <div style={{ marginLeft: '12px' }}>
                        <div className="font-medium">{user.name}</div>
                        <div className="text-xs text-muted">{user.email}</div>
                    </div>
                </div>
            ),
        },
        {
            key: 'phone',
            header: 'Mobile Number',
            width: '20%',
            render: (user) => <span className="text-sm">{user.phone}</span>,
        },
        {
            key: 'batch',
            header: UI_STRINGS.USERS.TH_BATCH,
            width: '15%',
            render: (user) => user.batch ? (
                <span style={{ backgroundColor: 'rgba(99, 102, 241, 0.1)', color: 'var(--accent-blue)', padding: '4px 8px', borderRadius: '4px', fontSize: '0.85rem' }}>
                    {user.batch}
                </span>
            ) : null,
        },
        {
            key: 'joined',
            header: UI_STRINGS.USERS.TH_JOINED,
            width: '15%',
            render: (user) => user.enrollmentDate?.toLocaleDateString() || UI_STRINGS.COMMON.N_A || 'N/A',
        },
        {
            key: 'actions',
            header: UI_STRINGS.USERS.TH_ACTIONS,
            width: '20%',
            align: 'center',
            render: (user) => (
                <div className="flex items-center gap-2 justify-center">
                    <button className="icon-btn" title="Edit Student" onClick={() => openEditModal(user)} style={{ color: 'var(--accent-blue)' }}>
                        <Edit2 size={18} />
                    </button>
                    <button className="icon-btn" title="Delete Student" onClick={() => setDeletingUser(user)} style={{ color: 'var(--error)' }}>
                        <Trash2 size={18} />
                    </button>
                    <button className="icon-btn" title="Block Student" onClick={() => setBlockingUser(user)} style={{ color: 'var(--text-secondary)' }}>
                        <Ban size={18} />
                    </button>
                </div>
            ),
        },
    ];

    // Blocked students columns
    const blockedColumns: Column<User>[] = [
        {
            key: 'name',
            header: UI_STRINGS.USERS.TH_NAME,
            width: '25%',
            render: (user) => (
                <div className="flex items-center">
                    <Avatar src={user.profilePhoto} fallback={user.name?.charAt(0) || '?'} size="sm" className="mr-3" />
                    <div style={{ marginLeft: '12px' }}>
                        <div className="font-medium">{user.name}</div>
                        <div className="text-xs text-muted">{user.email}</div>
                    </div>
                </div>
            ),
        },
        {
            key: 'phone',
            header: 'Mobile',
            width: '15%',
            render: (user) => <span className="text-sm">{user.phone}</span>,
        },
        {
            key: 'batch',
            header: UI_STRINGS.USERS.TH_BATCH,
            width: '12%',
            render: (user) => user.batch ? (
                <span style={{ backgroundColor: 'rgba(99, 102, 241, 0.1)', color: 'var(--accent-blue)', padding: '4px 8px', borderRadius: '4px', fontSize: '0.85rem' }}>
                    {user.batch}
                </span>
            ) : <span className="text-xs text-muted">—</span>,
        },
        {
            key: 'blockedAt',
            header: UI_STRINGS.USERS.BLOCKED_DATE,
            width: '15%',
            render: (user) => {
                if (!user.blockedAt) return <span className="text-xs text-muted">—</span>;
                const date = user.blockedAt instanceof Date ? user.blockedAt : new Date(user.blockedAt);
                return <span className="text-sm" style={{ color: '#f87171' }}>{date.toLocaleDateString()}</span>;
            },
        },
        {
            key: 'blockedReason',
            header: UI_STRINGS.USERS.BLOCKED_REASON,
            width: '18%',
            render: (user) => user.blockedReason ? (
                <span className="block-reason-text" title={user.blockedReason}>{user.blockedReason}</span>
            ) : (
                <span className="block-reason-text empty">No reason provided</span>
            ),
        },
        {
            key: 'actions',
            header: UI_STRINGS.USERS.TH_ACTIONS,
            width: '15%',
            align: 'center',
            render: (user) => (
                <div className="flex items-center gap-2 justify-center">
                    <button className="btn-unblock" onClick={() => setUnblockingUser(user)}>
                        <ShieldCheck size={15} /> Unblock
                    </button>
                    <button className="icon-btn" title="Delete Student" onClick={() => setDeletingUser(user)} style={{ color: 'var(--error)' }}>
                        <Trash2 size={16} />
                    </button>
                </div>
            ),
        },
    ];

    const activeBatches = useMemo(() => batches.filter(b => b.active !== false), [batches]);

    const batchOptions = useMemo(() => {
        const options = activeBatches.map(b => ({
            value: b.id,
            label: b.name
        }));
        
        // If editing a user and their current batch is inactive, add it to options
        if (editingUser?.batchId && editingUser?.batch) {
            const hasCurrentBatch = options.some(opt => opt.value === editingUser.batchId);
            if (!hasCurrentBatch) {
                options.unshift({
                    value: editingUser.batchId,
                    label: `${editingUser.batch} (Inactive)`
                });
            }
        }
        return options;
    }, [activeBatches, editingUser]);

    if (loading || usersLoading) {
        return <LoadingState message={UI_STRINGS.USERS.LOADING} />;
    }

    return (
        <div>
            {error || (usersError && !usersError.includes("permissions")) ? (
                <ErrorAlert message={error || usersError} />
            ) : null}
            <PageHeader
                title={UI_STRINGS.USERS.TITLE}
                subtitle={UI_STRINGS.USERS.SUBTITLE}
                actionLabel={UI_STRINGS.USERS.NEW_BTN}
                onAction={() => setShowModal(true)}
            />

            {/* Tab Navigation */}
            <div className="tab-navigation" style={{ marginBottom: '20px' }}>
                <button
                    className={`tab-btn ${activeTab === 'active' ? 'active' : ''}`}
                    onClick={() => setActiveTab('active')}
                >
                    <ShieldCheck size={18} />
                    {UI_STRINGS.USERS.TAB_ACTIVE}
                    <span className="tab-count-badge">{activeUsers.length}</span>
                </button>
                <button
                    className={`tab-btn ${activeTab === 'blocked' ? 'active' : ''}`}
                    onClick={() => setActiveTab('blocked')}
                >
                    <ShieldOff size={18} />
                    {UI_STRINGS.USERS.TAB_BLOCKED}
                    {blockedUsers.length > 0 && (
                        <span className="tab-count-badge danger">{blockedUsers.length}</span>
                    )}
                </button>
            </div>

            {/* Tab Content */}
            <div className="card mb-lg tab-content">
                {activeTab === 'active' ? (
                    <DataTable
                        columns={activeColumns}
                        data={activeUsers}
                        keyExtractor={(user) => user.id}
                        emptyMessage={UI_STRINGS.USERS.EMPTY}
                        searchPlaceholder="Search students by name, email, or batch..."
                        searchable
                        pageSize={10}
                    />
                ) : (
                    blockedUsers.length > 0 ? (
                        <DataTable
                            columns={blockedColumns}
                            data={blockedUsers}
                            keyExtractor={(user) => user.id}
                            emptyMessage={UI_STRINGS.USERS.BLOCKED_EMPTY}
                            searchPlaceholder="Search blocked students..."
                            searchable
                            pageSize={10}
                            renderAfterRow={() => null}
                        />
                    ) : (
                        <div className="blocked-empty-state">
                            <div className="blocked-empty-icon">
                                <CheckCircle size={36} />
                            </div>
                            <h3>All Clear!</h3>
                            <p>{UI_STRINGS.USERS.BLOCKED_EMPTY}</p>
                        </div>
                    )
                )}
            </div>

            {/* Add/Edit Student Modal */}
            <Modal
                isOpen={showModal}
                onClose={() => {
                    setShowModal(false);
                    resetForm();
                }}
                title={editingUser ? "Edit Student" : UI_STRINGS.USERS.MODAL_TITLE}
            >
                <form onSubmit={handleAddStudent} className="form-layout">
                    <CloudinaryUpload
                        label="Profile Photo (PNG/JPG)"
                        folder={editingUser ? `innov8/profile-photos/${editingUser.id}` : "innov8/profile-photos"}
                        acceptedTypes={['image/png', 'image/jpeg', 'image/webp']}
                        maxSizeMB={2}
                        previewMode="image"
                        existingUrl={newUser.profilePhoto || undefined}
                        onUploadComplete={(result) => {
                            setUploadedPhotoUrl(result.url);
                        }}
                        onError={(msg) => showToast(msg, 'error')}
                    />
                    <FormRow>
                        <FormField label={UI_STRINGS.USERS.FORM_FULL_NAME}>
                            <input type="text" required value={newUser.name} onChange={e => setNewUser({ ...newUser, name: e.target.value })} />
                        </FormField>
                        <FormField label={UI_STRINGS.USERS.FORM_EMAIL}>
                            <input type="email" required value={newUser.email} onChange={e => setNewUser({ ...newUser, email: e.target.value })} />
                        </FormField>
                    </FormRow>
                    <FormRow>
                        <FormField label={UI_STRINGS.USERS.FORM_PHONE}>
                            <input
                                type="tel"
                                required
                                maxLength={10}
                                value={newUser.phone}
                                onChange={e => {
                                    const val = e.target.value.replace(/\D/g, '');
                                    setNewUser({ ...newUser, phone: val });
                                }}
                            />
                        </FormField>
                        <FormField label={UI_STRINGS.USERS.FORM_BATCH}>
                            <CustomSelect
                                options={batchOptions}
                                value={newUser.batchId}
                                onChange={(val) => setNewUser({ ...newUser, batchId: val })}
                                placeholder="Select dynamic batch..."
                                searchable={true}
                            />
                        </FormField>
                    </FormRow>
                    <FormRow>
                        <FormField label="Skills (comma-separated)">
                            <input type="text" placeholder="React, Node.js, UI/UX" value={newUser.skills} onChange={e => setNewUser({ ...newUser, skills: e.target.value })} />
                        </FormField>
                    </FormRow>
                    <FormActions>
                        <button type="button" className="btn btn-secondary" onClick={() => { setShowModal(false); resetForm(); }} disabled={uploadingPhoto}>{UI_STRINGS.COMMON.CANCEL}</button>
                        <button type="submit" className="btn btn-primary" disabled={uploadingPhoto}>
                            {uploadingPhoto ? UI_STRINGS.COMMON.LOADING : UI_STRINGS.COMMON.SAVE}
                        </button>
                    </FormActions>
                </form>
            </Modal>

            {/* View Student Details Modal */}
            <Modal isOpen={!!viewingUser} onClose={() => setViewingUser(null)} title={viewingUser?.name || ''} maxWidth="550px">
                {viewingUser && (
                    <div>
                        <div className="text-center mb-xl">
                            <div style={{ margin: '0 auto 16px' }}>
                                <Avatar src={viewingUser.profilePhoto} fallback={viewingUser.name?.charAt(0) || '?'} size="md" className="" />
                            </div>
                            <p style={{ color: 'var(--primary)', fontWeight: 500 }}>{UI_STRINGS.USERS.TH_BATCH} {viewingUser.batch}</p>
                        </div>
                        <div className="grid-single" style={{ gap: 'var(--space-lg)' }}>
                            <div className="glass-card" style={{ padding: 'var(--space-md)', borderRadius: 'var(--radius-md)' }}>
                                <h3 className="section-label mb-md" style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>{UI_STRINGS.USERS.CONTACT_INFO}</h3>
                                <div className="grid-single" style={{ gap: '8px' }}>
                                    <div className="flex justify-between">
                                        <span className="text-muted">{UI_STRINGS.USERS.EMAIL_LABEL}</span>
                                        <span className="font-medium">{viewingUser.email}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-muted">{UI_STRINGS.USERS.PHONE_LABEL}</span>
                                        <span className="font-medium">{viewingUser.phone || UI_STRINGS.USERS.NOT_PROVIDED}</span>
                                    </div>
                                </div>
                            </div>
                            <div className="glass-card" style={{ padding: 'var(--space-md)', borderRadius: 'var(--radius-md)' }}>
                                <h3 className="section-label mb-md" style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>{UI_STRINGS.USERS.ACADEMIC_DETAILS}</h3>
                                <div className="grid-single" style={{ gap: '8px' }}>
                                    <div className="flex justify-between">
                                        <span className="text-muted">{UI_STRINGS.USERS.ENROLLMENT_DATE_LABEL}</span>
                                        <span className="font-medium">{viewingUser.enrollmentDate?.toLocaleDateString() || 'N/A'}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-muted">{UI_STRINGS.USERS.CURRENT_STATUS_LABEL}</span>
                                        <span className="badge badge-success">{UI_STRINGS.USERS.STATUS_ACTIVE}</span>
                                    </div>
                                </div>
                            </div>
                            {viewingUser.skills && viewingUser.skills.length > 0 && (
                                <div className="glass-card" style={{ padding: 'var(--space-md)', borderRadius: 'var(--radius-md)' }}>
                                    <h3 className="section-label mb-md" style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>{UI_STRINGS.USERS.ENROLLED_COURSES}</h3>
                                    <div className="flex gap-2" style={{ flexWrap: 'wrap' }}>
                                        {Array.isArray(viewingUser.skills) ? viewingUser.skills.map((skill, idx) => (
                                            <span key={idx} className="badge badge-primary text-xs">{skill}</span>
                                        )) : viewingUser.skills}
                                    </div>
                                </div>
                            )}
                        </div>
                        <div className="mt-lg flex justify-center">
                            <button className="btn btn-secondary w-full" onClick={() => setViewingUser(null)}>
                                {UI_STRINGS.USERS.CLOSE_DETAILS}
                            </button>
                        </div>
                    </div>
                )}
            </Modal>

            {/* Delete Confirmation Modal */}
            <Modal isOpen={!!deletingUser} onClose={() => setDeletingUser(null)} title="Confirm Deletion" maxWidth="400px">
                <div className="p-4" style={{ paddingTop: '16px', paddingBottom: '16px' }}>
                    <p style={{ marginBottom: '24px', color: 'var(--text-secondary)' }}>
                        Are you sure you want to delete <strong>{deletingUser?.name}</strong>? This action cannot be undone.
                    </p>
                    <div className="flex justify-end gap-3 mt-6">
                        <button className="btn btn-secondary" onClick={() => setDeletingUser(null)}>
                            {UI_STRINGS.COMMON.CANCEL}
                        </button>
                        <button className="btn btn-primary" style={{ backgroundColor: 'var(--error)', borderColor: 'var(--error)' }} onClick={confirmDelete}>
                            Delete
                        </button>
                    </div>
                </div>
            </Modal>

            {/* Block Confirmation Modal */}
            <Modal
                isOpen={!!blockingUser}
                onClose={() => { setBlockingUser(null); setBlockReason(''); }}
                title={UI_STRINGS.USERS.BLOCK_CONFIRM_TITLE}
                maxWidth="480px"
            >
                <div style={{ padding: '16px' }}>
                    <div className="block-warning-banner">
                        <AlertTriangle size={20} />
                        <div>
                            <strong>{blockingUser?.name}</strong> will be immediately logged out from all devices and won't be able to access the platform until unblocked.
                        </div>
                    </div>

                    <div style={{ marginBottom: '20px' }}>
                        <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
                            {UI_STRINGS.USERS.BLOCK_REASON_LABEL}
                        </label>
                        <textarea
                            rows={3}
                            placeholder={UI_STRINGS.USERS.BLOCK_REASON_PLACEHOLDER}
                            value={blockReason}
                            onChange={e => setBlockReason(e.target.value)}
                            style={{ width: '100%', resize: 'vertical' }}
                        />
                    </div>

                    <div className="flex justify-end gap-3">
                        <button
                            className="btn btn-secondary"
                            onClick={() => { setBlockingUser(null); setBlockReason(''); }}
                            disabled={blockLoading}
                        >
                            {UI_STRINGS.COMMON.CANCEL}
                        </button>
                        <button
                            className="btn"
                            style={{ backgroundColor: '#ef4444', color: '#fff', border: 'none', display: 'flex', alignItems: 'center', gap: '8px' }}
                            onClick={handleBlockUser}
                            disabled={blockLoading}
                        >
                            <Ban size={16} />
                            {blockLoading ? 'Blocking...' : 'Block Student'}
                        </button>
                    </div>
                </div>
            </Modal>

            {/* Unblock Confirmation Modal */}
            <Modal
                isOpen={!!unblockingUser}
                onClose={() => setUnblockingUser(null)}
                title={UI_STRINGS.USERS.UNBLOCK_CONFIRM_TITLE}
                maxWidth="420px"
            >
                <div style={{ padding: '16px' }}>
                    <div style={{
                        display: 'flex', alignItems: 'flex-start', gap: '12px',
                        padding: '14px 16px', background: 'rgba(16, 185, 129, 0.08)',
                        border: '1px solid rgba(16, 185, 129, 0.15)', borderRadius: '12px',
                        marginBottom: '20px', color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.6
                    }}>
                        <ShieldCheck size={20} style={{ flexShrink: 0, marginTop: '2px', color: '#10b981' }} />
                        <div>
                            <strong>{unblockingUser?.name}</strong> will regain full access to the platform and can log in again.
                        </div>
                    </div>

                    <div className="flex justify-end gap-3">
                        <button className="btn btn-secondary" onClick={() => setUnblockingUser(null)} disabled={blockLoading}>
                            {UI_STRINGS.COMMON.CANCEL}
                        </button>
                        <button
                            className="btn"
                            style={{ backgroundColor: '#10b981', color: '#fff', border: 'none', display: 'flex', alignItems: 'center', gap: '8px' }}
                            onClick={handleUnblockUser}
                            disabled={blockLoading}
                        >
                            <ShieldCheck size={16} />
                            {blockLoading ? 'Unblocking...' : 'Unblock Student'}
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}
