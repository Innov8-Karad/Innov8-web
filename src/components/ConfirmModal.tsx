
import { AlertCircle, Trash2 } from 'lucide-react';
import Modal from './Modal';

interface ConfirmModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    type?: 'danger' | 'warning';
}

export default function ConfirmModal({
    isOpen,
    onClose,
    onConfirm,
    title,
    message,
    confirmText = 'Delete',
    cancelText = 'Cancel',
    type = 'danger'
}: ConfirmModalProps) {
    return (
        <Modal isOpen={isOpen} onClose={onClose} title={title} maxWidth="400px">
            <div className="p-2">
                <div className="flex items-start gap-4 mb-6">
                    <div className={`p-3 rounded-full flex-shrink-0 ${
                        type === 'danger' ? 'bg-error/10 text-error' : 'bg-warning/10 text-warning'
                    }`}>
                        {type === 'danger' ? <Trash2 size={24} /> : <AlertCircle size={24} />}
                    </div>
                    <div>
                        <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                            {message}
                        </p>
                    </div>
                </div>

                <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-white/5">
                    <button 
                        type="button" 
                        className="btn btn-secondary" 
                        onClick={onClose}
                        style={{ padding: '8px 16px' }}
                    >
                        {cancelText}
                    </button>
                    <button 
                        type="button" 
                        className={`btn ${type === 'danger' ? 'btn-danger' : 'btn-primary'}`} 
                        onClick={() => {
                            onConfirm();
                            onClose();
                        }}
                        style={{ 
                            padding: '8px 16px',
                            backgroundColor: type === 'danger' ? 'var(--error)' : undefined,
                            color: type === 'danger' ? 'white' : undefined,
                            border: 'none'
                        }}
                    >
                        {confirmText}
                    </button>
                </div>
            </div>
        </Modal>
    );
}
