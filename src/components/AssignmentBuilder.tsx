import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Edit2, Calendar } from 'lucide-react';
import { courseService } from '../services/courseService';
import type { AssignmentType } from '../types';
import { useToast } from '../hooks/useToast';
import Modal from './Modal';
import { FormField, FormActions } from './FormField';

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
                <div className="p-xl text-center text-muted border-dashed rounded-md bg-secondary">
                    No assignments added yet.
                </div>
            ) : (
                <div className="flex flex-col gap-3">
                    {assignments.map(assignment => (
                        <div key={assignment.id} className="glass-card" style={{ padding: '0', overflow: 'hidden' }}>
                            <div className="flex justify-between items-center p-3">
                                <div className="flex items-center gap-3">
                                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary">
                                        <Calendar size={16} />
                                    </div>
                                    <div>
                                        <h4 className="font-semibold">{assignment.title}</h4>
                                        <span className="text-xs text-muted">Due: {assignment.dueDate || 'No date set'}</span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button type="button" className="icon-btn text-muted" onClick={() => openEdit(assignment)}>
                                        <Edit2 size={16} />
                                    </button>
                                    <button type="button" className="icon-btn text-error" onClick={() => handleDelete(assignment.id)}>
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
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
