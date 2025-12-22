'use client';

import React from 'react';

interface TabLoadingSkeletonProps {
    label?: string;
}

export const TabLoadingSkeleton: React.FC<TabLoadingSkeletonProps> = ({ label }) => {
    return (
        <div className="bg-white border-2 border-neo-border shadow-neo p-8 animate-pulse">
            {/* Header skeleton */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-gray-200 border-2 border-neo-border"></div>
                    <div>
                        <div className="h-6 w-48 bg-gray-200 mb-2"></div>
                        <div className="h-4 w-32 bg-gray-100"></div>
                    </div>
                </div>
                <div className="h-10 w-32 bg-gray-200 border-2 border-neo-border"></div>
            </div>

            {/* Content skeleton */}
            <div className="space-y-4">
                <div className="h-4 bg-gray-200 w-full"></div>
                <div className="h-4 bg-gray-200 w-5/6"></div>
                <div className="h-4 bg-gray-200 w-4/6"></div>
            </div>

            {/* Grid skeleton */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
                {[1, 2, 3].map((i) => (
                    <div key={i} className="h-32 bg-gray-100 border-2 border-neo-border"></div>
                ))}
            </div>

            {/* Loading indicator */}
            <div className="flex items-center justify-center mt-8 gap-3">
                <div className="w-6 h-6 border-4 border-neo-border border-t-neo-orange rounded-full animate-spin"></div>
                <span className="font-black uppercase text-gray-400">
                    {label ? `Cargando ${label}...` : 'Cargando...'}
                </span>
            </div>
        </div>
    );
};

export default TabLoadingSkeleton;
