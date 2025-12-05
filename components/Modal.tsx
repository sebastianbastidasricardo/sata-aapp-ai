import React, { useEffect } from 'react';
import { ICONS } from '../constants';

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    children: React.ReactNode;
    footer?: React.ReactNode;
}

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children, footer }) => {
    useEffect(() => {
        const handleEsc = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                onClose();
            }
        };
        window.addEventListener('keydown', handleEsc);
        return () => {
            window.removeEventListener('keydown', handleEsc);
        };
    }, [onClose]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 z-50 flex justify-center items-center p-4" onClick={onClose}>
            <div className="bg-card text-light rounded-lg shadow-xl w-full max-w-lg transform transition-all border border-border" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center p-4 border-b border-border">
                    <h3 className="text-lg font-semibold text-slate-200">{title}</h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-200">
                        {ICONS.close}
                    </button>
                </div>
                <div className="p-6">
                    {children}
                </div>
                {footer && (
                    <div className="flex justify-end p-4 bg-background border-t border-border rounded-b-lg">
                        {footer}
                    </div>
                )}
            </div>
        </div>
    );
};

export default Modal;