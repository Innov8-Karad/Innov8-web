import { useState, useEffect } from 'react';
import { Calendar, Clock, Award, MoreVertical } from 'lucide-react';
import { examService } from '../services/examService';
import type { Exam } from '../types';
import { UI_STRINGS } from '../constants';
import PageHeader from '../components/PageHeader';
import LoadingState from '../components/LoadingState';
import ErrorAlert from '../components/ErrorAlert';
import SearchInput from '../components/SearchInput';
import Modal from '../components/Modal';

export default function ExamsPage() {
    const [exams, setExams] = useState<Exam[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [newExam, setNewExam] = useState({
        title: '',
        description: '',
        duration: '',
        totalMarks: '',
        category: '',
        difficulty: 'medium',
        scheduledDate: ''
    });

    useEffect(() => {
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
        fetchExams();
    }, []);

    const handleCreateExam = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            setError(null);
            const created = await examService.createExam(newExam as unknown as Omit<Exam, 'id' | 'questions' | 'createdAt'>);
            setExams([created, ...exams]);
            setShowModal(false);
            setNewExam({ 
                title: '', 
                description: '', 
                duration: '', 
                totalMarks: '', 
                category: '', 
                difficulty: 'medium', 
                scheduledDate: '' 
            });
        } catch (err) {
            console.error("Error creating exam: ", err);
            setError(UI_STRINGS.EXAMS.ERROR_CREATE);
        }
    };

    const getDifficultyColor = (diff: string) => {
        switch (diff) {
            case 'easy': return 'var(--success)';
            case 'hard': return 'var(--error)';
            default: return 'var(--primary)';
        }
    };

    const filteredExams = exams.filter(exam =>
        exam.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        exam.category.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (loading) {
        return <LoadingState message={UI_STRINGS.EXAMS.LOADING} />;
    }

    return (
        <div>
            <ErrorAlert message={error} />
            <PageHeader
                title={UI_STRINGS.EXAMS.TITLE}
                subtitle={UI_STRINGS.EXAMS.SUBTITLE}
                actionLabel={UI_STRINGS.EXAMS.NEW_BTN}
                onAction={() => setShowModal(true)}
            />

            <div className="card" style={{ marginBottom: 'var(--space-md)' }}>
                <SearchInput
                    placeholder={UI_STRINGS.EXAMS.SEARCH_PLACEHOLDER}
                    value={searchTerm}
                    onChange={setSearchTerm}
                />
            </div>

            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
                gap: 'var(--space-lg)'
            }}>
                {filteredExams.length > 0 ? (
                    filteredExams.map(exam => (
                        <div key={exam.id} className="card" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
                            <div className="flex justify-between items-start">
                                <div>
                                    <span style={{
                                        fontSize: '0.75rem',
                                        fontWeight: 600,
                                        color: 'var(--accent-blue)',
                                        textTransform: 'uppercase',
                                        letterSpacing: '1px'
                                    }}>
                                        {exam.category}
                                    </span>
                                    <h3 style={{ marginTop: '4px' }}>{exam.title}</h3>
                                </div>
                                <button className="btn-text">
                                    <MoreVertical size={18} />
                                </button>
                            </div>

                            <p style={{ fontSize: '0.9rem', flex: 1 }}>{exam.description}</p>

                            <div style={{
                                display: 'grid',
                                gridTemplateColumns: '1fr 1fr',
                                gap: 'var(--space-sm)',
                                fontSize: '0.85rem',
                                color: 'var(--text-secondary)'
                            }}>
                                <div className="flex items-center gap-2">
                                    <Calendar size={14} />
                                    {exam.scheduledDate?.toLocaleDateString()}
                                </div>
                                <div className="flex items-center gap-2">
                                    <Clock size={14} />
                                    {exam.duration} {UI_STRINGS.EXAMS.MINS_SUFFIX}
                                </div>
                                <div className="flex items-center gap-2">
                                    <Award size={14} />
                                    {exam.totalMarks} {UI_STRINGS.EXAMS.MARKS_SUFFIX}
                                </div>
                                <div className="flex items-center gap-2" style={{ color: getDifficultyColor(exam.difficulty) }}>
                                    <div style={{
                                        width: '8px',
                                        height: '8px',
                                        borderRadius: '50%',
                                        backgroundColor: getDifficultyColor(exam.difficulty)
                                    }} />
                                    {exam.difficulty}
                                </div>
                            </div>

                            <div style={{
                                marginTop: 'var(--space-sm)',
                                paddingTop: 'var(--space-md)',
                                borderTop: '1px solid rgba(255,255,255,0.05)',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center'
                            }}>
                                <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                                    {exam.questions?.length || 0} {UI_STRINGS.EXAMS.QUESTIONS_SUFFIX}
                                </span>
                                <button className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '0.85rem' }}>
                                    {UI_STRINGS.COMMON.EDIT}
                                </button>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="card" style={{ gridColumn: '1/-1', textAlign: 'center', padding: 'var(--space-xl)' }}>
                        <p>{UI_STRINGS.EXAMS.EMPTY}</p>
                    </div>
                )}
            </div>

            <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={UI_STRINGS.EXAMS.MODAL_TITLE} maxWidth="550px">
                <form onSubmit={handleCreateExam} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)', marginTop: 'var(--space-lg)' }}>
                    <div>
                        <label>{UI_STRINGS.EXAMS.FORM_TITLE}</label>
                        <input type="text" required placeholder={UI_STRINGS.EXAMS.FORM_TITLE_PLACEHOLDER} value={newExam.title} onChange={e => setNewExam({ ...newExam, title: e.target.value })} />
                    </div>
                    <div>
                        <label>{UI_STRINGS.EXAMS.FORM_DESCRIPTION}</label>
                        <textarea rows={2} required value={newExam.description} onChange={e => setNewExam({ ...newExam, description: e.target.value })} />
                    </div>
                    <div className="flex gap-4">
                        <div style={{ flex: 1 }}>
                            <label>{UI_STRINGS.EXAMS.FORM_CATEGORY}</label>
                            <input type="text" required placeholder={UI_STRINGS.EXAMS.FORM_CATEGORY_PLACEHOLDER} value={newExam.category} onChange={e => setNewExam({ ...newExam, category: e.target.value })} />
                        </div>
                        <div style={{ flex: 1 }}>
                            <label>{UI_STRINGS.EXAMS.FORM_DIFFICULTY}</label>
                            <select value={newExam.difficulty} onChange={e => setNewExam({ ...newExam, difficulty: e.target.value as 'easy' | 'medium' | 'hard' })}>
                                <option value="easy">{UI_STRINGS.EXAMS.DIFFICULTY_EASY}</option>
                                <option value="medium">{UI_STRINGS.EXAMS.DIFFICULTY_MEDIUM}</option>
                                <option value="hard">{UI_STRINGS.EXAMS.DIFFICULTY_HARD}</option>
                            </select>
                        </div>
                    </div>
                    <div className="flex gap-4">
                        <div style={{ flex: 1 }}>
                            <label>{UI_STRINGS.EXAMS.FORM_DURATION}</label>
                            <input type="number" required value={newExam.duration} onChange={e => setNewExam({ ...newExam, duration: e.target.value })} />
                        </div>
                        <div style={{ flex: 1 }}>
                            <label>{UI_STRINGS.EXAMS.FORM_TOTAL_MARKS}</label>
                            <input type="number" required value={newExam.totalMarks} onChange={e => setNewExam({ ...newExam, totalMarks: e.target.value })} />
                        </div>
                    </div>
                    <div>
                        <label>{UI_STRINGS.EXAMS.FORM_SCHEDULED_DATE}</label>
                        <input type="datetime-local" required value={newExam.scheduledDate} onChange={e => setNewExam({ ...newExam, scheduledDate: e.target.value })} />
                    </div>
                    <div className="flex justify-end gap-2" style={{ marginTop: 'var(--space-md)' }}>
                        <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>{UI_STRINGS.COMMON.CANCEL}</button>
                        <button type="submit" className="btn btn-primary">{UI_STRINGS.COMMON.PUBLISH}</button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}
