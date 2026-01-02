'use client';

import { useState, useEffect, useCallback } from 'react';
import { NeoCard } from '../components/neo/NeoCard';
import { NeoButton } from '../components/neo/NeoButton';
import { withAuth } from '../components/auth/withAuth';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface Reminder {
  id: string;
  title: string;
  description?: string;
  dueDate: string;
  status: 'PENDING' | 'ACTIVE' | 'COMPLETED' | 'DISMISSED';
  project?: { id: string; name: string };
  client?: { id: string; name: string };
  user?: { id: string; name: string; email: string };
}

function Home() {
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loadingReminders, setLoadingReminders] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string>('');
  const [currentUserName, setCurrentUserName] = useState<string>('');

  useEffect(() => {
    // Load current user from localStorage
    const savedUserId = localStorage.getItem('currentUserId');
    const savedUserName = localStorage.getItem('currentUserName');
    if (savedUserId) {
      setCurrentUserId(savedUserId);
    }
    if (savedUserName) {
      setCurrentUserName(savedUserName);
    }
  }, []);

  const loadReminders = useCallback(async () => {
    try {
      // Filter by current user if set
      const url = currentUserId
        ? `${API_BASE}/gmb/reminders?userId=${currentUserId}`
        : `${API_BASE}/gmb/reminders`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setReminders(data);
      }
    } catch (error) {
      console.error('Failed to load reminders:', error);
    } finally {
      setLoadingReminders(false);
    }
  }, [currentUserId]);

  useEffect(() => {
    loadReminders();
  }, [loadReminders]);

  const handleCompleteReminder = async (id: string) => {
    try {
      await fetch(`${API_BASE}/gmb/reminders/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'COMPLETED' })
      });
      loadReminders();
    } catch (error) {
      console.error(error);
    }
  };

  const activeReminders = reminders.filter(r => r.status === 'ACTIVE' || r.status === 'PENDING');
  const overdueReminders = activeReminders.filter(r => new Date(r.dueDate) <= new Date());
  const upcomingReminders = activeReminders.filter(r => new Date(r.dueDate) > new Date());

  const menuItems = [
    {
      title: 'Proyectos',
      description: 'Gestiona clientes y estados de proyectos.',
      icon: '🚀',
      href: '/projects',
      color: 'bg-neo-blue text-white',
      primary: true
    },
    {
      title: 'Análisis Local',
      description: 'Analiza tu competencia en Google Maps y optimiza tu SEO local.',
      icon: '🗺️',
      href: '/gmb',
      color: 'bg-green-100',
      primary: true
    },
    {
      title: 'Prospección',
      description: 'Gestiona leads y automatiza el contacto con potenciales clientes.',
      icon: '🎯',
      href: '/prospect',
      color: 'bg-orange-100',
      primary: true
    },
    {
      title: 'Reseñas',
      description: 'Gestiona y responde las reseñas de Google de tus clientes.',
      icon: '⭐',
      href: '/resenas',
      color: 'bg-neo-yellow/20',
      primary: false
    },
    {
      title: 'Calendario',
      description: 'Agenda y eventos de Google Calendar.',
      icon: '📅',
      href: '/calendar',
      color: 'bg-purple-100',
      primary: false
    },
    {
      title: 'Leads',
      description: 'Tus business leads del CRM.',
      icon: '👥',
      href: '/negocios',
      color: 'bg-gray-100',
      primary: false
    },
    {
      title: 'CRM / Clientes',
      description: 'Gestiona leads, clientes y usuarios en un solo lugar.',
      icon: '📊',
      href: '/crm',
      color: 'bg-neo-pink/10',
      primary: false
    },

    {
      title: 'Analíticas',
      description: 'Visualiza tus estadísticas de Instagram.',
      icon: '📈',
      href: '/analytics',
      color: 'bg-purple-100',
      primary: false
    },
    {
      title: 'Configuración',
      description: 'Gestiona tus integraciones y cuentas.',
      icon: '⚙️',
      href: '/settings',
      color: 'bg-gray-200',
      primary: false
    }
  ];

  const primaryItems = menuItems.filter(item => item.primary);
  const secondaryItems = menuItems.filter(item => !item.primary);

  return (
    <div className="min-h-screen bg-neo-bg text-neo-text p-4 md:p-8 font-sans">
      <header className="mb-8 text-center relative">
        <button
          onClick={() => {
            localStorage.removeItem('currentUserId');
            localStorage.removeItem('currentUserName');
            localStorage.removeItem('currentUserEmail');
            window.location.href = '/login';
          }}
          className="fixed top-4 right-4 z-50 bg-white border-2 border-black shadow-neo-sm px-4 py-2 text-xs font-bold uppercase text-red-500 hover:bg-red-50 hover:text-red-700 transition-all"
        >
          Cerrar Sesión ➔
        </button>
        <h1 className="text-4xl md:text-6xl font-black tracking-tighter uppercase italic text-neo-text drop-shadow-[4px_4px_0px_rgba(0,0,0,1)] mb-2">
          Forma Digital
        </h1>
        <p className="text-lg font-bold text-gray-600 uppercase tracking-widest">
          Gestión de Presencia Digital
        </p>
      </header>

      <div className="max-w-7xl mx-auto flex flex-col lg:flex-row gap-6">
        {/* Alerts Sidebar */}
        <aside className="lg:w-80 shrink-0">
          <NeoCard className="p-4 sticky top-4">
            <h2 className="text-xl font-black uppercase mb-2 flex items-center gap-2 border-b-2 border-black pb-2">
              📢 Alertas
              {overdueReminders.length > 0 && (
                <span className="bg-red-500 text-white px-2 py-0.5 text-xs font-bold animate-pulse">
                  {overdueReminders.length}
                </span>
              )}
            </h2>

            {/* User indicator */}
            {currentUserId && (
              <p className="text-sm font-bold text-gray-800 mb-4 flex items-center gap-2 bg-gray-100 p-2 rounded border border-gray-300">
                👤 {currentUserName || 'Usuario'}
              </p>
            )}
            {loadingReminders ? (
              <p className="text-gray-400 text-sm">Cargando...</p>
            ) : activeReminders.length === 0 ? (
              <p className="text-gray-400 text-sm italic">Sin recordatorios pendientes ✓</p>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {/* Overdue first */}
                {overdueReminders.map(reminder => (
                  <div
                    key={reminder.id}
                    className="p-3 bg-red-100 border-2 border-red-500 text-sm"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-bold text-red-700">⚠️ {reminder.title}</p>
                        {reminder.client && <p className="text-xs text-red-600">Cliente: {reminder.client.name}</p>}
                        {reminder.project && <p className="text-xs text-red-600">Proyecto: {reminder.project.name}</p>}
                        <p className="text-xs text-red-500 mt-1">
                          Vencido: {new Date(reminder.dueDate).toLocaleDateString('es-AR')}
                        </p>
                      </div>
                      <button
                        onClick={() => handleCompleteReminder(reminder.id)}
                        className="text-green-600 hover:text-green-800 text-lg"
                        title="Marcar como completado"
                      >
                        ✓
                      </button>
                    </div>
                  </div>
                ))}

                {/* Upcoming */}
                {upcomingReminders.map(reminder => (
                  <div
                    key={reminder.id}
                    className="p-3 bg-neo-yellow/20 border-2 border-neo-border text-sm"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-bold">{reminder.title}</p>
                        {reminder.client && <p className="text-xs text-gray-500">Cliente: {reminder.client.name}</p>}
                        {reminder.project && <p className="text-xs text-gray-500">Proyecto: {reminder.project.name}</p>}
                        <p className="text-xs text-gray-400 mt-1">
                          {new Date(reminder.dueDate).toLocaleDateString('es-AR')}
                        </p>
                      </div>
                      <button
                        onClick={() => handleCompleteReminder(reminder.id)}
                        className="text-gray-400 hover:text-green-600 text-lg"
                        title="Marcar como completado"
                      >
                        ✓
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="mt-4 pt-3 border-t-2 border-gray-200">
              <NeoButton
                size="sm"
                variant="secondary"
                className="w-full"
                onClick={() => window.location.href = '/projects'}
              >
                Ver todos →
              </NeoButton>
            </div>
          </NeoCard>
        </aside>

        {/* Main Content */}
        <main className="flex-1">
          {/* Primary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            {primaryItems.map((item) => (
              <NeoCard
                key={item.title}
                className={`h-full flex flex-col justify-between hover:translate-x-[-4px] hover:translate-y-[-4px] hover:shadow-neo-lg transition-all cursor-pointer ${item.color}`}
                onClick={() => window.location.href = item.href}
              >
                <div>
                  <div className="text-5xl mb-3">{item.icon}</div>
                  <h2 className="text-2xl font-black uppercase mb-2">{item.title}</h2>
                  <p className="font-medium text-gray-800 text-sm">{item.description}</p>
                </div>
                <div className="mt-4 flex justify-end">
                  <NeoButton size="sm" variant="secondary" onClick={(e) => { e.stopPropagation(); window.location.href = item.href; }}>
                    Abrir →
                  </NeoButton>
                </div>
              </NeoCard>
            ))}
          </div>

          {/* Secondary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {secondaryItems.map((item) => (
              <div
                key={item.title}
                onClick={() => window.location.href = item.href}
                className={`p-4 border-2 border-neo-border shadow-neo hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-neo-lg transition-all cursor-pointer ${item.color}`}
              >
                <div className="text-3xl mb-2">{item.icon}</div>
                <h3 className="text-xs font-black uppercase">{item.title}</h3>
              </div>
            ))}
          </div>
        </main>
      </div>

      <footer className="mt-16 text-center font-bold text-gray-400 uppercase text-sm">
        v0.9.0 • Built with Next.js & NestJS
      </footer>
    </div>
  );
}

export default withAuth(Home);
