'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { api } from '@/config/api';

interface Lead {
    id: string;
    name: string;
    address: string;
    category?: string;
    phone?: string;
    website?: string;
    instagram?: string;
    email?: string;
    rating?: number;
    reviewCount?: number;
    score?: number;
    contactAttempts: number;
    hasValidWhatsapp: boolean;
    hasValidInstagram: boolean;
    hasValidEmail: boolean;
    gaps?: string[];
    daysInStage: number;
}

interface SnoozeOption {
    label: string;
    days: number;
}

const SNOOZE_OPTIONS: SnoozeOption[] = [
    { label: '1 semana', days: 7 },
    { label: '1 mes', days: 30 },
    { label: '3 meses', days: 90 },
];

export default function TodayPage() {
    const [leads, setLeads] = useState<Lead[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
    const [showContactModal, setShowContactModal] = useState(false);
    const [showSnoozeModal, setShowSnoozeModal] = useState(false);
    const [contactChannel, setContactChannel] = useState<'whatsapp' | 'instagram' | 'email'>('whatsapp');
    const [contactMessage, setContactMessage] = useState('');
    const [actionLoading, setActionLoading] = useState(false);

    useEffect(() => {
        fetchReadyLeads();
    }, []);

    const fetchReadyLeads = async () => {
        setError(null);
        setLoading(true);
        try {
            const res = await fetch(api.pipeline.readyToContact(50));
            if (!res.ok) {
                throw new Error(`Error del servidor: ${res.status}`);
            }
            const data = await res.json();
            setLeads(data);
        } catch (e) {
            console.error('Error fetching leads:', e);
            setError('No se pudo conectar al servidor. ¿Está corriendo el backend?');
        } finally {
            setLoading(false);
        }
    };

    // Get user config from localStorage (set in settings)
    const getUserConfig = () => {
        if (typeof window === 'undefined') return { userName: 'Tu Nombre', companyName: 'Tu Empresa' };
        const stored = localStorage.getItem('prospectConfig');
        if (stored) {
            try {
                return JSON.parse(stored);
            } catch {
                return { userName: 'Tu Nombre', companyName: 'Tu Empresa' };
            }
        }
        return { userName: 'Tu Nombre', companyName: 'Tu Empresa' };
    };

    const generateMessage = (lead: Lead) => {
        const config = getUserConfig();
        const category = lead.category?.split(',')[0] || 'negocio';

        // Detect main gap/opportunity
        const mainGap = lead.gaps?.[0] || 'su presencia digital';
        const problemText = mainGap.toLowerCase().includes('sitio')
            ? 'no tienen sitio web'
            : 'pueden mejorar su presencia online';

        return `Hola! 👋 Vi ${lead.name} en Google Maps y me encantó el rating que tienen.

Noté que ${problemText} y me gustaría ayudarlos a mejorar su presencia digital.

Trabajo con ${category.toLowerCase()}s de la zona. ¿Te interesa una propuesta sin compromiso?

Saludos, ${config.userName} - ${config.companyName}`;
    };

    const openContactModal = (lead: Lead) => {
        setSelectedLead(lead);
        setContactMessage(generateMessage(lead));
        // Auto-select best channel
        if (lead.hasValidWhatsapp || lead.phone) {
            setContactChannel('whatsapp');
        } else if (lead.hasValidInstagram || lead.instagram) {
            setContactChannel('instagram');
        } else if (lead.hasValidEmail || lead.email) {
            setContactChannel('email');
        }
        setShowContactModal(true);
    };

    const openSnoozeModal = (lead: Lead) => {
        setSelectedLead(lead);
        setShowSnoozeModal(true);
    };

    const handleQuickContact = async () => {
        if (!selectedLead) return;
        setActionLoading(true);

        try {
            const res = await fetch(api.pipeline.quickContact(selectedLead.id), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    channel: contactChannel,
                    message: contactMessage,
                }),
            });

            if (res.ok) {
                // Copy message to clipboard
                await navigator.clipboard.writeText(contactMessage);
                alert('✅ Mensaje copiado al portapapeles. Lead marcado como CONTACTED.');

                // Remove from list
                setLeads(leads.filter(l => l.id !== selectedLead.id));
                setShowContactModal(false);
            }
        } catch (e) {
            console.error('Error:', e);
            alert('Error al marcar como contactado');
        } finally {
            setActionLoading(false);
        }
    };

    const handleSnooze = async (days: number) => {
        if (!selectedLead) return;
        setActionLoading(true);

        const until = new Date();
        until.setDate(until.getDate() + days);

        try {
            const res = await fetch(api.pipeline.snooze(selectedLead.id), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    until: until.toISOString(),
                    reason: `Postergar ${days} días`,
                }),
            });

            if (res.ok) {
                setLeads(leads.filter(l => l.id !== selectedLead.id));
                setShowSnoozeModal(false);
            }
        } catch (e) {
            console.error('Error:', e);
        } finally {
            setActionLoading(false);
        }
    };

    const getWhatsAppLink = (phone?: string) => {
        if (!phone) return null;
        const cleaned = phone.replace(/\D/g, '');
        // Convert to Argentine format
        let number = cleaned;
        if (cleaned.startsWith('011')) {
            number = '549' + cleaned.substring(1);
        } else if (cleaned.startsWith('11')) {
            number = '549' + cleaned;
        } else if (!cleaned.startsWith('54')) {
            number = '549' + cleaned;
        }
        return `https://wa.me/${number}`;
    };

    const ChannelBadges = ({ lead }: { lead: Lead }) => (
        <div className="flex gap-1">
            {(lead.hasValidWhatsapp || lead.phone) && (
                <a
                    href={getWhatsAppLink(lead.phone) || '#'}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-green-500 text-white px-2 py-0.5 text-xs font-bold border border-black rounded hover:bg-green-600"
                    title={lead.phone || 'WhatsApp'}
                >
                    📱 WSP
                </a>
            )}
            {(lead.hasValidInstagram || lead.instagram) && (
                <a
                    href={`https://instagram.com/${lead.instagram?.replace('@', '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-pink-500 text-white px-2 py-0.5 text-xs font-bold border border-black rounded hover:bg-pink-600"
                    title={lead.instagram || 'Instagram'}
                >
                    📸 IG
                </a>
            )}
            {(lead.hasValidEmail || lead.email) && (
                <span className="bg-blue-500 text-white px-2 py-0.5 text-xs font-bold border border-black rounded" title={lead.email}>
                    📧
                </span>
            )}
        </div>
    );

    const AttemptCounter = ({ attempts }: { attempts: number }) => {
        const color = attempts >= 8 ? 'bg-red-500' : attempts >= 5 ? 'bg-yellow-500' : 'bg-gray-300';
        return (
            <span className={`${color} text-xs font-bold px-2 py-0.5 border border-black rounded`}>
                {attempts}/10
            </span>
        );
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-neo-bg p-8">
                <div className="animate-pulse space-y-4">
                    <div className="h-12 bg-gray-200 border-2 border-black w-1/3"></div>
                    <div className="h-64 bg-gray-200 border-2 border-black"></div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-neo-bg p-4 md:p-8">
            {/* Error Banner */}
            {error && (
                <div className="mb-6 bg-red-100 border-2 border-red-500 p-4 flex justify-between items-center">
                    <div className="flex items-center gap-2">
                        <span className="text-2xl">⚠️</span>
                        <span className="font-bold text-red-700">{error}</span>
                    </div>
                    <button
                        onClick={() => { setError(null); fetchReadyLeads(); }}
                        className="bg-red-500 text-white px-4 py-2 border-2 border-black font-bold hover:bg-red-600"
                    >
                        Reintentar
                    </button>
                </div>
            )}

            {/* Header */}
            <header className="mb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b-4 border-neo-border pb-4">
                <div className="flex items-center gap-4">
                    <Link
                        href="/gmb/search"
                        className="bg-white border-2 border-neo-border shadow-neo px-4 py-2 font-bold uppercase hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-neo-lg transition-all"
                    >
                        🔍 Buscar
                    </Link>
                    <div className="flex items-center gap-2">
                        <div className="bg-neo-yellow text-black p-2 border-2 border-neo-border shadow-neo-sm">
                            <span className="text-xl">⭐</span>
                        </div>
                        <h1 className="text-2xl md:text-4xl font-black tracking-tighter uppercase italic text-neo-text">
                            Para Hoy
                        </h1>
                    </div>
                </div>

                <div className="flex items-center gap-2 text-sm font-bold">
                    <span className="bg-neo-yellow px-3 py-1 border-2 border-black">
                        {leads.length} Listos
                    </span>
                    <Link
                        href="/gmb/metrics"
                        className="bg-purple-500 text-white px-3 py-1 border-2 border-black hover:bg-purple-600"
                    >
                        📈 Métricas
                    </Link>
                    <button
                        onClick={fetchReadyLeads}
                        className="bg-white px-3 py-1 border-2 border-black hover:bg-gray-100"
                    >
                        🔄 Refresh
                    </button>
                </div>
            </header>

            {/* Leads List */}
            {leads.length === 0 ? (
                <div className="bg-white border-2 border-neo-border p-10 text-center shadow-neo">
                    <span className="text-6xl mb-4 block">🎉</span>
                    <p className="text-xl font-bold text-gray-600">No hay leads para contactar hoy</p>
                    <p className="text-gray-500 mt-2">Todos los leads han sido contactados o snoozeados.</p>
                    <Link
                        href="/gmb/search"
                        className="inline-block mt-4 bg-neo-blue text-white px-6 py-3 border-2 border-black shadow-neo font-bold uppercase hover:translate-x-[-2px] hover:translate-y-[-2px] transition-all"
                    >
                        Buscar más leads
                    </Link>
                </div>
            ) : (
                <div className="space-y-4">
                    {leads.map((lead) => (
                        <div
                            key={lead.id}
                            className="bg-white border-2 border-neo-border shadow-neo p-4 hover:shadow-neo-lg transition-all"
                        >
                            <div className="flex flex-col md:flex-row justify-between gap-4">
                                {/* Lead Info */}
                                <div className="flex-1">
                                    <div className="flex items-center gap-3 mb-2">
                                        <h3 className="font-black text-lg">{lead.name}</h3>
                                        <span className="bg-neo-blue text-white px-2 py-0.5 text-xs font-bold border border-black">
                                            Score: {lead.score || 0}
                                        </span>
                                        <AttemptCounter attempts={lead.contactAttempts} />
                                    </div>

                                    <p className="text-sm text-gray-600 mb-2">
                                        {lead.category?.split(',')[0]} • {lead.address}
                                    </p>

                                    <div className="flex items-center gap-4 text-sm">
                                        {lead.rating && (
                                            <span className="font-bold">
                                                ⭐ {lead.rating.toFixed(1)} ({lead.reviewCount || 0})
                                            </span>
                                        )}
                                        <ChannelBadges lead={lead} />
                                    </div>

                                    {lead.gaps && lead.gaps.length > 0 && (
                                        <div className="mt-2 flex gap-1">
                                            {lead.gaps.slice(0, 2).map((gap, i) => (
                                                <span key={i} className="bg-red-100 text-red-700 text-xs px-2 py-0.5 rounded">
                                                    {gap}
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* Actions */}
                                <div className="flex gap-2 items-center">
                                    <button
                                        onClick={() => openContactModal(lead)}
                                        className="bg-green-500 text-white px-4 py-2 border-2 border-black font-bold uppercase hover:bg-green-600 transition-colors shadow-neo hover:translate-x-[-2px] hover:translate-y-[-2px]"
                                    >
                                        📤 Contactar
                                    </button>
                                    <button
                                        onClick={() => openSnoozeModal(lead)}
                                        className="bg-yellow-400 text-black px-4 py-2 border-2 border-black font-bold uppercase hover:bg-yellow-500 transition-colors"
                                    >
                                        ⏰ Snooze
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Contact Modal */}
            {showContactModal && selectedLead && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white border-4 border-black shadow-neo-lg p-6 max-w-lg w-full">
                        <h2 className="text-xl font-black uppercase mb-4">
                            Contactar: {selectedLead.name}
                        </h2>

                        {/* Channel Selector */}
                        <div className="mb-4">
                            <label className="font-bold block mb-2">Canal:</label>
                            <div className="flex gap-2">
                                {(selectedLead.hasValidWhatsapp || selectedLead.phone) && (
                                    <button
                                        onClick={() => setContactChannel('whatsapp')}
                                        className={`px-4 py-2 border-2 border-black font-bold ${contactChannel === 'whatsapp' ? 'bg-green-500 text-white' : 'bg-white'
                                            }`}
                                    >
                                        📱 WhatsApp
                                    </button>
                                )}
                                {(selectedLead.hasValidInstagram || selectedLead.instagram) && (
                                    <button
                                        onClick={() => setContactChannel('instagram')}
                                        className={`px-4 py-2 border-2 border-black font-bold ${contactChannel === 'instagram' ? 'bg-pink-500 text-white' : 'bg-white'
                                            }`}
                                    >
                                        📸 Instagram
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Message */}
                        <div className="mb-4">
                            <label className="font-bold block mb-2">Mensaje:</label>
                            <textarea
                                value={contactMessage}
                                onChange={(e) => setContactMessage(e.target.value)}
                                className="w-full border-2 border-black p-3 h-40 font-medium"
                            />
                        </div>

                        {/* WhatsApp Link */}
                        {contactChannel === 'whatsapp' && selectedLead.phone && (
                            <a
                                href={getWhatsAppLink(selectedLead.phone) || '#'}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="block text-center bg-green-500 text-white px-4 py-2 border-2 border-black font-bold mb-4 hover:bg-green-600"
                            >
                                Abrir WhatsApp Web →
                            </a>
                        )}

                        {/* Actions */}
                        <div className="flex gap-2 justify-end">
                            <button
                                onClick={() => setShowContactModal(false)}
                                className="px-4 py-2 border-2 border-black font-bold bg-gray-200 hover:bg-gray-300"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleQuickContact}
                                disabled={actionLoading}
                                className="px-4 py-2 border-2 border-black font-bold bg-neo-blue text-white hover:bg-blue-600 disabled:opacity-50"
                            >
                                {actionLoading ? 'Guardando...' : 'Copiar y Marcar Enviado'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Snooze Modal */}
            {showSnoozeModal && selectedLead && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white border-4 border-black shadow-neo-lg p-6 max-w-sm w-full">
                        <h2 className="text-xl font-black uppercase mb-4">
                            Snooze: {selectedLead.name}
                        </h2>

                        <p className="text-gray-600 mb-4">¿Cuándo contactar de nuevo?</p>

                        <div className="space-y-2">
                            {SNOOZE_OPTIONS.map((option) => (
                                <button
                                    key={option.days}
                                    onClick={() => handleSnooze(option.days)}
                                    disabled={actionLoading}
                                    className="w-full px-4 py-3 border-2 border-black font-bold bg-yellow-100 hover:bg-yellow-200 transition-colors"
                                >
                                    {option.label}
                                </button>
                            ))}
                        </div>

                        <button
                            onClick={() => setShowSnoozeModal(false)}
                            className="w-full mt-4 px-4 py-2 border-2 border-black font-bold bg-gray-200 hover:bg-gray-300"
                        >
                            Cancelar
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
