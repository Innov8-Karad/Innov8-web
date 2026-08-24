import { useState } from 'react';
import { CheckCircle, ExternalLink, FileText, Image as ImageIcon, X, Undo } from 'lucide-react';
import { courseService } from '../services/courseService';
import { batchService } from '../services/batchService';
import type { AssignmentSubmission } from '../types';
import { useToast } from '../hooks/useToast';
import { getGoogleDocsViewerUrl } from '../lib/videoUtils';
import Modal from './Modal';

interface GradingPanelProps {
    courseId: string;
    targetType?: 'course' | 'batch';
    assignmentId: string;
    submission: AssignmentSubmission & { fullName?: string };
    onClose: () => void;
    isInline?: boolean;
}

export default function GradingPanel({ courseId, targetType = 'course', assignmentId, submission, onClose, isInline = false }: GradingPanelProps) {
    const [loading, setLoading] = useState(false);
    const { showToast } = useToast();

    const handleViewFile = () => {
        if (!submission.fileUrl) return;
        
        // For images, we can still use the direct URL as they don't trigger the PDF viewer frame error
        if (submission.fileType === 'image') {
            window.open(submission.fileUrl, '_blank', 'noopener,noreferrer');
            return;
        }

        // For PDFs, we use the Google Docs Viewer as a proxy to bypass the "Origins must match" block
        const proxyUrl = getGoogleDocsViewerUrl(submission.fileUrl);
        window.open(proxyUrl, '_blank', 'noopener,noreferrer');
    };

    const handleDownloadFile = () => {
        if (!submission.fileUrl) return;
        
        // Force Cloudinary to serve with an attachment header for 100% reliable access
        const downloadUrl = submission.fileUrl.replace('/upload/', '/upload/fl_attachment/');
        window.location.assign(downloadUrl);
    };

    const handleStatusUpdate = async (status: 'graded' | 'returned') => {
        setLoading(true);
        const service = targetType === 'course' ? courseService : batchService;
        try {
            await service.updateSubmissionGrade(courseId, assignmentId, submission.id, {
                status,
                gradedBy: 'Admin' // Should ideally come from auth context
            });
            showToast(status === 'graded' ? "Submission approved successfully" : "Submission returned to student", "success");
            onClose();
        } catch (error) {
            console.error("Error updating status:", error);
            showToast("Failed to update status", "error");
        }
        setLoading(false);
    };

    const panelContent = (
        <div className="flex flex-col gap-6 py-2">
            <div style={{ 
                padding: '16px',
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'rgba(255, 255, 255, 0.02)', 
                border: '1px solid rgba(255, 255, 255, 0.05)',
                display: 'flex',
                flexDirection: 'column',
                gap: '16px'
            }}>
                <h4 style={{ margin: 0, letterSpacing: '0.5px', textTransform: 'uppercase', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                    Submitted File
                </h4>
                
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    width: '100%',
                    overflow: 'hidden'
                }}>
                    <div style={{
                        width: '44px',
                        height: '44px',
                        borderRadius: 'var(--radius-sm)',
                        backgroundColor: submission.fileType === 'pdf' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(233, 80, 9, 0.1)',
                        border: submission.fileType === 'pdf' ? '1px solid rgba(239, 68, 68, 0.2)' : '1px solid rgba(233, 80, 9, 0.2)',
                        color: submission.fileType === 'pdf' ? 'var(--error)' : 'var(--primary)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                    }}>
                        {submission.fileType === 'pdf' ? <FileText size={22} /> : <ImageIcon size={22} />}
                    </div>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', flex: 1 }}>
                        <span style={{ 
                            fontWeight: 600, 
                            color: 'var(--text-main)', 
                            fontSize: '0.95rem',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            width: '100%'
                        }} title={submission.fileName}>
                            {submission.fileName}
                        </span>
                        <span style={{ 
                            fontSize: '0.75rem', 
                            color: 'var(--text-secondary)', 
                            textTransform: 'uppercase',
                            marginTop: '2px',
                            fontWeight: 500,
                        }}>
                            {submission.fileType} Document
                        </span>
                    </div>
                </div>

                {/* View / Download Action Row */}
                <div style={{ display: 'flex', gap: '8px', width: '100%' }}>
                    <button 
                        type="button"
                        onClick={handleViewFile}
                        className="btn btn-secondary"
                        style={{ 
                            flex: 1, 
                            height: '38px', 
                            fontSize: '0.85rem', 
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'center',
                            gap: '6px',
                            padding: '0'
                        }}
                    >
                        <ExternalLink size={16} />
                        View
                    </button>
                    
                    <button 
                        type="button"
                        onClick={handleDownloadFile}
                        className="btn btn-secondary"
                        style={{ 
                            flex: 1, 
                            height: '38px', 
                            fontSize: '0.85rem', 
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'center',
                            gap: '6px',
                            color: 'var(--primary)',
                            borderColor: 'rgba(var(--primary-rgb), 0.3)',
                            padding: '0'
                        }}
                    >
                        <FileText size={16} />
                        Download
                    </button>
                </div>

                {submission.fileType === 'image' && (
                    <div style={{ 
                        marginTop: '4px', 
                        borderRadius: 'var(--radius-md)', 
                        overflow: 'hidden', 
                        border: '1px solid rgba(255,255,255,0.05)',
                        backgroundColor: 'rgba(0,0,0,0.1)'
                    }}>
                        <img 
                            src={submission.fileUrl} 
                            alt={submission.fileName} 
                            style={{
                                width: '100%',
                                height: 'auto',
                                maxHeight: '200px',
                                objectFit: 'contain',
                            }}
                        />
                    </div>
                )}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <button 
                    type="button" 
                    className="btn btn-primary" 
                    disabled={loading} 
                    onClick={() => handleStatusUpdate('graded')}
                    style={{ 
                        background: 'linear-gradient(135deg, var(--success) 0%, #059669 100%)', 
                        border: 'none',
                        color: '#fff',
                        width: '100%',
                        height: '42px',
                        boxShadow: '0 4px 12px rgba(16, 185, 129, 0.2)',
                    }}
                >
                    {loading ? "Processing..." : <span className="flex items-center justify-center gap-1.5"><CheckCircle size={18} /> Approve Submission</span>}
                </button>
                
                <button 
                    type="button" 
                    className="btn btn-secondary" 
                    disabled={loading} 
                    onClick={() => handleStatusUpdate('returned')}
                    style={{ 
                        borderColor: 'rgba(59, 130, 246, 0.3)',
                        color: '#3b82f6',
                        width: '100%',
                        height: '42px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                    }}
                >
                    <Undo size={16} /> Return to Student
                </button>
                
                <button 
                    type="button" 
                    className="btn btn-secondary" 
                    onClick={onClose} 
                    disabled={loading}
                    style={{ 
                        width: '100%',
                        height: '42px',
                        backgroundColor: 'transparent',
                        borderColor: 'var(--border-subtle)',
                        color: 'var(--text-secondary)',
                    }}
                >
                    Cancel
                </button>
            </div>
        </div>
    );

    if (isInline) {
        return (
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: '24px', overflowY: 'auto' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '12px' }}>
                    <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-main)' }}>Grading: {submission.fullName || submission.userName}</h3>
                    <button onClick={onClose} style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '6px', borderRadius: '50%' }} onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.05)'} onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}>
                        <X size={20} />
                    </button>
                </div>
                {panelContent}
            </div>
        );
    }

    return (
        <Modal isOpen={true} onClose={onClose} title={`Grading: ${submission.fullName || submission.userName}`} maxWidth="600px">
            {panelContent}
        </Modal>
    );
}
