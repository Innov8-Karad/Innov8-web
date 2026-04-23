import React, { useState, useEffect, useMemo } from 'react';
import { 
    Plus, Trash2, Edit2, FileText, Link as LinkIcon, 
    ChevronDown, ChevronUp, Play, ExternalLink, Clock, Upload, 
    Link2, Search, MoreVertical, SortDesc, Filter, Folder, Copy
} from 'lucide-react';
import ImportBatchModal from './ImportBatchModal';
import { courseService } from '../services/courseService';
import { batchService } from '../services/batchService';
import type { CourseModule, CourseResource } from '../types';
import { useToast } from '../hooks/useToast';
import Modal from './Modal';
import CloudinaryUpload from './CloudinaryUpload';
import { FormField, FormActions } from './FormField';
import { detectPlatform, validateVideoUrl, getEmbedUrl, getThumbnailUrl, getPlatformLabel, getPlatformColor } from '../lib/videoUtils';
import type { VideoPlatform } from '../lib/videoUtils';

interface CurriculumBuilderProps {
    targetId: string;
    targetType: 'course' | 'batch';
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
    isDemo: boolean;
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
    isDemo: false,
};

export default function CurriculumBuilder({ targetId, targetType }: CurriculumBuilderProps) {
    const service = targetType === 'course' ? courseService : batchService;
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

    // Search & Filter State
    const [searchQuery, setSearchQuery] = useState('');
    const [sortBy, setSortBy] = useState('recent');
    const [showImportModal, setShowImportModal] = useState(false);

    useEffect(() => {
        const unsubscribeModules = service.subscribeToModules(targetId, (fetchedModules) => {
            setModules(fetchedModules);
            setLoading(false);
        });

        const unsubscribeResources = service.subscribeToResources(targetId, (fetchedResources) => {
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
    }, [targetId, service]);

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
                await service.updateModule(targetId, editingModule.id, moduleForm);
                showToast("Module updated", "success");
            } else {
                await service.addModule(targetId, { ...moduleForm, resources: [] });
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
                await service.deleteModule(targetId, id);
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
            // Restore PDF fields
            pdfInputMode: resource.cloudinaryPublicId ? 'upload' : 'url',
            cloudinaryPublicId: resource.cloudinaryPublicId,
            size: resource.size,
            fileFormat: resource.fileFormat,
            isDemo: resource.isDemo || false,
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
                isDemo: resourceForm.isDemo,
            };

            if (editingResource) {
                await service.updateResource(targetId, editingResource.id, payload);
                showToast("Resource updated", "success");
            } else {
                await service.addResource(targetId, activeModuleId, payload);
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
                await service.deleteResource(targetId, resourceId);
                showToast("Resource deleted", "success");
            } catch {
                showToast("Failed to delete resource", "error");
            }
        }
    };

    const filteredModules = useMemo(() => {
        const result = modules.filter(m => 
            m.title.toLowerCase().includes(searchQuery.toLowerCase())
        );

        if (sortBy === 'recent') {
            // Already sorted by order, but if we had timestamps we'd use them
        }

        return result;
    }, [modules, searchQuery, sortBy]);

    if (loading) return <div className="p-4 text-center text-muted">Loading curriculum...</div>;

    const getResourceIcon = (type: string) => {
        switch(type) {
            case 'video': 
                return (
                    <div className="res-icon-box" style={{ background: 'rgba(217, 119, 6, 0.1)', color: '#d97706' }}>
                        <Play size={16} fill="currentColor" />
                    </div>
                );
            case 'pdf': 
                return (
                    <div className="res-icon-box" style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444' }}>
                        <FileText size={16} />
                    </div>
                );
            default: 
                return (
                    <div className="res-icon-box" style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981' }}>
                        <LinkIcon size={16} />
                    </div>
                );
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
        <div className="curriculum-layout">
            <div className="curriculum-main-content">
                <div className="curriculum-header-section">
                    <div className="flex justify-between items-end mb-6">
                        <div>
                            <h2 className="text-2xl font-bold text-main flex items-center gap-3">
                                {targetType === 'batch' ? 'Videos' : 'Curriculum'} 
                                <span className="text-muted font-normal">({modules.length})</span>
                            </h2>
                            <p className="text-sm text-muted mt-1">Add / view content of your {targetType}</p>
                        </div>
                    </div>

                    {/* Toolbar */}
                    <div className="curriculum-toolbar mb-6">
                        <div className="search-wrapper">
                            <Search size={18} className="search-icon" />
                            <input 
                                type="text" 
                                placeholder="Search folders..." 
                                className="toolbar-search"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                        <div className="toolbar-actions">
                            <div className="dropdown-select">
                                <SortDesc size={16} />
                                <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
                                    <option value="recent">Recently Added</option>
                                    <option value="oldest">Archive (Oldest)</option>
                                </select>
                                <ChevronDown size={14} className="select-arrow" />
                            </div>
                            <div className="dropdown-select">
                                <Filter size={16} />
                                <select disabled>
                                    <option>Filter by Tags</option>
                                </select>
                                <ChevronDown size={14} className="select-arrow" />
                            </div>
                        </div>
                    </div>
                </div>

                {filteredModules.length === 0 ? (
                    <div className="empty-curriculum">
                        <Folder size={48} className="mb-4 opacity-20" />
                        <p>No content found matching your search</p>
                    </div>
                ) : (
                    <div className="modules-grid">
                        {filteredModules.map(module => (
                            <div key={module.id} className="module-row-card">
                                <div className="module-card-body" onClick={() => toggleModule(module.id)}>
                                    <div className="module-icon-container">
                                        <Folder size={24} fill="currentColor" opacity={0.6} />
                                    </div>
                                    <div className="module-info">
                                        <h4 className="module-title-text">{module.title}</h4>
                                        <div className="module-meta">
                                            <span>Collection • {resources.filter(r => r.moduleId === module.id).length} items</span>
                                            <span className="meta-dot">|</span>
                                            <span className="tag-badge">Curated Content</span>
                                        </div>
                                    </div>
                                    <div className="module-controls" onClick={e => e.stopPropagation()}>
                                        <button className="icon-btn-ghost" title="More Options">
                                            <MoreVertical size={18} />
                                            <div className="context-menu">
                                                <button onClick={() => { setEditingModule(module); setModuleForm({ title: module.title, description: module.description, order: module.order }); setShowModuleModal(true); }}>
                                                    <Edit2 size={14} /> Edit
                                                </button>
                                                <button className="text-error" onClick={() => handleDeleteModule(module.id)}>
                                                    <Trash2 size={14} /> Delete
                                                </button>
                                            </div>
                                        </button>
                                        <button className="expand-btn">
                                            {expandedModules.has(module.id) ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                                        </button>
                                    </div>
                                </div>

                                {expandedModules.has(module.id) && (
                                    <div className="module-expanded-content">
                                        {/* Resource list */}
                                        <div className="resources-list-compact">
                                            {resources.filter(r => r.moduleId === module.id).length === 0 ? (
                                                <div className="no-resources-msg">No resources in this folder</div>
                                            ) : (
                                                resources.filter(r => r.moduleId === module.id).map(resource => (
                                                    <div key={resource.id} className="resource-item-modern">
                                                        {getResourceIcon(resource.type)}
                                                        <div className="res-details">
                                                            <div className="res-title">{resource.title}</div>
                                                            <div className="res-meta">
                                                                {renderPlatformBadge(resource)}
                                                                {resource.isDemo && <span className="demo-tag">Demo</span>}
                                                            </div>
                                                        </div>
                                                        <div className="res-actions">
                                                            <a href={resource.url} target="_blank" rel="noopener noreferrer" className="res-action-btn"><ExternalLink size={14} /></a>
                                                            <button onClick={() => openEditResource(module.id, resource)} className="res-action-btn"><Edit2 size={14} /></button>
                                                            <button onClick={() => handleDeleteResource(resource.id)} className="res-action-btn text-error"><Trash2 size={14} /></button>
                                                        </div>
                                                    </div>
                                                ))
                                            )}
                                            <button className="add-resource-inline mt-2" onClick={() => openAddResource(module.id)}>
                                                <Plus size={14} /> Add item to this folder
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <div className="curriculum-sidebar">
                <div className="sidebar-glass-card">
                    <h3 className="sidebar-card-title">Curriculum Studio</h3>
                    <div className="sidebar-actions">
                        <button className="sidebar-action-btn" onClick={() => {
                            setEditingModule(null);
                            setModuleForm({ title: '', description: '', order: modules.length + 1 });
                            setShowModuleModal(true);
                        }}>
                            <Folder size={18} className="text-primary" />
                            <span>Folder</span>
                        </button>
                        <button className="sidebar-action-btn" onClick={() => {
                            if (modules.length === 0) {
                                showToast("Please create a folder first", "warning");
                                return;
                            }
                            openAddResource(modules[0].id);
                        }}>
                            <Play size={18} className="text-primary" />
                            <span>Video</span>
                        </button>
                        {targetType === 'batch' && (
                            <button className="sidebar-action-btn" onClick={() => setShowImportModal(true)}>
                                <Copy size={18} className="text-primary" />
                                <span>Import From Batch</span>
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Existing Modals */}
            <ImportBatchModal 
                isOpen={showImportModal} 
                onClose={() => setShowImportModal(false)}
                targetBatchId={targetId}
                onImportComplete={() => {
                    // Subscriptions will auto-update
                }}
            />

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
                                    folder={`innov8/${targetType}-notes/${targetId}/${activeModuleId}`}
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

                            {/* Demo Toggle */}
                            <div className="flex items-center gap-3 mt-4 p-3 rounded-lg" style={{ backgroundColor: 'rgba(52, 211, 153, 0.05)', border: '1px solid rgba(52, 211, 153, 0.2)' }}>
                                <input 
                                    type="checkbox" 
                                    id="isDemo" 
                                    checked={resourceForm.isDemo} 
                                    onChange={e => setResourceForm({...resourceForm, isDemo: e.target.checked})}
                                    style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                                />
                                <label htmlFor="isDemo" style={{ cursor: 'pointer', margin: 0, fontSize: '0.9rem', fontWeight: 500, color: '#34D399' }}>
                                    Available for Inactive Students (Demo Mode)
                                </label>
                            </div>
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
        </div>
    );
}
