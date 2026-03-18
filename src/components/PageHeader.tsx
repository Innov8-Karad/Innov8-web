import { Plus } from 'lucide-react';

interface PageHeaderProps {
    title: string;
    subtitle: string;
    actionLabel?: string;
    onAction?: () => void;
}

export default function PageHeader({ title, subtitle, actionLabel, onAction }: PageHeaderProps) {
    return (
        <div className="flex justify-between items-center" style={{ marginBottom: 'var(--space-lg)' }}>
            <div>
                <h1>{title}</h1>
                <p>{subtitle}</p>
            </div>
            {actionLabel && onAction && (
                <button className="btn btn-primary" onClick={onAction}>
                    <Plus size={18} style={{ marginRight: '8px' }} />
                    {actionLabel}
                </button>
            )}
        </div>
    );
}
