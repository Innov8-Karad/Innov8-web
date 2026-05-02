import React, { useState, useEffect, useMemo } from 'react';
import { Plus, Trash2, Edit2, FileText, Video, Link as LinkIcon, ChevronDown, ChevronUp, Play, ExternalLink, Clock, Upload, Link2 } from 'lucide-react';
import { courseService } from '../services/courseService';
import type { CourseModule, CourseResource } from '../types';
import { useToast } from '../hooks/useToast';
import Modal from './Modal';
import ConfirmModal from './ConfirmModal';
import CloudinaryUpload from './CloudinaryUpload';
import { FormField, FormActions } from './FormField';
import { detectPlatform, validateVideoUrl, getEmbedUrl, getThumbnailUrl, getPlatformLabel, getPlatformColor } from '../lib/videoUtils';
import type { VideoPlatform } from '../lib/videoUtils';

interface CurriculumBuilderProps {
    courseId: string;
    courseThumbnail?: string;
}

// ── Resource Form State Type ──────────────────────────────────────────────────

interface ResourceFormState {
    title: string;
    url: string;
    type: 'video' | 'pdf' | 'link';
    platform?: VideoPlatform;
    duration?: string;
    thumbnailUrl?: string;
    // PDF upload fields
    pdfInputMode: 'url' | 'upload';
    cloudinaryPublicId?: string;
    size?: string;
    fileFormat?: string;
}

const INITIAL_RESOURCE_FORM: ResourceFormState = {
    title: '',
    url: '',
    type: 'video',
    platform: undefined,
    duration: '',
    thumbnailUrl: '',
    pdfInputMode: 'url',
    cloudinaryPublicId: undefined,
    size: undefined,
    fileFormat: undefined,
};

export default function CurriculumBuilder({ courseId, courseThumbnail }: CurriculumBuilderProps) {
    const [modules, setModules] = useState<CourseModule[]>([]);
    const [resources, setResources] = useState<CourseResource[]>([]);
    const [loading, setLoading] = useState(true);
    const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set());
    const { showToast } = useToast();

    // Module Form State
    const [showModuleModal, setShowModuleModal] = useState(false);
    const [editingModule, setEditingModule] = useState<CourseModule | null>(null);
    const [moduleForm, setModuleForm] = useState({ title: '', description: '', order: 0 });

    // Resource Form State
    const [showResourceModal, setShowResourceModal] = useState(false);
    const [activeModuleId, setActiveModuleId] = useState<string | null>(null);
    const [editingResource, setEditingResource] = useState<CourseResource | null>(null);
    const [resourceForm, setResourceForm] = useState<ResourceFormState>(INITIAL_RESOURCE_FORM);

    // Confirmation Modal State
    const [confirmState, setConfirmState] = useState<{
        isOpen: boolean;
        title: string;
        message: string;
        onConfirm: () => void;
    }>({
        isOpen: false,
        title: '',
        message: '',
        onConfirm: () => {},
    });

    useEffect(() => {
        const unsubscribeModules = courseService.subscribeToModules(courseId, (fetchedModules) => {
            setModules(fetchedModules);
            setLoading(false);
        });

        const unsubscribeResources = courseService.subscribeToResources(courseId, (fetchedResources) => {
            setResources(fetchedResources);
        });

        // Safety timeout to disable loader if something hangs
        const timer = setTimeout(() => {
            setLoading(false);
        }, 5000);

        return () => {
            unsubscribeModules();
            unsubscribeResources();
            clearTimeout(timer);
        };
    }, [courseId]);

    // ── Auto-detect platform when video URL changes ──────────────────────────

    const detectedPlatform = useMemo(() => {
        if (resourceForm.type !== 'video' || !resourceForm.url) return null;
        return detectPlatform(resourceForm.url);
    }, [resourceForm.type, resourceForm.url]);

    const videoUrlError = useMemo(() => {
        if (resourceForm.type !== 'video' || !resourceForm.url) return null;
        return validateVideoUrl(resourceForm.url);
    }, [resourceForm.type, resourceForm.url]);

    const handleResourceUrlChange = (url: string) => {
        const platform = detectPlatform(url);
        const autoThumb = platform ? getThumbnailUrl(url, platform) : null;

        setResourceForm(prev => ({
            ...prev,
            url,
            platform: platform || prev.platform,
            thumbnailUrl: prev.thumbnailUrl || autoThumb || '',
        }));
    };

    // ── Embed preview for YouTube/Vimeo ──────────────────────────────────────

    const embedUrl = useMemo(() => {
        if (!detectedPlatform || videoUrlError) return null;
        if (detectedPlatform === 'youtube' || detectedPlatform === 'vimeo') {
            return getEmbedUrl(resourceForm.url, detectedPlatform);
        }
        return null;
    }, [detectedPlatform, resourceForm.url, videoUrlError]);

    const toggleModule = (moduleId: string) => {
        const newExpanded = new Set(expandedModules);
        if (newExpanded.has(moduleId)) newExpanded.delete(moduleId);
        else newExpanded.add(moduleId);
        setExpandedModules(newExpanded);
    };

    const handleSaveModule = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (editingModule) {
                await courseService.updateModule(courseId, editingModule.id, moduleForm);
                showToast("Module updated", "success");
            } else {
                await courseService.addModule(courseId, { ...moduleForm, resources: [] });
                showToast("Module added", "success");
            }
            setShowModuleModal(false);
            setEditingModule(null);
            setModuleForm({ title: '', description: '', order: modules.length + 1 });
        } catch {
            showToast("Failed to save module", "error");
        }
    };

    const handleDeleteModule = (id: string) => {
        setConfirmState({
            isOpen: true,
            title: "Delete Module",
            message: "Are you sure you want to delete this module and all its resources? This action cannot be undone.",
            onConfirm: async () => {
                try {
                    await courseService.deleteModule(courseId, id);
                    showToast("Module deleted", "success");
                } catch {
                    showToast("Failed to delete module", "error");
                }
            }
        });
    };

    const openAddResource = (moduleId: string) => {
        setActiveModuleId(moduleId);
        setEditingResource(null);
        setResourceForm(INITIAL_RESOURCE_FORM);
        setShowResourceModal(true);
    };

    const openEditResource = (moduleId: string, resource: CourseResource) => {
        setActiveModuleId(moduleId);
        setEditingResource(resource);
        setResourceForm({
            title: resource.title || '',
            url: resource.url,
            type: resource.type,
            platform: resource.platform,
            duration: resource.duration || '',
            thumbnailUrl: resource.thumbnailUrl || '',
            // Restore PDF fields
            pdfInputMode: resource.cloudinaryPublicId ? 'upload' : 'url',
            cloudinaryPublicId: resource.cloudinaryPublicId,
            size: resource.size,
            fileFormat: resource.fileFormat,
        });

        setShowResourceModal(true);
    };

    const handleSaveResource = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!activeModuleId) return;

        // Validate video URL happens in useMemo (videoUrlError)
        if (resourceForm.type === 'video' && videoUrlError) {
            return;
        }

        try {
            const payload: Omit<CourseResource, 'id'> = {
                title: resourceForm.title,
                url: resourceForm.url,
                type: resourceForm.type,
                ...(resourceForm.type === 'video' && {
                    platform: resourceForm.platform || detectedPlatform || undefined,
                    duration: resourceForm.duration || undefined,
                    thumbnailUrl: resourceForm.thumbnailUrl || undefined,
                }),
                ...(resourceForm.type === 'pdf' && {
                    cloudinaryPublicId: resourceForm.cloudinaryPublicId || undefined,
                    size: resourceForm.size || undefined,
                    fileFormat: resourceForm.fileFormat || undefined,
                }),
            };

            if (editingResource) {
                await courseService.updateResource(courseId, editingResource.id, payload);
                showToast("Resource updated", "success");
            } else {
                await courseService.addResource(courseId, activeModuleId, payload);
                showToast("Resource added", "success");
            }
            setShowResourceModal(false);
            setEditingResource(null);
            setActiveModuleId(null);
        } catch {
            showToast("Failed to save resource", "error");
        }
    };

    const handleDeleteResource = (resourceId: string) => {
        setConfirmState({
            isOpen: true,
            title: "Delete Resource",
            message: "Are you sure you want to delete this resource? This action cannot be undone.",
            onConfirm: async () => {
                try {
                    await courseService.deleteResource(courseId, resourceId);
                    showToast("Resource deleted", "success");
                } catch {
                    showToast("Failed to delete resource", "error");
                }
            }
        });
    };

    if (loading) return <div className="p-4 text-center text-muted">Loading curriculum...</div>;

    const getResourceIcon = (type: string) => {
        switch (type) {
            case 'video': return <Video size={16} />;
            case 'pdf': return <FileText size={16} />;
            default: return <LinkIcon size={16} />;
        }
    };

    // ── Platform Badge Helper ────────────────────────────────────────────────

    const renderPlatformBadge = (resource: CourseResource) => {
        if (resource.type !== 'video' || !resource.platform) return null;
        return (
            <span
                className="video-platform-badge"
                style={{ backgroundColor: getPlatformColor(resource.platform) + '18', color: getPlatformColor(resource.platform) }}
            >
                {getPlatformLabel(resource.platform)}
            </span>
        );
    };

    return (
        <div className="mt-md">
            <div className="flex justify-between items-center mb-md">
                <h3 className="text-lg font-semibold">Curriculum Modules</h3>
                <button
                    type="button"
                    className="btn btn-secondary btn-sm flex items-center gap-1"
                    onClick={() => {
                        setEditingModule(null);
                        setModuleForm({ title: '', description: '', order: modules.length + 1 });
                        setShowModuleModal(true);
                    }}
                >
                    <Plus size={16} /> Add Module
                </button>
            </div>

            {modules.length === 0 ? (
                <div className="p-xl text-center text-muted border-dashed rounded-md bg-secondary">
                    No modules yet. Add a module to build the curriculum.
                </div>
            ) : (
                <div className="flex flex-col" style={{ gap: '12px' }}>
                    {modules.map(module => (
                        <div key={module.id} className="card" style={{ padding: '0', overflow: 'hidden', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
                            {/* Module Header — collapsed row */}
                            <div
                                className="flex justify-between items-center cursor-pointer group"
                                style={{ padding: '14px 16px', transition: 'background 0.2s' }}
                                onClick={() => toggleModule(module.id)}
                                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.03)')}
                                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                            >
                                <div className="flex items-center" style={{ gap: '12px', minWidth: 0, flex: 1 }}>
                                    <span style={{
                                        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                                        width: '28px', height: '28px', borderRadius: 'var(--radius-sm)',
                                        background: 'rgba(var(--primary-rgb), 0.15)', color: 'var(--primary)',
                                        fontWeight: 700, fontSize: '0.8rem', flexShrink: 0
                                    }}>
                                        {module.order}
                                    </span>
                                    <div style={{ minWidth: 0, flex: 1 }}>
                                        <h4 style={{ fontSize: '0.95rem', fontWeight: 600, margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                            {module.title}
                                        </h4>
                                        <span className="text-muted" style={{ fontSize: '0.75rem' }}>
                                            {resources.filter(r => r.moduleId === module.id).length} resources
                                        </span>
                                    </div>
                                </div>
                                <div className="flex items-center" style={{ gap: '4px', flexShrink: 0 }} onClick={e => e.stopPropagation()}>
                                    <button type="button" className="icon-btn" style={{ width: '30px', height: '30px', border: 'none', background: 'transparent' }} onClick={() => { setEditingModule(module); setModuleForm({ title: module.title, description: module.description, order: module.order }); setShowModuleModal(true); }} title="Edit Module">
                                        <Edit2 size={14} />
                                    </button>
                                    <button type="button" className="icon-btn" style={{ width: '30px', height: '30px', border: 'none', background: 'transparent', color: 'var(--error)' }} onClick={() => handleDeleteModule(module.id)} title="Delete Module">
                                        <Trash2 size={14} />
                                    </button>
                                    <button type="button" style={{
                                        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                                        width: '30px', height: '30px', borderRadius: '50%',
                                        border: '1px solid var(--border-subtle)', background: 'var(--bg-card)',
                                        color: 'var(--text-secondary)', cursor: 'pointer', transition: 'all 0.2s',
                                        marginLeft: '2px'
                                    }} onClick={() => toggleModule(module.id)}>
                                        {expandedModules.has(module.id) ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                    </button>
                                </div>
                            </div>

                            {/* Expanded content */}
                            {expandedModules.has(module.id) && (
                                <div style={{ borderTop: '1px solid var(--border-subtle)', padding: '16px', background: 'rgba(0,0,0,0.15)' }}>
                                    {/* Description */}
                                    {module.description && (
                                        <div style={{ marginBottom: '16px', padding: '10px 12px', borderRadius: 'var(--radius-sm)', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-subtle)' }}>
                                            <p className="text-muted" style={{ fontSize: '0.8rem', margin: 0, lineHeight: 1.5 }}>{module.description}</p>
                                        </div>
                                    )}

                                    {/* Resources header */}
                                    <div className="flex justify-between items-center" style={{ marginBottom: '10px' }}>
                                        <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)' }}>Resources</span>
                                        <button type="button" className="btn btn-secondary" style={{ padding: '4px 10px', fontSize: '0.75rem', borderRadius: 'var(--radius-sm)', height: 'auto' }} onClick={() => openAddResource(module.id)}>
                                            <Plus size={12} /> Add
                                        </button>
                                    </div>

                                    {/* Resource list */}
                                    <div className="flex flex-col" style={{ gap: '6px' }}>
                                        {resources.filter(r => r.moduleId === module.id).length === 0 ? (
                                            <div className="text-muted" style={{ textAlign: 'center', padding: '20px 12px', fontSize: '0.8rem', border: '1px dashed var(--border-subtle)', borderRadius: 'var(--radius-sm)' }}>
                                                No resources yet
                                            </div>
                                        ) : (
                                            resources.filter(r => r.moduleId === module.id).map(resource => (
                                                <div key={resource.id} className="flex justify-between items-center" style={{
                                                    padding: '10px 12px', borderRadius: 'var(--radius-sm)',
                                                    background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-subtle)',
                                                    transition: 'all 0.2s', cursor: 'default'
                                                }}
                                                    onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.borderColor = 'rgba(var(--primary-rgb), 0.3)'; }}
                                                    onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; e.currentTarget.style.borderColor = 'var(--border-subtle)'; }}
                                                >
                                                    <div className="flex items-center" style={{ gap: '12px', minWidth: 0, flex: 1 }}>
                                                        {resource.type === 'video' ? (
                                                            <div style={{ position: 'relative', flexShrink: 0 }}>
                                                                <img
                                                                    src={courseThumbnail || resource.thumbnailUrl || 'https://images.unsplash.com/photo-1611162617474-5b21e879e113?q=80&w=1000&auto=format&fit=crop'}
                                                                    alt=""
                                                                    className="curriculum-thumb"
                                                                    onError={(e) => {
                                                                        const target = e.target as HTMLImageElement;
                                                                        target.src = 'https://images.unsplash.com/photo-1611162617474-5b21e879e113?q=80&w=1000&auto=format&fit=crop';
                                                                    }}
                                                                />
                                                            </div>
                                                        ) : (
                                                            <div className="curriculum-icon-fallback" style={{
                                                                background: resource.type === 'pdf' ? 'rgba(239,68,68,0.1)' : 'rgba(16,185,129,0.1)',
                                                                color: resource.type === 'pdf' ? '#F87171' : '#34D399'
                                                            }}>
                                                                {getResourceIcon(resource.type)}
                                                            </div>
                                                        )}
                                                        <div style={{ minWidth: 0, flex: 1 }}>
                                                            <div style={{ fontSize: '0.85rem', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                                {resource.title || resource.type}
                                                            </div>
                                                            <div className="flex items-center" style={{ gap: '6px', marginTop: '2px' }}>
                                                                {renderPlatformBadge(resource)}
                                                                {resource.type === 'pdf' && resource.size && (
                                                                    <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
                                                                        {resource.size} • {resource.fileFormat}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center" style={{ gap: '2px', flexShrink: 0, marginLeft: '8px' }}>
                                                        <a href={resource.url} target="_blank" rel="noopener noreferrer" className="icon-btn" style={{ width: '28px', height: '28px', border: 'none', background: 'transparent' }} title="Open">
                                                            <ExternalLink size={13} />
                                                        </a>
                                                        <button type="button" className="icon-btn" style={{ width: '28px', height: '28px', border: 'none', background: 'transparent' }} onClick={() => openEditResource(module.id, resource)} title="Edit">
                                                            <Edit2 size={13} />
                                                        </button>
                                                        <button type="button" className="icon-btn" style={{ width: '28px', height: '28px', border: 'none', background: 'transparent', color: 'var(--error)' }} onClick={() => handleDeleteResource(resource.id)} title="Delete">
                                                            <Trash2 size={13} />
                                                        </button>
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {/* Module Modal */}
            <Modal isOpen={showModuleModal} onClose={() => setShowModuleModal(false)} title={editingModule ? "Edit Module" : "Add Module"} maxWidth="500px">
                <form onSubmit={handleSaveModule} className="p-1">
                    <FormField label="Module Title">
                        <input type="text" required value={moduleForm.title} onChange={e => setModuleForm({ ...moduleForm, title: e.target.value })} />
                    </FormField>
                    <FormField label="Description">
                        <textarea rows={2} required value={moduleForm.description} onChange={e => setModuleForm({ ...moduleForm, description: e.target.value })} />
                    </FormField>
                    <FormField label="Order (Number)">
                        <input type="number" required value={moduleForm.order} onChange={e => setModuleForm({ ...moduleForm, order: Number(e.target.value) })} />
                    </FormField>
                    <FormActions>
                        <button type="button" className="btn btn-secondary" onClick={() => setShowModuleModal(false)}>Cancel</button>
                        <button type="submit" className="btn btn-primary">Save Module</button>
                    </FormActions>
                </form>
            </Modal>

            {/* Resource Modal — Enhanced with Video Support */}
            <Modal
                isOpen={showResourceModal}
                onClose={() => { setShowResourceModal(false); }}
                title={editingResource ? "Edit Resource" : "Add Resource"}
                maxWidth={resourceForm.type === 'video' ? '700px' : '500px'}
            >
                <form onSubmit={handleSaveResource} className="p-1">
                    <FormField label="Resource Type">
                        <select
                            required
                            value={resourceForm.type}
                            onChange={e => {
                                const newType = e.target.value as 'video' | 'pdf' | 'link';
                                setResourceForm({ ...INITIAL_RESOURCE_FORM, type: newType, title: resourceForm.title });
                            }}
                        >
                            <option value="video">🎬 Video</option>
                            <option value="pdf">📄 PDF / Notes</option>
                            <option value="link">🔗 External Link</option>
                        </select>
                    </FormField>

                    <FormField label="Title">
                        <input
                            type="text"
                            required
                            placeholder={resourceForm.type === 'video' ? 'e.g. Introduction to React' : 'Resource title'}
                            value={resourceForm.title}
                            onChange={e => setResourceForm({ ...resourceForm, title: e.target.value })}
                        />
                    </FormField>

                    {/* ── Video URL Field with Platform Detection ── */}
                    {resourceForm.type === 'video' && (
                        <>
                            <FormField label="Video URL">
                                <div className="video-url-input-wrapper">
                                    <input
                                        type="url"
                                        required
                                        placeholder="https://www.youtube.com/watch?v=... or Vimeo/MP4 URL"
                                        value={resourceForm.url}
                                        onChange={e => handleResourceUrlChange(e.target.value)}
                                        className={videoUrlError && resourceForm.url ? 'input-error' : ''}
                                    />
                                    {detectedPlatform && !videoUrlError && (
                                        <span
                                            className="video-platform-detect-badge"
                                            style={{ backgroundColor: getPlatformColor(detectedPlatform), color: '#fff' }}
                                        >
                                            <Play size={10} /> {getPlatformLabel(detectedPlatform)}
                                        </span>
                                    )}
                                </div>
                                {videoUrlError && resourceForm.url && (
                                    <p className="text-xs text-error mt-1">{videoUrlError}</p>
                                )}
                                {!videoUrlError && detectedPlatform && (
                                    <p className="text-xs text-success mt-1">
                                        ✓ Detected as {getPlatformLabel(detectedPlatform)} video
                                    </p>
                                )}
                            </FormField>

                            {/* Embed Preview */}
                            {embedUrl && (
                                <div className="video-embed-preview">
                                    <label className="form-field-label">Preview</label>
                                    <div className="video-embed-container">
                                        <iframe
                                            src={embedUrl}
                                            title="Video Preview"
                                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                            allowFullScreen
                                            className="video-embed-iframe"
                                        />
                                    </div>
                                </div>
                            )}

                            {/* Direct/Cloudinary video preview */}
                            {!videoUrlError && detectedPlatform && (detectedPlatform === 'direct' || detectedPlatform === 'cloudinary') && (
                                <div className="video-embed-preview">
                                    <label className="form-field-label">Preview</label>
                                    <div className="video-embed-container">
                                        <video
                                            src={resourceForm.url}
                                            controls
                                            className="video-embed-iframe"
                                            style={{ objectFit: 'contain', backgroundColor: '#000' }}
                                        />
                                    </div>
                                </div>
                            )}

                            {/* Optional: Duration */}
                            <FormField label="Duration (Optional)">
                                <div className="flex items-center gap-2">
                                    <Clock size={16} className="text-muted" />
                                    <input
                                        type="text"
                                        placeholder="e.g. 12:34 or 1:02:30"
                                        value={resourceForm.duration || ''}
                                        onChange={e => setResourceForm({ ...resourceForm, duration: e.target.value })}
                                        style={{ flex: 1 }}
                                    />
                                </div>
                            </FormField>

                            {/* Optional: Thumbnail URL */}
                            {resourceForm.type === 'video' && (
                                <FormField label="Thumbnail">
                                    <div className="video-thumbnail-preview">
                                        {resourceForm.thumbnailUrl && (
                                            <img
                                                src={resourceForm.thumbnailUrl}
                                                alt="Video thumbnail"
                                                className="video-thumb-img"
                                                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                                            />
                                        )}
                                        <div className="video-thumb-meta">
                                            <input
                                                type="url"
                                                placeholder="Thumbnail URL (auto-detected)"
                                                value={resourceForm.thumbnailUrl || ''}
                                                onChange={e => setResourceForm({ ...resourceForm, thumbnailUrl: e.target.value })}
                                            />
                                            {resourceForm.thumbnailUrl && (
                                                <button
                                                    type="button"
                                                    className="btn btn-secondary btn-sm"
                                                    onClick={() => setResourceForm({ ...resourceForm, thumbnailUrl: '' })}
                                                    style={{ whiteSpace: 'nowrap' }}
                                                >
                                                    Clear
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </FormField>
                            )}
                        </>
                    )}

                    {/* ── Link URL Field (simple — unchanged) ── */}
                    {resourceForm.type === 'link' && (
                        <FormField label="URL">
                            <input
                                type="url"
                                required
                                placeholder="https://..."
                                value={resourceForm.url}
                                onChange={e => setResourceForm({ ...resourceForm, url: e.target.value })}
                            />
                        </FormField>
                    )}

                    {/* ── PDF / Document Input (dual mode: URL or Upload) ── */}
                    {resourceForm.type === 'pdf' && (
                        <>
                            {/* Input Mode Toggle */}
                            <div className="flex gap-2 mb-3">
                                <button
                                    type="button"
                                    className={`btn btn-sm flex items-center gap-1 ${resourceForm.pdfInputMode === 'url' ? 'btn-primary' : 'btn-secondary'}`}
                                    onClick={() => setResourceForm({ ...resourceForm, pdfInputMode: 'url' })}
                                >
                                    <Link2 size={14} /> Paste URL
                                </button>
                                <button
                                    type="button"
                                    className={`btn btn-sm flex items-center gap-1 ${resourceForm.pdfInputMode === 'upload' ? 'btn-primary' : 'btn-secondary'}`}
                                    onClick={() => setResourceForm({ ...resourceForm, pdfInputMode: 'upload' })}
                                >
                                    <Upload size={14} /> Upload File
                                </button>
                            </div>

                            {/* Mode: Paste URL */}
                            {resourceForm.pdfInputMode === 'url' && (
                                <FormField label="PDF / Document URL">
                                    <input
                                        type="url"
                                        required
                                        placeholder="https://... (Cloudinary URL or external link)"
                                        value={resourceForm.url}
                                        onChange={e => setResourceForm({ ...resourceForm, url: e.target.value })}
                                    />
                                </FormField>
                            )}

                            {/* Mode: Upload File */}
                            {resourceForm.pdfInputMode === 'upload' && (
                                <CloudinaryUpload
                                    label="Upload PDF / Document"
                                    folder={`innov8/course-notes/${courseId}/${activeModuleId}`}
                                    acceptedTypes={[
                                        'application/pdf',
                                        'application/msword',
                                        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                                    ]}
                                    maxSizeMB={10}
                                    previewMode="document"
                                    existingUrl={resourceForm.cloudinaryPublicId ? resourceForm.url : undefined}
                                    onUploadComplete={(result) => {
                                        const sizeMB = (result.bytes / (1024 * 1024)).toFixed(1);
                                        const sizeLabel = parseFloat(sizeMB) < 1
                                            ? `${(result.bytes / 1024).toFixed(0)} KB`
                                            : `${sizeMB} MB`;
                                        const format = result.format?.toUpperCase() || 'PDF';
                                        setResourceForm(prev => ({
                                            ...prev,
                                            url: result.url,
                                            cloudinaryPublicId: result.publicId,
                                            size: sizeLabel,
                                            fileFormat: format,
                                        }));
                                    }}
                                    onError={(msg) => showToast(msg, 'error')}
                                />
                            )}

                            {/* Preview link after upload */}
                            {resourceForm.pdfInputMode === 'upload' && resourceForm.url && resourceForm.cloudinaryPublicId && (
                                <div className="flex items-center gap-2 mt-2 p-2 rounded-md bg-secondary/30 text-sm">
                                    <FileText size={16} className="text-error" />
                                    <span className="truncate flex-1">{resourceForm.fileFormat} • {resourceForm.size}</span>
                                    <a
                                        href={resourceForm.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-primary text-xs flex items-center gap-1 hover:underline"
                                    >
                                        <ExternalLink size={12} /> Open
                                    </a>
                                </div>
                            )}
                        </>
                    )}

                    <FormActions>
                        <button type="button" className="btn btn-secondary" onClick={() => { setShowResourceModal(false); }}>Cancel</button>
                        <button
                            type="submit"
                            className="btn btn-primary"
                            disabled={
                                (resourceForm.type === 'video' && !!videoUrlError && !!resourceForm.url) ||
                                (resourceForm.type === 'pdf' && resourceForm.pdfInputMode === 'upload' && !resourceForm.url)
                            }
                        >
                            {editingResource ? 'Update Resource' : 'Save Resource'}
                        </button>
                    </FormActions>
                </form>
            </Modal>
            
            <ConfirmModal
                isOpen={confirmState.isOpen}
                onClose={() => setConfirmState(prev => ({ ...prev, isOpen: false }))}
                onConfirm={confirmState.onConfirm}
                title={confirmState.title}
                message={confirmState.message}
            />
        </div>
    );
}
