'use client';

import ReviewsTab from '@/components/gmb/ReviewsTab';

export default function ResenasPage() {
    return (
        <div className="min-h-screen flex flex-col bg-neo-bg text-neo-text p-4 md:p-8 font-sans">
            <header className="mb-8 flex justify-between items-center border-b-4 border-neo-border pb-6">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => window.location.href = '/'}
                        className="bg-white border-2 border-neo-border shadow-neo px-4 py-2 font-bold uppercase hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-neo-lg transition-all"
                    >
                        ← Inicio
                    </button>
                    <div className="flex items-center gap-2">
                        <div className="bg-neo-yellow text-black p-2 border-2 border-neo-border shadow-neo-sm">
                            <span className="text-2xl">⭐</span>
                        </div>
                        <h1 className="text-3xl md:text-5xl font-black tracking-tighter uppercase italic text-neo-text">
                            Gestión de Reseñas
                        </h1>
                    </div>
                </div>
            </header>

            <main className="flex-1 w-full mx-auto">
                <ReviewsTab />
            </main>
        </div>
    );
}
