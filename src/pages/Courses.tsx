import { useState, useEffect } from 'react';
import { Book, Clock, User, Star, Edit2, Trash2 } from 'lucide-react';
import { courseService } from '../services/courseService';
import type { Course } from '../types';
import { UI_STRINGS } from '../constants';
import PageHeader from '../components/PageHeader';
import LoadingState from '../components/LoadingState';
import ErrorAlert from '../components/ErrorAlert';
import Modal from '../components/Modal';
import { FormField, FormRow, FormActions } from '../components/FormField';
import { useToast } from '../hooks/useToast';
import CurriculumBuilder from '../components/CurriculumBuilder';
import AssignmentBuilder from '../components/AssignmentBuilder';

export default function CoursesPage() {
    const [courses, setCourses] = useState<Course[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showModal, setShowModal] = useState(false);
    const [editingCourse, setEditingCourse] = useState<Course | null>(null);
    const [deletingCourse, setDeletingCourse] = useState<Course | null>(null);
    const { showToast } = useToast();
    
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
        const unsubscribe = courseService.subscribeToCourses((data) => {
            setCourses(data);
            setLoading(false);
        });
        
        // Safety timeout to disable loader if something hangs
        const timer = setTimeout(() => {
            setLoading(false);
        }, 5000);

        return () => {
            unsubscribe();
            clearTimeout(timer);
        };
    }, []);

    const resetForm = () => {
        setEditingCourse(null);
        setNewCourse({ title: '', description: '', duration: '', instructor: '', price: '', isFree: false, category: '', thumbnail: '' });
    };

    const handleAddCourse = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            setError(null);
            const coursePayload = {
                title: newCourse.title,
                description: newCourse.description,
                duration: newCourse.duration,
                instructor: newCourse.instructor,
                price: newCourse.isFree ? 0 : Number(newCourse.price),
                isFree: newCourse.isFree,
                category: newCourse.category,
                thumbnail: newCourse.thumbnail
            };

            if (editingCourse) {
                await courseService.updateCourse(editingCourse.id, coursePayload);
                showToast("Course updated successfully", "success");
            } else {
                await courseService.createCourse(coursePayload as unknown as Omit<Course, 'id' | 'createdAt'>);
                showToast("Course created successfully", "success");
            }
            setShowModal(false);
            resetForm();
        } catch (err) {
            console.error("Error saving course: ", err);
            const msg = editingCourse ? "Failed to update course" : UI_STRINGS.COURSES.ERROR_CREATE;
            setError(msg);
            showToast(msg, "error");
        }
    };

    const confirmDelete = async () => {
        if (!deletingCourse) return;
        try {
            await courseService.deleteCourse(deletingCourse.id);
            showToast("Course deleted successfully", "success");
            setDeletingCourse(null);
        } catch {
            showToast("Failed to delete course", "error");
        }
    };

    const openEditModal = (course: Course) => {
        setEditingCourse(course);
        setNewCourse({
            title: course.title || '',
            description: course.description || '',
            duration: course.duration || '',
            instructor: course.instructor || '',
            price: (course.price !== undefined ? course.price : 0).toString(),
            isFree: course.isFree || false,
            category: course.category || '',
            thumbnail: course.thumbnail || ''
        });
        setShowModal(true);
    };

    if (loading) return <LoadingState message={UI_STRINGS.COURSES.LOADING} />;

    return (
        <div>
            <ErrorAlert message={error} />
            <PageHeader
                title={UI_STRINGS.COURSES.TITLE}
                subtitle={UI_STRINGS.COURSES.SUBTITLE}
                actionLabel={UI_STRINGS.COURSES.NEW_BTN}
                onAction={() => {
                    resetForm();
                    setShowModal(true);
                }}
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
                                <div className="flex items-center gap-2">
                                    <button className="icon-btn text-accent-blue" title="Edit Course" onClick={() => openEditModal(course)} style={{ padding: '6px' }}>
                                        <Edit2 size={16} />
                                    </button>
                                    <button className="icon-btn text-error" title="Delete Course" onClick={() => setDeletingCourse(course)} style={{ padding: '6px' }}>
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            <Modal isOpen={showModal} onClose={() => { setShowModal(false); resetForm(); }} title={editingCourse ? "Edit Course" : UI_STRINGS.COURSES.MODAL_TITLE} maxWidth={editingCourse ? "800px" : "500px"}>
                <div className={editingCourse ? "grid grid-cols-1 lg:grid-cols-2 gap-6" : ""}>
                    <div>
                        <h3 className="section-label mb-4">Course Details</h3>
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
                        <button type="button" className="btn btn-secondary" onClick={() => { setShowModal(false); resetForm(); }}>{UI_STRINGS.COMMON.CANCEL}</button>
                        <button type="submit" className="btn btn-primary">{UI_STRINGS.COMMON.SAVE}</button>
                    </FormActions>
                </form>
                    </div>
                    {editingCourse && (
                        <div className="border-t pt-6 mt-6 lg:border-t-0 lg:pt-0 lg:mt-0 lg:border-l lg:border-divider lg:pl-6 col-span-1">
                            <h3 className="section-label mb-1">Curriculum & Assignments</h3>
                            <p className="text-sm text-muted mb-4">Manage course contents (auto-saved)</p>
                            <div className="flex flex-col gap-6">
                                <CurriculumBuilder courseId={editingCourse.id} />
                                <AssignmentBuilder courseId={editingCourse.id} />
                            </div>
                        </div>
                    )}
                </div>
            </Modal>

            {/* Delete Confirmation Modal */}
            <Modal
                isOpen={!!deletingCourse}
                onClose={() => setDeletingCourse(null)}
                title="Confirm Deletion"
                maxWidth="400px"
            >
                <div className="p-4" style={{ paddingTop: '16px', paddingBottom: '16px' }}>
                    <p style={{ marginBottom: '24px', color: 'var(--text-secondary)' }}>
                        Are you sure you want to delete <strong>{deletingCourse?.title}</strong>? This will remove all modules and resources.
                    </p>
                    <div className="flex justify-end gap-3 mt-6">
                        <button className="btn btn-secondary" onClick={() => setDeletingCourse(null)}>
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
