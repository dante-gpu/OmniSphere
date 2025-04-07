import React from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface Column<T> {
  key: string;
  header: React.ReactNode;
  cell: (row: T) => React.ReactNode;
  sortable?: boolean;
}

interface TableProps<T> {
  columns: Column<T>[];
  data: T[];
  onSort?: (key: string, direction: 'asc' | 'desc') => void;
  sortKey?: string;
  sortDirection?: 'asc' | 'desc';
  isLoading?: boolean;
  emptyState?: React.ReactNode;
  className?: string;
}

export function Table<T>({
  columns,
  data,
  onSort,
  sortKey,
  sortDirection,
  isLoading,
  emptyState,
  className = ''
}: TableProps<T>) {
  const renderSortIcon = (column: Column<T>) => {
    if (!column.sortable) return null;
    
    if (sortKey === column.key) {
      return sortDirection === 'asc' ? (
        <ChevronUp size={16} />
      ) : (
        <ChevronDown size={16} />
      );
    }
    
    return <ChevronDown size={16} className="text-neutral-300" />;
  };

  return (
    <div className={`overflow-x-auto ${className}`}>
      <table className="w-full">
        <thead>
          <tr className="bg-neutral-50">
            {columns.map((column) => (
              <th
                key={column.key}
                onClick={() => {
                  if (column.sortable && onSort) {
                    const newDirection = 
                      sortKey === column.key && sortDirection === 'asc'
                        ? 'desc'
                        : 'asc';
                    onSort(column.key, newDirection);
                  }
                }}
                className={`
                  px-6 py-4 text-left text-sm font-medium text-neutral-500
                  ${column.sortable ? 'cursor-pointer hover:text-neutral-900' : ''}
                `}
              >
                <div className="flex items-center gap-1">
                  {column.header}
                  {renderSortIcon(column)}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-neutral-100">
          {isLoading ? (
            <tr>
              <td colSpan={columns.length} className="px-6 py-4 text-center">
                <LoadingSpinner className="w-6 h-6 mx-auto" />
              </td>
            </tr>
          ) : data.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="px-6 py-8 text-center">
                {emptyState || (
                  <div className="text-neutral-500">No data available</div>
                )}
              </td>
            </tr>
          ) : (
            data.map((row, index) => (
              <tr key={index} className="hover:bg-neutral-50">
                {columns.map((column) => (
                  <td key={column.key} className="px-6 py-4">
                    {column.cell(row)}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}