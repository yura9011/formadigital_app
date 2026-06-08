'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { api } from '@/config/api';

interface Client {
    id: string;
    name: string;
    address: string;
    category?: string;
    phone?: string;
    instagram?: string;
    website?: string;
    rating?: number;
    reviewCount?: number;
    tier?: string;
    score?: number;
    type: 'LEAD' | 'CLIENT' | 'COMPETITOR';
    createdAt: string;
    updatedAt: string;
    audits?: { id: string; createdAt: string }[];
}

type FilterType = 'ALL' | 'LEAD' | 'CLIENT';

export default function LeadsPage() {
    const [clients, setClients] = useState<Client[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<FilterType>('ALL');
    const [searchTerm, setSearchTerm] = useState('');

    // Register Contact Modal state
    const [showRegisterModal, setShowRegisterModal] = useState(false);
    const [selectedClient, setSelectedClient] = useState<Client | null>(null);
    const [registerChannel, setRegisterChannel] = useState<'whatsapp' | 'instagram' | 'email'>('whatsapp');
    const [registerDate, setRegisterDate] = useState(new Date().toISOString().split('T')[0]);
    const [registerNotes, setRegisterNotes] = useState('');
    const [registerLoading, setRegisterLoading] = useState(false);
    const [registerError, setRegisterError] = useState<string | null>(null);

    useEffect(() => {
        fetchClients();
    }, []);

    const fetchClients = async () => {
        try {
            const res = await fetch(api.gmb.leads());
            if (res.ok) {
                const data = await res.json();
                setClients(data);
            }
        } catch (e) {
            console.error('Error fetching leads:', e);
        } finally {
            setLoading(false);
        }
    };

    const openRegisterModal = (client: Client) => {
        setSelectedClient(client);
        setRegisterChannel(client.phone ? 'whatsapp' : client.instagram ? 'instagram' : 'email');
        setRegisterDate(new Date().toISOString().split('T')[0]);
        setRegisterNotes('');
        setRegisterError(null);
        setShowRegisterModal(true);
    };

    const handleRegisterContact = async () => {
        if (!selectedClient) return;
        setRegisterLoading(true);
        setRegisterError(null);

        try {
            const res = await fetch(`${api.pipeline.leads(selectedClient.id)}/register-contact`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    channel: registerChannel,
                    contactedAt: new Date(registerDate).toISOString(),
                    notes: registerNotes || undefined,
                }),
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.message || 'Error registering contact');
            }

            // Success - refresh and close
            await fetchClients();
            setShowRegisterModal(false);
        } catch (e: any) {
            setRegisterError(e.message);
        } finally {
            setRegisterLoading(false);
        }
    };

    const filteredClients = useMemo(() => {
        return clients.filter(c => {
            const matchesFilter = filter === 'ALL' || c.type === filter;
            const matchesSearch = c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                c.address.toLowerCase().includes(searchTerm.toLowerCase());
            return matchesFilter && matchesSearch;
        });
    }, [clients, filter, searchTerm]);

    const getTierColor = (tier?: string) => {
        switch (tier) {
            case 'HOT': return 'bg-red-500 text-white';
            case 'WARM': return 'bg-yellow-400 text-black';
            case 'COLD': return 'bg-blue-400 text-white';
            default: return 'bg-gray-300 text-black';
        }
    };

    const getTypeColor = (type: string) => {
        switch (type) {
            case 'CLIENT': return 'bg-green-500 text-white';
            case 'LEAD': return 'bg-neo-blue text-white';
            default: return 'bg-gray-400 text-white';
        }
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
            {/* Header */}
            <header className="mb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b-4 border-neo-border pb-4">
                <div className="flex items-center gap-4">
                    <Link
                        href="/gmb"
                        className="bg-white border-2 border-neo-border shadow-neo px-4 py-2 font-bold uppercase hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-neo-lg transition-all"
                    >
                        ← GMB
                    </Link>
                    <div className="flex items-center gap-2">
                        <div className="bg-neo-blue text-white p-2 border-2 border-neo-border shadow-neo-sm">
                            <span className="text-xl">📋</span>
                        </div>
                        <h1 className="text-2xl md:text-4xl font-black tracking-tighter uppercase italic text-neo-text">
                            Leads & Clientes
                        </h1>
                    </div>
                </div>

                <div className="flex items-center gap-2 text-sm font-bold">
                    <span className="bg-neo-yellow px-3 py-1 border-2 border-black">
                        {clients.length} Total
                    </span>
                    <span className="bg-green-400 px-3 py-1 border-2 border-black">
                        {clients.filter(c => c.type === 'CLIENT').length} Clientes
                    </span>
                    <span className="bg-blue-400 px-3 py-1 border-2 border-black">
                        {clients.filter(c => c.type === 'LEAD').length} Leads
                    </span>
                </div>
            </header>

            {/* Filters */}
            <div className="mb-6 flex flex-col md:flex-row gap-4">
                <input
                    type="text"
                    placeholder="Buscar por nombre o dirección..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="flex-1 border-2 border-neo-border p-3 font-medium shadow-neo focus:outline-none focus:ring-2 focus:ring-neo-blue"
                />
                <div className="flex gap-2">
                    {(['ALL', 'LEAD', 'CLIENT'] as FilterType[]).map(f => (
                        <button
                            key={f}
                            onClick={() => setFilter(f)}
                            className={`px-4 py-2 border-2 border-neo-border font-bold uppercase transition-all
                                ${filter === f
                                    ? 'bg-neo-blue text-white shadow-neo translate-x-[-2px] translate-y-[-2px]'
                                    : 'bg-white hover:bg-gray-100'
                                }`}
                        >
                            {f === 'ALL' ? 'Todos' : f === 'LEAD' ? 'Leads' : 'Clientes'}
                        </button>
                    ))}
                </div>
            </div>

            {/* Table */}
            {filteredClients.length === 0 ? (
                <div className="bg-white border-2 border-neo-border p-10 text-center">
                    <span className="text-6xl mb-4 block">📭</span>
                    <p className="text-xl font-bold text-gray-600">No hay leads guardados</p>
                    <p className="text-gray-500 mt-2">Los leads se guardan automáticamente al ejecutar una Auditoría.</p>
                    <Link
                        href="/gmb"
                        className="inline-block mt-4 bg-neo-blue text-white px-6 py-3 border-2 border-black shadow-neo font-bold uppercase hover:translate-x-[-2px] hover:translate-y-[-2px] transition-all"
                    >
                        Ir a Análisis GMB
                    </Link>
                </div>
            ) : (
                <div className="bg-white border-2 border-neo-border shadow-neo overflow-hidden">
                    <table className="w-full">
                        <thead className="bg-gray-100 border-b-2 border-neo-border">
                            <tr>
                                <th className="text-left p-4 font-black uppercase text-sm">Negocio</th>
                                <th className="text-left p-4 font-black uppercase text-sm hidden md:table-cell">Categoría</th>
                                <th className="text-left p-4 font-black uppercase text-sm hidden lg:table-cell">Rating</th>
                                <th className="text-center p-4 font-black uppercase text-sm">Tier</th>
                                <th className="text-center p-4 font-black uppercase text-sm">Estado</th>
                                <th className="text-center p-4 font-black uppercase text-sm">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y-2 divide-gray-200">
                            {filteredClients.map(client => (
                                <tr key={client.id} className="hover:bg-gray-50 transition-colors">
                                    <td className="p-4">
                                        <div className="font-bold text-neo-text">{client.name}</div>
                                        <div className="text-sm text-gray-500 truncate max-w-xs">{client.address}</div>
                                    </td>
                                    <td className="p-4 hidden md:table-cell">
                                        <span className="text-sm text-gray-600">{client.category || '-'}</span>
                                    </td>
                                    <td className="p-4 hidden lg:table-cell">
                                        {client.rating ? (
                                            <span className="font-bold">
                                                ⭐ {client.rating.toFixed(1)} ({client.reviewCount || 0})
                                            </span>
                                        ) : '-'}
                                    </td>
                                    <td className="p-4 text-center">
                                        {client.tier ? (
                                            <span className={`px-2 py-1 text-xs font-black uppercase border-2 border-black ${getTierColor(client.tier)}`}>
                                                {client.tier}
                                            </span>
                                        ) : '-'}
                                    </td>
                                    <td className="p-4 text-center">
                                        <span className={`px-2 py-1 text-xs font-black uppercase border-2 border-black ${getTypeColor(client.type)}`}>
                                            {client.type}
                                        </span>
                                    </td>
                                    <td className="p-4">
                                        <div className="flex justify-center gap-2 flex-wrap">
                                            <button
                                                onClick={() => openRegisterModal(client)}
                                                className="bg-green-500 text-white px-3 py-1 text-xs font-bold border-2 border-black hover:bg-green-600 transition-colors"
                                                title="Registrar contacto manual"
                                            >
                                                Contactado
                                            </button>
                                            {client.audits && client.audits.length > 0 && (
                                                <button
                                                    className="bg-purple-500 text-white px-3 py-1 text-xs font-bold border-2 border-black hover:bg-purple-600 transition-colors"
                                                    title="Ver ultima Auditoria"
                                                >
                                                    Audit
                                                </button>
                                            )}
                                            <Link
                                                href={`/projects?clientId=${client.id}`}
                                                className="bg-neo-yellow text-black px-3 py-1 text-xs font-bold border-2 border-black hover:bg-yellow-400 transition-colors"
                                            >
                                                Proyecto
                                            </Link>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Register Contact Modal */}
            {showRegisterModal && selectedClient && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white border-4 border-black shadow-neo-lg p-6 max-w-md w-full">
                        <h2 className="text-xl font-black uppercase mb-4">
                            Registrar Contacto
                        </h2>
                        <p className="text-gray-600 mb-4">
                            <strong>{selectedClient.name}</strong>
                        </p>

                        {registerError && (
                            <div className="bg-red-100 border-2 border-red-500 p-3 mb-4 text-red-700 text-sm">
                                {registerError}
                            </div>
                        )}

                        <div className="space-y-4">
                            <div>
                                <label className="block font-bold text-sm mb-1">Canal</label>
                                <select
                                    value={registerChannel}
                                    onChange={(e) => setRegisterChannel(e.target.value as any)}
                                    className="w-full border-2 border-black p-2 font-bold"
                                >
                                    <option value="whatsapp">WhatsApp</option>
                                    <option value="instagram">Instagram</option>
                                    <option value="email">Email</option>
                                </select>
                            </div>

                            <div>
                                <label className="block font-bold text-sm mb-1">Fecha del contacto</label>
                                <input
                                    type="date"
                                    value={registerDate}
                                    onChange={(e) => setRegisterDate(e.target.value)}
                                    max={new Date().toISOString().split('T')[0]}
                                    className="w-full border-2 border-black p-2"
                                />
                            </div>

                            <div>
                                <label className="block font-bold text-sm mb-1">Notas (opcional)</label>
                                <textarea
                                    value={registerNotes}
                                    onChange={(e) => setRegisterNotes(e.target.value)}
                                    placeholder="Ej: Primer contacto, le intereso..."
                                    className="w-full border-2 border-black p-2 h-20 resize-none"
                                />
                            </div>
                        </div>

                        <div className="flex gap-3 mt-6">
                            <button
                                onClick={() => setShowRegisterModal(false)}
                                className="flex-1 bg-gray-200 border-2 border-black px-4 py-2 font-bold"
                                disabled={registerLoading}
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleRegisterContact}
                                disabled={registerLoading}
                                className="flex-1 bg-green-500 text-white border-2 border-black px-4 py-2 font-bold hover:bg-green-600 disabled:opacity-50"
                            >
                                {registerLoading ? 'Guardando...' : 'Registrar'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

