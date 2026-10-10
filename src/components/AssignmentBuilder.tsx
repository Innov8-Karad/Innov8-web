import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Edit2, Calendar, ClipboardList, FileText, X, UploadCloud } from 'lucide-react';
import { courseService } from '../services/courseService';
import { batchService } from '../services/batchService';
import type { AssignmentType, CourseModule } from '../types';
import { useToast } from '../hooks/useToast';
import { uploadWithFallback } from '../lib/cloudinary';
import Modal from './Modal';
import ConfirmModal from './ConfirmModal';
import { FormField, FormActions } from './FormField';
import SubmissionList from './SubmissionList';

interface AssignmentBuilderProps {
    courseId?: string;
    targetId?: string;
    targetType?: 'course' | 'batch';
}

export default function AssignmentBuilder({ courseId, targetId, targetType = 'course' }: AssignmentBuilderProps) {
    const activeId = targetId || courseId || '';
    const service = targetType === 'course' ? courseService : batchService;

    const [assignments, setAssignments] = useState<AssignmentType[]>([]);
    const [modules, setModules] = useState<CourseModule[]>([]);
    const [loading, setLoading] = useState(true);
    const { showToast } = useToast();

    // Assignment Form State
    const [showModal, setShowModal] = useState(false);
    const [editingAssignment, setEditingAssignment] = useState<AssignmentType | null>(null);
    const [form, setForm] = useState({ title: '', dueDate: '', moduleId: '' });

    // File Upload State
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [uploading, setUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [isUploadHovered, setIsUploadHovered] = useState(false);

    // Submission State
    const [selectedAssignment, setSelectedAssignment] = useState<AssignmentType | null>(null);

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

        const unsubscribeAssignments = service.subscribeToAssignments(activeId, (fetchedAssignments) => {
            setAssignments(fetchedAssignments as AssignmentType[]);
            setLoading(false);
        });

        const unsubscribeModules = service.subscribeToModules(activeId, (fetchedModules) => {
            setModules(fetchedModules);
        });

        const timer = setTimeout(() => {
            setLoading(false);
        }, 5000);

        return () => {
            unsubscribeAssignments();
            unsubscribeModules();
            clearTimeout(timer);
        };
    }, [activeId, service]);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            let questionFileUrl = editingAssignment?.questionFileUrl || '';
            let questionFileName = editingAssignment?.questionFileName || '';
            let questionFileType = editingAssignment?.questionFileType || 'other';

            if (selectedFile) {
                setUploading(true);
                try {
                    const uploadResult = await uploadWithFallback(selectedFile, {
                        folder: `innov8/${targetType}-assignments/${activeId}`,
                        onProgress: (pct) => setUploadProgress(pct)
                    });
                    questionFileUrl = uploadResult.url;
                    questionFileName = selectedFile.name;
                    questionFileType = selectedFile.type.includes('pdf') ? 'pdf' :
                        (selectedFile.type.includes('image') ? 'image' :
                            (selectedFile.type.includes('word') ? 'doc' : 'other'));
                } catch (err: unknown) {
                    const errorMessage = err instanceof Error ? err.message : "Failed to upload file";
                    showToast(errorMessage, "error");
                    setUploading(false);
                    return;
                }
                setUploading(false);
            }

            const payload: Omit<AssignmentType, 'id'> & { moduleId?: string } = {
                title: form.title,
                dueDate: form.dueDate,
                moduleId: form.moduleId || "",
                status: 'Pending',
                questionFileUrl: questionFileUrl || "",
                questionFileName: questionFileName || "",
                questionFileType: questionFileType as AssignmentType['questionFileType']
            };

            if (editingAssignment) {
                await service.updateAssignment(activeId, editingAssignment.id, payload);
                showToast("Assignment updated", "success");
            } else {
                await service.addAssignment(activeId, payload);
                showToast("Assignment added", "success");
            }
            closeModal();
        } catch (error) {
            console.error("Failed to save assignment:", error);
            showToast("Failed to save assignment", "error");
        }
    };

    const closeModal = () => {
        setShowModal(false);
        setEditingAssignment(null);
        setForm({ title: '', dueDate: '', moduleId: '' });
        setSelectedFile(null);
        setUploadProgress(0);
        setUploading(false);
    };

    const handleDelete = (id: string) => {
        setConfirmState({
            isOpen: true,
            title: "Delete Assignment",
            message: "Are you sure you want to delete this assignment? This action cannot be undone.",
            onConfirm: async () => {
                try {
                    await service.deleteAssignment(activeId, id);
                    showToast("Assignment deleted", "success");
                } catch {
                    showToast("Failed to delete assignment", "error");
                }
            }
        });
    };

    const openEdit = (assignment: AssignmentType) => {
        setEditingAssignment(assignment);
        setForm({
            title: assignment.title || '',
            dueDate: assignment.dueDate || '',
            moduleId: assignment.moduleId || ''
        });
        setSelectedFile(null);
        setShowModal(true);
    };

    if (loading) return <div className="p-4 text-center text-muted">Loading assignments...</div>;

    return (
        <div className="mt-xl border-t border-divider pt-md">
            <div className="flex justify-between items-center mb-md">
                <h3 className="text-lg font-semibold">Assignments</h3>
                <button
                    type="button"
                    className="btn btn-secondary btn-sm flex items-center gap-1"
                    onClick={() => {
                        setEditingAssignment(null);
                        setForm({ title: '', dueDate: '', moduleId: '' });
                        setSelectedFile(null);
                        setShowModal(true);
                    }}
                >
                    <Plus size={16} /> Add Assignment
                </button>
            </div>

            {assignments.length === 0 ? (
                <div className="p-xl text-center text-muted border-dashed border-2 border-white/5 rounded-xl bg-white/[0.02]">
                    No assignments added yet.
                </div>
            ) : (
                <div className="flex flex-col" style={{ gap: '10px' }}>
                    {assignments.map(assignment => (
                        <div key={assignment.id} className="card" style={{ padding: '0', overflow: 'hidden', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
                            <div className="flex justify-between items-center"
                                style={{ padding: '14px 16px', transition: 'background 0.2s' }}
                                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.03)')}
                                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                            >
                                <div className="flex items-center" style={{ gap: '12px', minWidth: 0, flex: 1 }}>
                                    <span style={{
                                        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                                        width: '28px', height: '28px', borderRadius: 'var(--radius-sm)', flexShrink: 0,
                                        background: 'rgba(var(--accent-blue-rgb), 0.15)', color: 'var(--accent-blue)'
                                    }}>
                                        <Calendar size={14} />
                                    </span>
                                    <div style={{ minWidth: 0, flex: 1 }}>
                                        <div style={{ fontSize: '0.95rem', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                            {assignment.title}
                                        </div>
                                        <span className="text-muted" style={{ fontSize: '0.75rem' }}>
                                            Due: {assignment.dueDate || 'No date set'}
                                        </span>
                                        {assignment.moduleId && (
                                            <div style={{ marginTop: '4px' }}>
                                                <span style={{
                                                    fontSize: '0.65rem',
                                                    padding: '2px 6px',
                                                    borderRadius: '4px',
                                                    background: 'rgba(245, 158, 11, 0.1)',
                                                    color: '#F59E0B',
                                                    fontWeight: 600,
                                                    textTransform: 'uppercase'
                                                }}>
                                                    Module: {modules.find(m => m.id === assignment.moduleId)?.title || 'Unknown'}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div className="flex items-center" style={{ gap: '4px', flexShrink: 0 }}>
                                    <button
                                        type="button"
                                        className="btn btn-secondary"
                                        style={{ padding: '4px 10px', fontSize: '0.7rem', borderRadius: 'var(--radius-sm)', height: 'auto' }}
                                        onClick={() => setSelectedAssignment(assignment)}
                                    >
                                        <ClipboardList size={12} /> Submissions
                                    </button>
                                    <button type="button" className="icon-btn" style={{ width: '28px', height: '28px', border: 'none', background: 'transparent' }} onClick={() => openEdit(assignment)} title="Edit">
                                        <Edit2 size={13} />
                                    </button>
                                    <button type="button" className="icon-btn" style={{ width: '28px', height: '28px', border: 'none', background: 'transparent', color: 'var(--error)' }} onClick={() => handleDelete(assignment.id)} title="Delete">
                                        <Trash2 size={13} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {selectedAssignment && (
                <SubmissionList
                    courseId={activeId}
                    targetType={targetType}
                    assignmentId={selectedAssignment.id}
                    assignmentTitle={selectedAssignment.title}
                    onClose={() => setSelectedAssignment(null)}
                />
            )}

            {/* Assignment Modal */}
            <Modal isOpen={showModal} onClose={closeModal} title={editingAssignment ? "Edit Assignment" : "Add Assignment"} maxWidth="500px">
                <form onSubmit={handleSave} className="p-1">
                    <FormField label="Assignment Title">
                        <input type="text" required value={form.title} placeholder="e.g. React Final Project" onChange={e => setForm({ ...form, title: e.target.value })} disabled={uploading} />
                    </FormField>
                    <FormField label="Due Date">
                        <input type="text" required value={form.dueDate} placeholder="e.g. 25th May, 2026" onChange={e => setForm({ ...form, dueDate: e.target.value })} disabled={uploading} />
                    </FormField>

                    <FormField label="Linked Module (Optional)">
                        <select
                            value={form.moduleId}
                            onChange={e => setForm({ ...form, moduleId: e.target.value })}
                            disabled={uploading}
                        >
                            <option value="">-- No Module (General Content) --</option>
                            {modules.map(module => (
                                <option key={module.id} value={module.id}>
                                    Module {module.order}: {module.title}
                                </option>
                            ))}
                        </select>
                    </FormField>

                    <FormField label="Assignment Document (Optional)">
                        <div 
                            style={{
                                marginTop: '6px',
                                border: '2.5px dashed',
                                borderRadius: '12px',
                                padding: '24px 16px',
                                textAlign: 'center',
                                transition: 'all 0.25s ease',
                                backgroundColor: isUploadHovered ? 'rgba(255, 255, 255, 0.04)' : (selectedFile || editingAssignment?.questionFileUrl ? 'rgba(59, 130, 246, 0.03)' : 'rgba(255, 255, 255, 0.01)'),
                                borderColor: isUploadHovered ? 'var(--primary)' : (selectedFile || editingAssignment?.questionFileUrl ? 'rgba(59, 130, 246, 0.35)' : 'rgba(255, 255, 255, 0.1)'),
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
                            ) : editingAssignment?.questionFileUrl ? (
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: 'rgba(255,255,255,0.04)', padding: '10px 12px', borderRadius: '8px', border: '1px solid rgba(59, 130, 246, 0.2)' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', overflow: 'hidden', flex: 1 }}>
                                        <div style={{ width: '36px', height: '36px', borderRadius: '6px', backgroundColor: 'rgba(59, 130, 246, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                            <FileText size={18} style={{ color: '#3B82F6' }} />
                                        </div>
                                        <div style={{ textAlign: 'left', overflow: 'hidden', flex: 1 }}>
                                            <p style={{ fontSize: '0.85rem', fontWeight: 600, margin: 0, textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', color: '#3B82F6' }}>
                                                {editingAssignment.questionFileName || 'Current Assignment File'}
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
                                            accept=".pdf,image/*,.doc,.docx" 
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
                                        Choose assignment paper
                                    </p>
                                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0 }}>
                                        PDF, Images or Documents up to 10MB
                                    </p>
                                    <input 
                                        type="file" 
                                        style={{ display: 'none' }} 
                                        accept=".pdf,image/*,.doc,.docx" 
                                        onChange={e => e.target.files?.[0] && setSelectedFile(e.target.files[0])} 
                                    />
                                </label>
                            )}
                        </div>
                    </FormField>

                    <FormActions>
                        <button type="button" className="btn btn-secondary" onClick={closeModal} disabled={uploading}>Cancel</button>
                        <button type="submit" className="btn btn-primary" disabled={uploading}>
                            {uploading ? 'Uploading...' : (editingAssignment ? "Update Assignment" : "Save Assignment")}
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
