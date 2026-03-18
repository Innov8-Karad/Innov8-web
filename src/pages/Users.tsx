import { useState, useEffect } from 'react';
import type { User, Course } from '../types';
import { MoreVertical } from 'lucide-react';
import { userService } from '../services/userService';
import { courseService } from '../services/courseService';
import { UI_STRINGS } from '../constants';
import PageHeader from '../components/PageHeader';
import LoadingState from '../components/LoadingState';
import ErrorAlert from '../components/ErrorAlert';
import SearchInput from '../components/SearchInput';
import Modal from '../components/Modal';

export default function UsersPage() {
    const [users, setUsers] = useState<User[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showModal, setShowModal] = useState(false);
    const [viewingUser, setViewingUser] = useState<User | null>(null);
    const [courses, setCourses] = useState<Course[]>([]);
    const [newUser, setNewUser] = useState({
        name: '',
        email: '',
        phone: '',
        batch: '',
        course: ''
    });

    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);
                setError(null);
                const [userData, courseData] = await Promise.all([
                    userService.fetchUsers(),
                    courseService.fetchCourses()
                ]);
                setUsers(userData);
                setCourses(courseData);
            } catch (err) {
                console.error("Error fetching data: ", err);
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
            setError(null);
            const created = await userService.createUser({
                ...newUser,
                skills: []
            } as unknown as Omit<User, 'id' | 'enrollmentDate' | 'createdAt'>);

            setUsers([created, ...users]);
            setShowModal(false);
            setNewUser({ name: '', email: '', phone: '', batch: '', course: '' });
        } catch (err) {
            console.error("Error adding student: ", err);
            setError(UI_STRINGS.USERS.ERROR_CREATE);
        }
    };

    const filteredUsers = users.filter(user =>
        user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (loading) {
        return <LoadingState message={UI_STRINGS.USERS.LOADING} />;
    }

    return (
        <div>
            <ErrorAlert message={error} />
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
                                <th style={{ padding: 'var(--space-md)', color: 'var(--text-secondary)', fontWeight: 600 }}>{UI_STRINGS.USERS.TH_NAME}</th>
                                <th style={{ padding: 'var(--space-md)', color: 'var(--text-secondary)', fontWeight: 600 }}>{UI_STRINGS.USERS.TH_BATCH}</th>
                                <th style={{ padding: 'var(--space-md)', color: 'var(--text-secondary)', fontWeight: 600 }}>{UI_STRINGS.USERS.TH_COURSE}</th>
                                <th style={{ padding: 'var(--space-md)', color: 'var(--text-secondary)', fontWeight: 600 }}>{UI_STRINGS.USERS.TH_JOINED}</th>
                                <th style={{ padding: 'var(--space-md)', color: 'var(--text-secondary)', fontWeight: 600 }}>{UI_STRINGS.USERS.TH_ACTIONS}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredUsers.length > 0 ? (
                                filteredUsers.map(user => (
                                    <tr key={user.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                        <td style={{ padding: 'var(--space-md)' }}>
                                            <div className="flex items-center">
                                                <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: 'var(--dark-card-accent)', marginRight: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                    {user.name?.charAt(0) || '?'}
                                                </div>
                                                <div>
                                                    <div style={{ fontWeight: 500 }}>{user.name}</div>
                                                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{user.email}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td style={{ padding: 'var(--space-md)' }}>
                                            <span style={{ backgroundColor: 'rgba(99, 102, 241, 0.1)', color: 'var(--accent-blue)', padding: '4px 8px', borderRadius: '4px', fontSize: '0.85rem' }}>
                                                {user.batch}
                                            </span>
                                        </td>
                                        <td style={{ padding: 'var(--space-md)' }}>{user.course}</td>
                                        <td style={{ padding: 'var(--space-md)' }}>{user.enrollmentDate?.toLocaleDateString()}</td>
                                        <td style={{ padding: 'var(--space-md)' }}>
                                            <button 
                                                className="icon-btn" 
                                                title={UI_STRINGS.USERS.VIEW_DETAILS}
                                                onClick={() => setViewingUser(user)}
                                            >
                                                <MoreVertical size={18} />
                                            </button>
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
            <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={UI_STRINGS.USERS.MODAL_TITLE}>
                <form onSubmit={handleAddStudent} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)', marginTop: 'var(--space-lg)' }}>
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
                        <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>{UI_STRINGS.COMMON.CANCEL}</button>
                        <button type="submit" className="btn btn-primary">{UI_STRINGS.COMMON.SAVE}</button>
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
                                border: '2px solid rgba(var(--primary-rgb), 0.2)'
                            }}>
                                {viewingUser.name?.charAt(0) || '?'}
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
