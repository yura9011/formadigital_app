'use client';

import { NeoCard } from '../components/neo/NeoCard';
import { NeoButton } from '../components/neo/NeoButton';

export default function Home() {
  const menuItems = [
    {
      title: 'Proyectos',
      description: 'Gestiona clientes y estados de proyectos (Planificación, En Progreso, Completado).',
      icon: '🚀',
      href: '/projects',
      color: 'bg-neo-blue text-white'
    },
    {
      title: 'Analíticas',
      description: 'Visualiza tus estadísticas de Instagram, alcance y crecimiento.',
      icon: '📈',
      href: '/analytics',
      color: 'bg-neo-pink/10'
    },
    {
      title: 'Calendario',
      description: 'Programa y gestiona tu contenido de redes sociales.',
      icon: '📅',
      href: '/calendar',
      color: 'bg-neo-blue/10'
    },
    {
      title: 'Competidores',
      description: 'Analiza tu competencia local y optimiza tu SEO en Google.',
      icon: '🗺️',
      href: '/gmb',
      color: 'bg-green-100'
    },
    {
      title: 'Historial',
      description: 'Sigue las últimas actualizaciones y funciones de Forma Digital.',
      icon: '📜',
      href: '/changelog',
      color: 'bg-neo-yellow/10'
    },
    {
      title: 'Configuración',
      description: 'Gestiona tus integraciones y cuentas conectadas.',
      icon: '⚙️',
      href: '/settings',
      color: 'bg-gray-200'
    }
  ];

  return (
    <div className="min-h-screen bg-neo-bg text-neo-text p-8 font-sans">
      <header className="mb-16 text-center">
        <h1 className="text-4xl md:text-8xl font-black tracking-tighter uppercase italic text-neo-text drop-shadow-[4px_4px_0px_rgba(0,0,0,1)] md:drop-shadow-[6px_6px_0px_rgba(0,0,0,1)] mb-4">
          Forma Digital
        </h1>
        <p className="text-lg md:text-xl font-bold text-gray-600 uppercase tracking-widest">
          Gestión de Redes Sociales
        </p>
      </header>

      <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
        {menuItems.map((item) => (
          <NeoCard key={item.title} className={`h-full flex flex-col justify-between hover:translate-x-[-4px] hover:translate-y-[-4px] hover:shadow-neo-lg transition-all cursor-pointer ${item.color}`} onClick={() => window.location.href = item.href}>
            <div>
              <div className="text-6xl mb-6">{item.icon}</div>
              <h2 className="text-3xl font-black uppercase mb-2">{item.title}</h2>
              <p className="font-medium text-gray-800">{item.description}</p>
            </div>
            <div className="mt-8 flex justify-end">
              <NeoButton size="sm" variant="secondary" onClick={(e) => { e.stopPropagation(); window.location.href = item.href; }}>
                Abrir →
              </NeoButton>
            </div>
          </NeoCard>
        ))}
      </div>

      <footer className="mt-24 text-center font-bold text-gray-400 uppercase text-sm">
        v0.4.0 • Built with Next.js & NestJS
      </footer>
    </div>
  );
}
