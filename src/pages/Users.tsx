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
import { useUser } from '../contexts/UserContext';
import { useToast } from '../contexts/ToastContext';

export default function UsersPage() {
    const { students: users, loading: usersLoading, error: usersError } = useUser();
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showModal, setShowModal] = useState(false);
    const [viewingUser, setViewingUser] = useState<User | null>(null);
    const [courses, setCourses] = useState<Course[]>([]);
    
    // Photo upload states
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [uploadingPhoto, setUploadingPhoto] = useState(false);

    const [newUser, setNewUser] = useState({
        name: '',
        email: '',
        phone: '',
        batch: '',
        course: '',
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
        try {
            setUploadingPhoto(true);
            let photoUrl = newUser.profilePhoto;
            
            if (selectedFile) {
                photoUrl = await userService.uploadProfilePhoto(selectedFile);
            }

            if (editingUser) {
                await userService.updateUser(editingUser.id, {
                    ...newUser,
                    profilePhoto: photoUrl
                });
                showToast("Student updated successfully", "success");
            } else {
                await userService.createUser({
                    ...newUser,
                    profilePhoto: photoUrl,
                    skills: [],
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
        setSelectedFile(null);
        setPreviewUrl(null);
        setNewUser({ name: '', email: '', phone: '', batch: '', course: '', profilePhoto: '' });
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setSelectedFile(file);
            setPreviewUrl(URL.createObjectURL(file));
        }
    };

    const handleToggleStatus = async (user: User) => {
        try {
            const newStatus = user.status === 'inactive' ? 'active' : 'inactive';
            await userService.updateUser(user.id, { status: newStatus });
            showToast(`Student ${newStatus === 'active' ? 'activated' : 'deactivated'}`, "success");
        } catch (err) {
            showToast("Failed to update status", "error");
        }
    };

    const handleToggleBlock = async (user: User) => {
        try {
            const newBlockStatus = !user.isBlocked;
            await userService.updateUser(user.id, { isBlocked: newBlockStatus });
            showToast(`Student ${newBlockStatus ? 'blocked' : 'unblocked'}`, "success");
        } catch (err) {
            showToast("Failed to update block status", "error");
        }
    };

    const handleDelete = async (user: User) => {
        if (window.confirm(`Are you sure you want to delete ${user.name}? This action cannot be undone.`)) {
            try {
                await userService.deleteUser(user.id);
                showToast("Student deleted successfully", "success");
            } catch (err) {
                showToast("Failed to delete student", "error");
            }
        }
    };

    const openEditModal = (user: User) => {
        setEditingUser(user);
        setNewUser({
            name: user.name,
            email: user.email,
            phone: user.phone,
            batch: user.batch,
            course: user.course,
            profilePhoto: user.profilePhoto || ''
        });
        setSelectedFile(null);
        setPreviewUrl(null);
        setShowModal(true);
    };

    const filteredUsers = users.filter(user =>
        user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email.toLowerCase().includes(searchTerm.toLowerCase())
    );

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

            <div className="card" style={{ marginBottom: 'var(--space-lg)' }}>
                <div className="flex items-center gap-4" style={{ marginBottom: 'var(--space-md)' }}>
                    <SearchInput
                        placeholder={UI_STRINGS.USERS.SEARCH}
                        value={searchTerm}
                        onChange={setSearchTerm}
                    />
                </div>

                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                        <thead>
                            <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                                <th style={{ padding: 'var(--space-md)', color: 'var(--text-secondary)', fontWeight: 600, width: '25%' }}>{UI_STRINGS.USERS.TH_NAME}</th>
                                <th style={{ padding: 'var(--space-md)', color: 'var(--text-secondary)', fontWeight: 600, width: '15%' }}>Mobile Number</th>
                                <th style={{ padding: 'var(--space-md)', color: 'var(--text-secondary)', fontWeight: 600, width: '10%' }}>{UI_STRINGS.USERS.TH_BATCH}</th>
                                <th style={{ padding: 'var(--space-md)', color: 'var(--text-secondary)', fontWeight: 600, width: '15%' }}>{UI_STRINGS.USERS.TH_COURSE}</th>
                                <th style={{ padding: 'var(--space-md)', color: 'var(--text-secondary)', fontWeight: 600, width: '15%' }}>{UI_STRINGS.USERS.TH_JOINED}</th>
                                <th style={{ padding: 'var(--space-md)', color: 'var(--text-secondary)', fontWeight: 600, width: '20%', textAlign: 'center' }}>{UI_STRINGS.USERS.TH_ACTIONS}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredUsers.length > 0 ? (
                                filteredUsers.map(user => (
                                    <tr key={user.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                        <td style={{ padding: 'var(--space-md)' }}>
                                            <div className="flex items-center">
                                                <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: 'var(--dark-card-accent)', marginRight: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                                                    {user.profilePhoto ? (
                                                        <img src={user.profilePhoto} alt={user.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                    ) : (
                                                        <span style={{ fontWeight: 'bold', color: 'var(--text-secondary)' }}>{user.name?.charAt(0) || '?'}</span>
                                                    )}
                                                </div>
                                                <div>
                                                    <div style={{ fontWeight: 500 }}>{user.name}</div>
                                                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{user.email}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td style={{ padding: 'var(--space-md)', verticalAlign: 'middle' }}>
                                            <div style={{ color: 'var(--text-main)', fontSize: '0.9rem' }}>{user.phone}</div>
                                        </td>
                                        <td style={{ padding: 'var(--space-md)', verticalAlign: 'middle' }}>
                                            {user.batch && (
                                                <span style={{ backgroundColor: 'rgba(99, 102, 241, 0.1)', color: 'var(--accent-blue)', padding: '4px 8px', borderRadius: '4px', fontSize: '0.85rem' }}>
                                                    {user.batch}
                                                </span>
                                            )}
                                        </td>
                                        <td style={{ padding: 'var(--space-md)', verticalAlign: 'middle' }}>{user.course || <span style={{ color: 'var(--text-secondary)', fontStyle: 'italic', fontSize: '0.8rem' }}>Not Assigned</span>}</td>
                                        <td style={{ padding: 'var(--space-md)', verticalAlign: 'middle' }}>{user.enrollmentDate?.toLocaleDateString()}</td>
                                        <td style={{ padding: 'var(--space-md)', verticalAlign: 'middle', textAlign: 'center' }}>
                                            <div className="flex items-center gap-2 justify-center">
                                                <button 
                                                    className="icon-btn" 
                                                    title={user.status === 'inactive' ? 'Activate Student' : 'Deactivate Student'}
                                                    onClick={() => handleToggleStatus(user)}
                                                    style={{ color: user.status === 'inactive' ? 'var(--text-secondary)' : 'var(--success)' }}
                                                >
                                                    {user.status === 'inactive' ? <UserX size={18} /> : <UserCheck size={18} />}
                                                </button>
                                                <button 
                                                    className="icon-btn" 
                                                    title="Edit Student"
                                                    onClick={() => openEditModal(user)}
                                                    style={{ color: 'var(--accent-blue)' }}
                                                >
                                                    <Edit2 size={18} />
                                                </button>
                                                <button 
                                                    className="icon-btn" 
                                                    title="Delete Student"
                                                    onClick={() => handleDelete(user)}
                                                    style={{ color: 'var(--error)' }}
                                                >
                                                    <Trash2 size={18} />
                                                </button>
                                                <button 
                                                    className="icon-btn" 
                                                    title={user.isBlocked ? 'Unblock Student' : 'Block Student'}
                                                    onClick={() => handleToggleBlock(user)}
                                                    style={{ color: user.isBlocked ? 'var(--error)' : 'var(--text-secondary)' }}
                                                >
                                                    <Ban size={18} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={5} style={{ padding: 'var(--space-xl)', textAlign: 'center', color: 'var(--text-secondary)' }}>
                                        {UI_STRINGS.USERS.EMPTY}
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
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
                <form onSubmit={handleAddStudent} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)', marginTop: 'var(--space-lg)' }}>
                    <div style={{ alignSelf: 'center', marginBottom: 'var(--space-sm)' }}>
                        <div style={{ width: '100px', height: '100px', borderRadius: '50%', backgroundColor: 'var(--dark-card-accent)', overflow: 'hidden', border: '2px dashed var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                            {(previewUrl || newUser.profilePhoto) ? (
                                <img src={previewUrl || newUser.profilePhoto} alt="Profile Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            ) : (
                                <UserCheck size={40} style={{ color: 'var(--text-secondary)' }} />
                            )}
                        </div>
                    </div>
                    <div>
                        <label>Profile Photo (PNG/JPG)</label>
                        <input type="file" accept="image/png, image/jpeg" onChange={handleFileChange} />
                    </div>
                    <div className="flex gap-4">
                        <div style={{ flex: 1 }}>
                            <label>{UI_STRINGS.USERS.FORM_FULL_NAME}</label>
                            <input type="text" required value={newUser.name} onChange={e => setNewUser({ ...newUser, name: e.target.value })} />
                        </div>
                        <div style={{ flex: 1 }}>
                            <label>{UI_STRINGS.USERS.FORM_EMAIL}</label>
                            <input type="email" required value={newUser.email} onChange={e => setNewUser({ ...newUser, email: e.target.value })} />
                        </div>
                    </div>
                    <div className="flex gap-4">
                        <div style={{ flex: 1 }}>
                            <label>{UI_STRINGS.USERS.FORM_PHONE}</label>
                            <input type="tel" required value={newUser.phone} onChange={e => setNewUser({ ...newUser, phone: e.target.value })} />
                        </div>
                        <div style={{ flex: 1 }}>
                            <label>{UI_STRINGS.USERS.FORM_BATCH}</label>
                            <input type="text" required placeholder={UI_STRINGS.USERS.FORM_BATCH_PLACEHOLDER} value={newUser.batch} onChange={e => setNewUser({ ...newUser, batch: e.target.value })} />
                        </div>
                    </div>
                    <div>
                        <label>{UI_STRINGS.USERS.SELECT_COURSE}</label>
                        <select 
                            required 
                            value={newUser.course} 
                            onChange={e => setNewUser({ ...newUser, course: e.target.value })}
                        >
                            <option value="">{UI_STRINGS.USERS.SELECT_COURSE_PLACEHOLDER}</option>
                            {courses.map(course => (
                                <option key={course.id} value={course.title}>
                                    {course.title}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div className="flex justify-end gap-2" style={{ marginTop: 'var(--space-md)' }}>
                        <button type="button" className="btn btn-secondary" onClick={() => { setShowModal(false); resetForm(); }} disabled={uploadingPhoto}>{UI_STRINGS.COMMON.CANCEL}</button>
                        <button type="submit" className="btn btn-primary" disabled={uploadingPhoto}>
                            {uploadingPhoto ? UI_STRINGS.COMMON.LOADING : UI_STRINGS.COMMON.SAVE}
                        </button>
                    </div>
                </form>
            </Modal>

            {/* View Student Details Modal */}
            <Modal isOpen={!!viewingUser} onClose={() => setViewingUser(null)} title={viewingUser?.name || ''} maxWidth="550px">
                {viewingUser && (
                    <div>
                        <div style={{ textAlign: 'center', marginBottom: 'var(--space-xl)' }}>
                            <div style={{ 
                                width: '80px', 
                                height: '80px', 
                                borderRadius: '50%', 
                                backgroundColor: 'var(--bg-card-accent)', 
                                margin: '0 auto 16px', 
                                display: 'flex', 
                                alignItems: 'center', 
                                justifyContent: 'center',
                                fontSize: '2rem',
                                color: 'var(--primary)',
                                fontWeight: 600,
                                border: '2px solid rgba(var(--primary-rgb), 0.2)',
                                overflow: 'hidden'
                            }}>
                                {viewingUser.profilePhoto ? (
                                    <img src={viewingUser.profilePhoto} alt={viewingUser.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                ) : (
                                    <>{viewingUser.name?.charAt(0) || '?'}</>
                                )}
                            </div>
                            <p style={{ color: 'var(--primary)', fontWeight: 500 }}>{viewingUser.course} • {UI_STRINGS.USERS.TH_BATCH} {viewingUser.batch}</p>
                        </div>

                        <div style={{ display: 'grid', gap: 'var(--space-lg)' }}>
                            <div className="glass-card" style={{ padding: 'var(--space-md)', borderRadius: 'var(--radius-md)' }}>
                                <h3 style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '1px' }}>{UI_STRINGS.USERS.CONTACT_INFO}</h3>
                                <div style={{ display: 'grid', gap: '8px' }}>
                                    <div className="flex justify-between">
                                        <span style={{ color: 'var(--text-secondary)' }}>{UI_STRINGS.USERS.EMAIL_LABEL}</span>
                                        <span style={{ fontWeight: 500 }}>{viewingUser.email}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span style={{ color: 'var(--text-secondary)' }}>{UI_STRINGS.USERS.PHONE_LABEL}</span>
                                        <span style={{ fontWeight: 500 }}>{viewingUser.phone || UI_STRINGS.USERS.NOT_PROVIDED}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="glass-card" style={{ padding: 'var(--space-md)', borderRadius: 'var(--radius-md)' }}>
                                <h3 style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '1px' }}>{UI_STRINGS.USERS.ACADEMIC_DETAILS}</h3>
                                <div style={{ display: 'grid', gap: '8px' }}>
                                    <div className="flex justify-between">
                                        <span style={{ color: 'var(--text-secondary)' }}>{UI_STRINGS.USERS.ENROLLMENT_DATE_LABEL}</span>
                                        <span style={{ fontWeight: 500 }}>{viewingUser.enrollmentDate?.toLocaleDateString()}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span style={{ color: 'var(--text-secondary)' }}>{UI_STRINGS.USERS.CURRENT_STATUS_LABEL}</span>
                                        <span className="badge badge-success">{UI_STRINGS.USERS.STATUS_ACTIVE}</span>
                                    </div>
                                </div>
                            </div>

                            {viewingUser.skills && viewingUser.skills.length > 0 && (
                                <div className="glass-card" style={{ padding: 'var(--space-md)', borderRadius: 'var(--radius-md)' }}>
                                    <h3 style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '1px' }}>{UI_STRINGS.USERS.ENROLLED_COURSES}</h3>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                        {Array.isArray(viewingUser.skills) ? viewingUser.skills.map((skill, idx) => (
                                            <span key={idx} className="badge badge-primary" style={{ fontSize: '0.75rem' }}>
                                                {skill}
                                            </span>
                                        )) : viewingUser.skills}
                                    </div>
                                </div>
                            )}
                        </div>

                        <div style={{ marginTop: 'var(--space-xl)', display: 'flex', justifyContent: 'center' }}>
                            <button className="btn btn-secondary" onClick={() => setViewingUser(null)} style={{ width: '100%' }}>
                                {UI_STRINGS.USERS.CLOSE_DETAILS}
                            </button>
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
}
