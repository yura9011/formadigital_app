'use client';

import { useEffect, useState } from 'react';

export function withAuth<P extends object>(Component: React.ComponentType<P>) {
    return function ProtectedRoute(props: P) {
        const [isAuthenticated, setIsAuthenticated] = useState(false);
        const [isLoading, setIsLoading] = useState(true);

        useEffect(() => {
            const userId = localStorage.getItem('currentUserId');

            if (!userId) {
                window.location.href = '/login';
            } else {
                setIsAuthenticated(true);
            }
            setIsLoading(false);
        }, []);

        if (isLoading) {
            return (
                <div className="min-h-screen flex items-center justify-center bg-neo-bg">
                    <div className="font-black text-2xl uppercase italic animate-pulse">Cargando...</div>
                </div>
            );
        }

        if (!isAuthenticated) return null;

        return <Component {...props} />;
    };
}
