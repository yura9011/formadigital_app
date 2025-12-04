import React from 'react';

interface NeoCardProps extends React.HTMLAttributes<HTMLDivElement> {
    children: React.ReactNode;
    title?: string;
}

export const NeoCard: React.FC<NeoCardProps> = ({ children, className = '', title, ...props }) => {
    return (
        <div className={`bg-neo-bg border-2 border-neo-border shadow-neo p-6 ${className}`} {...props}>
            {title && (
                <h3 className="text-xl font-bold mb-4 border-b-2 border-neo-border pb-2 uppercase tracking-tighter">
                    {title}
                </h3>
            )}
            {children}
        </div>
    );
};
