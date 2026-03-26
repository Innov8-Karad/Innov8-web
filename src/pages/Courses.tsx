import { useState, useEffect } from 'react';
import { Book, Clock, User, Star } from 'lucide-react';
import { courseService } from '../services/courseService';
import type { Course } from '../types';
import { UI_STRINGS } from '../constants';
import PageHeader from '../components/PageHeader';
import LoadingState from '../components/LoadingState';
import ErrorAlert from '../components/ErrorAlert';
import Modal from '../components/Modal';
import { FormField, FormRow, FormActions } from '../components/FormField';

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
            setNewCourse({ title: '', description: '', duration: '', instructor: '', price: '', isFree: false, category: '', thumbnail: '' });
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

            <div className="grid-cards">
                {courses.map((course: Course) => (
                    <div key={course.id} className="card stat-card-hover" style={{ padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                        <div style={{ height: '160px', backgroundColor: 'var(--bg-card-accent)', position: 'relative' }}>
                            {course.thumbnail ? (
                                <img src={course.thumbnail} alt={course.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            ) : (
                                <div className="flex items-center justify-center text-muted" style={{ height: '100%' }}>
                                    <Book size={48} />
                                </div>
                            )}
                            <div style={{ position: 'absolute', top: '12px', right: '12px' }}>
                                <span style={{ backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', padding: '4px 8px', borderRadius: '4px', fontSize: '0.8rem', color: 'white' }}>
                                    {course.isFree ? UI_STRINGS.COURSES.BADGE_FREE : `₹ ${course.price.toLocaleString()}`}
                                </span>
                            </div>
                        </div>

                        <div style={{ padding: 'var(--space-md)', flex: 1, display: 'flex', flexDirection: 'column' }}>
                            <h3 style={{ margin: 0 }}>{course.title}</h3>
                            <p className="text-sm text-muted mt-md" style={{ flex: 1 }}>
                                {course.description.length > 100 ? course.description.substring(0, 100) + '...' : course.description}
                            </p>

                            <div className="flex gap-4 mt-md text-sm text-muted">
                                <div className="flex items-center gap-1">
                                    <Clock size={14} /> {course.duration}
                                </div>
                                <div className="flex items-center gap-1">
                                    <User size={14} /> {course.instructor}
                                </div>
                            </div>

                            <div className="separator flex justify-between items-center">
                                <div className="flex items-center gap-1" style={{ color: 'var(--primary)' }}>
                                    <Star size={14} fill="var(--primary)" />
                                    <span className="font-semibold">{course.rating || 'N/A'}</span>
                                    <span className="text-xs text-muted">({course.enrolled || 0})</span>
                                </div>
                                <button className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '0.85rem' }}>{UI_STRINGS.COMMON.EDIT}</button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={UI_STRINGS.COURSES.MODAL_TITLE}>
                <form onSubmit={handleAddCourse} className="form-layout">
                    <FormField label={UI_STRINGS.COURSES.FORM_TITLE}>
                        <input type="text" required placeholder={UI_STRINGS.COURSES.FORM_TITLE_PLACEHOLDER} value={newCourse.title} onChange={e => setNewCourse({ ...newCourse, title: e.target.value })} />
                    </FormField>
                    <FormField label={UI_STRINGS.COURSES.FORM_DESCRIPTION}>
                        <textarea rows={2} required value={newCourse.description} onChange={e => setNewCourse({ ...newCourse, description: e.target.value })} />
                    </FormField>
                    <FormRow>
                        <FormField label={UI_STRINGS.COURSES.FORM_INSTRUCTOR}>
                            <input type="text" required value={newCourse.instructor} onChange={e => setNewCourse({ ...newCourse, instructor: e.target.value })} />
                        </FormField>
                        <FormField label={UI_STRINGS.COURSES.FORM_DURATION}>
                            <input type="text" required placeholder={UI_STRINGS.COURSES.FORM_DURATION_PLACEHOLDER} value={newCourse.duration} onChange={e => setNewCourse({ ...newCourse, duration: e.target.value })} />
                        </FormField>
                    </FormRow>
                    <FormRow>
                        <FormField label={UI_STRINGS.COURSES.FORM_PRICE}>
                            <input type="number" disabled={newCourse.isFree} required={!newCourse.isFree} value={newCourse.price} onChange={e => setNewCourse({ ...newCourse, price: e.target.value })} />
                        </FormField>
                        <div className="flex items-center gap-2 mt-lg">
                            <input type="checkbox" id="isFree" checked={newCourse.isFree} onChange={e => setNewCourse({ ...newCourse, isFree: e.target.checked })} />
                            <label htmlFor="isFree" style={{ margin: 0 }}>{UI_STRINGS.COURSES.FORM_FREE_COURSE}</label>
                        </div>
                    </FormRow>
                    <FormField label={UI_STRINGS.COURSES.FORM_THUMBNAIL_URL}>
                        <input type="url" value={newCourse.thumbnail} onChange={e => setNewCourse({ ...newCourse, thumbnail: e.target.value })} />
                    </FormField>
                    <FormActions>
                        <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>{UI_STRINGS.COMMON.CANCEL}</button>
                        <button type="submit" className="btn btn-primary">{UI_STRINGS.COMMON.SAVE}</button>
                    </FormActions>
                </form>
            </Modal>
        </div>
    );
}
