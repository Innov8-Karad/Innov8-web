import { useState, useEffect } from 'react';
import type { User } from '../types';
import { Search, Plus, MoreVertical, X } from 'lucide-react';
import { userService } from '../services/userService';
import { courseService } from '../services/courseService';
import { UI_STRINGS } from '../constants';
import type { Course } from '../types';

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
        course: '',
        skills: ''
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
                skills: newUser.skills.split(',').map(s => s.trim())
            } as any);

            setUsers([created, ...users]);
            setShowModal(false);
            setNewUser({ name: '', email: '', phone: '', batch: '', course: '', skills: '' });
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
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
                <div className="animate-pulse text-secondary">{UI_STRINGS.USERS.LOADING}</div>
            </div>
        );
    }

    return (
        <div>
            {error && (
                <div className="alert alert-error mb-4">
                    {error}
                </div>
            )}
            <div className="flex justify-between items-center" style={{ marginBottom: 'var(--space-lg)' }}>
                <div>
                    <h1>{UI_STRINGS.USERS.TITLE}</h1>
                    <p>{UI_STRINGS.USERS.SUBTITLE}</p>
                </div>
                <button className="btn btn-primary" onClick={() => setShowModal(true)}>
                    <Plus size={18} style={{ marginRight: '8px' }} />
                    {UI_STRINGS.USERS.NEW_BTN}
                </button>
            </div>

            <div className="card" style={{ marginBottom: 'var(--space-lg)' }}>
                <div className="flex items-center gap-4" style={{ marginBottom: 'var(--space-md)' }}>
                    <div style={{ position: 'relative', flex: 1 }}>
                        <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
                        <input
                            type="text"
                            placeholder={UI_STRINGS.USERS.SEARCH}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            style={{ paddingLeft: '40px' }}
                        />
                    </div>
                </div>

                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                        <thead>
                            <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                                <th style={{ padding: 'var(--space-md)', color: 'var(--text-secondary)', fontWeight: 600 }}>Name</th>
                                <th style={{ padding: 'var(--space-md)', color: 'var(--text-secondary)', fontWeight: 600 }}>Batch</th>
                                <th style={{ padding: 'var(--space-md)', color: 'var(--text-secondary)', fontWeight: 600 }}>Course</th>
                                <th style={{ padding: 'var(--space-md)', color: 'var(--text-secondary)', fontWeight: 600 }}>Joined</th>
                                <th style={{ padding: 'var(--space-md)', color: 'var(--text-secondary)', fontWeight: 600 }}>Actions</th>
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
                                                title="View Full Details"
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

            {showModal && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    backgroundColor: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(4px)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999
                }}>
                    <div className="card" style={{ width: '100%', maxWidth: '500px', position: 'relative', maxHeight: '90vh', overflowY: 'auto' }}>
                        <button
                            onClick={() => setShowModal(false)}
                            style={{ position: 'absolute', top: '16px', right: '16px', border: 'none', background: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
                        >
                            <X size={20} />
                        </button>
                        <h2>{UI_STRINGS.USERS.MODAL_TITLE}</h2>
                        <form onSubmit={handleAddStudent} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)', marginTop: 'var(--space-lg)' }}>
                            <div className="flex gap-4">
                                <div style={{ flex: 1 }}>
                                    <label>Full Name</label>
                                    <input type="text" required value={newUser.name} onChange={e => setNewUser({ ...newUser, name: e.target.value })} />
                                </div>
                                <div style={{ flex: 1 }}>
                                    <label>Email</label>
                                    <input type="email" required value={newUser.email} onChange={e => setNewUser({ ...newUser, email: e.target.value })} />
                                </div>
                            </div>
                            <div className="flex gap-4">
                                <div style={{ flex: 1 }}>
                                    <label>Phone</label>
                                    <input type="tel" required value={newUser.phone} onChange={e => setNewUser({ ...newUser, phone: e.target.value })} />
                                </div>
                                <div style={{ flex: 1 }}>
                                    <label>Batch</label>
                                    <input type="text" required placeholder="e.g. 2024-A" value={newUser.batch} onChange={e => setNewUser({ ...newUser, batch: e.target.value })} />
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
                            <div>
                                <label>Entrolling Courses (comma separated)</label>
                                <input type="text" placeholder="React, Node.js, CSS" value={newUser.skills} onChange={e => setNewUser({ ...newUser, skills: e.target.value })} />
                            </div>
                            <div className="flex justify-end gap-2" style={{ marginTop: 'var(--space-md)' }}>
                                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>{UI_STRINGS.COMMON.CANCEL}</button>
                                <button type="submit" className="btn btn-primary">{UI_STRINGS.COMMON.SAVE}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* View Student Details Modal */}
            {viewingUser && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    backgroundColor: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(4px)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999,
                    padding: 'var(--space-md)'
                }}>
                    <div className="card" style={{ width: '100%', maxWidth: '550px', position: 'relative', padding: 'var(--space-xl)', maxHeight: '95vh', overflowY: 'auto' }}>
                        <button
                            onClick={() => setViewingUser(null)}
                            style={{ position: 'absolute', top: '16px', right: '16px', border: 'none', background: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
                        >
                            <X size={24} />
                        </button>
                        
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
                            <h2 style={{ marginBottom: '4px' }}>{viewingUser.name}</h2>
                            <p style={{ color: 'var(--primary)', fontWeight: 500 }}>{viewingUser.course} • Batch {viewingUser.batch}</p>
                        </div>

                        <div style={{ display: 'grid', gap: 'var(--space-lg)' }}>
                            <div className="glass-card" style={{ padding: 'var(--space-md)', borderRadius: 'var(--radius-md)' }}>
                                <h3 style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '1px' }}>Contact Information</h3>
                                <div style={{ display: 'grid', gap: '8px' }}>
                                    <div className="flex justify-between">
                                        <span style={{ color: 'var(--text-secondary)' }}>Email:</span>
                                        <span style={{ fontWeight: 500 }}>{viewingUser.email}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span style={{ color: 'var(--text-secondary)' }}>Phone:</span>
                                        <span style={{ fontWeight: 500 }}>{viewingUser.phone || 'Not provided'}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="glass-card" style={{ padding: 'var(--space-md)', borderRadius: 'var(--radius-md)' }}>
                                <h3 style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '1px' }}>Academic Details</h3>
                                <div style={{ display: 'grid', gap: '8px' }}>
                                    <div className="flex justify-between">
                                        <span style={{ color: 'var(--text-secondary)' }}>Enrollment Date:</span>
                                        <span style={{ fontWeight: 500 }}>{viewingUser.enrollmentDate?.toLocaleDateString()}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span style={{ color: 'var(--text-secondary)' }}>Current Status:</span>
                                        <span className="badge badge-success">Active</span>
                                    </div>
                                </div>
                            </div>

                            {viewingUser.skills && viewingUser.skills.length > 0 && (
                                <div className="glass-card" style={{ padding: 'var(--space-md)', borderRadius: 'var(--radius-md)' }}>
                                    <h3 style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '1px' }}>Enrolled Courses</h3>
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
                                Close Details
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

