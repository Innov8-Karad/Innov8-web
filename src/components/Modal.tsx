import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    maxWidth?: string;
    children: React.ReactNode;
}

export default function Modal({ isOpen, onClose, title, maxWidth = '500px', children }: ModalProps) {
    if (!isOpen) return null;

    return createPortal(
        <div className="modal-overlay">
            <div className="card modal-content animate-fade-slide-up" style={{ maxWidth }}>
                <button onClick={onClose} className="modal-close">
                    <X size={20} />
                </button>
                <h2 className="mb-lg text-2xl font-bold">{title}</h2>
                {children}
            </div>
        </div>,
        document.body
    );
}
