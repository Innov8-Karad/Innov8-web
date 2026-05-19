import { useState } from 'react';
import { CheckCircle, ExternalLink, FileText, Image as ImageIcon } from 'lucide-react';
import { courseService } from '../services/courseService';
import { batchService } from '../services/batchService';
import type { AssignmentSubmission } from '../types';
import { useToast } from '../hooks/useToast';
import Modal from './Modal';
import { FormField, FormActions } from './FormField';

interface GradingPanelProps {
    courseId: string;
    targetType?: 'course' | 'batch';
    assignmentId: string;
    submission: AssignmentSubmission;
    onClose: () => void;
}

export default function GradingPanel({ courseId, targetType = 'course', assignmentId, submission, onClose }: GradingPanelProps) {
    const [grade, setGrade] = useState<number>(submission.grade || 0);
    const [feedback, setFeedback] = useState<string>(submission.feedback || '');
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
        const proxyUrl = `https://docs.google.com/viewer?url=${encodeURIComponent(submission.fileUrl)}&embedded=true`;
        window.open(proxyUrl, '_blank', 'noopener,noreferrer');
    };

    const handleDownloadFile = () => {
        if (!submission.fileUrl) return;
        
        // Force Cloudinary to serve with an attachment header for 100% reliable access
        const downloadUrl = submission.fileUrl.replace('/upload/', '/upload/fl_attachment/');
        window.location.assign(downloadUrl);
    };

    const handleSaveGrade = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        const service = targetType === 'course' ? courseService : batchService;
        try {
            await service.updateSubmissionGrade(courseId, assignmentId, submission.id, {
                grade,
                feedback,
                gradedBy: 'Admin' // Should ideally come from auth context
            });
            showToast("Submission graded successfully", "success");
            onClose();
        } catch (error) {
            console.error("Error grading submission:", error);
            showToast("Failed to save grade", "error");
        }
        setLoading(false);
    };

    return (
        <Modal isOpen={true} onClose={onClose} title={`Grading: ${submission.userName}`} maxWidth="600px">
            <div className="flex flex-col gap-6 py-2">
                <div className="p-4 rounded-lg bg-secondary/30 border border-divider">
                    <h4 className="text-sm font-semibold mb-2">Submitted File</h4>
                    <div className="flex items-center justify-between p-3 bg-card rounded-md border">
                        <div className="flex items-center gap-3">
                            <div className="flex items-center justify-center w-10 h-10 rounded-md bg-primary/10 text-primary">
                                {submission.fileType === 'pdf' ? <FileText size={20} /> : <ImageIcon size={20} />}
                            </div>
                            <div className="flex flex-col overflow-hidden">
                                <span className="font-medium truncate max-w-[300px]">{submission.fileName}</span>
                                <span className="text-xs text-muted uppercase">{submission.fileType}</span>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <button 
                                type="button"
                                onClick={handleViewFile}
                                className="btn btn-secondary btn-sm h-8"
                                title="Preview File"
                            >
                                <ExternalLink size={14} className="mr-1" />
                                View
                            </button>
                            <button 
                                type="button"
                                onClick={handleDownloadFile}
                                className="btn btn-secondary btn-sm h-8 text-primary"
                                title="Download File"
                                style={{ borderColor: 'var(--primary-light)' }}
                            >
                                <FileText size={14} className="mr-1" />
                                Download
                            </button>
                        </div>
                    </div>
                    {submission.fileType === 'image' && (
                        <div className="mt-3 rounded-lg overflow-hidden border">
                            <img 
                                src={submission.fileUrl} 
                                alt={submission.fileName} 
                                className="w-full h-auto max-h-[300px] object-contain bg-black/5"
                            />
                        </div>
                    )}
                </div>

                <form onSubmit={handleSaveGrade} className="flex flex-col gap-4">
                    <FormField label="Grade (0-100)">
                        <input 
                            type="number" 
                            min="0" 
                            max="100" 
                            required 
                            value={grade} 
                            onChange={(e) => setGrade(Number(e.target.value))}
                            placeholder="Enter percentage..."
                        />
                    </FormField>
                    <FormField label="Feedback">
                        <textarea 
                            rows={4} 
                            value={feedback} 
                            onChange={(e) => setFeedback(e.target.value)}
                            placeholder="Add comments for the student..."
                            className="login-input h-auto py-3"
                        />
                    </FormField>
                    <FormActions>
                        <button type="button" className="btn btn-secondary" onClick={onClose} disabled={loading}>Cancel</button>
                        <button type="submit" className="btn btn-primary" disabled={loading}>
                            {loading ? "Saving..." : <><CheckCircle size={18} className="mr-2" /> Save Grade</>}
                        </button>
                    </FormActions>
                </form>
            </div>
        </Modal>
    );
}
