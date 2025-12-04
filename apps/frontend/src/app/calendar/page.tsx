'use client';

import { useState, useEffect } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import PostComposer from '../../components/PostComposer';
import { NeoButton } from '../../components/neo/NeoButton';
import { NeoCard } from '../../components/neo/NeoCard';

export default function CalendarPage() {
    const [posts, setPosts] = useState([]);
    const [isComposerOpen, setIsComposerOpen] = useState(false);
    const [selectedDate, setSelectedDate] = useState<string | null>(null);

    const [selectedPost, setSelectedPost] = useState<any | null>(null);

    const fetchPosts = async () => {
        try {
            // 1. Fetch Local Scheduled Posts
            const postsRes = await fetch('http://localhost:3000/posts');
            const localPosts = await postsRes.json();

            // 2. Fetch Integrations to get ID
            const integrationsRes = await fetch('http://localhost:3000/integrations');
            const integrations = await integrationsRes.json();

            let externalEvents: any[] = [];

            // 3. Fetch External Media for the first VALID integration (MVP)
            const validIntegration = integrations.find((i: any) => i.accountId && i.provider === 'instagram');

            if (validIntegration) {
                const integrationId = validIntegration.id;
                try {
                    const mediaRes = await fetch(`http://localhost:3000/integrations/${integrationId}/media`);
                    if (mediaRes.ok) {
                        const mediaData = await mediaRes.json();
                        externalEvents = mediaData.map((media: any) => ({
                            title: (media.caption || 'No Caption').substring(0, 20) + '...',
                            start: media.timestamp,
                            backgroundColor: '#ffffff',
                            borderColor: '#000000',
                            textColor: '#000000',
                            extendedProps: {
                                id: media.id,
                                content: media.caption || '',
                                publishDate: media.timestamp,
                                state: 'PUBLISHED',
                                integration: { name: 'Instagram (History)' },
                                media: [{ path: media.media_url || media.thumbnail_url }]
                            }
                        }));
                    }
                } catch (e) {
                    console.error("Failed to fetch external media", e);
                }
            }

            // 4. Map Local Posts
            const localEvents = localPosts.map((post: any) => ({
                title: post.content.substring(0, 20) + '...',
                start: post.publishDate,
                backgroundColor: '#ffffff',
                borderColor: '#000000',
                textColor: '#000000',
                extendedProps: { ...post }
            }));

            // 5. Merge
            setPosts([...localEvents, ...externalEvents]);

        } catch (err) {
            console.error("Failed to fetch posts", err);
        }
    };

    useEffect(() => {
        fetchPosts();
    }, []);

    const handleDateClick = (arg: any) => {
        setSelectedDate(arg.dateStr);
        setIsComposerOpen(true);
        setSelectedPost(null);
    };

    const handleEventClick = (arg: any) => {
        setSelectedPost(arg.event.extendedProps);
        setIsComposerOpen(false);
    };

    const [showErrors, setShowErrors] = useState(false);

    // Filter posts based on showErrors
    const visiblePosts = posts.filter((p: any) => showErrors || p.extendedProps?.state !== 'ERROR');

    return (
        <div className="min-h-screen bg-neo-bg text-neo-text p-8 font-sans">
            <header className="mb-8 flex justify-between items-center border-b-4 border-neo-border pb-6">
                <div className="flex items-center gap-4">
                    <NeoButton onClick={() => window.location.href = '/'} size="sm" variant="secondary">
                        ← Back
                    </NeoButton>
                    <h1 className="text-4xl md:text-6xl font-black tracking-tighter uppercase text-neo-text">
                        Calendar
                    </h1>
                </div>
                <div className="flex gap-4">
                    <button
                        onClick={() => setShowErrors(!showErrors)}
                        className={`text-xs font-bold uppercase underline ${showErrors ? 'text-red-600' : 'text-gray-400'}`}
                    >
                        {showErrors ? 'Ocultar Errores' : 'Mostrar Errores'}
                    </button>
                    <NeoButton onClick={() => { setSelectedDate(null); setIsComposerOpen(true); setSelectedPost(null); }}>
                        + New Post
                    </NeoButton>
                </div>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Calendar Column - Hidden if Composer is Open */}
                {!isComposerOpen && !selectedPost && (
                    <div className="lg:col-span-3">
                        <NeoCard className="bg-white">
                            <style jsx global>{`
                                .fc {
                                    font-family: inherit;
                                    --fc-border-color: black;
                                    --fc-page-bg-color: white;
                                    --fc-neutral-bg-color: white;
                                }
                                .fc-toolbar-title {
                                    font-weight: 900 !important;
                                    text-transform: uppercase;
                                }
                                .fc-button {
                                    background-color: white !important;
                                    border: 2px solid black !important;
                                    border-radius: 0 !important;
                                    box-shadow: 4px 4px 0px 0px #D02020 !important; /* Red Shadow */
                                    font-weight: bold !important;
                                    text-transform: uppercase !important;
                                    color: black !important;
                                    opacity: 1 !important;
                                }
                                .fc-button:active {
                                    transform: translate(2px, 2px);
                                    box-shadow: 2px 2px 0px 0px #D02020 !important;
                                }
                                .fc-daygrid-day {
                                    border: 2px solid black !important;
                                }
                                .fc-day-today {
                                    background-color: rgba(208, 32, 32, 0.1) !important; /* Red tint */
                                }
                                .fc-event {
                                    border: 2px solid black !important;
                                    box-shadow: 2px 2px 0px 0px black;
                                    border-radius: 0 !important;
                                    font-weight: bold;
                                    cursor: pointer;
                                    padding: 2px 4px;
                                }
                                @media (max-width: 768px) {
                                    .fc-toolbar {
                                        flex-direction: column;
                                        gap: 1rem;
                                    }
                                    .fc-toolbar-title {
                                        font-size: 1.25rem !important;
                                    }
                                }
                            `}</style>
                            <FullCalendar
                                plugins={[dayGridPlugin, interactionPlugin]}
                                initialView="dayGridMonth"
                                events={visiblePosts}
                                dateClick={handleDateClick}
                                eventClick={handleEventClick}
                                headerToolbar={{
                                    left: 'prev,next today',
                                    center: 'title',
                                    right: 'dayGridMonth,dayGridWeek'
                                }}
                                height="auto"
                            />
                        </NeoCard>
                    </div>
                )}

                {/* Composer / Details Column - Full Width if Active */}
                {(isComposerOpen || selectedPost) && (
                    <div className="lg:col-span-3">
                        {selectedPost ? (
                            <NeoCard title="Post Details" className="bg-white border-l-8 border-l-neo-orange max-w-4xl mx-auto">
                                <div className="space-y-4">
                                    <div>
                                        <span className="bg-black text-white px-2 py-1 text-xs font-bold uppercase">
                                            {selectedPost.state}
                                        </span>
                                        <span className="ml-2 text-sm font-bold text-gray-500">
                                            {new Date(selectedPost.publishDate).toLocaleString()}
                                        </span>
                                    </div>
                                    <p className="text-xl font-bold whitespace-pre-wrap border-l-4 border-gray-200 pl-4">
                                        {selectedPost.content}
                                    </p>

                                    {selectedPost.media && Array.isArray(selectedPost.media) && selectedPost.media.length > 0 && (
                                        <div className="grid grid-cols-2 gap-2 mt-4">
                                            {selectedPost.media.map((m: any, idx: number) => (
                                                <div key={idx} className="relative aspect-square border-2 border-neo-border shadow-neo-sm">
                                                    <img
                                                        src={m.path}
                                                        alt={`Media ${idx + 1}`}
                                                        className="w-full h-full object-cover"
                                                    />
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    <div className="pt-4 border-t-2 border-neo-border">
                                        <p className="text-xs font-bold uppercase text-gray-400">Integration</p>
                                        <p className="font-bold">{selectedPost.integration?.name || 'Unknown'}</p>
                                    </div>
                                    <div className="flex justify-end mt-4">
                                        <NeoButton size="sm" variant="secondary" onClick={() => setSelectedPost(null)}>
                                            Close
                                        </NeoButton>
                                    </div>
                                </div>
                            </NeoCard>
                        ) : (
                            <div className="max-w-6xl mx-auto">
                                <div className="mb-4">
                                    <button
                                        onClick={() => setIsComposerOpen(false)}
                                        className="text-sm font-bold text-gray-500 hover:text-black underline mb-4 inline-block"
                                    >
                                        ← Volver al Calendario
                                    </button>
                                </div>
                                <NeoCard title={selectedDate ? `Nuevo Post para el ${selectedDate}` : "Nuevo Post"} className="bg-white">
                                    <PostComposer
                                        onPostCreated={() => {
                                            fetchPosts();
                                            setIsComposerOpen(false);
                                        }}
                                        initialDate={selectedDate}
                                    />
                                </NeoCard>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
