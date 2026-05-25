interface EmptyStateProps {
    message?: string;
    title?: string;
    description?: string;
    actionLabel?: string;
    onAction?: () => void;
    colSpan?: number;
    isTableRow?: boolean;
}

export default function EmptyState({ message, title, description, actionLabel, onAction, colSpan, isTableRow }: EmptyStateProps) {
    if (isTableRow) {
        return (
            <tr>
                <td colSpan={colSpan} className="table-empty">
                    {message || title || description}
                </td>
            </tr>
        );
    }

    return (
        <div className="card empty-state" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 20px', textAlign: 'center', gap: '16px' }}>
            {title && <h3 style={{ fontSize: '18px', fontWeight: 'bold', margin: 0, color: 'var(--text-primary)' }}>{title}</h3>}
            {(description || message) && <p style={{ margin: 0, color: 'var(--text-secondary)', maxWidth: '400px', lineHeight: '1.5' }}>{description || message}</p>}
            {actionLabel && onAction && (
                <button className="btn btn-primary" onClick={onAction} style={{ marginTop: '8px' }}>
                    {actionLabel}
                </button>
            )}
        </div>
    );
}
