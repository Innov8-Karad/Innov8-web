import { useState, useEffect } from 'react';
import { Bell, Megaphone, Trash2, Calendar, Edit2, X } from 'lucide-react';
import { announcementService } from '../services/announcementService';
import { userService } from '../services/userService';
import { PRIORITY_LEVELS, PRIORITY_COLORS, UI_STRINGS, DEFAULT_VALUES } from '../constants';
import type { Announcement, User } from '../types';
import PageHeader from '../components/PageHeader';
import LoadingState from '../components/LoadingState';
import ErrorAlert from '../components/ErrorAlert';
import Modal from '../components/Modal';
import { FormField, FormRow, FormActions } from '../components/FormField';
import { useToast } from '../hooks/useToast';

export default function AnnouncementsPage() {
    const { showToast } = useToast();
    const [announcements, setAnnouncements] = useState<Announcement[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showModal, setShowModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [deleteId, setDeleteId] = useState<string | null>(null);
    const [isEditing, setIsEditing] = useState(false);
    const [editId, setEditId] = useState<string | null>(null);
    const [uniqueBatches, setUniqueBatches] = useState<string[]>([]);
    const [students, setStudents] = useState<User[]>([]);
    const [searchQuery, setSearchQuery] = useState('');

    const initialFormState = {
        title: '',
        content: '',
        priority: PRIORITY_LEVELS.MEDIUM as 'high' | 'medium' | 'low',
        targetAudience: 'all' as 'all' | 'batch' | 'students',
        targetBatches: [] as string[],
        targetStudentIds: [] as string[]
    };
    const [formData, setFormData] = useState(initialFormState);

    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);
                setError(null);
                const [data, batches, usersData] = await Promise.all([
                    announcementService.fetchAnnouncements(),
                    announcementService.fetchUniqueBatches(),
                    userService.fetchUsers()
                ]);
                setAnnouncements(data);
                setUniqueBatches(batches);
                setStudents(usersData.filter(u => u.role !== 'admin'));
            } catch (err) {
                console.error("Error fetching data:", err);
                setError(UI_STRINGS.ANNOUNCEMENTS.ERROR_LOAD);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    const handleOpenCreate = () => {
        setIsEditing(false);
        setEditId(null);
        setFormData(initialFormState);
        setShowModal(true);
    };

    const handleOpenEdit = (ann: Announcement) => {
        setIsEditing(true);
        setEditId(ann.id);
        setFormData({
            title: ann.title,
            content: ann.content,
            priority: ann.priority,
            targetAudience: ann.targetAudience || 'all',
            targetBatches: ann.targetBatches || [],
            targetStudentIds: ann.targetStudentIds || []
        });
        setShowModal(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            setError(null);
            
            const submitData = {
                ...formData
            };

            if (isEditing && editId) {
                await announcementService.updateAnnouncement(editId, submitData);
                setAnnouncements(announcements.map(ann => 
                    ann.id === editId ? { ...ann, ...submitData } as Announcement : ann
                ));
                showToast('Announcement updated successfully', 'success');
            } else {
                const created = await announcementService.createAnnouncement(submitData);
                setAnnouncements([created, ...announcements]);
                showToast('Announcement created successfully', 'success');
            }
            setShowModal(false);
        } catch (err) {
            console.error("Error saving announcement:", err);
            setError(isEditing ? UI_STRINGS.ANNOUNCEMENTS.ERROR_UPDATE : UI_STRINGS.ANNOUNCEMENTS.ERROR_CREATE);
            showToast(UI_STRINGS.COMMON.ERROR_PRIMARY, 'error');
        }
    };

    const handleOpenDelete = (id: string) => {
        setDeleteId(id);
        setShowDeleteModal(true);
    };

    const confirmDelete = async () => {
        if (!deleteId) return;
        try {
            setError(null);
            await announcementService.deleteAnnouncement(deleteId);
            setAnnouncements(announcements.filter(ann => ann.id !== deleteId));
            setShowDeleteModal(false);
            setDeleteId(null);
            showToast('Announcement deleted successfully', 'success');
        } catch (err) {
            console.error("Error deleting announcement:", err);
            setError(UI_STRINGS.ANNOUNCEMENTS.ERROR_DELETE);
            showToast(UI_STRINGS.COMMON.ERROR_PRIMARY, 'error');
        }
    };

    const toggleBatch = (batch: string) => {
        if (batch === DEFAULT_VALUES.TARGET_BATCH_ALL) {
            // Selecting All clears others, unselecting all clears selection
            setFormData(prev => ({
                ...prev,
                targetBatches: prev.targetBatches.includes(DEFAULT_VALUES.TARGET_BATCH_ALL) ? [] : [DEFAULT_VALUES.TARGET_BATCH_ALL]
            }));
            return;
        }

        setFormData(prev => {
            const current = prev.targetBatches.filter(b => b !== DEFAULT_VALUES.TARGET_BATCH_ALL); // Remove 'All' if selecting specific batch
            if (current.includes(batch)) {
                return { ...prev, targetBatches: current.filter(b => b !== batch) };
            } else {
                return { ...prev, targetBatches: [...current, batch] };
            }
        });
    };

    const toggleStudent = (studentId: string) => {
        setFormData(prev => {
            const current = prev.targetStudentIds || [];
            if (current.includes(studentId)) {
                return { ...prev, targetStudentIds: current.filter(id => id !== studentId) };
            } else {
                return { ...prev, targetStudentIds: [...current, studentId] };
            }
        });
    };

    const getPriorityColor = (p: string) => {
        return PRIORITY_COLORS[p as keyof typeof PRIORITY_COLORS] || PRIORITY_COLORS.DEFAULT;
    };

    if (loading) return <LoadingState message={UI_STRINGS.ANNOUNCEMENTS.LOADING} />;

    return (
        <div>
            <ErrorAlert message={error} />
            <PageHeader
                title={UI_STRINGS.ANNOUNCEMENTS.TITLE}
                subtitle={UI_STRINGS.ANNOUNCEMENTS.SUBTITLE}
                actionLabel={UI_STRINGS.ANNOUNCEMENTS.NEW_BTN}
                onAction={handleOpenCreate}
            />

            <div className="grid-single">
                {announcements.map(ann => (
                    <div key={ann.id} className="card flex gap-4">
                        <div
                            className="avatar-sm flex items-center justify-center"
                            style={{
                                width: '40px',
                                height: '40px',
                                borderRadius: '50%',
                                backgroundColor: `${getPriorityColor(ann.priority)}20`,
                                color: getPriorityColor(ann.priority),
                                flexShrink: 0
                            }}
                        >
                            {ann.priority === PRIORITY_LEVELS.HIGH ? <Bell size={20} /> : <Megaphone size={20} />}
                        </div>
                        <div style={{ flex: 1 }}>
                            <div className="flex justify-between items-start">
                                <div>
                                    <h3 style={{ margin: 0 }}>{ann.title}</h3>
                                    <div className="flex items-center gap-2 text-xs text-muted" style={{ marginTop: '4px' }}>
                                        <Calendar size={14} />
                                        {ann.createdAt.toLocaleDateString()}
                                        <span style={{ margin: '0 4px' }}>•</span>
                                        <span className={`priority-badge priority-${ann.priority}`}>
                                            {ann.priority}
                                        </span>
                                        <span style={{ margin: '0 4px' }}>•</span>
                                        {UI_STRINGS.ANNOUNCEMENTS.TARGET_LABEL}: {
                                            ann.targetAudience === 'students' ? `${ann.targetStudentIds?.length || 0} students` :
                                            ann.targetAudience === 'all' ? 'All Students' :
                                            ((!ann.targetAudience && (!ann.targetBatches || ann.targetBatches.includes('All'))) ? 'All Students' :
                                            (ann.targetBatches && ann.targetBatches.length > 0 ? ann.targetBatches.join(', ') : 'All Students'))
                                        }
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <button className="icon-btn" title={UI_STRINGS.COMMON.EDIT} onClick={() => handleOpenEdit(ann)}>
                                        <Edit2 size={18} />
                                    </button>
                                    <button className="icon-btn" title={UI_STRINGS.COMMON.DELETE} onClick={() => handleOpenDelete(ann.id)}>
                                        <Trash2 size={18} />
                                    </button>
                                </div>
                            </div>
                            <p className="mt-md" style={{ lineHeight: 1.6 }}>{ann.content}</p>
                        </div>
                    </div>
                ))}
                {announcements.length === 0 && !loading && (
                    <div className="empty-state">{UI_STRINGS.ANNOUNCEMENTS.EMPTY}</div>
                )}
            </div>

            <Modal 
                isOpen={showModal} 
                onClose={() => setShowModal(false)} 
                title={isEditing ? UI_STRINGS.ANNOUNCEMENTS.EDIT_MODAL_TITLE : UI_STRINGS.ANNOUNCEMENTS.MODAL_TITLE}
                maxWidth="900px"
            >
                <div className="grid-2col" style={{ marginTop: 'var(--space-md)' }}>
                    {/* Form Section */}
                    <div>
                        <form onSubmit={handleSubmit} className="form-layout" style={{ marginTop: 0 }}>
                            <FormField label={UI_STRINGS.ANNOUNCEMENTS.FORM_TITLE}>
                                <input type="text" value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} required />
                            </FormField>
                            <FormField label={UI_STRINGS.ANNOUNCEMENTS.FORM_CONTENT}>
                                <textarea rows={4} value={formData.content} onChange={e => setFormData({ ...formData, content: e.target.value })} required />
                            </FormField>
                            <FormRow>
                                <FormField label={UI_STRINGS.ANNOUNCEMENTS.FORM_PRIORITY}>
                                    <select value={formData.priority} onChange={e => setFormData({ ...formData, priority: e.target.value as 'high' | 'medium' | 'low' })}>
                                        <option value={PRIORITY_LEVELS.LOW}>Low</option>
                                        <option value={PRIORITY_LEVELS.MEDIUM}>Medium</option>
                                        <option value={PRIORITY_LEVELS.HIGH}>High</option>
                                    </select>
                                </FormField>
                            </FormRow>
                            <FormField label={UI_STRINGS.ANNOUNCEMENTS.TARGET_LABEL}>
                                <div className="target-mode-selector">
                                    <button 
                                        type="button"
                                        className={`target-mode-btn ${formData.targetAudience === 'all' ? 'active' : ''}`}
                                        onClick={() => setFormData({...formData, targetAudience: 'all'})}
                                    >
                                        {UI_STRINGS.ANNOUNCEMENTS.TARGET_ALL}
                                    </button>
                                    <button 
                                        type="button"
                                        className={`target-mode-btn ${formData.targetAudience === 'batch' ? 'active' : ''}`}
                                        onClick={() => setFormData({...formData, targetAudience: 'batch'})}
                                    >
                                        {UI_STRINGS.ANNOUNCEMENTS.TARGET_BATCH}
                                    </button>
                                    <button 
                                        type="button"
                                        className={`target-mode-btn ${formData.targetAudience === 'students' ? 'active' : ''}`}
                                        onClick={() => setFormData({...formData, targetAudience: 'students'})}
                                    >
                                        {UI_STRINGS.ANNOUNCEMENTS.TARGET_STUDENTS}
                                    </button>
                                </div>

                                {formData.targetAudience === 'batch' && (
                                    <div className="batch-multi-select" style={{ marginTop: 'var(--space-sm)' }}>
                                        <label className="batch-checkbox-item">
                                            <input 
                                                type="checkbox" 
                                                checked={formData.targetBatches.includes(DEFAULT_VALUES.TARGET_BATCH_ALL)} 
                                                onChange={() => toggleBatch(DEFAULT_VALUES.TARGET_BATCH_ALL)} 
                                            />
                                            All Batches
                                        </label>
                                        {uniqueBatches.map(batch => (
                                            <label key={batch} className="batch-checkbox-item">
                                                <input 
                                                    type="checkbox" 
                                                    checked={formData.targetBatches.includes(batch)} 
                                                    onChange={() => toggleBatch(batch)} 
                                                />
                                                {batch}
                                            </label>
                                        ))}
                                    </div>
                                )}

                                {formData.targetAudience === 'students' && (
                                    <div className="student-picker-container" style={{ marginTop: 'var(--space-sm)' }}>
                                        {formData.targetStudentIds && formData.targetStudentIds.length > 0 && (
                                            <div className="selected-students-chips">
                                                {formData.targetStudentIds.map(id => {
                                                    const student = students.find(s => s.id === id);
                                                    return (
                                                        <div key={id} className="student-chip">
                                                            {student ? student.name : id}
                                                            <div 
                                                                className="student-chip-remove"
                                                                onClick={(e) => { e.stopPropagation(); toggleStudent(id); }}
                                                            >
                                                                <X size={12} />
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                        <input
                                            type="text"
                                            className="student-search-input"
                                            placeholder={UI_STRINGS.ANNOUNCEMENTS.STUDENT_SEARCH_PLACEHOLDER}
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                        />
                                        <div className="student-list" style={{ marginTop: 'var(--space-sm)' }}>
                                            {students
                                                .filter(s => 
                                                    s.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                                                    s.email.toLowerCase().includes(searchQuery.toLowerCase())
                                                )
                                                .map(student => (
                                                    <div 
                                                        key={student.id} 
                                                        className="student-list-item"
                                                        onClick={() => toggleStudent(student.id)}
                                                    >
                                                        <input 
                                                            type="checkbox" 
                                                            checked={(formData.targetStudentIds || []).includes(student.id)} 
                                                            readOnly
                                                        />
                                                        <div className="student-list-info" style={{ marginLeft: '8px' }}>
                                                            <div className="student-list-name">{student.name}</div>
                                                            <div className="student-list-meta">
                                                                <span>{student.batch}</span>
                                                                <span>&bull;</span>
                                                                <span>{student.email}</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            {students.length === 0 && (
                                                <div className="text-muted text-sm text-center py-2">No students found</div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </FormField>
                            <FormActions>
                                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>{UI_STRINGS.COMMON.CANCEL}</button>
                                <button type="submit" className="btn btn-primary">{UI_STRINGS.COMMON.SAVE}</button>
                            </FormActions>
                        </form>
                    </div>

                    {/* Preview Section */}
                    <div>
                        <h3 style={{ marginBottom: '16px', fontSize: '1rem', color: 'var(--text-secondary)' }}>{UI_STRINGS.ANNOUNCEMENTS.LIVE_PREVIEW}</h3>
                        <div className="mobile-preview-frame">
                            <div className="mobile-preview-header">
                                <div className="mobile-preview-title">{UI_STRINGS.ANNOUNCEMENTS.TITLE}</div>
                            </div>
                            <div className="mobile-preview-content">
                                {(formData.title || formData.content) ? (
                                    <div className="mobile-preview-card">
                                        <div className="flex justify-between items-start">
                                            <span className={`priority-badge priority-${formData.priority}`}>
                                                {formData.priority}
                                            </span>
                                            <span className="text-xs text-muted">Just now</span>
                                        </div>
                                        <div className="mobile-preview-card-title">{formData.title || 'Announcement Title'}</div>
                                        <div className="mobile-preview-card-text">
                                            {formData.content || 'Announcement content will appear here.'}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="text-center text-muted" style={{ marginTop: '50px' }}>
                                        Start typing to see preview
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </Modal>

            {/* Delete Confirmation Modal */}
            <Modal isOpen={showDeleteModal} onClose={() => setShowDeleteModal(false)} title={UI_STRINGS.ANNOUNCEMENTS.CONFIRM_DELETE_TITLE} maxWidth="400px">
                <div style={{ marginTop: 'var(--space-md)' }}>
                    <p>{UI_STRINGS.ANNOUNCEMENTS.CONFIRM_DELETE_DESC}</p>
                    <div className="flex justify-end gap-2" style={{ marginTop: 'var(--space-lg)' }}>
                        <button className="btn btn-secondary" onClick={() => setShowDeleteModal(false)}>{UI_STRINGS.COMMON.CANCEL}</button>
                        <button className="btn btn-danger" onClick={confirmDelete}>{UI_STRINGS.COMMON.DELETE}</button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}
