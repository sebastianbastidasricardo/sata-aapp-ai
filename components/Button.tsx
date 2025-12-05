
import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    children: React.ReactNode;
    variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline';
    isLoading?: boolean;
    icon?: React.ReactNode;
    size?: 'sm' | 'md';
}

const Button: React.FC<ButtonProps> = ({ children, variant = 'primary', isLoading = false, icon, size = 'md', ...props }) => {
    const baseClasses = "rounded-md font-semibold focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-background transition-colors duration-200 inline-flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed";

    const sizeClasses = {
        sm: 'px-3 py-1.5 text-xs',
        md: 'px-4 py-2 text-sm',
    };

    const variantClasses = {
        primary: 'bg-primary text-white hover:bg-primary-hover focus:ring-primary',
        secondary: 'bg-secondary text-white hover:bg-slate-600 focus:ring-secondary',
        danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500',
        ghost: 'bg-transparent text-slate-300 hover:bg-slate-700 hover:text-white focus:ring-secondary',
        outline: 'bg-transparent border border-primary text-primary hover:bg-primary hover:text-white focus:ring-primary',
    };

    return (
        <button className={`${baseClasses} ${sizeClasses[size]} ${variantClasses[variant]}`} disabled={isLoading || props.disabled} {...props}>
            {isLoading ? (
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
            ) : icon}
            <span className={icon && children ? 'ml-2' : ''}>{children}</span>
        </button>
    );
};

export default Button;
