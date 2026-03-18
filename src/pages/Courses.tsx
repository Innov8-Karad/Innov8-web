import { useState, useEffect } from 'react';
import { Book, Clock, User, Star } from 'lucide-react';
import { courseService } from '../services/courseService';
import type { Course } from '../types';
import { UI_STRINGS } from '../constants';
import PageHeader from '../components/PageHeader';
import LoadingState from '../components/LoadingState';
import ErrorAlert from '../components/ErrorAlert';
import Modal from '../components/Modal';

export default function CoursesPage() {
    const [courses, setCourses] = useState<Course[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showModal, setShowModal] = useState(false);
    const [newCourse, setNewCourse] = useState({
        title: '',
        description: '',
        duration: '',
        instructor: '',
        price: '',
        isFree: false,
        category: '',
        thumbnail: ''
    });

    useEffect(() => {
        const fetchCourses = async () => {
            try {
                setLoading(true);
                setError(null);
                const data = await courseService.fetchCourses();
                setCourses(data);
            } catch (err) {
                console.error("Error fetching courses:", err);
                setError(UI_STRINGS.COURSES.ERROR_LOAD);
            } finally {
                setLoading(false);
            }
        };
        fetchCourses();
    }, []);

    const handleAddCourse = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            setError(null);
            const created = await courseService.createCourse(newCourse as unknown as Omit<Course, 'id' | 'createdAt'>);

            setCourses([created, ...courses]);
            setShowModal(false);
            setNewCourse({ 
                title: '', 
                description: '', 
                duration: '', 
                instructor: '', 
                price: '', 
                isFree: false, 
                category: '', 
                thumbnail: '' 
            });
        } catch (err) {
            console.error("Error adding course: ", err);
            setError(UI_STRINGS.COURSES.ERROR_CREATE);
        }
    };

    if (loading) return <LoadingState message={UI_STRINGS.COURSES.LOADING} />;

    return (
        <div>
            <ErrorAlert message={error} />
            <PageHeader
                title={UI_STRINGS.COURSES.TITLE}
                subtitle={UI_STRINGS.COURSES.SUBTITLE}
                actionLabel={UI_STRINGS.COURSES.NEW_BTN}
                onAction={() => setShowModal(true)}
            />

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 'var(--space-lg)' }}>
                {courses.map((course: Course) => (
                    <div key={course.id} className="card stat-card-hover" style={{ padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
                        <div style={{ height: '160px', backgroundColor: 'var(--dark-card-accent)', position: 'relative' }}>
                            {course.thumbnail ? (
                                <img src={course.thumbnail} alt={course.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            ) : (
                                <div className="flex items-center justify-center h-full text-secondary">
                                    <Book size={48} />
                                </div>
                            )}
                            <div style={{ position: 'absolute', top: '12px', right: '12px' }}>
                                <span style={{
                                    backgroundColor: 'rgba(0,0,0,0.6)',
                                    backdropFilter: 'blur(4px)',
                                    padding: '4px 8px',
                                    borderRadius: '4px',
                                    fontSize: '0.8rem',
                                    color: 'white'
                                }}>
                                    {course.isFree ? UI_STRINGS.COURSES.BADGE_FREE : `₹ ${course.price.toLocaleString()}`}
                                </span>
                            </div>
                        </div>

                        <div style={{ padding: 'var(--space-md)', flex: 1, display: 'flex', flexDirection: 'column' }}>
                            <h3 style={{ margin: 0 }}>{course.title}</h3>
                            <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginTop: '8px', flex: 1 }}>
                                {course.description.length > 100 ? course.description.substring(0, 100) + '...' : course.description}
                            </p>

                            <div style={{ display: 'flex', gap: 'var(--space-md)', marginTop: 'var(--space-md)', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                                <div className="flex items-center gap-1">
                                    <Clock size={14} />
                                    {course.duration}
                                </div>
                                <div className="flex items-center gap-1">
                                    <User size={14} />
                                    {course.instructor}
                                </div>
                            </div>

                            <div className="flex justify-between items-center" style={{ marginTop: 'var(--space-md)', paddingTop: 'var(--space-md)', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                                <div className="flex items-center gap-1" style={{ color: 'var(--primary)' }}>
                                    <Star size={14} fill="var(--primary)" />
                                    <span style={{ fontWeight: 600 }}>{course.rating || 'N/A'}</span>
                                    <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>({course.enrolled || 0})</span>
                                </div>
                                <button className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '0.85rem' }}>{UI_STRINGS.COMMON.EDIT}</button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={UI_STRINGS.COURSES.MODAL_TITLE}>
                <form onSubmit={handleAddCourse} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)', marginTop: 'var(--space-lg)' }}>
                    <div>
                        <label>{UI_STRINGS.COURSES.FORM_TITLE}</label>
                        <input type="text" required placeholder={UI_STRINGS.COURSES.FORM_TITLE_PLACEHOLDER} value={newCourse.title} onChange={e => setNewCourse({ ...newCourse, title: e.target.value })} />
                    </div>
                    <div>
                        <label>{UI_STRINGS.COURSES.FORM_DESCRIPTION}</label>
                        <textarea rows={2} required value={newCourse.description} onChange={e => setNewCourse({ ...newCourse, description: e.target.value })} />
                    </div>
                    <div className="flex gap-4">
                        <div style={{ flex: 1 }}>
                            <label>{UI_STRINGS.COURSES.FORM_INSTRUCTOR}</label>
                            <input type="text" required value={newCourse.instructor} onChange={e => setNewCourse({ ...newCourse, instructor: e.target.value })} />
                        </div>
                        <div style={{ flex: 1 }}>
                            <label>{UI_STRINGS.COURSES.FORM_DURATION}</label>
                            <input type="text" required placeholder={UI_STRINGS.COURSES.FORM_DURATION_PLACEHOLDER} value={newCourse.duration} onChange={e => setNewCourse({ ...newCourse, duration: e.target.value })} />
                        </div>
                    </div>
                    <div className="flex gap-4 items-center">
                        <div style={{ flex: 1 }}>
                            <label>{UI_STRINGS.COURSES.FORM_PRICE}</label>
                            <input type="number" disabled={newCourse.isFree} required={!newCourse.isFree} value={newCourse.price} onChange={e => setNewCourse({ ...newCourse, price: e.target.value })} />
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '20px' }}>
                            <input type="checkbox" id="isFree" checked={newCourse.isFree} onChange={e => setNewCourse({ ...newCourse, isFree: e.target.checked })} />
                            <label htmlFor="isFree" style={{ margin: 0 }}>{UI_STRINGS.COURSES.FORM_FREE_COURSE}</label>
                        </div>
                    </div>
                    <div>
                        <label>{UI_STRINGS.COURSES.FORM_THUMBNAIL_URL}</label>
                        <input type="url" value={newCourse.thumbnail} onChange={e => setNewCourse({ ...newCourse, thumbnail: e.target.value })} />
                    </div>
                    <div className="flex justify-end gap-2" style={{ marginTop: 'var(--space-md)' }}>
                        <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>{UI_STRINGS.COMMON.CANCEL}</button>
                        <button type="submit" className="btn btn-primary">{UI_STRINGS.COMMON.SAVE}</button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}
