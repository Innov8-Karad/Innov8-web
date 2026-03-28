import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Edit2, FileText, Video, Link as LinkIcon, ChevronDown, ChevronUp } from 'lucide-react';
import { courseService } from '../services/courseService';
import type { CourseModule, CourseResource } from '../types';
import { useToast } from '../hooks/useToast';
import Modal from './Modal';
import { FormField, FormActions } from './FormField';

interface CurriculumBuilderProps {
    courseId: string;
}

export default function CurriculumBuilder({ courseId }: CurriculumBuilderProps) {
    const [modules, setModules] = useState<CourseModule[]>([]);
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
    const [resourceForm, setResourceForm] = useState({ title: '', url: '', type: 'video' as 'video' | 'pdf' | 'link' });

    useEffect(() => {
        const unsubscribe = courseService.subscribeToModules(courseId, (fetchedModules) => {
            setModules(fetchedModules);
            setLoading(false);
        });
        return () => unsubscribe();
    }, [courseId]);

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
        setResourceForm({ title: '', url: '', type: 'video' });
        setShowResourceModal(true);
    };

    const openEditResource = (moduleId: string, resource: CourseResource) => {
        setActiveModuleId(moduleId);
        setEditingResource(resource);
        setResourceForm({ title: resource.title || '', url: resource.url, type: resource.type });
        setShowResourceModal(true);
    };

    const handleSaveResource = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!activeModuleId) return;
        try {
            if (editingResource) {
                await courseService.updateResource(courseId, activeModuleId, editingResource.id, resourceForm);
                showToast("Resource updated", "success");
            } else {
                await courseService.addResource(courseId, activeModuleId, resourceForm);
                showToast("Resource added", "success");
            }
            setShowResourceModal(false);
            setEditingResource(null);
            setActiveModuleId(null);
        } catch {
            showToast("Failed to save resource", "error");
        }
    };

    const handleDeleteResource = async (moduleId: string, resourceId: string) => {
        if (window.confirm("Delete this resource?")) {
            try {
                await courseService.deleteResource(courseId, moduleId, resourceId);
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
                                        <span className="text-xs text-muted">{module.resources?.length || 0} resources</span>
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
                                        {(!module.resources || module.resources.length === 0) ? (
                                            <div className="text-xs text-muted text-center py-2">No resources in this module.</div>
                                        ) : (
                                            module.resources.map(resource => (
                                                <div key={resource.id} className="flex justify-between items-center p-2 rounded-md bg-secondary/30 text-sm">
                                                    <div className="flex items-center gap-2 flex-1 overflow-hidden">
                                                        <span className="text-muted">{getResourceIcon(resource.type)}</span>
                                                        <span className="truncate">{resource.title || resource.type}</span>
                                                    </div>
                                                    <div className="flex items-center gap-1">
                                                        <a href={resource.url} target="_blank" rel="noopener noreferrer" className="icon-btn bg-transparent text-primary" style={{ padding: '4px' }}>
                                                            <LinkIcon size={14} />
                                                        </a>
                                                        <button type="button" className="icon-btn bg-transparent text-muted" onClick={() => openEditResource(module.id, resource)} style={{ padding: '4px' }}>
                                                            <Edit2 size={14} />
                                                        </button>
                                                        <button type="button" className="icon-btn bg-transparent text-error" onClick={() => handleDeleteResource(module.id, resource.id)} style={{ padding: '4px' }}>
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

            {/* Resource Modal */}
            <Modal isOpen={showResourceModal} onClose={() => setShowResourceModal(false)} title={editingResource ? "Edit Resource" : "Add Resource"} maxWidth="500px">
                <form onSubmit={handleSaveResource} className="p-1">
                    <FormField label="Resource Type">
                        <select required value={resourceForm.type} onChange={e => setResourceForm({ ...resourceForm, type: e.target.value as 'video' | 'pdf' | 'link' })}>
                            <option value="video">Video</option>
                            <option value="pdf">PDF</option>
                            <option value="link">External Link</option>
                        </select>
                    </FormField>
                    <FormField label="Title (Optional)">
                        <input type="text" value={resourceForm.title} onChange={e => setResourceForm({ ...resourceForm, title: e.target.value })} />
                    </FormField>
                    <FormField label="URL">
                        <input type="url" required value={resourceForm.url} onChange={e => setResourceForm({ ...resourceForm, url: e.target.value })} />
                    </FormField>
                    <FormActions>
                        <button type="button" className="btn btn-secondary" onClick={() => setShowResourceModal(false)}>Cancel</button>
                        <button type="submit" className="btn btn-primary">Save Resource</button>
                    </FormActions>
                </form>
            </Modal>
        </div>
    );
}
