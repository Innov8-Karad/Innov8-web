import { useState, useEffect } from 'react';
import { Building2, Users, Briefcase } from 'lucide-react';
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
    const [error, setError] = useState<string | null>(null);
    const [showModal, setShowModal] = useState(false);
    const [newStory, setNewStory] = useState({
        studentName: '',
        company: '',
        package: '',
        role: '',
        studentImage: '',
        batch: '',
        testimonial: ''
    });

    useEffect(() => {
        async function fetchData() {
            try {
                setLoading(true);
                setError(null);
                const [statsData, storiesData] = await Promise.all([
                    placementService.fetchPlacementStats(),
                    placementService.fetchSuccessStories()
                ]);
                setStats(statsData);
                setSuccessStories(storiesData);
            } catch (err) {
                console.error("Error fetching placement data:", err);
                setError(UI_STRINGS.PLACEMENTS.ERROR_LOAD);
            } finally {
                setLoading(false);
            }
        }
        fetchData();
    }, []);

    const handleAddStory = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            setError(null);
            const dataToSave = {
                studentName: newStory.studentName,
                company: newStory.company,
                package: newStory.package,
                role: newStory.role,
                studentPhoto: newStory.studentImage,
                batch: newStory.batch,
                testimonial: newStory.testimonial
            };

            const created = await placementService.createSuccessStory(dataToSave);
            setSuccessStories([created, ...successStories]);
            setShowModal(false);
            setNewStory({ studentName: '', company: '', package: '', role: '', studentImage: '', batch: '', testimonial: '' });
        } catch (err) {
            console.error("Error adding success story: ", err);
            setError(UI_STRINGS.PLACEMENTS.ERROR_SAVE);
        }
    };

    if (loading) {
        return <LoadingState message={UI_STRINGS.PLACEMENTS.LOADING} />;
    }

    return (
        <div>
            <ErrorAlert message={error} />
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
                    </div>
                ))}
            </div>

            <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={UI_STRINGS.PLACEMENTS.MODAL_TITLE}>
                <form onSubmit={handleAddStory} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)', marginTop: 'var(--space-lg)' }}>
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
                        <input type="url" value={newStory.studentImage} onChange={e => setNewStory({ ...newStory, studentImage: e.target.value })} />
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
