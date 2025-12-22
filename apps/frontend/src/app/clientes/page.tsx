'use client';

import { useEffect } from 'react';

export default function ClientesPage() {
    useEffect(() => {
        window.location.href = '/crm?tab=usuarios';
    }, []);

    return (
        <div className="min-h-screen flex items-center justify-center bg-neo-bg">
            <p className="font-bold text-gray-500">Redirigiendo a CRM...</p>
        </div>
    );
}
