import { useState, useEffect } from 'react';
import { Plus, Bell, Megaphone, Trash2, Calendar } from 'lucide-react';
import { announcementService } from '../services/announcementService';
import { PRIORITY_LEVELS, PRIORITY_COLORS, UI_STRINGS } from '../constants';
import type { Announcement } from '../types';

export default function AnnouncementsPage() {
    const [announcements, setAnnouncements] = useState<Announcement[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showModal, setShowModal] = useState(false);
    const [newAnnouncement, setNewAnnouncement] = useState({
        title: '',
        content: '',
        priority: PRIORITY_LEVELS.MEDIUM as 'high' | 'medium' | 'low',
        targetBatches: [] as string[]
    });

    useEffect(() => {
        const fetchAnnouncements = async () => {
            try {
                setLoading(true);
                setError(null);
                const data = await announcementService.fetchAnnouncements();
                setAnnouncements(data);
            } catch (err) {
                console.error("Error fetching announcements:", err);
                setError(UI_STRINGS.ANNOUNCEMENTS.ERROR_LOAD);
            } finally {
                setLoading(false);
            }
        };
        fetchAnnouncements();
    }, []);

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            setError(null);
            const created = await announcementService.createAnnouncement(newAnnouncement);
            setAnnouncements([created, ...announcements]);
            setShowModal(false);
            setNewAnnouncement({ 
                title: '', 
                content: '', 
                priority: PRIORITY_LEVELS.MEDIUM, 
                targetBatches: [] 
            });
        } catch (err) {
            console.error("Error creating announcement:", err);
            setError(UI_STRINGS.ANNOUNCEMENTS.ERROR_CREATE);
        }
    };

    const getPriorityColor = (p: string) => {
        return PRIORITY_COLORS[p as keyof typeof PRIORITY_COLORS] || PRIORITY_COLORS.DEFAULT;
    };

    if (loading) return (
        <div className="flex items-center justify-center h-full">
            <div className="animate-pulse text-secondary">{UI_STRINGS.ANNOUNCEMENTS.LOADING}</div>
        </div>
    );

    return (
        <div>
            {error && (
                <div className="alert alert-error mb-4">
                    {error}
                </div>
            )}
            <div className="flex justify-between items-center" style={{ marginBottom: 'var(--space-lg)' }}>
                <div>
                    <h1>{UI_STRINGS.ANNOUNCEMENTS.TITLE}</h1>
                    <p>{UI_STRINGS.ANNOUNCEMENTS.SUBTITLE}</p>
                </div>
                <button className="btn btn-primary" onClick={() => setShowModal(true)}>
                    <Plus size={18} style={{ marginRight: '8px' }} />
                    {UI_STRINGS.ANNOUNCEMENTS.NEW_BTN}
                </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 'var(--space-md)' }}>
                {announcements.map(ann => (
                    <div key={ann.id} className="card" style={{ display: 'flex', gap: 'var(--space-md)' }}>
                        <div style={{
                            width: '40px',
                            height: '40px',
                            borderRadius: '50%',
                            backgroundColor: `${getPriorityColor(ann.priority)}20`,
                            color: getPriorityColor(ann.priority),
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0
                        }}>
                            {ann.priority === PRIORITY_LEVELS.HIGH ? <Bell size={20} /> : <Megaphone size={20} />}
                        </div>
                        <div style={{ flex: 1 }}>
                            <div className="flex justify-between items-start">
                                <div>
                                    <h3 style={{ margin: 0 }}>{ann.title}</h3>
                                    <div className="flex items-center gap-2" style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                                        <Calendar size={14} />
                                        {ann.createdAt.toLocaleDateString()}
                                        <span style={{ margin: '0 4px' }}>•</span>
                                        Target: {ann.targetBatches.join(', ')}
                                    </div>
                                </div>
                                <button className="icon-btn icon-btn-danger" title={UI_STRINGS.COMMON.DELETE}>
                                    <Trash2 size={18} />
                                </button>
                            </div>
                            <p style={{ marginTop: 'var(--space-md)', lineHeight: 1.6 }}>{ann.content}</p>
                        </div>
                    </div>
                ))}
                {announcements.length === 0 && !loading && (
                    <div className="text-center py-12 text-secondary">
                        {UI_STRINGS.ANNOUNCEMENTS.EMPTY}
                    </div>
                )}
            </div>

            {showModal && (
                <div style={{
                    position: 'fixed',
                    top: 0, left: 0, right: 0, bottom: 0,
                    backgroundColor: 'rgba(0,0,0,0.8)',
                    backdropFilter: 'blur(4px)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 100
                }}>
                    <div className="card" style={{ width: '100%', maxWidth: '500px' }}>
                        <h2>{UI_STRINGS.ANNOUNCEMENTS.MODAL_TITLE}</h2>
                        <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)', marginTop: 'var(--space-md)' }}>
                            <div>
                                <label>Title</label>
                                <input
                                    type="text"
                                    value={newAnnouncement.title}
                                    onChange={e => setNewAnnouncement({ ...newAnnouncement, title: e.target.value })}
                                    required
                                />
                            </div>
                            <div>
                                <label>Content</label>
                                <textarea
                                    rows={4}
                                    value={newAnnouncement.content}
                                    onChange={e => setNewAnnouncement({ ...newAnnouncement, content: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="flex gap-4">
                                <div style={{ flex: 1 }}>
                                    <label>Priority</label>
                                    <select
                                        value={newAnnouncement.priority}
                                        onChange={e => setNewAnnouncement({ ...newAnnouncement, priority: e.target.value as any })}
                                    >
                                        <option value={PRIORITY_LEVELS.LOW}>Low</option>
                                        <option value={PRIORITY_LEVELS.MEDIUM}>Medium</option>
                                        <option value={PRIORITY_LEVELS.HIGH}>High</option>
                                    </select>
                                </div>
                            </div>
                            <div className="flex justify-end gap-2" style={{ marginTop: 'var(--space-md)' }}>
                                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>{UI_STRINGS.COMMON.CANCEL}</button>
                                <button type="submit" className="btn btn-primary">{UI_STRINGS.COMMON.PUBLISH}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
