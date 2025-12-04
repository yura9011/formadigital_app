import React from 'react';

interface NeoSelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
    label?: string;
}

export const NeoSelect: React.FC<NeoSelectProps> = ({ label, className = '', children, ...props }) => {
    return (
        <div className="flex flex-col gap-1">
            {label && (
                <label className="font-bold text-sm uppercase tracking-wider text-neo-text">
                    {label}
                </label>
            )}
            <select
                className={`border-2 border-neo-border bg-white p-2 font-mono focus:outline-none focus:ring-2 focus:ring-neo-blue shadow-neo-sm transition-all focus:shadow-neo ${className}`}
                {...props}
            >
                {children}
            </select>
        </div>
    );
};
