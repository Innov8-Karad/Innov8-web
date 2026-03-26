import type { ReactNode } from 'react';

export interface Column<T> {
    key: string;
    header: string;
    width?: string;
    align?: 'left' | 'center' | 'right';
    render: (item: T) => ReactNode;
}

interface DataTableProps<T> {
    columns: Column<T>[];
    data: T[];
    emptyMessage: string;
    keyExtractor: (item: T) => string;
}

export default function DataTable<T>({ columns, data, emptyMessage, keyExtractor }: DataTableProps<T>) {
    return (
        <div className="table-wrapper">
            <table className="table">
                <thead>
                    <tr>
                        {columns.map(col => (
                            <th key={col.key} style={{ width: col.width, textAlign: col.align }}>
                                {col.header}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {data.length > 0 ? (
                        data.map(item => (
                            <tr key={keyExtractor(item)}>
                                {columns.map(col => (
                                    <td key={col.key} style={{ textAlign: col.align }}>
                                        {col.render(item)}
                                    </td>
                                ))}
                            </tr>
                        ))
                    ) : (
                        <tr>
                            <td colSpan={columns.length} className="table-empty">
                                {emptyMessage}
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
    );
}
