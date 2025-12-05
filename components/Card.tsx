import React from 'react';

interface CardProps {
    title?: string;
    children: React.ReactNode;
    className?: string;
    titleAction?: React.ReactNode;
}

const Card: React.FC<CardProps> = ({ title, children, className = '', titleAction }) => {
    return (
        <div className={`bg-card rounded-lg shadow-lg p-6 border border-border ${className}`}>
            {title && (
                <div className="flex justify-between items-center border-b border-border pb-4 mb-4">
                    <h3 className="text-xl font-semibold text-slate-200">{title}</h3>
                    {titleAction}
                </div>
            )}
            <div>
                {children}
            </div>
        </div>
    );
};

export default Card;