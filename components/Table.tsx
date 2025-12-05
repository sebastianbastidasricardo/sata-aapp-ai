
import React from 'react';

interface Column<T> {
    header: string;
    accessor: (item: T) => React.ReactNode;
}

interface TableProps<T> {
    columns: Column<T>[];
    data: T[];
    isLoading?: boolean;
}

const Table = <T extends { id: string }>(
    { columns, data, isLoading = false }: TableProps<T>
) => {
    return (
        <div className="w-full">
            {/* Desktop View: Standard Table */}
            <div className="hidden md:block overflow-x-auto bg-card rounded-lg shadow-md border border-border">
                <table className="min-w-full divide-y divide-border">
                    <thead className="bg-slate-900/50">
                        <tr>
                            {columns.map((col, index) => (
                                <th key={index} scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                                    {col.header}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="bg-card divide-y divide-border">
                        {isLoading ? (
                            <tr>
                                <td colSpan={columns.length} className="text-center py-10">
                                    <div className="text-slate-400">Cargando datos...</div>
                                </td>
                            </tr>
                        ) : data.length === 0 ? (
                            <tr>
                                <td colSpan={columns.length} className="text-center py-10">
                                    <div className="text-slate-400">No se encontraron datos.</div>
                                </td>
                            </tr>
                        ) : (
                            data.map((item) => (
                                <tr key={item.id} className="hover:bg-slate-700/50 transition-colors">
                                    {columns.map((col, index) => (
                                        <td key={index} className="px-6 py-4 whitespace-nowrap text-sm text-slate-300">
                                            {col.accessor(item)}
                                        </td>
                                    ))}
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Mobile View: Stacked Cards */}
            <div className="md:hidden space-y-4">
                {isLoading ? (
                    <div className="text-center py-10 text-slate-400">Cargando datos...</div>
                ) : data.length === 0 ? (
                    <div className="text-center py-10 text-slate-400 bg-card rounded-lg border border-border">No se encontraron datos.</div>
                ) : (
                    data.map((item) => (
                        <div key={item.id} className="bg-card rounded-lg border border-border p-4 shadow-sm space-y-3">
                            {columns.map((col, index) => (
                                <div key={index} className="flex flex-col border-b border-slate-700/50 last:border-0 pb-2 last:pb-0">
                                    {/* Don't show header label for Actions column usually, or keep it consistent */}
                                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                                        {col.header}
                                    </span>
                                    <div className="text-sm text-slate-200 pl-1">
                                        {col.accessor(item)}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default Table;
