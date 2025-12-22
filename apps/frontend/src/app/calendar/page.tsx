'use client';

import React, { useState, useEffect } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import { NeoCard } from '../../components/neo/NeoCard';
import { NeoButton } from '../../components/neo/NeoButton';
import { withAuth } from '../../components/auth/withAuth';
// import GoogleConnectButton from '../../components/google/GoogleConnectButton'; // Verify path
import toast from 'react-hot-toast';
import { CalendarEventModal } from '../../components/calendar/CalendarEventModal';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

function CalendarPage() {
    const [events, setEvents] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isConnected, setIsConnected] = useState(true);

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedEvent, setSelectedEvent] = useState<any>(null);

    const [errorMessage, setErrorMessage] = useState('');

    useEffect(() => {
        loadEvents();
    }, []);

    const loadEvents = async () => {
        setIsLoading(true);
        const userId = localStorage.getItem('currentUserId');
        if (!userId) {
            setIsLoading(false);
            return;
        }

        try {
            const res = await fetch(`${API_BASE}/calendar/events?userId=${userId}`);

            if (res.status === 401 || res.status === 403) {
                const errData = await res.json().catch(() => ({}));
                setErrorMessage(errData.message || 'Error de autenticación');
                setIsConnected(false);
                setIsLoading(false);
                return;
            }

            if (res.ok) {
                const data = await res.json();
                // Transform Google Events to FullCalendar format
                const formattedEvents = data.map((evt: any) => ({
                    id: evt.id,
                    title: evt.summary,
                    start: evt.start.dateTime || evt.start.date,
                    end: evt.end.dateTime || evt.end.date,
                    backgroundColor: '#1E1E1E', // Neo-black
                    borderColor: '#000000',
                    textColor: '#FFFFFF',
                    extendedProps: {
                        description: evt.description
                    }
                }));
                setEvents(formattedEvents);
                setIsConnected(true);
                setErrorMessage('');
            }
        } catch (error) {
            console.error('Error fetching events', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleDateClick = (arg: any) => {
        setSelectedEvent({ start: arg.dateStr });
        setIsModalOpen(true);
    };

    const handleEventClick = (info: any) => {
        info.jsEvent.preventDefault();
        setSelectedEvent({
            id: info.event.id,
            title: info.event.title,
            start: info.event.start,
            end: info.event.end,
            description: info.event.extendedProps.description
        });
        setIsModalOpen(true);
    };

    const handleSaveEvent = async (eventData: any) => {
        const userId = localStorage.getItem('currentUserId');
        if (!userId) return;

        try {
            let res;
            if (eventData.id) {
                res = await fetch(`${API_BASE}/calendar/events/${eventData.id}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ ...eventData, userId })
                });
            } else {
                res = await fetch(`${API_BASE}/calendar/events`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ ...eventData, userId })
                });
            }

            if (res.ok) {
                toast.success(eventData.id ? 'Evento actualizado' : 'Evento creado');
                loadEvents();
            } else {
                const errData = await res.json().catch(() => ({}));
                throw new Error(errData.message || 'Failed to save');
            }
        } catch (error: any) {
            console.error(error);
            toast.error(error.message || 'Error al guardar evento');
            throw error;
        }
    };

    const handleDeleteEvent = async (eventId: string) => {
        const userId = localStorage.getItem('currentUserId');
        if (!userId) return;

        try {
            const res = await fetch(`${API_BASE}/calendar/events/${eventId}?userId=${userId}`, {
                method: 'DELETE'
            });

            if (res.ok) {
                toast.success('Evento eliminado');
                loadEvents();
            } else {
                const errData = await res.json().catch(() => ({}));
                throw new Error(errData.message || 'Failed to delete');
            }
        } catch (error: any) {
            console.error(error);
            toast.error(error.message || 'Error al eliminar evento');
            throw error;
        }
    };

    if (!isConnected) {
        return (
            <div className="min-h-screen bg-neo-bg text-neo-text p-4 md:p-8 font-sans">
                <header className="mb-12 flex items-center justify-between border-b-4 border-neo-border pb-6">
                    <div className="flex items-center gap-4">
                        <NeoButton onClick={() => window.location.href = '/'} size="sm" variant="secondary">
                            ← Back
                        </NeoButton>
                        <h1 className="text-4xl md:text-6xl font-black tracking-tighter uppercase italic text-neo-text drop-shadow-[4px_4px_0px_rgba(0,0,0,1)]">
                            Calendar
                        </h1>
                    </div>
                </header>

                <div className="flex flex-col items-center justify-center p-12">
                    <NeoCard className="text-center max-w-lg border-red-500 border-4">
                        <h2 className="text-2xl font-black mb-4 text-red-600 uppercase">⚠ Sin Conexión al Calendario</h2>
                        <p className="mb-4 font-bold">{errorMessage || 'No se pudo conectar con Google Calendar.'}</p>
                        <p className="mb-6 text-sm text-gray-600">
                            Si eres un colaborador externo, el administrador debe reconectar la cuenta de la agencia en Configuración.
                        </p>

                        <a href="/settings" className="inline-block">
                            <NeoButton variant="secondary">
                                Ir a Configuración
                            </NeoButton>
                        </a>

                        <div className="mt-4">
                            <NeoButton onClick={loadEvents} size="sm" variant="primary">Reintentar</NeoButton>
                        </div>
                    </NeoCard>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-neo-bg text-neo-text p-4 md:p-8 font-sans">
            <header className="mb-8 flex items-center justify-between border-b-4 border-neo-border pb-6">
                <div className="flex items-center gap-4">
                    <NeoButton onClick={() => window.location.href = '/'} size="sm" variant="secondary">
                        ← Back
                    </NeoButton>
                    <h1 className="text-4xl md:text-6xl font-black tracking-tighter uppercase italic text-neo-text drop-shadow-[4px_4px_0px_rgba(0,0,0,1)]">
                        Calendar
                    </h1>
                </div>
                <NeoButton onClick={loadEvents} size="sm" variant="secondary">
                    ↻ Refresh
                </NeoButton>
            </header>

            <NeoCard className="p-0 overflow-hidden bg-white">
                <div className="p-4" style={{ height: '70vh' }}>
                    <FullCalendar
                        plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
                        initialView="dayGridMonth"
                        headerToolbar={{
                            left: 'prev,next today',
                            center: 'title',
                            right: 'dayGridMonth,timeGridWeek,timeGridDay'
                        }}
                        events={events}
                        height="100%"
                        selectable={true}
                        dateClick={handleDateClick}
                        eventClick={handleEventClick}
                    />
                </div>
            </NeoCard>

            <CalendarEventModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSave={handleSaveEvent}
                onDelete={handleDeleteEvent}
                initialData={selectedEvent}
            />
        </div>
    );
}

export default withAuth(CalendarPage);
