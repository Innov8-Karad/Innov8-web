import React, { useState, useMemo, type ReactNode } from 'react';
import { Search, ChevronUp, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';

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
    renderAfterRow?: (item: T) => ReactNode;
    pageSize?: number;
}

export default function DataTable<T>({ 
    columns, 
    data, 
    emptyMessage, 
    keyExtractor,
    searchable = false,
    searchPlaceholder = "Search...",
    renderAfterRow,
    pageSize = 0
}: DataTableProps<T>) {
    const [searchTerm, setSearchTerm] = useState('');
    const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);
    const [currentPage, setCurrentPage] = useState(1);

    // Reset pagination when data changes
    const [prevData, setPrevData] = useState(data);
    if (data !== prevData) {
        setPrevData(data);
        setCurrentPage(1);
    }

    const handleSort = (key: string) => {
        let direction: 'asc' | 'desc' = 'asc';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
        setCurrentPage(1);
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

    // Pagination logic
    const totalItems = processedData.length;
    const isPaginationEnabled = pageSize > 0 && totalItems > pageSize;
    
    const paginatedData = useMemo(() => {
        if (!isPaginationEnabled) return processedData;
        const startIndex = (currentPage - 1) * pageSize;
        return processedData.slice(startIndex, startIndex + pageSize);
    }, [processedData, isPaginationEnabled, currentPage, pageSize]);

    const totalPages = Math.ceil(totalItems / (pageSize || 1));

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
                            onChange={(e) => {
                                setSearchTerm(e.target.value);
                                setCurrentPage(1);
                            }}
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
                        {paginatedData.length > 0 ? (
                            paginatedData.map(item => (
                                <React.Fragment key={keyExtractor(item)}>
                                <tr>
                                    {columns.map(col => (
                                        <td key={col.key as string} style={{ textAlign: col.align }}>
                                            {col.render 
                                                ? col.render(item) 
                                                : String((item as Record<string, unknown>)[col.key as string] || '')
                                            }
                                        </td>
                                    ))}
                                </tr>
                                {renderAfterRow && renderAfterRow(item)}
                                </React.Fragment>
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

            {isPaginationEnabled && (
                <div className="pagination-container">
                    <div className="text-sm text-muted">
                        Showing <span className="text-main">{(currentPage - 1) * pageSize + 1}</span> to <span className="text-main">{Math.min(currentPage * pageSize, totalItems)}</span> of <span className="text-main">{totalItems}</span> results
                    </div>
                    <div className="pagination-controls">
                        <button 
                            className="pagination-btn"
                            disabled={currentPage === 1}
                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        >
                            <ChevronLeft size={16} /> Prev
                        </button>
                        
                        <div className="flex items-center gap-1 mx-2">
                            {Array.from({ length: totalPages }, (_, i) => i + 1)
                                .filter(p => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
                                .map((p, i, arr) => (
                                    <React.Fragment key={p}>
                                        {i > 0 && arr[i-1] !== p - 1 && <span className="text-muted">...</span>}
                                        <button 
                                            className={`page-indicator ${currentPage === p ? 'active' : ''}`}
                                            onClick={() => setCurrentPage(p)}
                                        >
                                            {p}
                                        </button>
                                    </React.Fragment>
                                ))
                            }
                        </div>

                        <button 
                            className="pagination-btn"
                            disabled={currentPage === totalPages}
                            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                        >
                            Next <ChevronRight size={16} />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
