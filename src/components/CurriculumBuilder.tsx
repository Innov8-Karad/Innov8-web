import React, { useState, useEffect, useMemo } from 'react';
import { Plus, Trash2, Edit2, FileText, Video, Link as LinkIcon, ChevronDown, ChevronUp, Play, ExternalLink, Clock } from 'lucide-react';
import { courseService } from '../services/courseService';
import type { CourseModule, CourseResource } from '../types';
import { useToast } from '../hooks/useToast';
import Modal from './Modal';
import { FormField, FormActions } from './FormField';
import { detectPlatform, validateVideoUrl, getEmbedUrl, getThumbnailUrl, getPlatformLabel, getPlatformColor } from '../lib/videoUtils';
import type { VideoPlatform } from '../lib/videoUtils';

interface CurriculumBuilderProps {
    courseId: string;
}

// ── Resource Form State Type ──────────────────────────────────────────────────

interface ResourceFormState {
    title: string;
    url: string;
    type: 'video' | 'pdf' | 'link';
    platform?: VideoPlatform;
    duration?: string;
    thumbnailUrl?: string;
}

const INITIAL_RESOURCE_FORM: ResourceFormState = {
    title: '',
    url: '',
    type: 'video',
    platform: undefined,
    duration: '',
    thumbnailUrl: '',
};

export default function CurriculumBuilder({ courseId }: CurriculumBuilderProps) {
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

    const handleDeleteModule = async (id: string) => {
        if (window.confirm("Delete this module and all its resources?")) {
            try {
                await courseService.deleteModule(courseId, id);
                showToast("Module deleted", "success");
            } catch {
                showToast("Failed to delete module", "error");
            }
        }
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

    const handleDeleteResource = async (resourceId: string) => {
        if (window.confirm("Delete this resource?")) {
            try {
                await courseService.deleteResource(courseId, resourceId);
                showToast("Resource deleted", "success");
            } catch {
                showToast("Failed to delete resource", "error");
            }
        }
    };

    if (loading) return <div className="p-4 text-center text-muted">Loading curriculum...</div>;

    const getResourceIcon = (type: string) => {
        switch(type) {
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
                <div className="flex flex-col gap-3">
                    {modules.map(module => (
                        <div key={module.id} className="glass-card" style={{ padding: '0', overflow: 'hidden' }}>
                            <div 
                                className="flex justify-between items-center p-3 cursor-pointer hover:bg-secondary/50 transition-colors"
                                onClick={() => toggleModule(module.id)}
                            >
                                <div className="flex items-center gap-3">
                                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-bold text-sm">
                                        {module.order}
                                    </div>
                                    <div>
                                        <h4 className="font-semibold">{module.title}</h4>
                                        <span className="text-xs text-muted">{resources.filter(r => r.moduleId === module.id).length} resources</span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                                    <button type="button" className="icon-btn text-muted" onClick={() => { setEditingModule(module); setModuleForm({ title: module.title, description: module.description, order: module.order }); setShowModuleModal(true); }}>
                                        <Edit2 size={16} />
                                    </button>
                                    <button type="button" className="icon-btn text-error" onClick={() => handleDeleteModule(module.id)}>
                                        <Trash2 size={16} />
                                    </button>
                                    <button type="button" className="icon-btn text-muted ml-2" onClick={() => toggleModule(module.id)}>
                                        {expandedModules.has(module.id) ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                                    </button>
                                </div>
                            </div>

                            {expandedModules.has(module.id) && (
                                <div className="p-4 border-t border-divider bg-card">
                                    <p className="text-sm text-muted mb-4">{module.description}</p>
                                    
                                    <div className="flex justify-between items-center mb-3">
                                        <h5 className="font-medium text-sm">Resources</h5>
                                        <button type="button" className="text-primary text-xs flex items-center gap-1 hover:underline" onClick={() => openAddResource(module.id)}>
                                            <Plus size={14} /> Add Resource
                                        </button>
                                    </div>

                                    <div className="flex flex-col gap-2">
                                        {resources.filter(r => r.moduleId === module.id).length === 0 ? (
                                            <div className="text-xs text-muted text-center py-2">No resources in this module.</div>
                                        ) : (
                                            resources.filter(r => r.moduleId === module.id).map(resource => (
                                                <div key={resource.id} className="flex justify-between items-center p-2 rounded-md bg-secondary/30 text-sm">
                                                    <div className="flex items-center gap-2 flex-1 overflow-hidden">
                                                        <span className="text-muted">{getResourceIcon(resource.type)}</span>
                                                        <span className="truncate">{resource.title || resource.type}</span>
                                                        {renderPlatformBadge(resource)}
                                                        {resource.type === 'video' && resource.duration && (
                                                            <span className="video-duration-badge">
                                                                <Clock size={10} /> {resource.duration}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="flex items-center gap-1">
                                                        <a href={resource.url} target="_blank" rel="noopener noreferrer" className="icon-btn bg-transparent text-primary" style={{ padding: '4px' }}>
                                                            <ExternalLink size={14} />
                                                        </a>
                                                        <button type="button" className="icon-btn bg-transparent text-muted" onClick={() => openEditResource(module.id, resource)} style={{ padding: '4px' }}>
                                                            <Edit2 size={14} />
                                                        </button>
                                                        <button type="button" className="icon-btn bg-transparent text-error" onClick={() => handleDeleteResource(resource.id)} style={{ padding: '4px' }}>
                                                            <Trash2 size={14} />
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
                            {resourceForm.thumbnailUrl && (
                                <FormField label="Thumbnail">
                                    <div className="video-thumbnail-preview">
                                        <img
                                            src={resourceForm.thumbnailUrl}
                                            alt="Video thumbnail"
                                            className="video-thumb-img"
                                            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                                        />
                                        <div className="video-thumb-meta">
                                            <input
                                                type="url"
                                                placeholder="Thumbnail URL (auto-detected)"
                                                value={resourceForm.thumbnailUrl}
                                                onChange={e => setResourceForm({ ...resourceForm, thumbnailUrl: e.target.value })}
                                            />
                                            <button
                                                type="button"
                                                className="btn btn-secondary btn-sm"
                                                onClick={() => setResourceForm({ ...resourceForm, thumbnailUrl: '' })}
                                                style={{ whiteSpace: 'nowrap' }}
                                            >
                                                Clear
                                            </button>
                                        </div>
                                    </div>
                                </FormField>
                            )}
                        </>
                    )}

                    {/* ── PDF / Link URL Field (simple) ── */}
                    {resourceForm.type !== 'video' && (
                        <FormField label="URL">
                            <input
                                type="url"
                                required
                                placeholder={resourceForm.type === 'pdf' ? 'https://... (PDF URL or Cloudinary URL)' : 'https://...'}
                                value={resourceForm.url}
                                onChange={e => setResourceForm({ ...resourceForm, url: e.target.value })}
                            />
                        </FormField>
                    )}

                    <FormActions>
                        <button type="button" className="btn btn-secondary" onClick={() => { setShowResourceModal(false); }}>Cancel</button>
                        <button
                            type="submit"
                            className="btn btn-primary"
                            disabled={resourceForm.type === 'video' && !!videoUrlError && !!resourceForm.url}
                        >
                            {editingResource ? 'Update Resource' : 'Save Resource'}
                        </button>
                    </FormActions>
                </form>
            </Modal>
        </div>
    );
}
