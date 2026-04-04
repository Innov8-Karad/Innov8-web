import { useState, useEffect } from 'react';
import { Calendar, Clock, Award, Plus, Trash2 } from 'lucide-react';
import './Exams.css';
import { examService } from '../services/examService';
import type { Exam, Question } from '../types';
import { UI_STRINGS } from '../constants';
import { getDifficultyColor } from '../styles/colors';
import PageHeader from '../components/PageHeader';
import LoadingState from '../components/LoadingState';
import ErrorAlert from '../components/ErrorAlert';
import SearchInput from '../components/SearchInput';
import Modal from '../components/Modal';
import EmptyState from '../components/EmptyState';
import { FormField, FormRow, FormActions } from '../components/FormField';
import { useToast } from '../hooks/useToast';

export default function ExamsPage() {
    const { showToast } = useToast();
    const [exams, setExams] = useState<Exam[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [examIdToDelete, setExamIdToDelete] = useState<string | null>(null);
    const [editingExamId, setEditingExamId] = useState<string | null>(null);
    
    const initialExamState = {
        title: '',
        description: '',
        duration: '',
        totalMarks: '',
        category: '',
        difficulty: 'medium' as 'easy' | 'medium' | 'hard',
        scheduledDate: '',
        questions: [] as Question[]
    };

    const [formData, setFormData] = useState(initialExamState);

    useEffect(() => {
        fetchExams();
    }, []);

    const fetchExams = async () => {
        try {
            setLoading(true);
            setError(null);
            const data = await examService.fetchExams();
            setExams(data);
        } catch (err) {
            console.error("Error fetching exams: ", err);
            setError(UI_STRINGS.EXAMS.ERROR_LOAD);
        } finally {
            setLoading(false);
        }
    };

    const handleOpenCreate = () => {
        setEditingExamId(null);
        setFormData(initialExamState);
        setShowModal(true);
    };

    const handleOpenEdit = (exam: Exam) => {
        setEditingExamId(exam.id);
        setFormData({
            title: exam.title,
            description: exam.description,
            duration: String(exam.duration),
            totalMarks: String(exam.totalMarks),
            category: exam.category,
            difficulty: exam.difficulty,
            scheduledDate: exam.scheduledDate ? new Date(exam.scheduledDate).toISOString().slice(0, 16) : '',
            questions: exam.questions || []
        });
        setShowModal(true);
    };

    const handleConfirmDelete = (id: string) => {
        setExamIdToDelete(id);
        setShowDeleteModal(true);
    };

    const handleDeleteExam = async () => {
        if (!examIdToDelete) return;
        try {
            await examService.deleteExam(examIdToDelete);
            showToast("Exam deleted successfully");
            setExams(exams.filter(e => e.id !== examIdToDelete));
            setShowDeleteModal(false);
        } catch (err) {
            console.error("Error deleting exam:", err);
            showToast("Failed to delete exam", "error");
        }
    };

    const handleSaveExam = async (e: React.FormEvent) => {
        e.preventDefault();
        
        // Validation
        if (formData.questions.length === 0) {
            showToast("At least one question is required", "error");
            return;
        }

        for (let i = 0; i < formData.questions.length; i++) {
            const q = formData.questions[i];
            if (!q.questionText || q.options.some(opt => !opt.trim())) {
                showToast(`Question ${i + 1} is incomplete`, "error");
                return;
            }
        }

        try {
            setLoading(true);
            if (editingExamId) {
                await examService.updateExam(editingExamId, formData as unknown as Partial<Exam>);
                showToast("Exam updated successfully");
            } else {
                const created = await examService.createExam(formData as unknown as Omit<Exam, 'id' | 'createdAt'>);
                showToast("Exam published successfully");
                setExams([created, ...exams]);
            }
            setShowModal(false);
            fetchExams(); // Refresh to ensure sync
        } catch (err) {
            console.error("Error saving exam: ", err);
            showToast(editingExamId ? "Failed to update exam" : "Failed to publish exam", "error");
        } finally {
            setLoading(false);
        }
    };

    const addQuestion = () => {
        const newQuestion: Question = {
            questionText: '',
            options: ['', '', '', ''],
            correctAnswerIndex: 0,
            explanation: ''
        };
        setFormData({ ...formData, questions: [...formData.questions, newQuestion] });
    };

    const removeQuestion = (index: number) => {
        const updated = [...formData.questions];
        updated.splice(index, 1);
        setFormData({ ...formData, questions: updated });
    };

    const updateQuestion = (index: number, field: keyof Question, value: string | number) => {
        const updated = [...formData.questions];
        updated[index] = { ...updated[index], [field]: value } as Question;
        setFormData({ ...formData, questions: updated });
    };

    const updateOption = (qIndex: number, optIndex: number, value: string) => {
        const updated = [...formData.questions];
        const updatedOptions = [...updated[qIndex].options];
        updatedOptions[optIndex] = value;
        updated[qIndex] = { ...updated[qIndex], options: updatedOptions };
        setFormData({ ...formData, questions: updated });
    };

    const filteredExams = exams.filter(exam =>
        exam.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        exam.category.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (loading && exams.length === 0) {
        return <LoadingState message={UI_STRINGS.EXAMS.LOADING} />;
    }

    return (
        <div className="animate-in">
            <ErrorAlert message={error} />
            <PageHeader
                title={UI_STRINGS.EXAMS.TITLE}
                subtitle={UI_STRINGS.EXAMS.SUBTITLE}
                actionLabel={UI_STRINGS.EXAMS.NEW_BTN}
                onAction={handleOpenCreate}
            />

            <div className="card mb-md">
                <SearchInput placeholder={UI_STRINGS.EXAMS.SEARCH_PLACEHOLDER} value={searchTerm} onChange={setSearchTerm} />
            </div>

            <div className="grid-cards">
                {filteredExams.length > 0 ? (
                    filteredExams.map(exam => (
                        <div key={exam.id} className="card flex flex-col gap-4">
                            <div>
                                <span className="section-label">{exam.category}</span>
                                <h3 style={{ marginTop: '4px' }}>{exam.title}</h3>
                            </div>

                            <p className="text-sm text-muted" style={{ flex: 1 }}>{exam.description}</p>

                            <div className="grid-2col text-sm text-muted">
                                <div className="flex items-center gap-2">
                                    <Calendar size={14} className="text-primary" /> {exam.scheduledDate?.toLocaleDateString()}
                                </div>
                                <div className="flex items-center gap-2">
                                    <Clock size={14} className="text-primary" /> {exam.duration} {UI_STRINGS.EXAMS.MINS_SUFFIX}
                                </div>
                                <div className="flex items-center gap-2">
                                    <Award size={14} className="text-primary" /> {exam.totalMarks} {UI_STRINGS.EXAMS.MARKS_SUFFIX}
                                </div>
                                <div className="flex items-center gap-2" style={{ color: getDifficultyColor(exam.difficulty) }}>
                                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: getDifficultyColor(exam.difficulty) }} />
                                    <span className="capitalize">{exam.difficulty}</span>
                                </div>
                            </div>

                            <div className="separator flex justify-between items-center" style={{ paddingTop: '12px', borderTop: '1px solid var(--border-color)' }}>
                                <span className="text-sm font-medium">
                                    {exam.questions?.length || 0} {UI_STRINGS.EXAMS.QUESTIONS_SUFFIX}
                                </span>
                                <div className="flex items-center gap-2">
                                    <button
                                        className="btn btn-secondary btn-sm"
                                        onClick={() => handleOpenEdit(exam)}
                                    >
                                        {UI_STRINGS.COMMON.EDIT}
                                    </button>
                                    <button
                                        className="btn btn-sm"
                                        style={{ backgroundColor: 'var(--error)', color: 'white' }}
                                        onClick={() => handleConfirmDelete(exam.id)}
                                    >
                                        <Trash2 size={14} style={{ marginRight: '4px', display: 'inline' }} />
                                        {UI_STRINGS.COMMON.DELETE}
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))
                ) : (
                    <EmptyState message={UI_STRINGS.EXAMS.EMPTY} />
                )}
            </div>

            {/* Exam Editor Modal */}
            <Modal 
                isOpen={showModal} 
                onClose={() => setShowModal(false)} 
                title={editingExamId ? "Edit Exam" : UI_STRINGS.EXAMS.MODAL_TITLE} 
                maxWidth="800px"
            >
                <form onSubmit={handleSaveExam} className="form-layout">
                    <div className="grid-2col gap-md">
                        <div className="flex flex-col gap-md">
                            <FormField label={UI_STRINGS.EXAMS.FORM_TITLE}>
                                <input type="text" required placeholder={UI_STRINGS.EXAMS.FORM_TITLE_PLACEHOLDER} value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} />
                            </FormField>
                            <FormField label={UI_STRINGS.EXAMS.FORM_DESCRIPTION}>
                                <textarea rows={3} required value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} />
                            </FormField>
                            <FormRow>
                                <FormField label={UI_STRINGS.EXAMS.FORM_CATEGORY}>
                                    <input type="text" required placeholder={UI_STRINGS.EXAMS.FORM_CATEGORY_PLACEHOLDER} value={formData.category} onChange={e => setFormData({ ...formData, category: e.target.value })} />
                                </FormField>
                                <FormField label={UI_STRINGS.EXAMS.FORM_DIFFICULTY}>
                                    <select value={formData.difficulty} onChange={e => setFormData({ ...formData, difficulty: e.target.value as 'easy' | 'medium' | 'hard' })}>
                                        <option value="easy">{UI_STRINGS.EXAMS.DIFFICULTY_EASY}</option>
                                        <option value="medium">{UI_STRINGS.EXAMS.DIFFICULTY_MEDIUM}</option>
                                        <option value="hard">{UI_STRINGS.EXAMS.DIFFICULTY_HARD}</option>
                                    </select>
                                </FormField>
                            </FormRow>
                            <FormRow>
                                <FormField label={UI_STRINGS.EXAMS.FORM_DURATION}>
                                    <input type="number" required value={formData.duration} onChange={e => setFormData({ ...formData, duration: e.target.value })} />
                                </FormField>
                                <FormField label={UI_STRINGS.EXAMS.FORM_TOTAL_MARKS}>
                                    <input type="number" required value={formData.totalMarks} onChange={e => setFormData({ ...formData, totalMarks: e.target.value })} />
                                </FormField>
                            </FormRow>
                            <FormField label={UI_STRINGS.EXAMS.FORM_SCHEDULED_DATE}>
                                <div className="att-date-time-grid">
                                    <div className="att-date-time-inputs">
                                        <div className="att-date-input-wrapper">
                                            <input 
                                                type="date" 
                                                required 
                                                value={formData.scheduledDate.split('T')[0] || ''} 
                                                onChange={e => {
                                                    const date = e.target.value;
                                                    const time = formData.scheduledDate.split('T')[1] || '09:00';
                                                    setFormData({ ...formData, scheduledDate: `${date}T${time}` });
                                                }} 
                                            />
                                        </div>
                                        <div className="att-time-input-wrapper">
                                            <input 
                                                type="time" 
                                                required 
                                                value={formData.scheduledDate.split('T')[1] || ''} 
                                                onChange={e => {
                                                    const time = e.target.value;
                                                    const date = formData.scheduledDate.split('T')[0] || new Date().toISOString().split('T')[0];
                                                    setFormData({ ...formData, scheduledDate: `${date}T${time}` });
                                                }} 
                                            />
                                        </div>
                                    </div>
                                    <div className="att-quick-options">
                                        <button 
                                            type="button" 
                                            className={`btn-quick-date ${formData.scheduledDate.startsWith(new Date().toISOString().split('T')[0]) ? 'active' : ''}`}
                                            onClick={() => {
                                                const date = new Date().toISOString().split('T')[0];
                                                const time = formData.scheduledDate.split('T')[1] || '09:00';
                                                setFormData({ ...formData, scheduledDate: `${date}T${time}` });
                                            }}
                                        >
                                            Today
                                        </button>
                                        <button 
                                            type="button" 
                                            className={`btn-quick-date ${formData.scheduledDate.startsWith(new Date(Date.now() + 86400000).toISOString().split('T')[0]) ? 'active' : ''}`}
                                            onClick={() => {
                                                const date = new Date(Date.now() + 86400000).toISOString().split('T')[0];
                                                const time = formData.scheduledDate.split('T')[1] || '09:00';
                                                setFormData({ ...formData, scheduledDate: `${date}T${time}` });
                                            }}
                                        >
                                            Tomorrow
                                        </button>
                                    </div>
                                </div>
                            </FormField>
                        </div>

                        <div className="flex flex-col gap-md" style={{ maxHeight: '600px', overflowY: 'auto', paddingRight: '4px' }}>
                            <div className="flex justify-between items-center">
                                <h4 className="text-md font-bold">Questions ({formData.questions.length})</h4>
                                <button type="button" className="btn btn-secondary btn-sm flex items-center gap-1" onClick={addQuestion}>
                                    <Plus size={14} /> Add Question
                                </button>
                            </div>

                            {formData.questions.map((q, qIndex) => (
                                <div key={qIndex} className="card shadow-sm p-sm bg-light" style={{ position: 'relative' }}>
                                    <button 
                                        type="button" 
                                        className="btn-icon text-error" 
                                        style={{ position: 'absolute', top: '8px', right: '8px' }}
                                        onClick={() => removeQuestion(qIndex)}
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                    
                                    <span className="text-xs font-bold text-primary mb-1 inline-block">Question {qIndex + 1}</span>
                                    
                                    <div className="flex flex-col gap-sm">
                                        <textarea 
                                            placeholder="Question Text" 
                                            rows={2} 
                                            className="text-sm p-xs"
                                            value={q.questionText}
                                            onChange={(e) => updateQuestion(qIndex, 'questionText', e.target.value)}
                                        />
                                        
                                        <div className="grid-2col gap-xs">
                                            {q.options.map((opt, optIndex) => (
                                                <div key={optIndex} className="flex items-center gap-1">
                                                    <input 
                                                        type="radio" 
                                                        checked={q.correctAnswerIndex === optIndex} 
                                                        onChange={() => updateQuestion(qIndex, 'correctAnswerIndex', optIndex)}
                                                    />
                                                    <input 
                                                        type="text" 
                                                        placeholder={`Option ${optIndex + 1}`} 
                                                        className="text-xs p-xs w-full"
                                                        value={opt}
                                                        onChange={(e) => updateOption(qIndex, optIndex, e.target.value)}
                                                    />
                                                </div>
                                            ))}
                                        </div>

                                        <input 
                                            type="text" 
                                            placeholder="Explanation (Optional)" 
                                            className="text-xs p-xs"
                                            value={q.explanation}
                                            onChange={(e) => updateQuestion(qIndex, 'explanation', e.target.value)}
                                        />
                                    </div>
                                </div>
                            ))}
                            
                            {formData.questions.length === 0 && (
                                <p className="text-sm text-center text-muted py-lg border-dashed">No questions added yet.</p>
                            )}
                        </div>
                    </div>

                    <FormActions>
                        <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>{UI_STRINGS.COMMON.CANCEL}</button>
                        <button type="submit" className="btn btn-primary" disabled={loading}>
                            {loading ? UI_STRINGS.COMMON.LOADING : (editingExamId ? "Update Exam" : UI_STRINGS.COMMON.PUBLISH)}
                        </button>
                    </FormActions>
                </form>
            </Modal>

            {/* Delete Confirmation Modal */}
            <Modal 
                isOpen={showDeleteModal} 
                onClose={() => setShowDeleteModal(false)} 
                title="Confirm Delete" 
                maxWidth="400px"
            >
                <div className="text-center py-md">
                    <Trash2 size={48} className="text-error mb-md" style={{ margin: '0 auto' }} />
                    <p className="mb-lg">Are you sure you want to delete this exam? This action cannot be undone.</p>
                    <div className="flex justify-center gap-3">
                        <button className="btn btn-secondary" onClick={() => setShowDeleteModal(false)}>Cancel</button>
                        <button className="btn btn-error" onClick={handleDeleteExam}>Delete Exam</button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}
