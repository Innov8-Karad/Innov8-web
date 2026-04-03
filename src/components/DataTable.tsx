import { useState, useMemo, type ReactNode } from 'react';
import { Search, ChevronUp, ChevronDown } from 'lucide-react';

export interface Column<T> {
    key: keyof T | string;
    header: string;
    width?: string;
    align?: 'left' | 'center' | 'right';
    sortable?: boolean;
    render?: (item: T) => ReactNode;
}

interface DataTableProps<T> {
    columns: Column<T>[];
    data: T[];
    emptyMessage: string | ReactNode;
    keyExtractor: (item: T) => string;
    searchable?: boolean;
    searchPlaceholder?: string;
}

export default function DataTable<T>({ 
    columns, 
    data, 
    emptyMessage, 
    keyExtractor,
    searchable = false,
    searchPlaceholder = "Search..."
}: DataTableProps<T>) {
    const [searchTerm, setSearchTerm] = useState('');
    const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);

    const handleSort = (key: string) => {
        let direction: 'asc' | 'desc' = 'asc';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    const processedData = useMemo(() => {
        let filteredData = [...data];

        // Search
        if (searchable && searchTerm) {
            const lowerSearch = searchTerm.toLowerCase();
            filteredData = filteredData.filter(item => 
                Object.values(item as Record<string, unknown>).some(val => 
                    String(val).toLowerCase().includes(lowerSearch)
                )
            );
        }

        // Sort
        if (sortConfig) {
            filteredData.sort((a, b) => {
                const aValue = (a as Record<string, unknown>)[sortConfig.key];
                const bValue = (b as Record<string, unknown>)[sortConfig.key];
                
                if (String(aValue) < String(bValue)) return sortConfig.direction === 'asc' ? -1 : 1;
                if (String(aValue) > String(bValue)) return sortConfig.direction === 'asc' ? 1 : -1;
                return 0;
            });
        }

        return filteredData;
    }, [data, searchable, searchTerm, sortConfig]);

    return (
        <div className="table-container">
            {searchable && (
                <div className="p-4 border-b border-divider">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary" size={18} />
                        <input
                            type="text"
                            placeholder={searchPlaceholder}
                            className="w-full pl-10 pr-4 py-2 rounded-lg border border-divider bg-card-accent focus:outline-none focus:ring-2 focus:ring-primary/20"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>
            )}
            
            <div className="table-wrapper overflow-x-auto">
                <table className="table w-full">
                    <thead>
                        <tr>
                            {columns.map(col => (
                                <th 
                                    key={col.key as string} 
                                    style={{ width: col.width, textAlign: col.align }}
                                    className={col.sortable ? 'cursor-pointer hover:text-primary transition-colors' : ''}
                                    onClick={() => col.sortable && handleSort(col.key as string)}
                                >
                                    <div className="flex items-center gap-2" style={{ justifyContent: col.align === 'center' ? 'center' : col.align === 'right' ? 'flex-end' : 'flex-start' }}>
                                        {col.header}
                                        {col.sortable && (
                                            <div className="flex flex-col">
                                                <ChevronUp size={12} className={sortConfig?.key === col.key && sortConfig.direction === 'asc' ? 'text-primary' : 'text-muted/30'} />
                                                <ChevronDown size={12} className={sortConfig?.key === col.key && sortConfig.direction === 'desc' ? 'text-primary' : 'text-muted/30'} />
                                            </div>
                                        )}
                                    </div>
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {processedData.length > 0 ? (
                            processedData.map(item => (
                                <tr key={keyExtractor(item)}>
                                    {columns.map(col => (
                                        <td key={col.key as string} style={{ textAlign: col.align }}>
                                            {col.render 
                                                ? col.render(item) 
                                                : String((item as Record<string, unknown>)[col.key as string] || '')
                                            }
                                        </td>
                                    ))}
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan={columns.length} className="py-12 text-center text-secondary">
                                    {emptyMessage}
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
