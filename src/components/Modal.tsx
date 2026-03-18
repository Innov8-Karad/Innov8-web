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

    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(4px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999,
            padding: 'var(--space-md)'
        }}>
            <div className="card" style={{ width: '100%', maxWidth, position: 'relative', maxHeight: '90vh', overflowY: 'auto' }}>
                <button
                    onClick={onClose}
                    style={{ position: 'absolute', top: '16px', right: '16px', border: 'none', background: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
                >
                    <X size={20} />
                </button>
                <h2>{title}</h2>
                {children}
            </div>
        </div>
    );
}
