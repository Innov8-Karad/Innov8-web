import { useState, useEffect } from 'react';
import type { User, Course } from '../types';
import { UserCheck, UserX, Edit2, Trash2, Ban } from 'lucide-react';
import { userService } from '../services/userService';
import { courseService } from '../services/courseService';
import { UI_STRINGS } from '../constants';
import PageHeader from '../components/PageHeader';
import LoadingState from '../components/LoadingState';
import ErrorAlert from '../components/ErrorAlert';
import SearchInput from '../components/SearchInput';
import Modal from '../components/Modal';
import DataTable from '../components/DataTable';
import type { Column } from '../components/DataTable';
import Avatar from '../components/Avatar';
import CloudinaryUpload from '../components/CloudinaryUpload';
import { FormField, FormRow, FormActions } from '../components/FormField';
import { useUser } from '../hooks/useUser';
import { useToast } from '../hooks/useToast';

export default function UsersPage() {
    const { students: users, loading: usersLoading, error: usersError } = useUser();
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showModal, setShowModal] = useState(false);
    const [viewingUser, setViewingUser] = useState<User | null>(null);
    const [deletingUser, setDeletingUser] = useState<User | null>(null);
    const [courses, setCourses] = useState<Course[]>([]);
    
    // Photo upload states
    const [uploadedPhotoUrl, setUploadedPhotoUrl] = useState<string | null>(null);
    const [uploadingPhoto, setUploadingPhoto] = useState(false);

    const [newUser, setNewUser] = useState({
        name: '',
        email: '',
        phone: '',
        batch: '',
        course: '',
        skills: '',
        profilePhoto: ''
    });
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const { showToast } = useToast();

    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);
                setError(null);
                const courseData = await courseService.fetchCourses();
                setCourses(courseData);
            } catch (err) {
                console.error("Error fetching courses: ", err);
                setError(UI_STRINGS.USERS.ERROR_LOAD);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    const handleAddStudent = async (e: React.FormEvent) => {
        e.preventDefault();

        const phoneRegex = /^[0-9]{10}$/;
        if (!phoneRegex.test(newUser.phone)) {
            setError("Mobile number must be exactly 10 digits");
            showToast("Mobile number must be exactly 10 digits", "error");
            return;
        }
        try {
            setUploadingPhoto(true);
            const photoUrl = uploadedPhotoUrl || newUser.profilePhoto;

            const parsedSkills = newUser.skills
                ? newUser.skills.split(',').map(s => s.trim()).filter(Boolean)
                : [];

            if (editingUser) {
                await userService.updateUser(editingUser.id, {
                    ...newUser,
                    skills: parsedSkills,
                    profilePhoto: photoUrl
                });
                showToast("Student updated successfully", "success");
            } else {
                await userService.createUser({
                    ...newUser,
                    profilePhoto: photoUrl,
                    skills: parsedSkills,
                    status: 'active',
                    isBlocked: false
                } as unknown as Omit<User, 'id' | 'enrollmentDate' | 'createdAt'>);
                showToast("Student added successfully", "success");
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
        setNewUser({ name: '', email: '', phone: '', batch: '', course: '', skills: '', profilePhoto: '' });
    };



    const handleToggleStatus = async (user: User) => {
        try {
            const newStatus = user.status === 'inactive' ? 'active' : 'inactive';
            await userService.updateUser(user.id, { status: newStatus });
            showToast(`Student ${newStatus === 'active' ? 'activated' : 'deactivated'}`, "success");
        } catch {
            showToast("Failed to update status", "error");
        }
    };

    const handleToggleBlock = async (user: User) => {
        try {
            const newBlockStatus = !user.isBlocked;
            await userService.updateUser(user.id, { isBlocked: newBlockStatus });
            showToast(`Student ${newBlockStatus ? 'blocked' : 'unblocked'}`, "success");
        } catch {
            showToast("Failed to update block status", "error");
        }
    };

    const confirmDelete = async () => {
        if (!deletingUser) return;
        try {
            await userService.deleteUser(deletingUser.id);
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
            course: user.course || '',
            skills: user.skills ? (Array.isArray(user.skills) ? user.skills.join(', ') : user.skills) : '',
            profilePhoto: user.profilePhoto || ''
        });
        setUploadedPhotoUrl(null);
        setShowModal(true);
    };

    const filteredUsers = users.filter(user =>
        user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const columns: Column<User>[] = [
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
            header: 'Mobile Number',
            width: '15%',
            render: (user) => <span className="text-sm">{user.phone}</span>,
        },
        {
            key: 'batch',
            header: UI_STRINGS.USERS.TH_BATCH,
            width: '10%',
            render: (user) => user.batch ? (
                <span style={{ backgroundColor: 'rgba(99, 102, 241, 0.1)', color: 'var(--accent-blue)', padding: '4px 8px', borderRadius: '4px', fontSize: '0.85rem' }}>
                    {user.batch}
                </span>
            ) : null,
        },
        {
            key: 'course',
            header: UI_STRINGS.USERS.TH_COURSE,
            width: '15%',
            render: (user) => user.course || <span className="text-xs text-muted" style={{ fontStyle: 'italic' }}>Not Assigned</span>,
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
                    <button className="icon-btn" title={user.status === 'inactive' ? 'Activate Student' : 'Deactivate Student'} onClick={() => handleToggleStatus(user)} style={{ color: user.status === 'inactive' ? 'var(--text-secondary)' : 'var(--success)' }}>
                        {user.status === 'inactive' ? <UserX size={18} /> : <UserCheck size={18} />}
                    </button>
                    <button className="icon-btn" title="Edit Student" onClick={() => openEditModal(user)} style={{ color: 'var(--accent-blue)' }}>
                        <Edit2 size={18} />
                    </button>
                    <button className="icon-btn" title="Delete Student" onClick={() => setDeletingUser(user)} style={{ color: 'var(--error)' }}>
                        <Trash2 size={18} />
                    </button>
                    <button className="icon-btn" title={user.isBlocked ? 'Unblock Student' : 'Block Student'} onClick={() => handleToggleBlock(user)} style={{ color: user.isBlocked ? 'var(--error)' : 'var(--text-secondary)' }}>
                        <Ban size={18} />
                    </button>
                </div>
            ),
        },
    ];

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

            <div className="card mb-lg">
                <div className="flex items-center gap-4 mb-md">
                    <SearchInput
                        placeholder={UI_STRINGS.USERS.SEARCH}
                        value={searchTerm}
                        onChange={setSearchTerm}
                    />
                </div>

                 <DataTable
                 columns={columns}
                 data={filteredUsers}
                 keyExtractor={(user) => user.id}
                 emptyMessage={UI_STRINGS.USERS.EMPTY}
                 searchPlaceholder="Search users by name, email, or role..."
                 searchable
                 pageSize={10}
             />
</div>

            {/* Add Student Modal */}
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
                            <input type="text" required placeholder={UI_STRINGS.USERS.FORM_BATCH_PLACEHOLDER} value={newUser.batch} onChange={e => setNewUser({ ...newUser, batch: e.target.value })} />
                        </FormField>
                    </FormRow>
                    <FormRow>
                        <FormField label={UI_STRINGS.USERS.SELECT_COURSE}>
                            <select required value={newUser.course} onChange={e => setNewUser({ ...newUser, course: e.target.value })}>
                                <option value="">{UI_STRINGS.USERS.SELECT_COURSE_PLACEHOLDER}</option>
                                {courses.map(course => (
                                    <option key={course.id} value={course.title}>{course.title}</option>
                                ))}
                            </select>
                        </FormField>
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
                            <p style={{ color: 'var(--primary)', fontWeight: 500 }}>{viewingUser.course} • {UI_STRINGS.USERS.TH_BATCH} {viewingUser.batch}</p>
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
            <Modal
                isOpen={!!deletingUser}
                onClose={() => setDeletingUser(null)}
                title="Confirm Deletion"
                maxWidth="400px"
            >
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
        </div>
    );
}
