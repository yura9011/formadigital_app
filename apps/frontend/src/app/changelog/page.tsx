'use client';

import { NeoCard } from '../../components/neo/NeoCard';
import { NeoButton } from '../../components/neo/NeoButton';

export default function ChangelogPage() {
    const changes = [
        {
            version: '0.8.0',
            date: '2025-12-11',
            title: 'GBP/GSC Agency Platform',
            items: [
                '🏢 Plataforma de Agencia: Sistema multi-cliente para gestionar GBP y GSC de múltiples clientes.',
                '🔐 OAuth de Google: Flujo OAuth 2.0 seguro para conectar cuentas de clientes con modo mock.',
                '⭐ Gestión de Reseñas: Dashboard completo con filtros, estadísticas y sugerencias de respuesta con IA.',
                '📊 Analytics de GSC: Panel de rendimiento con clicks, impresiones, CTR, posición e índice de cobertura.',
                '📋 Panel de Agencia: Vista general multi-cliente con alertas de reseñas y gestión de clientes.',
                '🧪 Sistema Mock: Datos de prueba completos para desarrollo (3 ubicaciones, 7 reseñas, 3 propiedades GSC).',
            ]
        },
        {
            version: '0.7.0',
            date: '2025-12-10',
            title: 'GMB Audit v0.3.1 & Reportes',
            items: [
                '🚀 Auditoría Avanzada: Análisis SWOT, Brecha Competitiva (Gap Analysis) y Plan de Acción Estratégico.',
                '🧠 Contexto Inteligente: Nuevos filtros para "Contexto de Zona" y "Productos Objetivo" para afinar la IA.',
                '📄 Reportes PDF: Generación de informes profesionales PDF directamente desde el navegador.',
                '🗺️ Mapa Mejorado: Visualización de "Ubicaciones Sintéticas" para competidores sin coordenadas exactas.',
            ]
        },
        {
            version: '0.6.0',
            date: '2025-12-09',
            title: 'Normalización de Tema Neo-Brutalista',
            items: [
                '🎨 Tema Unificado: Aplicado estilo Neo-Brutalista (Bauhaus) a secciones de Proyectos y GMB.',
                '🛡️ Componentes UI: Estandarización de tarjetas, botones y tablas con bordes gruesos y sombras duras.',
                '🚀 Navegación: Botones "Volver" consistentes que regresan al menú principal.',
                '📱 UI Mapas: Controles de búsqueda en GMB rediseñados con estilo Neo.',
            ]
        },
        {
            version: '0.5.0',
            date: '2025-12-08',
            title: 'GMB Intelligence & CRM',
            items: [
                '📍 Google My Business: Busqueda de competidores y auditoría con IA.',
                '🗄️ CRM de Clientes: Base de datos persistente para guardar clientes detectados.',
                '⚡ Smart Caching: Sistema de caché (7 días) para reducir costos de API drásticamente.',
                '🧠 IA Potenciada: Actualización a modelo Gemini 2.5 Flash para mayor precisión.',
                '📊 Reportes PDF: Generación de reportes de auditoría profesionales.',
            ]
        },
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
