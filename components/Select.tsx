import React from 'react';

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
    label: string;
    error?: string;
    children: React.ReactNode;
}

const Select: React.FC<SelectProps> = ({ label, id, error, children, ...props }) => {
    const selectId = id || `select-${label.replace(/\s+/g, '-')}`;
    const errorClasses = error ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : 'border-border focus:border-primary focus:ring-primary';

    return (
        <div className="mb-4">
            <label htmlFor={selectId} className="block text-sm font-medium text-slate-300 mb-1">{label}</label>
            <select
                id={selectId}
                className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-1 sm:text-sm bg-slate-700 text-white ${errorClasses}`}
                {...props}
            >
                {children}
            </select>
            {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
        </div>
    );
};

export default Select;