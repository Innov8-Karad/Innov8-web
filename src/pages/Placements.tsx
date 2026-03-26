import { useState, useEffect } from 'react';
import { Building2, Users, Briefcase, Pencil } from 'lucide-react';
import { placementService } from '../services/placementService';
import type { Placement, SuccessStory } from '../types';
import { UI_STRINGS } from '../constants';
import PageHeader from '../components/PageHeader';
import LoadingState from '../components/LoadingState';
import ErrorAlert from '../components/ErrorAlert';
import Modal from '../components/Modal';
import StatCard from '../components/StatCard';
import Avatar from '../components/Avatar';
import { FormField, FormRow, FormActions } from '../components/FormField';

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
                <div className="grid-cards-sm mb-xl">
                    <StatCard title={UI_STRINGS.PLACEMENTS.STAT_PARTNER_COMPANIES} value={`${stats.companiesCount || stats.topCompanies?.length || 0}+`} icon={Building2} color="accent-blue" />
                    <StatCard title={UI_STRINGS.PLACEMENTS.STAT_PLACED_STUDENTS} value={`${stats.totalPlaced || stats.studentsPlaced || 0}+`} icon={Users} color="primary" />
                    <StatCard title={UI_STRINGS.PLACEMENTS.STAT_HIGHEST_PACKAGE} value={`${stats.highestPackage} ${UI_STRINGS.PLACEMENTS.LPA_SUFFIX}`} icon={Briefcase} color="success" />
                </div>
            )}

            <h2 className="mb-md">{UI_STRINGS.PLACEMENTS.SUCCESS_STORIES_HEADING}</h2>
            <div className="grid-cards">
                {successStories.map(story => (
                    <div key={story.id} className="card flex gap-4">
                        <div style={{ width: '80px', height: '80px', borderRadius: '12px', overflow: 'hidden', flexShrink: 0, backgroundColor: 'var(--bg-card-accent)' }}>
                            {story.studentPhoto ? (
                                <img src={story.studentPhoto} alt={story.studentName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            ) : (
                                <div className="flex items-center justify-center" style={{ height: '100%', color: 'var(--text-secondary)' }}>
                                    <Users size={32} />
                                </div>
                            )}
                        </div>
                        <div style={{ flex: 1 }}>
                            <h3 style={{ margin: 0 }}>{story.studentName}</h3>
                            <p style={{ color: 'var(--primary)', fontWeight: 600, fontSize: '0.9rem', marginTop: '2px' }}>{story.company}</p>
                            <div className="text-sm text-muted mt-md">
                                <div>{story.role ? `${UI_STRINGS.PLACEMENTS.ROLE_PREFIX} ${story.role}` : `${UI_STRINGS.PLACEMENTS.BATCH_PREFIX} ${story.batch}`}</div>
                                <div>{UI_STRINGS.PLACEMENTS.PACKAGE_PREFIX} {story.package}</div>
                            </div>
                        </div>
                        <button onClick={() => handleEditClick(story)} title={UI_STRINGS.COMMON.EDIT} className="icon-btn" style={{ alignSelf: 'flex-start' }}>
                            <Pencil size={18} />
                        </button>
                    </div>
                ))}
            </div>

            <Modal 
                isOpen={showModal} 
                onClose={() => { setShowModal(false); resetForm(); }} 
                title={editingId ? UI_STRINGS.COMMON.EDIT : UI_STRINGS.PLACEMENTS.MODAL_TITLE}
            >
                <form onSubmit={handleSaveStory} className="form-layout">
                    <div style={{ alignSelf: 'center' }} className="mb-sm">
                        <Avatar src={previewUrl || newStory.studentImage} fallbackIcon={<Users size={40} style={{ color: 'var(--text-secondary)' }} />} size="lg" upload />
                    </div>
                    <FormField label={UI_STRINGS.PLACEMENTS.FORM_STUDENT_NAME}>
                        <input type="text" required value={newStory.studentName} onChange={e => setNewStory({ ...newStory, studentName: e.target.value })} />
                    </FormField>
                    <FormRow>
                        <FormField label={UI_STRINGS.PLACEMENTS.FORM_COMPANY}>
                            <input type="text" required placeholder={UI_STRINGS.PLACEMENTS.FORM_COMPANY_PLACEHOLDER} value={newStory.company} onChange={e => setNewStory({ ...newStory, company: e.target.value })} />
                        </FormField>
                        <FormField label={UI_STRINGS.PLACEMENTS.FORM_PACKAGE}>
                            <input type="text" required placeholder={UI_STRINGS.PLACEMENTS.FORM_PACKAGE_PLACEHOLDER} value={newStory.package} onChange={e => setNewStory({ ...newStory, package: e.target.value })} />
                        </FormField>
                    </FormRow>
                    <FormRow>
                        <FormField label={UI_STRINGS.PLACEMENTS.FORM_ROLE}>
                            <input type="text" required placeholder={UI_STRINGS.PLACEMENTS.FORM_ROLE_PLACEHOLDER} value={newStory.role} onChange={e => setNewStory({ ...newStory, role: e.target.value })} />
                        </FormField>
                        <FormField label={UI_STRINGS.PLACEMENTS.FORM_BATCH}>
                            <input type="text" required placeholder={UI_STRINGS.PLACEMENTS.FORM_BATCH_PLACEHOLDER} value={newStory.batch} onChange={e => setNewStory({ ...newStory, batch: e.target.value })} />
                        </FormField>
                    </FormRow>
                    <FormField label={UI_STRINGS.PLACEMENTS.FORM_TESTIMONIAL}>
                        <textarea rows={2} value={newStory.testimonial} onChange={e => setNewStory({ ...newStory, testimonial: e.target.value })} />
                    </FormField>
                    <FormField label={UI_STRINGS.PLACEMENTS.FORM_IMAGE_URL}>
                        <input type="file" accept="image/png, image/jpeg" onChange={handleFileChange} />
                    </FormField>
                    <FormActions>
                        <button type="button" className="btn btn-secondary" disabled={saving} onClick={() => { setShowModal(false); resetForm(); }}>{UI_STRINGS.COMMON.CANCEL}</button>
                        <button type="submit" className="btn btn-primary" disabled={saving}>
                            {saving ? UI_STRINGS.COMMON.LOADING : UI_STRINGS.COMMON.SAVE}
                        </button>
                    </FormActions>
                </form>
            </Modal>
        </div>
    );
}
