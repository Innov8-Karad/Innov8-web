import { Plus } from 'lucide-react';

interface PageHeaderProps {
    title: string;
    subtitle: string;
    actionLabel?: string;
    onAction?: () => void;
    children?: React.ReactNode;
}

export default function PageHeader({ title, subtitle, actionLabel, onAction, children }: PageHeaderProps) {
    return (
        <div className="flex justify-between items-center" style={{ marginBottom: 'var(--space-lg)' }}>
            <div>
                <h1>{title}</h1>
                <p>{subtitle}</p>
            </div>
            <div className="flex items-center gap-lg">
                {children}
                {actionLabel && onAction && (
                    <button className="btn btn-primary" onClick={onAction}>
                        <Plus size={18} style={{ marginRight: '8px' }} />
                        {actionLabel}
                    </button>
                )}
            </div>
        </div>
    );
}
