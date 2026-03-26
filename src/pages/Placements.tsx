import { useState, useEffect } from 'react';
import { Building2, Users, Briefcase, Pencil } from 'lucide-react';
import { placementService } from '../services/placementService';
import type { Placement, SuccessStory } from '../types';
import { UI_STRINGS } from '../constants';
import PageHeader from '../components/PageHeader';
import LoadingState from '../components/LoadingState';
import ErrorAlert from '../components/ErrorAlert';
import Modal from '../components/Modal';

export default function PlacementsPage() {
    const [stats, setStats] = useState<Placement | null>(null);
    const [successStories, setSuccessStories] = useState<SuccessStory[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showModal, setShowModal] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [newStory, setNewStory] = useState({
        studentName: '',
        company: '',
        package: '',
        role: '',
        studentImage: '',
        batch: '',
        testimonial: ''
    });

    const fetchStories = async () => {
        try {
            const storiesData = await placementService.fetchSuccessStories();
            setSuccessStories(storiesData);
        } catch (err) {
            console.error("Error fetching success stories:", err);
            setError(UI_STRINGS.PLACEMENTS.ERROR_LOAD);
        }
    };

    useEffect(() => {
        async function fetchData() {
            try {
                setLoading(true);
                setError(null);
                const statsData = await placementService.fetchPlacementStats();
                setStats(statsData);
                await fetchStories();
            } catch (err) {
                console.error("Error fetching placement stats:", err);
                setError(UI_STRINGS.PLACEMENTS.ERROR_LOAD);
            } finally {
                setLoading(false);
            }
        }
        fetchData();
    }, []);

    const handleEditClick = (story: SuccessStory) => {
        setEditingId(story.id);
        setNewStory({
            studentName: story.studentName,
            company: story.company,
            package: String(story.package),
            role: story.role || '',
            studentImage: story.studentPhoto || '',
            batch: story.batch || '',
            testimonial: story.testimonial || ''
        });
        setShowModal(true);
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setSelectedFile(file);
            setPreviewUrl(URL.createObjectURL(file));
        }
    };

    const handleSaveStory = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            setSaving(true);
            setError(null);
            
            let imageUrl = newStory.studentImage;
            
            if (selectedFile) {
                imageUrl = await placementService.uploadStudentPhoto(selectedFile);
            }

            const dataToSave = {
                studentName: newStory.studentName,
                company: newStory.company,
                package: newStory.package,
                role: newStory.role,
                studentPhoto: imageUrl,
                batch: newStory.batch,
                testimonial: newStory.testimonial
            };

            if (editingId) {
                await placementService.updateSuccessStory(editingId, dataToSave);
            } else {
                await placementService.createSuccessStory(dataToSave);
            }
            
            await fetchStories();

            setShowModal(false);
            resetForm();
        } catch (err) {
            console.error("Error saving success story: ", err);
            setError(UI_STRINGS.PLACEMENTS.ERROR_SAVE);
        } finally {
            setSaving(false);
        }
    };

    const resetForm = () => {
        setEditingId(null);
        setSelectedFile(null);
        setPreviewUrl(null);
        setNewStory({ studentName: '', company: '', package: '', role: '', studentImage: '', batch: '', testimonial: '' });
    };

    if (loading) {
        return <LoadingState message={UI_STRINGS.PLACEMENTS.LOADING} />;
    }

    return (
        <div>
            {error && !error.includes("placement records") ? (
                <ErrorAlert message={error} />
            ) : null}
            <PageHeader
                title={UI_STRINGS.PLACEMENTS.TITLE}
                subtitle={UI_STRINGS.PLACEMENTS.SUBTITLE}
                actionLabel={UI_STRINGS.PLACEMENTS.NEW_BTN}
                onAction={() => setShowModal(true)}
            />

            {stats && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 'var(--space-md)', marginBottom: 'var(--space-xl)' }}>
                    <div className="card flex items-center gap-4">
                        <div style={{ padding: '12px', borderRadius: '12px', backgroundColor: 'rgba(99, 102, 241, 0.1)', color: 'var(--accent-blue)' }}>
                            <Building2 size={24} />
                        </div>
                        <div>
                            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{UI_STRINGS.PLACEMENTS.STAT_PARTNER_COMPANIES}</p>
                            <h2 style={{ margin: 0 }}>{stats.companiesCount || stats.topCompanies?.length || 0}+</h2>
                        </div>
                    </div>
                    <div className="card flex items-center gap-4">
                        <div style={{ padding: '12px', borderRadius: '12px', backgroundColor: 'rgba(249, 115, 22, 0.1)', color: 'var(--primary)' }}>
                            <Users size={24} />
                        </div>
                        <div>
                            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{UI_STRINGS.PLACEMENTS.STAT_PLACED_STUDENTS}</p>
                            <h2 style={{ margin: 0 }}>{stats.totalPlaced || stats.studentsPlaced || 0}+</h2>
                        </div>
                    </div>
                    <div className="card flex items-center gap-4">
                        <div style={{ padding: '12px', borderRadius: '12px', backgroundColor: 'rgba(34, 197, 94, 0.1)', color: 'var(--success)' }}>
                            <Briefcase size={24} />
                        </div>
                        <div>
                            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{UI_STRINGS.PLACEMENTS.STAT_HIGHEST_PACKAGE}</p>
                            <h2 style={{ margin: 0 }}>{stats.highestPackage} {UI_STRINGS.PLACEMENTS.LPA_SUFFIX}</h2>
                        </div>
                    </div>
                </div>
            )}

            <h2 style={{ marginBottom: 'var(--space-md)' }}>{UI_STRINGS.PLACEMENTS.SUCCESS_STORIES_HEADING}</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 'var(--space-lg)' }}>
                {successStories.map(story => (
                    <div key={story.id} className="card flex gap-4">
                        <div style={{ width: '80px', height: '80px', borderRadius: '12px', backgroundColor: 'var(--dark-card-accent)', flexShrink: 0, overflow: 'hidden' }}>
                            {story.studentPhoto ? (
                                <img src={story.studentPhoto} alt={story.studentName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            ) : (
                                <div className="flex items-center justify-center h-full text-secondary">
                                    <Users size={32} />
                                </div>
                            )}
                        </div>
                        <div style={{ flex: 1 }}>
                            <h3 style={{ margin: 0 }}>{story.studentName}</h3>
                            <p style={{ color: 'var(--primary)', fontWeight: 600, fontSize: '0.9rem', marginTop: '2px' }}>{story.company}</p>
                            <div style={{ marginTop: '8px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                                <div>{story.role ? `${UI_STRINGS.PLACEMENTS.ROLE_PREFIX} ${story.role}` : `${UI_STRINGS.PLACEMENTS.BATCH_PREFIX} ${story.batch}`}</div>
                                <div>{UI_STRINGS.PLACEMENTS.PACKAGE_PREFIX} {story.package}</div>
                            </div>
                        </div>
                        <button 
                            onClick={() => handleEditClick(story)}
                            className="btn-icon"
                            title={UI_STRINGS.COMMON.EDIT}
                            style={{ 
                                alignSelf: 'flex-start',
                                padding: '8px',
                                borderRadius: '8px',
                                color: 'var(--text-secondary)',
                                transition: 'all 0.2s'
                            }}
                        >
                            <Pencil size={18} />
                        </button>
                    </div>
                ))}
            </div>

            <Modal 
                isOpen={showModal} 
                onClose={() => {
                    setShowModal(false);
                    resetForm();
                }} 
                title={editingId ? UI_STRINGS.COMMON.EDIT : UI_STRINGS.PLACEMENTS.MODAL_TITLE}
            >
                <form onSubmit={handleSaveStory} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)', marginTop: 'var(--space-lg)' }}>
                    <div style={{ alignSelf: 'center', marginBottom: 'var(--space-sm)' }}>
                        <div style={{ width: '100px', height: '100px', borderRadius: '50%', backgroundColor: 'var(--dark-card-accent)', overflow: 'hidden', border: '2px dashed var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                            {(previewUrl || newStory.studentImage) ? (
                                <img src={previewUrl || newStory.studentImage} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            ) : (
                                <Users size={40} style={{ color: 'var(--text-secondary)' }} />
                            )}
                        </div>
                    </div>
                    <div>
                        <label>{UI_STRINGS.PLACEMENTS.FORM_STUDENT_NAME}</label>
                        <input type="text" required value={newStory.studentName} onChange={e => setNewStory({ ...newStory, studentName: e.target.value })} />
                    </div>
                    <div className="flex gap-4">
                        <div style={{ flex: 1 }}>
                            <label>{UI_STRINGS.PLACEMENTS.FORM_COMPANY}</label>
                            <input type="text" required placeholder={UI_STRINGS.PLACEMENTS.FORM_COMPANY_PLACEHOLDER} value={newStory.company} onChange={e => setNewStory({ ...newStory, company: e.target.value })} />
                        </div>
                        <div style={{ flex: 1 }}>
                            <label>{UI_STRINGS.PLACEMENTS.FORM_PACKAGE}</label>
                            <input type="text" required placeholder={UI_STRINGS.PLACEMENTS.FORM_PACKAGE_PLACEHOLDER} value={newStory.package} onChange={e => setNewStory({ ...newStory, package: e.target.value })} />
                        </div>
                    </div>
                    <div className="flex gap-4">
                        <div style={{ flex: 1 }}>
                            <label>{UI_STRINGS.PLACEMENTS.FORM_ROLE}</label>
                            <input type="text" required placeholder={UI_STRINGS.PLACEMENTS.FORM_ROLE_PLACEHOLDER} value={newStory.role} onChange={e => setNewStory({ ...newStory, role: e.target.value })} />
                        </div>
                        <div style={{ flex: 1 }}>
                            <label>{UI_STRINGS.PLACEMENTS.FORM_BATCH}</label>
                            <input type="text" required placeholder={UI_STRINGS.PLACEMENTS.FORM_BATCH_PLACEHOLDER} value={newStory.batch} onChange={e => setNewStory({ ...newStory, batch: e.target.value })} />
                        </div>
                    </div>
                    <div>
                        <label>{UI_STRINGS.PLACEMENTS.FORM_TESTIMONIAL}</label>
                        <textarea rows={2} value={newStory.testimonial} onChange={e => setNewStory({ ...newStory, testimonial: e.target.value })} />
                    </div>
                    <div>
                        <label>{UI_STRINGS.PLACEMENTS.FORM_IMAGE_URL}</label>
                        <input type="file" accept="image/png, image/jpeg" onChange={handleFileChange} />
                    </div>
                    <div className="flex justify-end gap-2" style={{ marginTop: 'var(--space-md)' }}>
                        <button type="button" className="btn btn-secondary" disabled={saving} onClick={() => { setShowModal(false); resetForm(); }}>{UI_STRINGS.COMMON.CANCEL}</button>
                        <button type="submit" className="btn btn-primary" disabled={saving}>
                            {saving ? UI_STRINGS.COMMON.LOADING : UI_STRINGS.COMMON.SAVE}
                        </button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}
