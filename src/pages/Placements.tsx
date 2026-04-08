import { useState, useEffect, useContext } from 'react';
import { Building2, Users, Briefcase, Pencil, Trash2, Calendar } from 'lucide-react';
import { placementService } from '../services/placementService';
import { ToastContext } from '../contexts/ToastContext';
import type { SuccessStory, PlacementStats } from '../types';
import { UI_STRINGS } from '../constants';
import PageHeader from '../components/PageHeader';
import LoadingState from '../components/LoadingState';
import ErrorAlert from '../components/ErrorAlert';
import Modal from '../components/Modal';
import StatCard from '../components/StatCard';
import Avatar from '../components/Avatar';
import CloudinaryUpload from '../components/CloudinaryUpload';
import { FormField, FormRow, FormActions } from '../components/FormField';
import { getOptimizedUrl } from '../lib/cloudinary';

export default function PlacementsPage() {
    // 1. Context
    const toastContext = useContext(ToastContext);
    const showToast = toastContext?.showToast;

    // 2. State
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [stats, setStats] = useState<PlacementStats | null>(null);
    const [successStories, setSuccessStories] = useState<SuccessStory[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    
    // 2. Modals Control
    const [showStoryModal, setShowStoryModal] = useState(false);
    const [showStatsModal, setShowStatsModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [editingStoryId, setEditingStoryId] = useState<string | null>(null);
    const [storyToDelete, setStoryToDelete] = useState<string | null>(null);
    
    // 3. Form States
    const [uploadedPhotoUrl, setUploadedPhotoUrl] = useState<string | null>(null);
    const [storyForm, setStoryForm] = useState({
        studentName: '',
        company: '',
        package: '',
        role: '',
        studentImage: '',
        batch: '',
        testimonial: '',
        collegeName: '',
        year: selectedYear
    });

    const [statsForm, setStatsForm] = useState({
        companiesCount: 0,
        studentsPlaced: 0,
        averagePackage: 0,
        highestPackage: 0
    });

    // 4. Real-time Subscriptions
    useEffect(() => {
        setLoading(true);
        setError(null);

        // Subscribe to Stats
        const unsubStats = placementService.subscribeToPlacementStats(selectedYear, (data) => {
            setStats(data);
            if (data) {
                setStatsForm({
                    companiesCount: data.companiesCount,
                    studentsPlaced: data.studentsPlaced,
                    averagePackage: data.averagePackage,
                    highestPackage: data.highestPackage
                });
            } else {
                setStatsForm({ companiesCount: 0, studentsPlaced: 0, averagePackage: 0, highestPackage: 0 });
            }
        }, (err) => {
            console.error("Stats subscription error:", err);
            setError("Could not load placement statistics at this moment.");
        });

        // Subscribe to Stories
        const unsubStories = placementService.subscribeToSuccessStories(selectedYear, (data) => {
            setSuccessStories(data);
            setLoading(false);
        }, (err) => {
            console.error("Stories subscription error:", err);
            setError("Could not load success stories at this moment.");
            setLoading(false);
        });

        return () => {
            unsubStats();
            unsubStories();
        };
    }, [selectedYear]);

    // 5. Handlers
    const handleAddStory = () => {
        setEditingStoryId(null);
        setStoryForm({
            studentName: '',
            company: '',
            package: '',
            role: '',
            studentImage: '',
            batch: '',
            testimonial: '',
            collegeName: '',
            year: selectedYear
        });
        setShowStoryModal(true);
    };

    const handleEditStory = (story: SuccessStory) => {
        setEditingStoryId(story.id);
        setStoryForm({
            studentName: story.studentName,
            company: story.company,
            package: String(story.package),
            role: story.role || '',
            studentImage: story.studentPhoto || '',
            batch: story.batch || '',
            testimonial: story.testimonial || '',
            collegeName: story.collegeName || '',
            year: story.year || selectedYear
        });
        setShowStoryModal(true);
    };

    const handleDeleteStory = (id: string) => {
        setStoryToDelete(id);
        setShowDeleteModal(true);
    };

    const handleConfirmDelete = async () => {
        if (!storyToDelete) return;
        try {
            setSaving(true);
            await placementService.deleteSuccessStory(storyToDelete);
            showToast?.(UI_STRINGS.PLACEMENTS.DELETE_STORY_SUCCESS, "success");
            setShowDeleteModal(false);
            setStoryToDelete(null);
        } catch (err) {
            console.error("Error deleting story:", err);
            showToast?.("Failed to delete story. Please try again.", "error");
        } finally {
            setSaving(false);
        }
    };

    const handleSaveStory = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            setSaving(true);
            const imageUrl = uploadedPhotoUrl || storyForm.studentImage;

            const data = {
                studentName: storyForm.studentName,
                company: storyForm.company,
                role: storyForm.role,
                batch: storyForm.batch,
                testimonial: storyForm.testimonial,
                collegeName: storyForm.collegeName,
                package: typeof storyForm.package === 'string' ? Number(storyForm.package.replace(/[^0-9.]/g, '')) : storyForm.package,
                studentPhoto: imageUrl,
                year: Number(storyForm.year)
            };

            if (editingStoryId) {
                await placementService.updateSuccessStory(editingStoryId, data);
            } else {
                await placementService.createPlacement(data);
            }
            
            showToast?.(editingStoryId ? "Success story updated successfully!" : "Success story added successfully!", "success");
            setShowStoryModal(false);
            resetStoryForm();
        } catch (err) {
            console.error("Error saving story:", err);
            showToast?.("Failed to save story. Please try again.", "error");
            setError(UI_STRINGS.PLACEMENTS.ERROR_SAVE);
        } finally {
            setSaving(false);
        }
    };

    const handleSaveStats = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            setSaving(true);
            await placementService.updatePlacementStats(selectedYear, statsForm);
            showToast?.(UI_STRINGS.PLACEMENTS.SAVE_STATS_SUCCESS, "success");
            setShowStatsModal(false);
        } catch (err) {
            console.error("Error saving stats:", err);
            showToast?.("Failed to save statistics.", "error");
        } finally {
            setSaving(false);
        }
    };

    const resetStoryForm = () => {
        setEditingStoryId(null);
        setUploadedPhotoUrl(null);
        setStoryForm({
            studentName: '',
            company: '',
            package: '',
            role: '',
            studentImage: '',
            batch: '',
            testimonial: '',
            collegeName: '',
            year: selectedYear
        });
    };

    if (loading) return <LoadingState message={UI_STRINGS.PLACEMENTS.LOADING} />;

    const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);

    return (
        <div className="pb-xl">
            {error && <ErrorAlert message={error} />}
            
            <PageHeader
                title={UI_STRINGS.PLACEMENTS.TITLE}
                subtitle={UI_STRINGS.PLACEMENTS.SUBTITLE}
                actionLabel={UI_STRINGS.PLACEMENTS.NEW_BTN}
                onAction={handleAddStory}
            >
                <div className="flex items-center gap-sm">
                    <Calendar size={18} className="text-muted" />
                    <select 
                        value={selectedYear} 
                        onChange={(e) => setSelectedYear(Number(e.target.value))}
                        className="select-input"
                        style={{ padding: '6px 12px', borderRadius: '8px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-card)' }}
                    >
                        {years.map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                </div>
            </PageHeader>

            <div className="mb-md flex justify-between items-center">
                <h2 className="text-lg font-semibold">{selectedYear} Overview</h2>
                <button 
                    onClick={() => setShowStatsModal(true)} 
                    className="btn btn-secondary flex items-center gap-2 text-sm"
                >
                    <Pencil size={14} /> {UI_STRINGS.PLACEMENTS.EDIT_STATS}
                </button>
            </div>

            <div className="grid-cards-sm mb-xl">
                <StatCard 
                    title={UI_STRINGS.PLACEMENTS.STAT_PARTNER_COMPANIES} 
                    value={`${stats?.companiesCount || 0}+`} 
                    icon={Building2} 
                    color="accent-blue" 
                />
                <StatCard 
                    title={UI_STRINGS.PLACEMENTS.STAT_PLACED_STUDENTS} 
                    value={`${stats?.studentsPlaced || 0}+`} 
                    icon={Users} 
                    color="primary" 
                />
                <StatCard 
                    title={UI_STRINGS.PLACEMENTS.STAT_HIGHEST_PACKAGE} 
                    value={`${stats?.highestPackage || 0} ${UI_STRINGS.PLACEMENTS.LPA_SUFFIX}`} 
                    icon={Briefcase} 
                    color="success" 
                />
            </div>

            <h2 className="mb-md">{UI_STRINGS.PLACEMENTS.SUCCESS_STORIES_HEADING}</h2>
            {successStories.length === 0 ? (
                <div className="card text-center py-xl text-muted">No success stories found for {selectedYear}.</div>
            ) : (
                <div className="grid-cards">
                    {successStories.map(story => (
                        <div key={story.id} className="card flex gap-4 relative group">
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
                                {story.collegeName && (
                                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '2px' }}>
                                        {story.collegeName}
                                    </p>
                                )}
                                <div className="text-sm text-muted mt-sm">
                                    <div>{UI_STRINGS.PLACEMENTS.ROLE_PREFIX} {story.role}</div>
                                    <div>{UI_STRINGS.PLACEMENTS.PACKAGE_PREFIX} {story.package} LPA</div>
                                </div>
                            </div>
                            <div className="flex gap-1">
                                <button onClick={() => handleEditStory(story)} className="icon-btn" title={UI_STRINGS.COMMON.EDIT}>
                                    <Pencil size={18} />
                                </button>
                                <button onClick={() => handleDeleteStory(story.id)} className="icon-btn text-error" title={UI_STRINGS.COMMON.DELETE}>
                                    <Trash2 size={18} />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Modal: Add/Edit Story */}
            <Modal 
                isOpen={showStoryModal} 
                onClose={() => setShowStoryModal(false)}
                title={editingStoryId ? UI_STRINGS.COMMON.EDIT : UI_STRINGS.PLACEMENTS.MODAL_TITLE}
            >
                <form onSubmit={handleSaveStory} className="form-layout">
                    <div style={{ alignSelf: 'center' }} className="mb-sm">
                        <Avatar 
                            src={uploadedPhotoUrl || storyForm.studentImage} 
                            fallbackIcon={<Users size={40} style={{ color: 'var(--text-secondary)' }} />} 
                            size="lg" 
                            upload 
                        />
                    </div>
                    <FormField label={UI_STRINGS.PLACEMENTS.FORM_STUDENT_NAME}>
                        <input type="text" required value={storyForm.studentName} onChange={e => setStoryForm({ ...storyForm, studentName: e.target.value })} />
                    </FormField>
                    <FormRow>
                        <FormField label={UI_STRINGS.PLACEMENTS.FORM_COMPANY}>
                            <input type="text" required placeholder={UI_STRINGS.PLACEMENTS.FORM_COMPANY_PLACEHOLDER} value={storyForm.company} onChange={e => setStoryForm({ ...storyForm, company: e.target.value })} />
                        </FormField>
                        <FormField label={UI_STRINGS.PLACEMENTS.FORM_PACKAGE}>
                            <input type="text" required placeholder={UI_STRINGS.PLACEMENTS.FORM_PACKAGE_PLACEHOLDER} value={storyForm.package} onChange={e => setStoryForm({ ...storyForm, package: e.target.value })} />
                        </FormField>
                    </FormRow>
                    <FormRow>
                        <FormField label={UI_STRINGS.PLACEMENTS.FORM_ROLE}>
                            <input type="text" required placeholder={UI_STRINGS.PLACEMENTS.FORM_ROLE_PLACEHOLDER} value={storyForm.role} onChange={e => setStoryForm({ ...storyForm, role: e.target.value })} />
                        </FormField>
                        <FormField label="College Name">
                            <input type="text" placeholder="Enter college name" value={storyForm.collegeName} onChange={e => setStoryForm({ ...storyForm, collegeName: e.target.value })} />
                        </FormField>
                    </FormRow>
                    <FormField label={UI_STRINGS.PLACEMENTS.FORM_YEAR}>
                        <input type="number" required value={storyForm.year} onChange={e => setStoryForm({ ...storyForm, year: Number(e.target.value) })} />
                    </FormField>
                    <FormField label={UI_STRINGS.PLACEMENTS.FORM_TESTIMONIAL}>
                        <textarea rows={3} value={storyForm.testimonial} onChange={e => setStoryForm({ ...storyForm, testimonial: e.target.value })} />
                    </FormField>
                    <CloudinaryUpload
                        label={UI_STRINGS.PLACEMENTS.FORM_IMAGE_URL}
                        preset="success_story"
                        folder="innov8/success-stories/"
                        acceptedTypes={['image/png', 'image/jpeg', 'image/webp']}
                        maxSizeMB={3}
                        previewMode="image"
                        existingUrl={storyForm.studentImage || undefined}
                        onUploadComplete={(result) => {
                            setUploadedPhotoUrl(getOptimizedUrl(result.publicId));
                        }}
                        onError={(msg) => showToast?.(msg, 'error')}
                    />
                    <FormActions>
                        <button type="button" className="btn btn-secondary" onClick={() => setShowStoryModal(false)}>{UI_STRINGS.COMMON.CANCEL}</button>
                        <button type="submit" className="btn btn-primary" disabled={saving}>
                            {saving ? UI_STRINGS.COMMON.LOADING : UI_STRINGS.COMMON.SAVE}
                        </button>
                    </FormActions>
                </form>
            </Modal>

            {/* Modal: Edit Stats */}
            <Modal 
                isOpen={showStatsModal} 
                onClose={() => setShowStatsModal(false)}
                title={`${UI_STRINGS.PLACEMENTS.EDIT_STATS} (${selectedYear})`}
            >
                <form onSubmit={handleSaveStats} className="form-layout">
                    <FormRow>
                        <FormField label={UI_STRINGS.PLACEMENTS.FORM_COMPANIES_COUNT}>
                            <input type="number" required value={statsForm.companiesCount} onChange={e => setStatsForm({ ...statsForm, companiesCount: Number(e.target.value) })} />
                        </FormField>
                        <FormField label={UI_STRINGS.PLACEMENTS.FORM_STUDENTS_PLACED}>
                            <input type="number" required value={statsForm.studentsPlaced} onChange={e => setStatsForm({ ...statsForm, studentsPlaced: Number(e.target.value) })} />
                        </FormField>
                    </FormRow>
                    <FormRow>
                        <FormField label={UI_STRINGS.PLACEMENTS.FORM_AVG_PACKAGE}>
                            <input type="number" step="0.1" required value={statsForm.averagePackage} onChange={e => setStatsForm({ ...statsForm, averagePackage: Number(e.target.value) })} />
                        </FormField>
                        <FormField label={UI_STRINGS.PLACEMENTS.FORM_HIGHEST_PACKAGE}>
                            <input type="number" step="0.1" required value={statsForm.highestPackage} onChange={e => setStatsForm({ ...statsForm, highestPackage: Number(e.target.value) })} />
                        </FormField>
                    </FormRow>
                    <FormActions>
                        <button type="button" className="btn btn-secondary" onClick={() => setShowStatsModal(false)}>{UI_STRINGS.COMMON.CANCEL}</button>
                        <button type="submit" className="btn btn-primary" disabled={saving}>
                            {saving ? UI_STRINGS.COMMON.LOADING : UI_STRINGS.COMMON.SAVE}
                        </button>
                    </FormActions>
                </form>
            </Modal>
            
            {/* Modal: Delete Confirmation */}
            <Modal
                isOpen={showDeleteModal}
                onClose={() => setShowDeleteModal(false)}
                title="Confirm Deletion"
            >
                <div className="py-md text-center">
                    <p className="mb-lg">{UI_STRINGS.PLACEMENTS.DELETE_STORY_CONFIRM}</p>
                    <div className="flex justify-center gap-md">
                        <button 
                            className="btn btn-secondary" 
                            disabled={saving}
                            onClick={() => setShowDeleteModal(false)}
                        >
                            {UI_STRINGS.COMMON.CANCEL}
                        </button>
                        <button 
                            className="btn btn-primary" 
                            style={{ backgroundColor: 'var(--error)' }}
                            disabled={saving}
                            onClick={handleConfirmDelete}
                        >
                            {saving ? UI_STRINGS.COMMON.LOADING : UI_STRINGS.COMMON.DELETE}
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}
