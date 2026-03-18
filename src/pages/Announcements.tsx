import { useState, useEffect } from 'react';
import { Bell, Megaphone, Trash2, Calendar } from 'lucide-react';
import { announcementService } from '../services/announcementService';
import { PRIORITY_LEVELS, PRIORITY_COLORS, UI_STRINGS } from '../constants';
import type { Announcement } from '../types';
import PageHeader from '../components/PageHeader';
import LoadingState from '../components/LoadingState';
import ErrorAlert from '../components/ErrorAlert';
import Modal from '../components/Modal';

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

    if (loading) return <LoadingState message={UI_STRINGS.ANNOUNCEMENTS.LOADING} />;

    return (
        <div>
            <ErrorAlert message={error} />
            <PageHeader
                title={UI_STRINGS.ANNOUNCEMENTS.TITLE}
                subtitle={UI_STRINGS.ANNOUNCEMENTS.SUBTITLE}
                actionLabel={UI_STRINGS.ANNOUNCEMENTS.NEW_BTN}
                onAction={() => setShowModal(true)}
            />

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
                                        {UI_STRINGS.ANNOUNCEMENTS.TARGET_LABEL}: {ann.targetBatches.join(', ')}
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

            <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={UI_STRINGS.ANNOUNCEMENTS.MODAL_TITLE}>
                <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)', marginTop: 'var(--space-md)' }}>
                    <div>
                        <label>{UI_STRINGS.ANNOUNCEMENTS.FORM_TITLE}</label>
                        <input
                            type="text"
                            value={newAnnouncement.title}
                            onChange={e => setNewAnnouncement({ ...newAnnouncement, title: e.target.value })}
                            required
                        />
                    </div>
                    <div>
                        <label>{UI_STRINGS.ANNOUNCEMENTS.FORM_CONTENT}</label>
                        <textarea
                            rows={4}
                            value={newAnnouncement.content}
                            onChange={e => setNewAnnouncement({ ...newAnnouncement, content: e.target.value })}
                            required
                        />
                    </div>
                    <div className="flex gap-4">
                        <div style={{ flex: 1 }}>
                            <label>{UI_STRINGS.ANNOUNCEMENTS.FORM_PRIORITY}</label>
                            <select
                                value={newAnnouncement.priority}
                                onChange={e => setNewAnnouncement({ ...newAnnouncement, priority: e.target.value as 'high' | 'medium' | 'low' })}
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
            </Modal>
        </div>
    );
}
