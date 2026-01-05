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
                                        <div className="flex justify-center gap-2">
                                            {client.audits && client.audits.length > 0 && (
                                                <button
                                                    className="bg-purple-500 text-white px-3 py-1 text-xs font-bold border-2 border-black hover:bg-purple-600 transition-colors"
                                                    title="Ver última Auditoría"
                                                >
                                                    🔍 Audit
                                                </button>
                                            )}
                                            <Link
                                                href={`/projects?clientId=${client.id}`}
                                                className="bg-neo-yellow text-black px-3 py-1 text-xs font-bold border-2 border-black hover:bg-yellow-400 transition-colors"
                                            >
                                                📁 Proyecto
                                            </Link>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
