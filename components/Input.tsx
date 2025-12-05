import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    label: string;
    error?: string;
}

const Input: React.FC<InputProps> = ({ label, id, error, ...props }) => {
    const inputId = id || `input-${label.replace(/\s+/g, '-')}`;
    const errorClasses = error ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : 'border-border focus:border-primary focus:ring-primary';
    
    return (
        <div className="mb-4">
            <label htmlFor={inputId} className="block text-sm font-medium text-slate-300 mb-1">{label}</label>
            <input
                id={inputId}
                className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-1 sm:text-sm bg-slate-700 text-white placeholder-slate-400 ${errorClasses}`}
                {...props}
            />
            {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
        </div>
    );
};

export default Input;