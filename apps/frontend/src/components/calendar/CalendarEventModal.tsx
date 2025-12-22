import React, { useState, useEffect } from 'react';
import { NeoButton } from '../neo/NeoButton';
import { NeoInput } from '../neo/NeoInput';
import toast from 'react-hot-toast';

interface CalendarEventModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (event: any) => Promise<void>;
    onDelete?: (eventId: string) => Promise<void>;
    initialData?: any; // If null, creating new
}

export function CalendarEventModal({ isOpen, onClose, onSave, onDelete, initialData }: CalendarEventModalProps) {
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [start, setStart] = useState('');
    const [end, setEnd] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (isOpen) {
            if (initialData) {
                setTitle(initialData.title || '');
                setDescription(initialData.extendedProps?.description || initialData.description || '');
                setStart(formatDateForInput(initialData.start));
                setEnd(initialData.end ? formatDateForInput(initialData.end) : formatDateForInput(initialData.start));
            } else {
                // Default new: now, 1 hour duration
                const now = new Date();
                setStart(formatDateForInput(now));
                const nextHour = new Date(now.getTime() + 60 * 60000);
                setEnd(formatDateForInput(nextHour));
                setTitle('');
                setDescription('');
            }
        }
    }, [isOpen, initialData]);

    const formatDateForInput = (d: Date | string) => {
        if (!d) return '';
        const date = typeof d === 'string' ? new Date(d) : d;
        // Adjust for local timezone for input value
        const localIso = new Date(date.getTime() - (date.getTimezoneOffset() * 60000)).toISOString().slice(0, 16);
        return localIso;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            await onSave({
                id: initialData?.id,
                title,
                description,
                start: new Date(start).toISOString(),
                end: new Date(end).toISOString(),
            });
            onClose();
        } catch (error) {
            console.error(error);
            toast.error('Error al guardar evento');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async () => {
        if (!confirm('¿Estás seguro de eliminar este evento?')) return;
        setIsSubmitting(true);
        try {
            if (onDelete && initialData?.id) {
                await onDelete(initialData.id);
                onClose();
            }
        } catch (error) {
            console.error(error);
            toast.error('Error al eliminar evento');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white border-4 border-black shadow-[8px_8px_0px_rgba(0,0,0,1)] w-full max-w-md p-6 relative animate-in fade-in zoom-in duration-200">
                <button
                    onClick={onClose}
                    className="absolute top-2 right-2 text-2xl font-bold hover:text-red-500"
                >
                    ×
                </button>

                <h2 className="text-2xl font-black uppercase mb-6 border-b-4 border-black pb-2">
                    {initialData ? 'Editar Evento' : 'Nuevo Evento'}
                </h2>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <NeoInput
                        label="Título"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        required
                        placeholder="Reunión con Cliente..."
                    />

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-bold mb-1 uppercase">Inicio</label>
                            <input
                                type="datetime-local"
                                value={start}
                                onChange={(e) => setStart(e.target.value)}
                                className="w-full border-2 border-black p-2 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-black focus:shadow-[4px_4px_0px_rgba(0,0,0,0.2)]"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-bold mb-1 uppercase">Fin</label>
                            <input
                                type="datetime-local"
                                value={end}
                                onChange={(e) => setEnd(e.target.value)}
                                className="w-full border-2 border-black p-2 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-black focus:shadow-[4px_4px_0px_rgba(0,0,0,0.2)]"
                                required
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-bold mb-1 uppercase">Descripción</label>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            className="w-full border-2 border-black p-2 font-mono text-sm h-24 focus:outline-none focus:ring-2 focus:ring-black focus:shadow-[4px_4px_0px_rgba(0,0,0,0.2)] resize-none"
                            placeholder="Detalles adicionales..."
                        />
                    </div>

                    <div className="flex gap-4 pt-4">
                        <NeoButton
                            type="submit"
                            className="flex-1 bg-neo-green text-black"
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? 'Guardando...' : 'Guardar'}
                        </NeoButton>

                        {initialData && onDelete && (
                            <NeoButton
                                type="button"
                                onClick={handleDelete}
                                className="bg-red-500 text-white border-red-700 hover:bg-red-600"
                                disabled={isSubmitting}
                            >
                                Eliminar
                            </NeoButton>
                        )}
                    </div>
                </form>
            </div>
        </div>
    );
}
