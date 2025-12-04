'use client';

import { NeoCard } from '../../components/neo/NeoCard';
import { NeoButton } from '../../components/neo/NeoButton';

export default function ChangelogPage() {
    const changes = [
        {
            version: '0.4.0',
            date: '2025-12-03',
            title: 'Multi-Plataforma y Facebook Real',
            items: [
                '🚀 Multi-Plataforma: Publicación simultánea en Facebook e Instagram.',
                '📘 Facebook Real: Conexión con páginas reales de Facebook (Adiós Mock).',
                '🛡️ Robustez: Manejo de errores avanzado y reintentos automáticos (espera de 5s para IG).',
                '👁️ UI Mejorada: Opción para ocultar errores en el calendario y selector de cuentas unificado.',
            ]
        },
        {
            version: '0.3.0',
            date: '2025-12-03',
            title: 'UI Neo-Brutalista y Analíticas',
            items: [
                '🎨 Revisión completa de UI: Implementado sistema de diseño Neo-Brutalista.',
                '📊 Panel de Analíticas: Insights de Instagram en tiempo real (Alcance, Visitas al Perfil).',
                '🛠️ Sistema de Diseño: Creados componentes NeoButton, NeoCard, NeoInput.',
                '🐛 Corrección de Errores: Resueltos problemas de permisos de API y normalización de datos.',
            ]
        },
        {
            version: '0.2.0',
            date: '2025-12-02',
            title: 'Funcionalidad Principal',
            items: [
                '📸 Sistema de Medios: Soporte para carga de imágenes y carruseles.',
                '📅 Programador: Vista de calendario básica y programación de posts.',
                '🔗 Integraciones: Configuración de conexión con Instagram Graph API.',
            ]
        },
        {
            version: '0.1.0',
            date: '2025-12-01',
            title: 'Inicio del Proyecto',
            items: [
                '🚀 Configuración Inicial: Estructura Monorepo (estilo Nx/Turbo).',
                '🏗️ Backend: NestJS + Prisma + PostgreSQL.',
                '🖥️ Frontend: Next.js + TailwindCSS.',
            ]
        }
    ];

    return (
        <div className="min-h-screen bg-neo-bg text-neo-text p-8 font-sans">
            <header className="mb-12 flex justify-between items-center border-b-4 border-neo-border pb-6">
                <div className="flex items-center gap-4">
                    <NeoButton onClick={() => window.location.href = '/'} size="sm" variant="secondary">
                        ← Volver
                    </NeoButton>
                    <h1 className="text-4xl md:text-6xl font-black tracking-tighter uppercase italic text-neo-text drop-shadow-[4px_4px_0px_rgba(0,0,0,1)]">
                        Historial
                    </h1>
                </div>
            </header>

            <div className="max-w-4xl mx-auto space-y-8">
                {changes.map((change, idx) => (
                    <NeoCard key={change.version} className="bg-white relative overflow-visible">
                        <div className="absolute -top-4 -left-4 bg-neo-blue text-white font-black text-xl px-4 py-2 border-2 border-neo-border shadow-neo">
                            v{change.version}
                        </div>
                        <div className="mt-6">
                            <div className="flex justify-between items-baseline mb-4 border-b-2 border-neo-border pb-2">
                                <h2 className="text-2xl font-bold uppercase">{change.title}</h2>
                                <span className="font-mono text-gray-500 font-bold">{change.date}</span>
                            </div>
                            <ul className="space-y-3">
                                {change.items.map((item, i) => (
                                    <li key={i} className="flex items-start gap-3">
                                        <span className="text-neo-orange font-bold">→</span>
                                        <span className="font-medium">{item}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </NeoCard>
                ))}
            </div>
        </div>
    );
}
