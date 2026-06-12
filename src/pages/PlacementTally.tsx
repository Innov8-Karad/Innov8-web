import React, { useState, useEffect, useContext, useRef } from 'react';
import { Users, Pencil, Trash2, Plus, Book, Clock, ChevronDown, ChevronUp, Download, FileSpreadsheet, ChevronLeft, ChevronRight } from 'lucide-react';
import { placementTallyService, type PlacementTallyStudent, type PaymentRecord } from '../services/placementTallyService';
import { ToastContext } from '../contexts/ToastContext';
import PageHeader from '../components/PageHeader';
import LoadingState from '../components/LoadingState';
import ErrorAlert from '../components/ErrorAlert';
import Modal from '../components/Modal';
import { FormField, FormRow } from '../components/FormField';
import { useUser } from '../hooks/useUser';
import type { User } from '../types';
import CustomDatePicker from '../components/CustomDatePicker';

export default function PlacementTallyPage() {
    const toastContext = useContext(ToastContext);
    const showToast = toastContext?.showToast;

    const [students, setStudents] = useState<PlacementTallyStudent[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [showStudentModal, setShowStudentModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [editingStudentId, setEditingStudentId] = useState<string | null>(null);
    const [studentToDelete, setStudentToDelete] = useState<string | null>(null);

    const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());
    const [exportingAll, setExportingAll] = useState(false);
    const [exportingStudentId, setExportingStudentId] = useState<string | null>(null);

    const [currentPage, setCurrentPage] = useState(1);
    const pageSize = 8;

    // Reset current page when database results list size changes
    useEffect(() => {
        setCurrentPage(1);
    }, [students.length]);

    const toggleCardExpand = (studentId: string) => {
        setExpandedCards(prev => {
            const next = new Set(prev);
            if (next.has(studentId)) {
                next.delete(studentId);
            } else {
                next.add(studentId);
            }
            return next;
        });
    };

    // Form states
    const [activeTab, setActiveTab] = useState<'basic' | 'previous' | 'payment'>('basic');
    const [studentForm, setStudentForm] = useState<Partial<PlacementTallyStudent>>({
        name: '',
        emailId: '',
        companyName: '',
        joiningDate: '',
        designation: '',
        package: 0,
        totalPayable: 0,
        placementCharges: 0,
        internshipStartDate: '',
        internshipEndDate: '',
        jobJoiningDate: '',
        jobReleaseDate: '',
        employeeId: '',
        previousCompanyName: '',
        mobileNo: '',
        client: '',
        paymentDetails: []
    });

    const userContext = useUser();
    const allStudents = userContext?.students || [];
    const [showDropdown, setShowDropdown] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const getSearchScore = (name: string, query: string) => {
        const n = name.toLowerCase();
        const q = query.toLowerCase();
        if (n === q) return 0;
        if (n.startsWith(q)) return 1;
        const words = n.split(/\s+/);
        if (words.some(w => w.startsWith(q))) return 2;
        if (n.includes(q)) return 3;
        return 4;
    };

    const searchTerm = studentForm.name || '';
    const filteredAndSortedStudents = allStudents
        .filter(s => {
            if (!searchTerm) return true;
            return s.name.toLowerCase().includes(searchTerm.toLowerCase());
        })
        .sort((a, b) => {
            if (!searchTerm) {
                return a.name.localeCompare(b.name);
            }
            const scoreA = getSearchScore(a.name, searchTerm);
            const scoreB = getSearchScore(b.name, searchTerm);
            if (scoreA !== scoreB) {
                return scoreA - scoreB;
            }
            return a.name.localeCompare(b.name);
        });

    const handleSelectStudent = (selectedStudent: User) => {
        setStudentForm(prev => ({
            ...prev,
            name: selectedStudent.name || '',
            mobileNo: selectedStudent.phone || prev.mobileNo || ''
        }));
        setShowDropdown(false);
    };

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setShowDropdown(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        setLoading(true);
        setError(null);

        const unsub = placementTallyService.subscribeToStudents(
            (data) => {
                setStudents(data);
                setLoading(false);
            },
            (err) => {
                console.error("Students subscription error:", err);
                setError("Could not load students at this moment.");
                setLoading(false);
            }
        );

        return () => unsub();
    }, []);

    // --- CSV Export Helpers ---
    const escapeCSV = (value: string | number | undefined | null): string => {
        const str = String(value ?? '');
        if (str.includes(',') || str.includes('"') || str.includes('\n')) {
            return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
    };

    const downloadCSV = (csvContent: string, fileName: string) => {
        const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    const getStudentFees = (student: PlacementTallyStudent) => {
        const totalFee = student.totalPayable || 0;
        const paidFee = student.paymentDetails?.reduce((sum, p) => sum + (Number(p.amount) || 0), 0) || 0;
        const remainingFee = totalFee - paidFee;
        return { totalFee, paidFee, remainingFee };
    };

    const getPlacementStatus = (student: PlacementTallyStudent): string => {
        const { totalFee, paidFee } = getStudentFees(student);
        if (paidFee >= totalFee && totalFee > 0) return 'Fully Paid';
        if (paidFee > 0) return 'Partially Paid';
        return 'Pending';
    };

    const handleExportAllCSV = async () => {
        if (students.length === 0) {
            showToast?.('No students to export.', 'error');
            return;
        }
        try {
            setExportingAll(true);
            // Small delay for loading indicator visibility
            await new Promise(resolve => setTimeout(resolve, 300));

            const headers = ['Student Name', 'Parent Number', 'Company Name', 'Job Role', 'Total Fee', 'Paid Fee', 'Remaining Fee', 'Placement Date', 'Placement Status'];
            const rows = students.map(student => {
                const { totalFee, paidFee, remainingFee } = getStudentFees(student);
                return [
                    escapeCSV(student.name),
                    escapeCSV(student.emailId),
                    escapeCSV(student.companyName),
                    escapeCSV(student.designation),
                    escapeCSV(totalFee),
                    escapeCSV(paidFee),
                    escapeCSV(remainingFee),
                    escapeCSV(student.joiningDate ? new Date(student.joiningDate).toLocaleDateString() : ''),
                    escapeCSV(getPlacementStatus(student))
                ].join(',');
            });

            const csvContent = [headers.join(','), ...rows].join('\n');
            const today = new Date().toISOString().split('T')[0];
            downloadCSV(csvContent, `placement_tally_all_students_${today}.csv`);
            showToast?.('All students CSV exported successfully!', 'success');
        } catch (err) {
            console.error('Error exporting all CSV:', err);
            showToast?.('Failed to export CSV. Please try again.', 'error');
        } finally {
            setExportingAll(false);
        }
    };

    const handleExportStudentCSV = async (student: PlacementTallyStudent) => {
        try {
            setExportingStudentId(student.id);
            await new Promise(resolve => setTimeout(resolve, 300));

            const { totalFee, paidFee, remainingFee } = getStudentFees(student);

            const headers = ['Initial Total Payable', 'Total Paid', 'Remaining Payable'];
            const row = [
                escapeCSV(`₹${totalFee.toLocaleString()}`),
                escapeCSV(`₹${paidFee.toLocaleString()}`),
                escapeCSV(`₹${remainingFee.toLocaleString()}`)
            ];

            const csvContent = [headers.join(','), row.join(',')].join('\n');
            const safeName = student.name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/(^_|_$)/g, '');
            downloadCSV(csvContent, `${safeName}_placement_details.csv`);
            showToast?.(`CSV exported for ${student.name}!`, 'success');
        } catch (err) {
            console.error('Error exporting student CSV:', err);
            showToast?.('Failed to export CSV. Please try again.', 'error');
        } finally {
            setExportingStudentId(null);
        }
    };

    const handleAddStudent = () => {
        setEditingStudentId(null);
        setStudentForm({
            name: '',
            emailId: '',
            companyName: '',
            joiningDate: '',
            designation: '',
            package: 0,
            totalPayable: 0,
            placementCharges: 0,
            internshipStartDate: '',
            internshipEndDate: '',
            jobJoiningDate: '',
            jobReleaseDate: '',
            employeeId: '',
            previousCompanyName: '',
            mobileNo: '',
            client: '',
            paymentDetails: []
        });
        setActiveTab('basic');
        setShowStudentModal(true);
    };

    const handleEditStudent = (student: PlacementTallyStudent) => {
        setEditingStudentId(student.id);
        setStudentForm({ ...student });
        setActiveTab('basic');
        setShowStudentModal(true);
    };

    const handleDeleteStudent = (id: string) => {
        setStudentToDelete(id);
        setShowDeleteModal(true);
    };

    const handleConfirmDelete = async () => {
        if (!studentToDelete) return;
        try {
            setSaving(true);
            await placementTallyService.deleteStudent(studentToDelete);
            showToast?.("Student record deleted successfully.", "success");
            setShowDeleteModal(false);
            setStudentToDelete(null);
        } catch (err) {
            console.error("Error deleting student:", err);
            showToast?.("Failed to delete student. Please try again.", "error");
        } finally {
            setSaving(false);
        }
    };

    const handleAddPayment = () => {
        setStudentForm(prev => ({
            ...prev,
            paymentDetails: [
                ...(prev.paymentDetails || []),
                { id: crypto.randomUUID(), date: '', amount: 0, accountNo: '' }
            ]
        }));
    };

    const handleRemovePayment = (idToRemove: string) => {
        setStudentForm(prev => ({
            ...prev,
            paymentDetails: prev.paymentDetails?.filter(p => p.id !== idToRemove) || []
        }));
    };

    const handlePaymentChange = (id: string, field: keyof PaymentRecord, value: string | number) => {
        setStudentForm(prev => ({
            ...prev,
            paymentDetails: prev.paymentDetails?.map(p => 
                p.id === id ? { ...p, [field]: value } : p
            ) || []
        }));
    };

    const handleSaveStudent = async (e: React.FormEvent) => {
        e.preventDefault();

        // --- Custom Validation Logic ---
        if (studentForm.emailId && !/^\d{10}$/.test(studentForm.emailId)) {
            showToast?.("Parent number must be exactly 10 digits.", "error");
            setActiveTab('basic');
            return;
        }

        if (studentForm.mobileNo && !/^\d{10}$/.test(studentForm.mobileNo)) {
            showToast?.("Mobile number must be exactly 10 digits.", "error");
            setActiveTab('previous');
            return;
        }

        if (studentForm.internshipStartDate && studentForm.internshipEndDate) {
            if (new Date(studentForm.internshipEndDate) <= new Date(studentForm.internshipStartDate)) {
                showToast?.("Internship End Date must be strictly after the Start Date.", "error");
                setActiveTab('previous');
                return;
            }
        }

        if (studentForm.jobJoiningDate && studentForm.jobReleaseDate) {
            if (new Date(studentForm.jobReleaseDate) <= new Date(studentForm.jobJoiningDate)) {
                showToast?.("Job Release Date must be strictly after the Joining Date.", "error");
                setActiveTab('previous');
                return;
            }
        }

        if ((studentForm.package || 0) < 0 || (studentForm.totalPayable || 0) < 0 || (studentForm.placementCharges || 0) < 0) {
            showToast?.("Financial amounts cannot be negative.", "error");
            setActiveTab('basic');
            return;
        }

        if (studentForm.paymentDetails?.some(p => Number(p.amount) <= 0)) {
            showToast?.("Payment amounts must be greater than zero.", "error");
            setActiveTab('payment');
            return;
        }
        // -------------------------------

        try {
            setSaving(true);

            if (editingStudentId) {
                await placementTallyService.updateStudent(editingStudentId, studentForm);
                showToast?.("Student updated successfully!", "success");
            } else {
                await placementTallyService.createStudent(studentForm);
                showToast?.("Student added successfully!", "success");
            }

            setShowStudentModal(false);
        } catch (err) {
            console.error("Error saving student:", err);
            showToast?.("Failed to save student. Please try again.", "error");
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <LoadingState message="Loading placement tally records..." />;

    // Pagination logic
    const totalItems = students.length;
    const totalPages = Math.ceil(totalItems / pageSize);
    const paginatedStudents = students.slice(
        (currentPage - 1) * pageSize,
        currentPage * pageSize
    );

    return (
        <div className="pb-xl">
            {error && <ErrorAlert message={error} />}

            <PageHeader
                title="Placement Tally"
                subtitle="Track student placements, financial details, and payment history"
                actionLabel="Add New Student"
                onAction={handleAddStudent}
            >
                <button
                    className="btn btn-secondary flex items-center gap-2"
                    onClick={handleExportAllCSV}
                    disabled={exportingAll || students.length === 0}
                    title="Export all students to CSV"
                    style={{ whiteSpace: 'nowrap' }}
                >
                    {exportingAll ? (
                        <span className="flex items-center gap-2">
                            <span className="spinner" style={{ width: '16px', height: '16px', border: '2px solid rgba(var(--primary-rgb), 0.2)', borderTopColor: 'var(--primary)', borderRadius: '50%', animation: 'spin 0.6s linear infinite', display: 'inline-block' }} />
                            Exporting...
                        </span>
                    ) : (
                        <>
                            <FileSpreadsheet size={18} />
                            📊 Export All CSV
                        </>
                    )}
                </button>
            </PageHeader>

            {students.length === 0 ? (
                <div className="card text-center py-xl text-muted">No students found. Add a new student to get started.</div>
            ) : (
                <>
                <div className="grid-cards">
                    {paginatedStudents.map(student => (
                        <div key={student.id} className="card flex flex-col gap-4 relative group" style={{ padding: 'var(--space-lg)' }}>
                            {/* Header: User Info & Actions */}
                            <div className="flex justify-between items-start">
                                <div className="flex gap-4">
                                    <div style={{ width: '60px', height: '60px', borderRadius: '12px', overflow: 'hidden', flexShrink: 0, backgroundColor: 'var(--bg-card-accent)' }}>
                                        <div className="flex items-center justify-center" style={{ height: '100%', color: 'var(--text-secondary)' }}>
                                            <Users size={28} />
                                        </div>
                                    </div>
                                    <div>
                                        <h3 style={{ margin: 0, fontSize: '1.25rem' }}>{student.name}</h3>
                                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: '2px 0 6px 0' }}>Parent: {student.emailId}</p>
                                        <div style={{ display: 'inline-block', padding: '4px 10px', backgroundColor: 'rgba(var(--primary-rgb), 0.1)', color: 'var(--primary)', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 600 }}>
                                            {student.companyName} {student.designation ? `• ${student.designation}` : ''}
                                        </div>
                                    </div>
                                </div>
                                <div className="flex gap-1 items-start">
                                    <button
                                        onClick={() => handleExportStudentCSV(student)}
                                        className="icon-btn"
                                        title="Export CSV"
                                        disabled={exportingStudentId === student.id}
                                        style={{ position: 'relative' }}
                                    >
                                        {exportingStudentId === student.id ? (
                                            <span className="spinner" style={{ width: '18px', height: '18px', border: '2px solid rgba(var(--primary-rgb), 0.2)', borderTopColor: 'var(--primary)', borderRadius: '50%', animation: 'spin 0.6s linear infinite', display: 'inline-block' }} />
                                        ) : (
                                            <Download size={18} />
                                        )}
                                    </button>
                                    <button onClick={() => handleEditStudent(student)} className="icon-btn" title="Edit">
                                        <Pencil size={18} />
                                    </button>
                                    <button onClick={() => handleDeleteStudent(student.id)} className="icon-btn text-error" title="Delete">
                                        <Trash2 size={18} />
                                    </button>
                                </div>
                            </div>

                            {expandedCards.has(student.id) && (
                                <div className="flex flex-col gap-4 mt-2 pt-4 border-t border-divider animate-in fade-in duration-300">
                                    {/* Section 1: Placement Details */}
                                    {(student.joiningDate || student.package || student.client || student.employeeId) && (
                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '16px', padding: '16px', backgroundColor: 'var(--bg-surface)', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
                                            {student.joiningDate && (
                                                <div className="flex flex-col">
                                                    <span className="text-muted" style={{ fontSize: '0.75rem', marginBottom: '4px' }}>Joining Date</span>
                                                    <span className="font-medium text-sm">{new Date(student.joiningDate).toLocaleDateString()}</span>
                                                </div>
                                            )}
                                            {student.package && (
                                                <div className="flex flex-col">
                                                    <span className="text-muted" style={{ fontSize: '0.75rem', marginBottom: '4px' }}>Package (LPA)</span>
                                                    <span className="font-medium text-sm">₹{student.package?.toLocaleString()}</span>
                                                </div>
                                            )}
                                            {student.client && (
                                                <div className="flex flex-col">
                                                    <span className="text-muted" style={{ fontSize: '0.75rem', marginBottom: '4px' }}>Client</span>
                                                    <span className="font-medium text-sm">{student.client}</span>
                                                </div>
                                            )}
                                            {student.employeeId && (
                                                <div className="flex flex-col">
                                                    <span className="text-muted" style={{ fontSize: '0.75rem', marginBottom: '4px' }}>Emp ID</span>
                                                    <span className="font-medium text-sm">{student.employeeId}</span>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* Section 2: Previous Experience */}
                                    {(student.internshipStartDate || student.jobJoiningDate || student.previousCompanyName || student.mobileNo) && (
                                        <div>
                                            <p style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}>Previous Details</p>
                                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px', padding: '16px', backgroundColor: 'var(--bg-surface)', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
                                                {student.internshipStartDate && (
                                                    <div className="flex flex-col">
                                                        <span className="text-muted" style={{ fontSize: '0.75rem', marginBottom: '4px' }}>Internship</span>
                                                        <span className="font-medium text-sm">
                                                            {new Date(student.internshipStartDate).toLocaleDateString()}
                                                            {student.internshipEndDate ? ` - ${new Date(student.internshipEndDate).toLocaleDateString()}` : ''}
                                                        </span>
                                                    </div>
                                                )}
                                                {student.jobJoiningDate && (
                                                    <div className="flex flex-col">
                                                        <span className="text-muted" style={{ fontSize: '0.75rem', marginBottom: '4px' }}>Job Dates</span>
                                                        <span className="font-medium text-sm">
                                                            {new Date(student.jobJoiningDate).toLocaleDateString()}
                                                            {student.jobReleaseDate ? ` - ${new Date(student.jobReleaseDate).toLocaleDateString()}` : ''}
                                                        </span>
                                                    </div>
                                                )}
                                                {student.previousCompanyName && (
                                                    <div className="flex flex-col">
                                                        <span className="text-muted" style={{ fontSize: '0.75rem', marginBottom: '4px' }}>Prev. Company</span>
                                                        <span className="font-medium text-sm">{student.previousCompanyName}</span>
                                                    </div>
                                                )}
                                                {student.mobileNo && (
                                                    <div className="flex flex-col">
                                                        <span className="text-muted" style={{ fontSize: '0.75rem', marginBottom: '4px' }}>Mobile No</span>
                                                        <span className="font-medium text-sm">{student.mobileNo}</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    {/* Section 3: Financial Summary & Payments */}
                                    <div>
                                        <p style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}>Financial & Payments</p>
                                        
                                        {/* Totals Grid (Horizontal 4 columns) */}
                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', padding: '16px', backgroundColor: 'rgba(var(--primary-rgb), 0.05)', borderRadius: '8px', border: '1px solid rgba(var(--primary-rgb), 0.1)' }}>
                                            <div className="flex flex-col">
                                                <span className="text-muted" style={{ fontSize: '0.75rem', marginBottom: '4px' }}>Initial Total Payable</span>
                                                <span className="font-bold text-main" style={{ fontSize: '1.1rem' }}>₹{student.totalPayable?.toLocaleString() || '0'}</span>
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-muted" style={{ fontSize: '0.75rem', marginBottom: '4px' }}>Total Paid</span>
                                                <span className="font-bold text-success" style={{ fontSize: '1.1rem' }}>
                                                    ₹{(student.paymentDetails?.reduce((sum, p) => sum + (Number(p.amount) || 0), 0) || 0).toLocaleString()}
                                                </span>
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-muted" style={{ fontSize: '0.75rem', marginBottom: '4px' }}>Remaining Payable</span>
                                                <span className="font-bold" style={{ fontSize: '1.1rem', color: 'var(--error, #e53e3e)' }}>
                                                    ₹{((student.totalPayable || 0) - (student.paymentDetails?.reduce((sum, p) => sum + (Number(p.amount) || 0), 0) || 0)).toLocaleString()}
                                                </span>
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-muted" style={{ fontSize: '0.75rem', marginBottom: '4px' }}>Placement Charges</span>
                                                <span className="font-bold text-main" style={{ fontSize: '1.1rem' }}>₹{student.placementCharges?.toLocaleString() || '0'}</span>
                                            </div>
                                        </div>

                                        {/* Individual Payment Records */}
                                        {student.paymentDetails && student.paymentDetails.length > 0 && (
                                            <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                                {student.paymentDetails.map((payment, idx) => (
                                                    <div key={payment.id || idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', backgroundColor: 'var(--bg-surface)', borderRadius: '6px', border: '1px solid var(--border-subtle)' }}>
                                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                                            <span style={{ fontSize: '0.95rem', fontWeight: 600 }}>₹{Number(payment.amount).toLocaleString()}</span>
                                                            {payment.accountNo && <span className="text-muted" style={{ fontSize: '0.75rem' }}>Account No: {payment.accountNo}</span>}
                                                        </div>
                                                        <span className="text-muted font-medium" style={{ fontSize: '0.85rem' }}>
                                                            {payment.date ? new Date(payment.date).toLocaleDateString() : 'N/A'}
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Expand/Collapse Toggle Button & Export */}
                            <div className="flex justify-center items-center mt-2 pt-4 border-t border-divider gap-3">
                                <button 
                                    onClick={() => toggleCardExpand(student.id)}
                                    className={`btn ${expandedCards.has(student.id) ? 'btn-primary' : 'btn-secondary'} rounded-full text-sm py-1.5 px-5 flex items-center gap-1.5 transition-all shadow-none`}
                                >
                                    {expandedCards.has(student.id) ? 'Hide Details' : 'View Full Details'}
                                    {expandedCards.has(student.id) ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                </button>
                                {expandedCards.has(student.id) && (
                                    <button
                                        onClick={() => handleExportStudentCSV(student)}
                                        className="btn btn-secondary rounded-full text-sm py-1.5 px-5 flex items-center gap-1.5 transition-all shadow-none"
                                        disabled={exportingStudentId === student.id}
                                    >
                                        {exportingStudentId === student.id ? (
                                            <>
                                                <span className="spinner" style={{ width: '14px', height: '14px', border: '2px solid rgba(var(--primary-rgb), 0.2)', borderTopColor: 'var(--primary)', borderRadius: '50%', animation: 'spin 0.6s linear infinite', display: 'inline-block' }} />
                                                Exporting...
                                            </>
                                        ) : (
                                            <>
                                                <Download size={14} />
                                                📄 Export CSV
                                            </>
                                        )}
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>

                {totalPages > 1 && (
                    <div className="pagination-container" style={{ marginTop: '24px', borderRadius: '12px', border: '1px solid var(--border)' }}>
                        <div className="text-sm text-muted">
                            Showing <span className="text-main">{(currentPage - 1) * pageSize + 1}</span> to <span className="text-main">{Math.min(currentPage * pageSize, totalItems)}</span> of <span className="text-main">{totalItems}</span> results
                        </div>
                        <div className="pagination-controls">
                            <button 
                                className="pagination-btn"
                                disabled={currentPage === 1}
                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                            >
                                <ChevronLeft size={16} /> Prev
                            </button>
                            
                            <div className="flex items-center gap-1 mx-2">
                                {Array.from({ length: totalPages }, (_, i) => i + 1)
                                    .filter(p => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
                                    .map((p, i, arr) => (
                                        <React.Fragment key={p}>
                                            {i > 0 && arr[i-1] !== p - 1 && <span className="text-muted">...</span>}
                                            <button 
                                                className={`page-indicator ${currentPage === p ? 'active' : ''}`}
                                                onClick={() => setCurrentPage(p)}
                                                type="button"
                                            >
                                                {p}
                                            </button>
                                        </React.Fragment>
                                    ))
                                }
                            </div>

                            <button 
                                className="pagination-btn"
                                disabled={currentPage === totalPages}
                                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                            >
                                Next <ChevronRight size={16} />
                            </button>
                        </div>
                    </div>
                )}
                </>
            )}

            {/* Modal: Add/Edit Student */}
            <Modal
                isOpen={showStudentModal}
                onClose={() => setShowStudentModal(false)}
                title={editingStudentId ? "Edit Student Record" : "Add New Student"}
                maxWidth="900px"
            >
                <div className="tab-content">
                    <div className="tab-navigation">
                        <button 
                            type="button"
                            className={`tab-btn ${activeTab === 'basic' ? 'active' : ''}`}
                            onClick={() => setActiveTab('basic')}
                        >
                            <Pencil size={16} /> Basic Information
                        </button>
                        <button 
                            type="button"
                            className={`tab-btn ${activeTab === 'previous' ? 'active' : ''}`}
                            onClick={() => setActiveTab('previous')}
                        >
                            <Book size={16} /> Previous Company
                        </button>
                        <button 
                            type="button"
                            className={`tab-btn ${activeTab === 'payment' ? 'active' : ''}`}
                            onClick={() => setActiveTab('payment')}
                        >
                            <Clock size={16} /> Payment Details
                        </button>
                    </div>

                    <div className="animate-in">
                        <form onSubmit={handleSaveStudent} className="form-layout" style={{ maxHeight: '65vh', overflowY: 'auto', paddingRight: '12px', paddingBottom: '140px' }}>
                    
                        {activeTab === 'basic' && (
                            <div className="animate-in">
                                <h3 className="section-label mb-4">Student Details</h3>
                                <FormRow>
                                <FormField label="Full Name">
                                    <div className="custom-select-container" ref={dropdownRef}>
                                        <input 
                                            type="text" 
                                            required 
                                            value={studentForm.name || ''} 
                                            onChange={e => {
                                                setStudentForm({ ...studentForm, name: e.target.value });
                                                setShowDropdown(true);
                                            }} 
                                            onFocus={() => setShowDropdown(true)}
                                            placeholder="Type or select student..."
                                            autoComplete="off"
                                        />
                                        {showDropdown && (
                                            <div className="custom-select-dropdown" style={{ top: '100%', marginTop: '4px' }}>
                                                {filteredAndSortedStudents.length === 0 ? (
                                                    <div className="custom-select-option empty">No students found</div>
                                                ) : (
                                                    filteredAndSortedStudents.map((student) => (
                                                        <div
                                                            key={student.id}
                                                            className="custom-select-option"
                                                            onClick={() => handleSelectStudent(student)}
                                                            style={{ display: 'flex', flexDirection: 'column', gap: '2px', padding: '10px 16px' }}
                                                        >
                                                            <span style={{ fontWeight: 500 }}>{student.name}</span>
                                                            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                                                                {student.email} {student.batch ? `• ${student.batch}` : ''}
                                                            </span>
                                                        </div>
                                                    ))
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </FormField>
                                <FormField label="Parent Number">
                                    <input 
                                        type="tel" 
                                        required 
                                        maxLength={10}
                                        pattern="[0-9]{10}"
                                        title="Parent number must be exactly 10 digits"
                                        value={studentForm.emailId || ''} 
                                        onChange={e => {
                                            const val = e.target.value.replace(/\D/g, '');
                                            setStudentForm({ ...studentForm, emailId: val });
                                        }} 
                                    />
                                </FormField>
                            </FormRow>
                            <FormRow>
                                <FormField label="Current Company's Name">
                                    <input type="text" required value={studentForm.companyName || ''} onChange={e => setStudentForm({ ...studentForm, companyName: e.target.value })} />
                                </FormField>
                                <FormField label="Designation">
                                    <input type="text" value={studentForm.designation || ''} onChange={e => setStudentForm({ ...studentForm, designation: e.target.value })} />
                                </FormField>
                            </FormRow>
                            <FormRow>
                                <FormField label="Joining Date">
                                    <CustomDatePicker value={studentForm.joiningDate || ''} onChange={e => setStudentForm({ ...studentForm, joiningDate: e.target.value })} />
                                </FormField>
                                <FormField label="Package (LPA/Amount)">
                                    <input type="number" min="0" step="0.01" value={studentForm.package || ''} onChange={e => setStudentForm({ ...studentForm, package: Number(e.target.value) })} />
                                </FormField>
                            </FormRow>
                            <FormRow>
                                <FormField label="Total Payable (₹)">
                                    <input type="number" min="0" value={studentForm.totalPayable || ''} onChange={e => setStudentForm({ ...studentForm, totalPayable: Number(e.target.value) })} />
                                </FormField>
                                <FormField label="Placement Charges (₹)">
                                    <input type="number" min="0" value={studentForm.placementCharges || ''} onChange={e => setStudentForm({ ...studentForm, placementCharges: Number(e.target.value) })} />
                                </FormField>
                            </FormRow>
                        </div>
                    )}

                        {activeTab === 'previous' && (
                            <div className="animate-in">
                                <h3 className="section-label mb-4">Previous Company Details</h3>
                                <FormRow>
                                <FormField label="Internship Start Date">
                                    <CustomDatePicker value={studentForm.internshipStartDate || ''} onChange={e => setStudentForm({ ...studentForm, internshipStartDate: e.target.value })} />
                                </FormField>
                                <FormField label="Internship End Date">
                                    <CustomDatePicker min={studentForm.internshipStartDate || ''} value={studentForm.internshipEndDate || ''} onChange={e => setStudentForm({ ...studentForm, internshipEndDate: e.target.value })} />
                                </FormField>
                            </FormRow>
                            <FormRow>
                                <FormField label="Job Joining Date">
                                    <CustomDatePicker value={studentForm.jobJoiningDate || ''} onChange={e => setStudentForm({ ...studentForm, jobJoiningDate: e.target.value })} />
                                </FormField>
                                <FormField label="Job Release Date">
                                    <CustomDatePicker min={studentForm.jobJoiningDate || ''} value={studentForm.jobReleaseDate || ''} onChange={e => setStudentForm({ ...studentForm, jobReleaseDate: e.target.value })} />
                                </FormField>
                            </FormRow>
                            <FormRow>
                                <FormField label="Employee ID">
                                    <input type="text" value={studentForm.employeeId || ''} onChange={e => setStudentForm({ ...studentForm, employeeId: e.target.value })} />
                                </FormField>
                                <FormField label="Client">
                                    <input type="text" value={studentForm.client || ''} onChange={e => setStudentForm({ ...studentForm, client: e.target.value })} />
                                </FormField>
                            </FormRow>
                            <FormRow>
                                <FormField label="Previous Company Name">
                                    <input type="text" value={studentForm.previousCompanyName || ''} onChange={e => setStudentForm({ ...studentForm, previousCompanyName: e.target.value })} />
                                </FormField>
                                <FormField label="Mobile No">
                                    <input type="tel" pattern="[0-9]{10}" maxLength={10} minLength={10} title="Mobile number must be exactly 10 digits" value={studentForm.mobileNo || ''} onChange={e => setStudentForm({ ...studentForm, mobileNo: e.target.value })} />
                                </FormField>
                            </FormRow>
                        </div>
                    )}

                        {activeTab === 'payment' && (
                            <div className="animate-in">
                                <h3 className="section-label mb-4">Payment Records</h3>
                                
                                {/* Payment Summary Box */}
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', padding: '16px', backgroundColor: 'rgba(var(--primary-rgb), 0.05)', borderRadius: '8px', border: '1px solid rgba(var(--primary-rgb), 0.1)', marginBottom: '16px' }}>
                                    <div className="flex flex-col">
                                        <span className="text-muted" style={{ fontSize: '0.75rem', marginBottom: '4px' }}>Initial Total Payable</span>
                                        <span className="font-bold text-main" style={{ fontSize: '1.2rem' }}>₹{studentForm.totalPayable?.toLocaleString() || '0'}</span>
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-muted" style={{ fontSize: '0.75rem', marginBottom: '4px' }}>Total Paid</span>
                                        <span className="font-bold text-success" style={{ fontSize: '1.2rem' }}>
                                            ₹{(studentForm.paymentDetails?.reduce((sum, p) => sum + (Number(p.amount) || 0), 0) || 0).toLocaleString()}
                                        </span>
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-muted" style={{ fontSize: '0.75rem', marginBottom: '4px' }}>Remaining Payable</span>
                                        <span className="font-bold" style={{ fontSize: '1.2rem', color: 'var(--error, #e53e3e)' }}>
                                            ₹{((studentForm.totalPayable || 0) - (studentForm.paymentDetails?.reduce((sum, p) => sum + (Number(p.amount) || 0), 0) || 0)).toLocaleString()}
                                        </span>
                                    </div>
                                </div>

                                <div className="flex justify-end mb-sm">
                                <button type="button" onClick={handleAddPayment} className="btn btn-secondary text-sm py-xs px-sm flex items-center gap-1">
                                    <Plus size={14} /> Add Payment
                                </button>
                            </div>

                            {(!studentForm.paymentDetails || studentForm.paymentDetails.length === 0) ? (
                                <div className="text-center text-muted py-md border border-dashed border-divider rounded mb-md">
                                    No payment records added yet.
                                </div>
                            ) : (
                                <div className="flex flex-col gap-sm mb-md">
                                    {studentForm.paymentDetails.map((payment, index) => (
                                        <div key={payment.id} className="bg-surface p-sm rounded border border-divider relative">
                                            <div className="absolute top-2 right-2">
                                                <button type="button" onClick={() => handleRemovePayment(payment.id)} className="icon-btn text-error" title="Remove Payment">
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                            <div className="font-medium text-sm text-muted mb-xs">Payment #{index + 1}</div>
                                            <FormRow>
                                                <FormField label="Date">
                                                    <CustomDatePicker required value={payment.date} onChange={e => handlePaymentChange(payment.id, 'date', e.target.value)} />
                                                </FormField>
                                                <FormField label="Amount (₹)">
                                                    <input type="number" min="1" required value={payment.amount || ''} onChange={e => handlePaymentChange(payment.id, 'amount', Number(e.target.value))} />
                                                </FormField>
                                                <FormField label="Account No.">
                                                    <input type="text" value={payment.accountNo} onChange={e => handlePaymentChange(payment.id, 'accountNo', e.target.value)} />
                                                </FormField>
                                            </FormRow>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                        <div className="mt-md pt-md border-t border-divider flex justify-between items-center">
                            <button type="button" className="btn btn-secondary" onClick={() => setShowStudentModal(false)}>Cancel</button>
                            <div className="flex gap-2">
                                {activeTab === 'basic' && <button type="button" className="btn btn-secondary" onClick={() => setActiveTab('previous')}>Next</button>}
                                {activeTab === 'previous' && <button type="button" className="btn btn-secondary" onClick={() => setActiveTab('payment')}>Next</button>}
                                <button type="submit" className="btn btn-primary" disabled={saving}>
                                    {saving ? "Saving..." : "Save Record"}
                                </button>
                            </div>
                        </div>
                    </form>
                </div>
            </div>
        </Modal>

            {/* Modal: Delete Confirmation */}
            <Modal
                isOpen={showDeleteModal}
                onClose={() => setShowDeleteModal(false)}
                title="Confirm Deletion"
            >
                <div className="py-md text-center">
                    <p className="mb-lg">Are you sure you want to delete this student record? This action cannot be undone.</p>
                    <div className="flex justify-center gap-md">
                        <button className="btn btn-secondary" disabled={saving} onClick={() => setShowDeleteModal(false)}>Cancel</button>
                        <button className="btn btn-primary" style={{ backgroundColor: 'var(--error)' }} disabled={saving} onClick={handleConfirmDelete}>
                            {saving ? "Deleting..." : "Delete Record"}
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}
