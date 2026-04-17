import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Edit2, Calendar, ClipboardList, FileText, X, UploadCloud } from 'lucide-react';
import { courseService } from '../services/courseService';
import type { AssignmentType } from '../types';
import { useToast } from '../hooks/useToast';
import { uploadWithFallback } from '../lib/cloudinary';
import Modal from './Modal';
import { FormField, FormActions } from './FormField';
import SubmissionList from './SubmissionList';

interface AssignmentBuilderProps {
    courseId: string;
}

export default function AssignmentBuilder({ courseId }: AssignmentBuilderProps) {
    const [assignments, setAssignments] = useState<AssignmentType[]>([]);
    const [loading, setLoading] = useState(true);
    const { showToast } = useToast();

    // Assignment Form State
    const [showModal, setShowModal] = useState(false);
    const [editingAssignment, setEditingAssignment] = useState<AssignmentType | null>(null);
    const [form, setForm] = useState({ title: '', dueDate: '' });
    
    // File Upload State
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [uploading, setUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);

    // Submission State
    const [selectedAssignment, setSelectedAssignment] = useState<AssignmentType | null>(null);

    useEffect(() => {
        const unsubscribe = courseService.subscribeToAssignments(courseId, (fetchedAssignments) => {
            setAssignments(fetchedAssignments as AssignmentType[]);
            setLoading(false);
        });

        const timer = setTimeout(() => {
            setLoading(false);
        }, 5000);

        return () => {
            unsubscribe();
            clearTimeout(timer);
        };
    }, [courseId]);

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
                        folder: `innov8/course-assignments/${courseId}`,
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

            const payload: Omit<AssignmentType, 'id'> = {
                title: form.title,
                dueDate: form.dueDate,
                status: 'Pending',
                questionFileUrl,
                questionFileName,
                questionFileType: questionFileType as AssignmentType['questionFileType']
            };

            if (editingAssignment) {
                await courseService.updateAssignment(courseId, editingAssignment.id, payload);
                showToast("Assignment updated", "success");
            } else {
                await courseService.addAssignment(courseId, payload);
                showToast("Assignment added", "success");
            }
            closeModal();
        } catch {
            showToast("Failed to save assignment", "error");
        }
    };

    const closeModal = () => {
        setShowModal(false);
        setEditingAssignment(null);
        setForm({ title: '', dueDate: '' });
        setSelectedFile(null);
        setUploadProgress(0);
        setUploading(false);
    };

    const handleDelete = async (id: string) => {
        if (window.confirm("Delete this assignment?")) {
            try {
                await courseService.deleteAssignment(courseId, id);
                showToast("Assignment deleted", "success");
            } catch {
                showToast("Failed to delete assignment", "error");
            }
        }
    };

    const openEdit = (assignment: AssignmentType) => {
        setEditingAssignment(assignment);
        setForm({ title: assignment.title || '', dueDate: assignment.dueDate || '' });
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
                        setForm({ title: '', dueDate: '' });
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
                    courseId={courseId}
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

                    <FormField label="Assignment Document (Optional)">
                        <div className={`mt-1 border-2 border-dashed rounded-lg p-4 text-center transition-colors ${selectedFile || editingAssignment?.questionFileUrl ? 'border-accent-blue/30 bg-accent-blue/5' : 'border-white/10 hover:border-white/20'}`}>
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
                                <div className="flex items-center justify-between bg-white/5 p-2 rounded-md">
                                    <div className="flex items-center gap-3 overflow-hidden">
                                        <div className="w-8 h-8 rounded bg-accent-blue/20 flex items-center justify-center flex-shrink-0">
                                            <FileText size={16} className="text-accent-blue" />
                                        </div>
                                        <div className="text-left overflow-hidden">
                                            <p className="text-sm font-medium truncate">{selectedFile.name}</p>
                                            <p className="text-[10px] text-muted">{(selectedFile.size / 1024).toFixed(1)} KB • Ready to upload</p>
                                        </div>
                                    </div>
                                    <button type="button" onClick={() => setSelectedFile(null)} className="p-1 hover:bg-white/10 rounded-full text-muted hover:text-error transition-colors">
                                        <X size={16} />
                                    </button>
                                </div>
                            ) : editingAssignment?.questionFileUrl ? (
                                <div className="flex items-center justify-between bg-white/5 p-2 rounded-md border border-accent-blue/20">
                                    <div className="flex items-center gap-3 overflow-hidden">
                                        <div className="w-8 h-8 rounded bg-accent-blue/20 flex items-center justify-center flex-shrink-0">
                                            <FileText size={16} className="text-accent-blue" />
                                        </div>
                                        <div className="text-left overflow-hidden">
                                            <p className="text-sm font-medium truncate text-accent-blue">{editingAssignment.questionFileName || 'Current Assignment File'}</p>
                                            <p className="text-[10px] text-muted">Uploaded • Click Browse to replace</p>
                                        </div>
                                    </div>
                                    <label className="cursor-pointer p-1.5 hover:bg-accent-blue/10 rounded-md text-accent-blue text-xs font-bold transition-colors">
                                        REPLACE
                                        <input type="file" className="hidden" accept=".pdf,image/*,.doc,.docx" onChange={e => e.target.files?.[0] && setSelectedFile(e.target.files[0])} />
                                    </label>
                                </div>
                            ) : (
                                <label className="cursor-pointer block py-2">
                                    <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-2 group-hover:bg-white/10">
                                        <UploadCloud size={20} className="text-muted" />
                                    </div>
                                    <p className="text-sm font-medium">Click to upload assignment paper</p>
                                    <p className="text-[11px] text-muted mt-1">PDF, Images or Documents (Max 10MB)</p>
                                    <input type="file" className="hidden" accept=".pdf,image/*,.doc,.docx" onChange={e => e.target.files?.[0] && setSelectedFile(e.target.files[0])} />
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
        </div>
    );
}
