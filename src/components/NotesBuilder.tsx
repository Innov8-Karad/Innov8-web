import React, { useState, useEffect, useMemo } from 'react';
import { Plus, Trash2, Edit2, Calendar, FileText, X, UploadCloud, User } from 'lucide-react';
import { courseService } from '../services/courseService';
import { batchService } from '../services/batchService';
import type { CourseModule, CourseResource } from '../types';
import { useToast } from '../hooks/useToast';
import { uploadWithFallback } from '../lib/cloudinary';
import { auth } from '../lib/firebase';
import Modal from './Modal';
import ConfirmModal from './ConfirmModal';
import { FormField, FormActions } from './FormField';
import CustomSelect from './CustomSelect';

interface NotesBuilderProps {
    courseId?: string;
    targetId?: string;
    targetType?: 'course' | 'batch';
}

export default function NotesBuilder({ courseId, targetId, targetType = 'course' }: NotesBuilderProps) {
    const activeId = targetId || courseId || '';
    const service = targetType === 'course' ? courseService : batchService;

    const [notes, setNotes] = useState<CourseResource[]>([]);
    const [modules, setModules] = useState<CourseModule[]>([]);
    const [loading, setLoading] = useState(true);
    const { showToast } = useToast();

    // Note Form State
    const [showModal, setShowModal] = useState(false);
    const [editingNote, setEditingNote] = useState<CourseResource | null>(null);
    const [form, setForm] = useState({ title: '', description: '', moduleId: '' });

    // File Upload State
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [uploading, setUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [isUploadHovered, setIsUploadHovered] = useState(false);

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
        onConfirm: () => { },
    });

    useEffect(() => {
        if (!activeId) return;

        const unsubscribeResources = service.subscribeToResources(activeId, (fetchedResources) => {
            const noteResources = fetchedResources.filter(r => r.type === 'pdf' || r.type === 'link');
            setNotes(noteResources);
            setLoading(false);
        });

        const unsubscribeModules = service.subscribeToModules(activeId, (fetchedModules) => {
            setModules(fetchedModules);
        });

        const timer = setTimeout(() => {
            setLoading(false);
        }, 5000);

        return () => {
            unsubscribeResources();
            unsubscribeModules();
            clearTimeout(timer);
        };
    }, [activeId, service]);

    const moduleOptions = useMemo(() => {
        const options = [{ value: '', label: '-- No Module (General Content) --' }];
        modules.forEach(m => {
            options.push({ value: m.id, label: `Module ${m.order}: ${m.title}` });
        });
        return options;
    }, [modules]);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedFile && !editingNote?.url) {
            showToast("Please upload a PDF/Document file", "error");
            return;
        }

        try {
            let url = editingNote?.url || '';
            let cloudinaryPublicId = editingNote?.cloudinaryPublicId || '';
            let size = editingNote?.size || '';
            let fileFormat = editingNote?.fileFormat || 'PDF';

            if (selectedFile) {
                setUploading(true);
                try {
                    const uploadResult = await uploadWithFallback(selectedFile, {
                        folder: `innov8/${targetType}-notes/${activeId}`,
                        onProgress: (pct) => setUploadProgress(pct)
                    });
                    url = uploadResult.url;
                    cloudinaryPublicId = uploadResult.publicId || '';
                    size = formatBytes(selectedFile.size);
                    const ext = selectedFile.name.split('.').pop()?.toUpperCase() || 'PDF';
                    fileFormat = ['PDF', 'DOC', 'DOCX', 'PPT', 'XLS'].includes(ext) ? ext : 'PDF';
                } catch (err: unknown) {
                    const errorMessage = err instanceof Error ? err.message : "Failed to upload file";
                    showToast(errorMessage, "error");
                    setUploading(false);
                    return;
                }
                setUploading(false);
            }

            const payload: Omit<CourseResource, 'id'> & { moduleId?: string } = {
                title: form.title,
                url,
                type: 'pdf',
                cloudinaryPublicId: cloudinaryPublicId || "",
                size: size || "",
                fileFormat: fileFormat || "PDF",
                description: form.description || "",
                createdBy: auth.currentUser?.email || auth.currentUser?.uid || 'admin',
                isDemo: false,
                moduleId: form.moduleId || ""
            };

            if (editingNote) {
                await service.updateResource(activeId, editingNote.id, payload);
                showToast("Note updated successfully", "success");
            } else {
                await service.addResource(activeId, form.moduleId || '', payload);
                showToast("Note added successfully", "success");
            }
            closeModal();
        } catch (err) {
            console.error("Error saving note: ", err);
            showToast("Failed to save note", "error");
        }
    };

    const closeModal = () => {
        setShowModal(false);
        setEditingNote(null);
        setForm({ title: '', description: '', moduleId: '' });
        setSelectedFile(null);
        setUploadProgress(0);
        setUploading(false);
    };

    const handleDelete = (id: string) => {
        setConfirmState({
            isOpen: true,
            title: "Delete Note",
            message: "Are you sure you want to delete this note? This action cannot be undone.",
            onConfirm: async () => {
                try {
                    await service.deleteResource(activeId, id);
                    showToast("Note deleted successfully", "success");
                } catch {
                    showToast("Failed to delete note", "error");
                }
            }
        });
    };

    const openEdit = (note: CourseResource) => {
        setEditingNote(note);
        setForm({
            title: note.title || '',
            description: note.description || '',
            moduleId: note.moduleId || ''
        });
        setSelectedFile(null);
        setShowModal(true);
    };

    const formatBytes = (bytes: number, decimals = 1) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const dm = decimals < 0 ? 0 : decimals;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
    };

    const formatCreatedAt = (createdAt: string | number | Date | { seconds?: number; toDate?: () => Date } | null | undefined) => {
        if (!createdAt) return 'Just now';
        let date: Date;
        if (typeof createdAt === 'object' && 'seconds' in createdAt && createdAt.seconds) {
            date = new Date(createdAt.seconds * 1000);
        } else if (typeof createdAt === 'object' && 'toDate' in createdAt && createdAt.toDate) {
            date = createdAt.toDate();
        } else {
            date = new Date(createdAt as string | number | Date);
        }
        return date.toLocaleDateString(undefined, {
            day: 'numeric',
            month: 'short',
            year: 'numeric'
        });
    };

    const getFormatBadgeColor = (format?: string) => {
        const fmt = format?.toUpperCase() || 'PDF';
        switch (fmt) {
            case 'PDF': return 'rgba(239, 68, 68, 0.15)'; // red
            case 'DOC':
            case 'DOCX': return 'rgba(59, 130, 246, 0.15)'; // blue
            case 'PPT': return 'rgba(249, 115, 22, 0.15)'; // orange
            case 'XLS': return 'rgba(16, 185, 129, 0.15)'; // green
            default: return 'rgba(107, 114, 128, 0.15)'; // grey
        }
    };

    const getFormatBadgeTextColor = (format?: string) => {
        const fmt = format?.toUpperCase() || 'PDF';
        switch (fmt) {
            case 'PDF': return '#EF4444';
            case 'DOC':
            case 'DOCX': return '#3B82F6';
            case 'PPT': return '#F97316';
            case 'XLS': return '#10B981';
            default: return '#6B7280';
        }
    };

    if (loading) return <div className="p-4 text-center text-muted">Loading notes...</div>;

    return (
        <div className="mt-xl border-t border-divider pt-md">
            <div className="flex justify-between items-center mb-md">
                <h3 className="text-lg font-semibold">Notes</h3>
                <button
                    type="button"
                    className="btn btn-secondary btn-sm flex items-center gap-1"
                    onClick={() => {
                        setEditingNote(null);
                        setForm({ title: '', description: '', moduleId: '' });
                        setSelectedFile(null);
                        setShowModal(true);
                    }}
                >
                    <Plus size={16} /> Add Note
                </button>
            </div>

            {notes.length === 0 ? (
                <div className="p-xl text-center text-muted border-dashed border-2 border-white/5 rounded-xl bg-white/[0.02]">
                    No notes added yet.
                </div>
            ) : (
                <div className="flex flex-col" style={{ gap: '10px' }}>
                    {notes.map(note => (
                        <div key={note.id} className="card" style={{ padding: '0', overflow: 'hidden', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
                            <div className="flex justify-between items-start"
                                style={{ padding: '14px 16px', transition: 'background 0.2s' }}
                                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.03)')}
                                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                            >
                                <div className="flex items-start" style={{ gap: '12px', minWidth: 0, flex: 1 }}>
                                    <span style={{
                                        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                                        width: '32px', height: '32px', borderRadius: 'var(--radius-sm)', flexShrink: 0,
                                        background: getFormatBadgeColor(note.fileFormat), color: getFormatBadgeTextColor(note.fileFormat),
                                        marginTop: '2px'
                                    }}>
                                        <FileText size={16} />
                                    </span>
                                    <div style={{ minWidth: 0, flex: 1 }}>
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <span 
                                                onClick={() => window.open(note.url, '_blank')}
                                                style={{ fontSize: '0.95rem', fontWeight: 600, cursor: 'pointer' }}
                                                className="hover:underline text-main"
                                            >
                                                {note.title}
                                            </span>
                                            <span style={{
                                                fontSize: '0.65rem',
                                                padding: '2px 6px',
                                                borderRadius: '4px',
                                                background: getFormatBadgeColor(note.fileFormat),
                                                color: getFormatBadgeTextColor(note.fileFormat),
                                                fontWeight: 600
                                            }}>
                                                {note.fileFormat || 'PDF'}
                                            </span>
                                            {note.size && (
                                                <span className="text-xs text-muted">
                                                    ({note.size})
                                                </span>
                                            )}
                                        </div>
                                        {note.description && (
                                            <p className="text-sm text-muted mt-sm" style={{ margin: '4px 0' }}>
                                                {note.description}
                                            </p>
                                        )}
                                        <div className="flex items-center gap-3 mt-xs flex-wrap text-muted" style={{ fontSize: '0.75rem' }}>
                                            <span className="flex items-center gap-1">
                                                <Calendar size={12} /> {formatCreatedAt(note.createdAt)}
                                            </span>
                                            {note.createdBy && (
                                                <span className="flex items-center gap-1">
                                                    <User size={12} /> {note.createdBy}
                                                </span>
                                            )}
                                            {note.moduleId && (
                                                <span style={{
                                                    fontSize: '0.65rem',
                                                    padding: '1px 5px',
                                                    borderRadius: '4px',
                                                    background: 'rgba(245, 158, 11, 0.1)',
                                                    color: '#F59E0B',
                                                    fontWeight: 600,
                                                    textTransform: 'uppercase'
                                                }}>
                                                    Module: {modules.find(m => m.id === note.moduleId)?.title || 'Unknown'}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center" style={{ gap: '4px', flexShrink: 0, marginLeft: '8px' }}>
                                    <button type="button" className="icon-btn" style={{ width: '28px', height: '28px', border: 'none', background: 'transparent' }} onClick={() => openEdit(note)} title="Edit Note">
                                        <Edit2 size={14} />
                                    </button>
                                    <button type="button" className="icon-btn" style={{ width: '28px', height: '28px', border: 'none', background: 'transparent', color: 'var(--error)' }} onClick={() => handleDelete(note.id)} title="Delete Note">
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Note Modal */}
            <Modal isOpen={showModal} onClose={closeModal} title={editingNote ? "Edit Note" : "Add Note"} maxWidth="500px">
                <form onSubmit={handleSave} className="p-1">
                    <FormField label="Note Title">
                        <input type="text" required value={form.title} placeholder="e.g. Introduction to React Hooks" onChange={e => setForm({ ...form, title: e.target.value })} disabled={uploading} />
                    </FormField>
                    <FormField label="Description (Optional)">
                        <textarea rows={2} value={form.description} placeholder="Enter a brief description of the notes..." onChange={e => setForm({ ...form, description: e.target.value })} disabled={uploading} />
                    </FormField>

                    <FormField label="Linked Module (Optional)">
                        <CustomSelect
                            options={moduleOptions}
                            value={form.moduleId}
                            onChange={(val) => setForm({ ...form, moduleId: val })}
                            disabled={uploading}
                        />
                    </FormField>

                    <FormField label="Note Document (PDF, DOC, Images)">
                        <div 
                            style={{
                                marginTop: '6px',
                                border: '2.5px dashed',
                                borderRadius: '12px',
                                padding: '24px 16px',
                                textAlign: 'center',
                                transition: 'all 0.25s ease',
                                backgroundColor: isUploadHovered ? 'rgba(255, 255, 255, 0.04)' : (selectedFile || editingNote?.url ? 'rgba(59, 130, 246, 0.03)' : 'rgba(255, 255, 255, 0.01)'),
                                borderColor: isUploadHovered ? 'var(--primary)' : (selectedFile || editingNote?.url ? 'rgba(59, 130, 246, 0.35)' : 'rgba(255, 255, 255, 0.1)'),
                            }}
                        >
                            {uploading ? (
                                <div className="py-2">
                                    <div className="flex justify-between items-center mb-2 px-1">
                                        <span className="text-xs font-medium text-accent-blue">Uploading file...</span>
                                        <span className="text-xs font-bold text-accent-blue">{uploadProgress}%</span>
                                    </div>
                                    <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                                        <div className="h-full bg-accent-blue transition-all duration-300" style={{ width: `${uploadProgress}%` }} />
                                    </div>
                                </div>
                            ) : selectedFile ? (
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: 'rgba(255,255,255,0.04)', padding: '10px 12px', borderRadius: '8px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', overflow: 'hidden', flex: 1 }}>
                                        <div style={{ width: '36px', height: '36px', borderRadius: '6px', backgroundColor: 'rgba(59, 130, 246, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                            <FileText size={18} style={{ color: '#3B82F6' }} />
                                        </div>
                                        <div style={{ textAlign: 'left', overflow: 'hidden', flex: 1 }}>
                                            <p style={{ fontSize: '0.85rem', fontWeight: 600, margin: 0, textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }} className="text-main">
                                                {selectedFile.name}
                                            </p>
                                            <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', margin: '2px 0 0 0' }}>
                                                {(selectedFile.size / 1024).toFixed(1)} KB • Ready to upload
                                            </p>
                                        </div>
                                    </div>
                                    <button 
                                        type="button" 
                                        onClick={() => setSelectedFile(null)} 
                                        style={{ padding: '6px', border: 'none', background: 'transparent', cursor: 'pointer', borderRadius: '50%', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                        onMouseEnter={e => {
                                            e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.05)';
                                            e.currentTarget.style.color = 'var(--error)';
                                        }}
                                        onMouseLeave={e => {
                                            e.currentTarget.style.backgroundColor = 'transparent';
                                            e.currentTarget.style.color = 'var(--text-muted)';
                                        }}
                                    >
                                        <X size={16} />
                                    </button>
                                </div>
                            ) : editingNote?.url ? (
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: 'rgba(255,255,255,0.04)', padding: '10px 12px', borderRadius: '8px', border: '1px solid rgba(59, 130, 246, 0.2)' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', overflow: 'hidden', flex: 1 }}>
                                        <div style={{ width: '36px', height: '36px', borderRadius: '6px', backgroundColor: 'rgba(59, 130, 246, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                            <FileText size={18} style={{ color: '#3B82F6' }} />
                                        </div>
                                        <div style={{ textAlign: 'left', overflow: 'hidden', flex: 1 }}>
                                            <p style={{ fontSize: '0.85rem', fontWeight: 600, margin: 0, textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', color: '#3B82F6' }}>
                                                {editingNote.title || 'Current Document File'}
                                            </p>
                                            <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', margin: '2px 0 0 0' }}>
                                                Uploaded • Click Replace to change
                                            </p>
                                        </div>
                                    </div>
                                    <label 
                                        style={{ cursor: 'pointer', padding: '6px 12px', backgroundColor: 'rgba(59, 130, 246, 0.15)', borderRadius: '6px', color: '#3B82F6', fontSize: '0.75rem', fontWeight: 700, transition: 'all 0.2s' }}
                                        onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'rgba(59, 130, 246, 0.25)'; }}
                                        onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'rgba(59, 130, 246, 0.15)'; }}
                                    >
                                        REPLACE
                                        <input 
                                            type="file" 
                                            style={{ display: 'none' }} 
                                            accept=".pdf,image/*,.doc,.docx,.ppt,.pptx,.xls,.xlsx" 
                                            onChange={e => e.target.files?.[0] && setSelectedFile(e.target.files[0])} 
                                        />
                                    </label>
                                </div>
                            ) : (
                                <label 
                                    className="block"
                                    style={{ cursor: 'pointer' }}
                                    onMouseEnter={() => setIsUploadHovered(true)}
                                    onMouseLeave={() => setIsUploadHovered(false)}
                                >
                                    <div 
                                        style={{
                                            width: '44px',
                                            height: '44px',
                                            borderRadius: '50%',
                                            backgroundColor: 'rgba(255, 255, 255, 0.05)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            margin: '0 auto 12px auto',
                                            color: isUploadHovered ? 'var(--primary)' : 'var(--text-secondary)',
                                            transition: 'all 0.2s ease',
                                        }}
                                    >
                                        <UploadCloud size={22} />
                                    </div>
                                    <p style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-main)', margin: '0 0 4px 0' }}>
                                        Choose note file
                                    </p>
                                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0 }}>
                                        PDF, Word, Slides, Excel or Images up to 10MB
                                    </p>
                                    <input 
                                        type="file" 
                                        style={{ display: 'none' }} 
                                        accept=".pdf,image/*,.doc,.docx,.ppt,.pptx,.xls,.xlsx" 
                                        onChange={e => e.target.files?.[0] && setSelectedFile(e.target.files[0])} 
                                    />
                                </label>
                            )}
                        </div>
                    </FormField>

                    <FormActions>
                        <button type="button" className="btn btn-secondary" onClick={closeModal} disabled={uploading}>Cancel</button>
                        <button type="submit" className="btn btn-primary" disabled={uploading}>
                            {uploading ? 'Uploading...' : (editingNote ? "Update Note" : "Save Note")}
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
