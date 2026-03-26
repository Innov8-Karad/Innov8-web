interface EmptyStateProps {
    message: string;
    colSpan?: number;
    isTableRow?: boolean;
}

export default function EmptyState({ message, colSpan, isTableRow }: EmptyStateProps) {
    if (isTableRow) {
        return (
            <tr>
                <td colSpan={colSpan} className="table-empty">
                    {message}
                </td>
            </tr>
        );
    }

    return (
        <div className="card empty-state">
            <p>{message}</p>
        </div>
    );
}
