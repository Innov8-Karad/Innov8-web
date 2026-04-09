import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Edit2, Calendar, ClipboardList } from 'lucide-react';
import { courseService } from '../services/courseService';
import type { AssignmentType } from '../types';
import { useToast } from '../hooks/useToast';
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
            const payload: Omit<AssignmentType, 'id'> = {
                title: form.title,
                dueDate: form.dueDate,
                status: 'Pending', // Default status for template
            };

            if (editingAssignment) {
                await courseService.updateAssignment(courseId, editingAssignment.id, payload);
                showToast("Assignment updated", "success");
            } else {
                await courseService.addAssignment(courseId, payload);
                showToast("Assignment added", "success");
            }
            setShowModal(false);
            setEditingAssignment(null);
            setForm({ title: '', dueDate: '' });
        } catch {
            showToast("Failed to save assignment", "error");
        }
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
            <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editingAssignment ? "Edit Assignment" : "Add Assignment"} maxWidth="500px">
                <form onSubmit={handleSave} className="p-1">
                    <FormField label="Assignment Title">
                        <input type="text" required value={form.title} placeholder="e.g. React Final Project" onChange={e => setForm({ ...form, title: e.target.value })} />
                    </FormField>
                    <FormField label="Due Date">
                        <input type="text" required value={form.dueDate} placeholder="e.g. 25th May, 2026" onChange={e => setForm({ ...form, dueDate: e.target.value })} />
                    </FormField>
                    <FormActions>
                        <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                        <button type="submit" className="btn btn-primary">Save Assignment</button>
                    </FormActions>
                </form>
            </Modal>
        </div>
    );
}
