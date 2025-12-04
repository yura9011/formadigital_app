import React from 'react';

interface NeoButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'secondary' | 'accent' | 'danger';
    size?: 'sm' | 'md' | 'lg';
}

export const NeoButton: React.FC<NeoButtonProps> = ({
    children,
    className = '',
    variant = 'primary',
    size = 'md',
    ...props
}) => {
    const baseStyles = "font-bold border-2 border-neo-border transition-all active:translate-x-[2px] active:translate-y-[2px] active:shadow-none";

    const variants = {
        primary: "bg-neo-blue text-white shadow-neo hover:bg-blue-700",
        secondary: "bg-white text-neo-text shadow-neo hover:bg-gray-100",
        accent: "bg-neo-yellow text-neo-text shadow-neo hover:bg-yellow-400",
        danger: "bg-neo-orange text-white shadow-neo hover:bg-red-600",
    };

    const sizes = {
        sm: "px-3 py-1 text-sm",
        md: "px-6 py-2 text-base",
        lg: "px-8 py-3 text-lg",
    };

    return (
        <button
            className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
            {...props}
        >
            {children}
        </button>
    );
};
