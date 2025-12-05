import React, { useEffect } from 'react';
import { ICONS } from '../constants';

interface ToastProps {
    message: string;
    type: 'info' | 'success' | 'warning' | 'error';
    onClose: () => void;
}

const Toast: React.FC<ToastProps> = ({ message, type, onClose }) => {
    useEffect(() => {
        const timer = setTimeout(() => {
            onClose();
        }, 3000);
        return () => clearTimeout(timer);
    }, [onClose]);

    const bgColors = {
        info: 'bg-blue-500',
        success: 'bg-green-500',
        warning: 'bg-yellow-500',
        error: 'bg-red-500',
    };

    return (
        <div className={`${bgColors[type]} text-white px-4 py-2 rounded shadow-lg flex items-center justify-between min-w-[300px] border border-slate-700`}>
            <span className="mr-2 font-medium">{message}</span>
            <button onClick={onClose} className="ml-2 hover:text-slate-300">
                {ICONS.close}
            </button>
        </div>
    );
};

export default Toast;