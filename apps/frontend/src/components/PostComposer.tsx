'use client';

import { useState, useEffect } from 'react';
import { MediaUploader } from './MediaUploader';
import { NeoInput } from './neo/NeoInput';
import { NeoSelect } from './neo/NeoSelect';
import { NeoTextarea } from './neo/NeoTextarea';
import { NeoButton } from './neo/NeoButton';

interface Integration {
    id: string;
    name: string;
    provider: string;
}


const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

export default function PostComposer({ onPostCreated, initialDate }: { onPostCreated: () => void, initialDate?: string | null }) {
    const [content, setContent] = useState('🚀 Prueba de Sistema\n\nVerificando publicación simultánea en Facebook e Instagram.\n\n#FormaDigital #DevMode');
    const [date, setDate] = useState('');
    // Use a reliable public image from Unsplash that Instagram can access
    const [mediaUrls, setMediaUrls] = useState<string[]>(['https://images.unsplash.com/photo-1526778548025-fa2f459cd5c1?q=80&w=1080&auto=format&fit=crop']);

    useEffect(() => {
        if (initialDate) {
            // Format date for datetime-local input (YYYY-MM-DDTHH:mm)
            const d = new Date(initialDate);
            d.setHours(12, 0); // Default to noon
            const formatted = d.toISOString().slice(0, 16);
            setDate(formatted);
        }
    }, [initialDate]);

    const [currentSlide, setCurrentSlide] = useState(0);
    const [integrations, setIntegrations] = useState<Integration[]>([]);
    const [selectedIntegrations, setSelectedIntegrations] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [previewTab, setPreviewTab] = useState<'instagram' | 'facebook'>('instagram');

    useEffect(() => {
        fetch(`${API_URL}/integrations`)
            .then((res) => res.json())
            .then((data) => {
                setIntegrations(data);
                // Auto-select all by default? Or just the first one?
                // Let's select all by default for convenience
                if (data.length > 0) {
                    setSelectedIntegrations(data.map((i: any) => i.id));
                }
            })
            .catch((err) => console.error('Failed to fetch integrations', err));
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (selectedIntegrations.length === 0) {
            alert('Por favor selecciona al menos una cuenta');
            return;
        }
        setIsLoading(true);

        try {
            const res = await fetch(`${API_URL}/posts`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    content,
                    publishDate: new Date(date).toISOString(),
                    integrationIds: selectedIntegrations,
                    media: mediaUrls.map(url => ({ path: url })),
                }),
            });

            if (res.ok) {
                setContent('');
                setDate('');
                onPostCreated();
            } else {
                alert('Error al crear el post');
            }
        } catch (error) {
            console.error(error);
            alert('Error creando el post');
        } finally {
            setIsLoading(false);
        }
    };



    const igIntegrations = integrations.filter(i => i.provider === 'instagram');
    const fbIntegrations = integrations.filter(i => i.provider === 'facebook');

    const isIgSelected = igIntegrations.some(i => selectedIntegrations.includes(i.id));
    const isFbSelected = fbIntegrations.some(i => selectedIntegrations.includes(i.id));

    const togglePlatform = (platform: 'instagram' | 'facebook') => {
        const targetIntegrations = platform === 'instagram' ? igIntegrations : fbIntegrations;
        const targetIds = targetIntegrations.map(i => i.id);
        const isSelected = platform === 'instagram' ? isIgSelected : isFbSelected;

        if (isSelected) {
            // Deselect all of this platform
            setSelectedIntegrations(prev => prev.filter(id => !targetIds.includes(id)));
        } else {
            // Select all of this platform
            setSelectedIntegrations(prev => [...new Set([...prev, ...targetIds])]);
        }
        setPreviewTab(platform);
    };

    return (
        <div className="flex flex-col lg:flex-row gap-8 mb-8">
            {/* Left Column: Editor */}
            <div className="flex-1 bg-white p-6 border-4 border-neo-border shadow-neo text-neo-text">
                <div className="flex justify-between items-center mb-6 border-b-4 border-neo-border pb-4">
                    <h2 className="text-2xl font-black uppercase">Crear Post</h2>
                    <div className="flex space-x-2">
                        <button
                            type="button"
                            onClick={() => togglePlatform('facebook')}
                            className={`px-4 py-2 font-black border-2 border-neo-border transition-all uppercase flex items-center gap-2 ${isFbSelected ? 'bg-neo-blue text-white shadow-neo-sm transform -translate-y-1' : 'bg-white hover:bg-gray-100'}`}
                        >
                            <span>📘</span> FB
                        </button>
                        <button
                            type="button"
                            onClick={() => togglePlatform('instagram')}
                            className={`px-4 py-2 font-black border-2 border-neo-border transition-all uppercase flex items-center gap-2 ${isIgSelected ? 'bg-neo-pink text-white shadow-neo-sm transform -translate-y-1' : 'bg-white hover:bg-gray-100'}`}
                        >
                            <span>📸</span> IG
                        </button>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Hidden Inputs for Form Logic if needed, but state handles it */}
                    {integrations.length === 0 && (
                        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4" role="alert">
                            <p className="font-bold">No hay cuentas conectadas</p>
                            <p>Ve a Configuración para conectar tus redes sociales.</p>
                        </div>
                    )}

                    <NeoTextarea
                        label="Contenido"
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        required
                        placeholder="¿Qué estás pensando? #FormaDigital"
                        className="h-48 resize-none"
                    />
                    <div className="text-right text-xs font-bold text-gray-400">
                        {content.length} / 2200
                    </div>

                    <div>
                        <label className="block font-bold text-sm uppercase tracking-wider text-neo-text mb-1">Multimedia</label>
                        <MediaUploader
                            onUpload={(urls) => setMediaUrls(prev => [...prev, ...urls])}
                            initialUrls={mediaUrls}
                        />
                    </div>

                    <div className="flex flex-col md:flex-row items-end gap-4">
                        <div className="flex-1 w-full">
                            <NeoInput
                                label="Fecha de Programación"
                                type="datetime-local"
                                value={date}
                                onChange={(e) => setDate(e.target.value)}
                                required
                            />
                        </div>
                        <NeoButton
                            type="submit"
                            disabled={isLoading || selectedIntegrations.length === 0}
                            className="w-full md:w-auto"
                        >
                            {isLoading ? 'Programando...' : 'Programar Post'}
                        </NeoButton>
                    </div>
                </form>
            </div>

            {/* Right Column: Device Preview */}
            <div className="w-full lg:w-[400px] flex flex-col items-center justify-start pt-8">
                <div className="text-sm font-bold uppercase tracking-widest text-gray-500 mb-4">Vista Previa ({previewTab})</div>

                {/* Phone Frame */}
                <div className="relative w-full max-w-[320px] aspect-[9/19] bg-black rounded-[2.5rem] border-8 border-black shadow-2xl overflow-hidden ring-4 ring-gray-300 transform scale-90 sm:scale-100 transition-transform origin-top">
                    {/* Notch / Dynamic Island */}
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-7 bg-black rounded-b-2xl z-20"></div>

                    {/* Screen Content */}
                    <div className="w-full h-full bg-white overflow-y-auto pt-10 pb-8 no-scrollbar">
                        {/* Status Bar Mock */}
                        <div className="flex justify-between px-6 mb-4 text-xs font-bold text-black">
                            <span>9:41</span>
                            <div className="flex gap-1">
                                <span>📶</span>
                                <span>🔋</span>
                            </div>
                        </div>

                        {/* App Header Mock */}
                        <div className="flex justify-between items-center px-4 mb-4 border-b border-gray-100 pb-2">
                            <span className="font-bold text-lg">{previewTab === 'instagram' ? 'Instagram' : 'Facebook'}</span>
                            <div className="flex gap-4 text-xl">
                                <span>❤️</span>
                                <span>💬</span>
                            </div>
                        </div>

                        {/* Post Card */}
                        <div className="pb-4">
                            {/* User Info */}
                            <div className="px-3 flex items-center mb-2">
                                <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-yellow-400 to-pink-600 mr-2 p-[2px]">
                                    <div className="w-full h-full bg-white rounded-full border-2 border-transparent"></div>
                                </div>
                                <div>
                                    <div className="font-bold text-sm leading-tight">Forma Digital</div>
                                    <div className="text-[10px] text-gray-500">Publicidad</div>
                                </div>
                                <div className="ml-auto text-gray-900">•••</div>
                            </div>

                            {/* Media */}
                            <div className="bg-gray-100 aspect-square w-full relative group">
                                {mediaUrls.length > 0 ? (
                                    <>
                                        <img src={mediaUrls[currentSlide]} alt="Preview" className="w-full h-full object-cover" />

                                        {/* Carousel Indicators */}
                                        {mediaUrls.length > 1 && (
                                            <>
                                                <div className="absolute top-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded-full">
                                                    {currentSlide + 1}/{mediaUrls.length}
                                                </div>
                                                <button
                                                    onClick={() => setCurrentSlide(prev => (prev === 0 ? mediaUrls.length - 1 : prev - 1))}
                                                    className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/80 text-black w-6 h-6 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity font-bold shadow-sm"
                                                >
                                                    ‹
                                                </button>
                                                <button
                                                    onClick={() => setCurrentSlide(prev => (prev === mediaUrls.length - 1 ? 0 : prev + 1))}
                                                    className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/80 text-black w-6 h-6 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity font-bold shadow-sm"
                                                >
                                                    ›
                                                </button>
                                                <div className="absolute bottom-0 w-full flex justify-center gap-1 pb-2">
                                                    {mediaUrls.map((_, idx) => (
                                                        <div
                                                            key={idx}
                                                            className={`w-1.5 h-1.5 rounded-full ${idx === currentSlide ? 'bg-blue-500' : 'bg-white/60'}`}
                                                        />
                                                    ))}
                                                </div>
                                            </>
                                        )}
                                    </>
                                ) : (
                                    <div className="w-full h-full flex flex-col items-center justify-center text-gray-400">
                                        <span className="text-4xl mb-2">📷</span>
                                        <span className="text-xs font-bold uppercase">Sin Imagen</span>
                                    </div>
                                )}
                            </div>

                            {/* Actions */}
                            <div className="px-3 py-2 flex justify-between text-2xl">
                                <div className="flex gap-4">
                                    <span>❤️</span>
                                    <span>💬</span>
                                    <span>🚀</span>
                                </div>
                                <span>🔖</span>
                            </div>

                            {/* Likes */}
                            <div className="px-3 text-sm font-bold mb-1">
                                1,234 Me gusta
                            </div>

                            {/* Caption */}
                            <div className="px-3">
                                <p className="text-sm">
                                    <span className="font-bold mr-2">Forma Digital</span>
                                    {content || <span className="text-gray-400 italic">Tu descripción aparecerá aquí...</span>}
                                </p>
                            </div>
                        </div>
                    </div >

                    {/* Home Bar */}
                    < div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-32 h-1 bg-black rounded-full z-20" ></div >
                </div >
            </div >
        </div >
    );
}
