import { useState, useEffect } from 'react';
import { Building2, Users, Briefcase, Plus, X } from 'lucide-react';
import { placementService } from '../services/placementService';
import type { Placement, SuccessStory } from '../types';
import { UI_STRINGS } from '../constants';

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
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
                <div className="animate-pulse text-secondary">{UI_STRINGS.PLACEMENTS.LOADING}</div>
            </div>
        );
    }

    return (
        <div>
            {error && (
                <div className="alert alert-error mb-4">
                    {error}
                </div>
            )}
            <div className="flex justify-between items-center" style={{ marginBottom: 'var(--space-lg)' }}>
                <div>
                    <h1>{UI_STRINGS.PLACEMENTS.TITLE}</h1>
                    <p>{UI_STRINGS.PLACEMENTS.SUBTITLE}</p>
                </div>
                <button className="btn btn-primary" onClick={() => setShowModal(true)}>
                    <Plus size={18} style={{ marginRight: '8px' }} />
                    {UI_STRINGS.PLACEMENTS.NEW_BTN}
                </button>
            </div>

            {stats && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 'var(--space-md)', marginBottom: 'var(--space-xl)' }}>
                    <div className="card flex items-center gap-4">
                        <div style={{ padding: '12px', borderRadius: '12px', backgroundColor: 'rgba(99, 102, 241, 0.1)', color: 'var(--accent-blue)' }}>
                            <Building2 size={24} />
                        </div>
                        <div>
                            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Partner Companies</p>
                            <h2 style={{ margin: 0 }}>{stats.companiesCount || stats.topCompanies?.length || 0}+</h2>
                        </div>
                    </div>
                    <div className="card flex items-center gap-4">
                        <div style={{ padding: '12px', borderRadius: '12px', backgroundColor: 'rgba(249, 115, 22, 0.1)', color: 'var(--primary)' }}>
                            <Users size={24} />
                        </div>
                        <div>
                            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Placed Students</p>
                            <h2 style={{ margin: 0 }}>{stats.totalPlaced || stats.studentsPlaced || 0}+</h2>
                        </div>
                    </div>
                    <div className="card flex items-center gap-4">
                        <div style={{ padding: '12px', borderRadius: '12px', backgroundColor: 'rgba(34, 197, 94, 0.1)', color: 'var(--success)' }}>
                            <Briefcase size={24} />
                        </div>
                        <div>
                            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Highest Package</p>
                            <h2 style={{ margin: 0 }}>{stats.highestPackage} LPA</h2>
                        </div>
                    </div>
                </div>
            )}

            <h2 style={{ marginBottom: 'var(--space-md)' }}>Success Stories</h2>
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
                                <div>{story.role ? `Role: ${story.role}` : `Batch: ${story.batch}`}</div>
                                <div>Package: {story.package}</div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {showModal && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    backgroundColor: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(4px)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100
                }}>
                    <div className="card" style={{ width: '100%', maxWidth: '500px', position: 'relative' }}>
                        <button
                            onClick={() => setShowModal(false)}
                            style={{ position: 'absolute', top: '16px', right: '16px', border: 'none', background: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
                        >
                            <X size={20} />
                        </button>
                        <h2>{UI_STRINGS.PLACEMENTS.MODAL_TITLE}</h2>
                        <form onSubmit={handleAddStory} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)', marginTop: 'var(--space-lg)' }}>
                            <div>
                                <label>Student Name</label>
                                <input type="text" required value={newStory.studentName} onChange={e => setNewStory({ ...newStory, studentName: e.target.value })} />
                            </div>
                            <div className="flex gap-4">
                                <div style={{ flex: 1 }}>
                                    <label>Company</label>
                                    <input type="text" required placeholder="e.g. Google" value={newStory.company} onChange={e => setNewStory({ ...newStory, company: e.target.value })} />
                                </div>
                                <div style={{ flex: 1 }}>
                                    <label>Package</label>
                                    <input type="text" required placeholder="e.g. 12 LPA" value={newStory.package} onChange={e => setNewStory({ ...newStory, package: e.target.value })} />
                                </div>
                            </div>
                            <div className="flex gap-4">
                                <div style={{ flex: 1 }}>
                                    <label>Role</label>
                                    <input type="text" required placeholder="e.g. Software Engineer" value={newStory.role} onChange={e => setNewStory({ ...newStory, role: e.target.value })} />
                                </div>
                                <div style={{ flex: 1 }}>
                                    <label>Batch</label>
                                    <input type="text" required placeholder="e.g. 2024" value={newStory.batch} onChange={e => setNewStory({ ...newStory, batch: e.target.value })} />
                                </div>
                            </div>
                            <div>
                                <label>Testimonial (Optional)</label>
                                <textarea rows={2} value={newStory.testimonial} onChange={e => setNewStory({ ...newStory, testimonial: e.target.value })} />
                            </div>
                            <div>
                                <label>Image URL (Optional)</label>
                                <input type="url" value={newStory.studentImage} onChange={e => setNewStory({ ...newStory, studentImage: e.target.value })} />
                            </div>
                            <div className="flex justify-end gap-2" style={{ marginTop: 'var(--space-md)' }}>
                                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>{UI_STRINGS.COMMON.CANCEL}</button>
                                <button type="submit" className="btn btn-primary">{UI_STRINGS.COMMON.SAVE}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

