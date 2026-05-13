import React, { useEffect, useState } from 'react';
import { X, AlertCircle, CheckCircle, AlertTriangle } from 'lucide-react';

interface ToastProps {
    message: string;
    type?: 'error' | 'success' | 'warning';
    duration?: number;
    onClose: () => void;
}

const Toast: React.FC<ToastProps> = ({ message, type = 'error', duration = 3000, onClose }) => {
    const [isVisible, setIsVisible] = useState(true);

    useEffect(() => {
        const timer = setTimeout(() => {
            setIsVisible(false);
            setTimeout(onClose, 300); // Wait for fade-out animation
        }, duration);

        return () => clearTimeout(timer);
    }, [duration, onClose]);

    const bgColor = type === 'error' ? '#FEF2F2' : type === 'warning' ? '#FFFBEB' : '#F0FDF4';
    const borderColor = type === 'error' ? '#FEE2E2' : type === 'warning' ? '#FEF3C7' : '#DCFCE7';
    const textColor = type === 'error' ? '#991B1B' : type === 'warning' ? '#92400E' : '#166534';
    const Icon = type === 'error' ? AlertCircle : type === 'warning' ? AlertTriangle : CheckCircle;

    return (
        <div style={{
            position: 'fixed',
            top: '24px',
            right: '24px',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '12px 20px',
            backgroundColor: bgColor,
            border: `1px solid ${borderColor}`,
            borderRadius: '12px',
            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
            transform: `translateX(${isVisible ? '0' : '120%'})`,
            opacity: isVisible ? 1 : 0,
            transition: 'all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
            minWidth: '320px'
        }}>
            <Icon size={20} style={{ color: textColor }} />
            <span style={{ 
                color: textColor, 
                fontSize: '0.9rem', 
                fontWeight: 500,
                flex: 1
            }}>
                {message}
            </span>
            <button 
                onClick={() => {
                    setIsVisible(false);
                    setTimeout(onClose, 300);
                }}
                style={{
                    background: 'none',
                    border: 'none',
                    padding: '4px',
                    cursor: 'pointer',
                    color: textColor,
                    opacity: 0.6,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                }}
                onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
                onMouseLeave={(e) => e.currentTarget.style.opacity = '0.6'}
            >
                <X size={16} />
            </button>
        </div>
    );
};

export default Toast;
