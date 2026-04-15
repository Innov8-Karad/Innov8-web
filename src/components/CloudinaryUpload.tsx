import { useState, useRef, useCallback, useEffect } from 'react';
import { Upload, X, FileText, CheckCircle, AlertCircle, Image } from 'lucide-react';
import { uploadWithFallback } from '../lib/cloudinary';
import type { CloudinaryUploadResult } from '../lib/cloudinary';

// ── Props Interface ───────────────────────────────────────────────────────────

interface CloudinaryUploadProps {
  /** Cloudinary upload preset name */
  preset?: string;
  /** Target folder path in Cloudinary */
  folder?: string;
  /** Allowed MIME types (e.g. ['image/png', 'image/jpeg', 'application/pdf']) */
  acceptedTypes?: string[];
  /** Max file size in MB (default: 2) */
  maxSizeMB?: number;
  /** Callback with uploaded URL and publicId */
  onUploadComplete: (result: CloudinaryUploadResult) => void;
  /** Optional error callback */
  onError?: (error: string) => void;
  /** Display label */
  label?: string;
  /** Show image preview or document icon on success */
  previewMode?: 'image' | 'document' | 'none';
  /** Existing file URL (for edit mode) */
  existingUrl?: string;
  /** Custom className */
  className?: string;
}

// ── State Types ───────────────────────────────────────────────────────────────

type UploadState = 'idle' | 'uploading' | 'success' | 'error';

// ── Component ─────────────────────────────────────────────────────────────────

export default function CloudinaryUpload({
  preset,
  folder = 'innov8/uploads',
  acceptedTypes = ['image/png', 'image/jpeg', 'image/webp'],
  maxSizeMB = 2,
  onUploadComplete,
  onError,
  label = 'Upload File',
  previewMode = 'image',
  existingUrl,
  className = '',
}: CloudinaryUploadProps) {
  const [uploadState, setUploadState] = useState<UploadState>(existingUrl ? 'success' : 'idle');
  const [progress, setProgress] = useState(0);
  const [errorMessage, setErrorMessage] = useState('');
  const [previewUrl, setPreviewUrl] = useState<string | null>(existingUrl || null);
  const [fileName, setFileName] = useState<string>('');
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [prevExistingUrl, setPrevExistingUrl] = useState(existingUrl);

  // Sync state with props during render (replaces the cascading useEffect)
  if (existingUrl !== prevExistingUrl) {
    setPrevExistingUrl(existingUrl);
    setPreviewUrl(existingUrl || null);
    setUploadState(existingUrl ? 'success' : 'idle');
  }

  // Cleanup blob URLs
  useEffect(() => {
    return () => {
      if (previewUrl && previewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  // ── Validation ────────────────────────────────────────────────────────────

  const validateFile = useCallback(
    (file: File): string | null => {
      if (!acceptedTypes.includes(file.type)) {
        const allowed = acceptedTypes.map((t) => t.split('/')[1].toUpperCase()).join(', ');
        return `Invalid file type. Accepted: ${allowed}`;
      }
      if (file.size > maxSizeMB * 1024 * 1024) {
        return `File exceeds ${maxSizeMB}MB limit (${(file.size / 1024 / 1024).toFixed(1)}MB)`;
      }
      return null;
    },
    [acceptedTypes, maxSizeMB]
  );

  // ── Upload Handler ────────────────────────────────────────────────────────

  const handleUpload = useCallback(
    async (file: File) => {
      const validationError = validateFile(file);
      if (validationError) {
        setErrorMessage(validationError);
        setUploadState('error');
        onError?.(validationError);
        return;
      }

      // Set local preview immediately
      setFileName(file.name);
      if (file.type.startsWith('image/')) {
        setPreviewUrl(URL.createObjectURL(file));
      }

      setUploadState('uploading');
      setProgress(0);
      setErrorMessage('');

      try {
        const result = await uploadWithFallback(file, {
          preset,
          folder,
          onProgress: setProgress,
        });

        // Update preview to the Cloudinary URL
        if (file.type.startsWith('image/')) {
          setPreviewUrl(result.url);
        }

        setUploadState('success');
        setProgress(100);
        onUploadComplete(result);
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Upload failed. Please try again.';
        setErrorMessage(msg);
        setUploadState('error');
        onError?.(msg);
      }
    },
    [preset, folder, validateFile, onUploadComplete, onError]
  );

  // ── Event Handlers ────────────────────────────────────────────────────────

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleUpload(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleUpload(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleReset = () => {
    setUploadState('idle');
    setProgress(0);
    setErrorMessage('');
    setPreviewUrl(null);
    setFileName('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleZoneClick = () => {
    if (uploadState !== 'uploading') {
      fileInputRef.current?.click();
    }
  };

  // ── Render Helpers ────────────────────────────────────────────────────────

  const acceptString = acceptedTypes.join(',');
  const maxSizeLabel = maxSizeMB >= 1 ? `${maxSizeMB}MB` : `${maxSizeMB * 1024}KB`;
  const typeLabels = acceptedTypes.map((t) => t.split('/')[1].toUpperCase()).join(', ');

  // ── JSX ───────────────────────────────────────────────────────────────────

  return (
    <div className={`upload-wrapper ${className}`}>
      <label className="form-field-label">{label}</label>

      <div
        className={`upload-zone ${isDragOver ? 'upload-zone--active' : ''} ${uploadState === 'error' ? 'upload-zone--error' : ''} ${uploadState === 'success' ? 'upload-zone--success' : ''}`}
        onClick={handleZoneClick}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleZoneClick(); }}
        id={`upload-zone-${folder.replace(/\//g, '-')}`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={acceptString}
          onChange={handleFileSelect}
          className="upload-hidden-input"
        />

        {/* ── IDLE State ── */}
        {uploadState === 'idle' && (
          <div className="upload-idle-content">
            <div className="upload-icon-circle">
              <Upload size={24} />
            </div>
            <p className="upload-main-text">
              Drag & drop or <span className="upload-browse-link">browse</span>
            </p>
            <p className="upload-hint-text">
              {typeLabels} • Max {maxSizeLabel}
            </p>
          </div>
        )}

        {/* ── UPLOADING State ── */}
        {uploadState === 'uploading' && (
          <div className="upload-progress-content">
            <div className="upload-progress-bar-container">
              <div
                className="upload-progress-bar-fill"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="upload-progress-text">
              Uploading... {progress}%
            </p>
          </div>
        )}

        {/* ── SUCCESS State ── */}
        {uploadState === 'success' && (
          <div className="upload-success-content">
            {previewMode === 'image' && previewUrl ? (
              <div className="upload-preview-image-container">
                <img src={previewUrl} alt="Uploaded preview" className="upload-preview-image" />
                <div className="upload-success-badge">
                  <CheckCircle size={14} />
                </div>
              </div>
            ) : previewMode === 'document' ? (
              <div className="upload-doc-preview">
                <FileText size={32} />
                <span className="upload-doc-name">{fileName || 'Document uploaded'}</span>
                <div className="upload-success-badge">
                  <CheckCircle size={14} />
                </div>
              </div>
            ) : null}
            <button
              type="button"
              className="upload-change-btn"
              onClick={(e) => {
                e.stopPropagation();
                handleReset();
              }}
            >
              <X size={14} />
              Change
            </button>
          </div>
        )}

        {/* ── ERROR State ── */}
        {uploadState === 'error' && (
          <div className="upload-error-content">
            <div className="upload-error-icon-circle">
              <AlertCircle size={24} />
            </div>
            <p className="upload-error-message">{errorMessage}</p>
            <button
              type="button"
              className="upload-retry-btn"
              onClick={(e) => {
                e.stopPropagation();
                handleReset();
              }}
            >
              <Image size={14} />
              Try Again
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
