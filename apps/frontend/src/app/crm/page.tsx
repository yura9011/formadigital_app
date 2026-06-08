'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { NeoButton } from '@/components/neo/NeoButton';
import { NeoCard } from '@/components/neo/NeoCard';
import toast from 'react-hot-toast';
import { withAuth } from '@/components/auth/withAuth';
import { CalendarEventModal } from '@/components/calendar/CalendarEventModal';
import type { Client, FilterType } from '@/types/client';

import { API_URL as API_BASE } from '@/config/api';

function CRMPage() {
    const [clients, setClients] = useState<Client[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<FilterType>('ALL');
    const [search, setSearch] = useState('');

    // Modal states
    const [showAddModal, setShowAddModal] = useState(false);
    const [selectedClient, setSelectedClient] = useState<Client | null>(null);
    const [isEditing, setIsEditing] = useState(false);

    // Form data
    const [formData, setFormData] = useState({ name: '', address: '', phone: '', category: '', type: 'LEAD' as 'LEAD' | 'CLIENT' });
    const [newNote, setNewNote] = useState('');

    // Schedule Modal State
    const [showScheduleModal, setShowScheduleModal] = useState(false);
    const [scheduleInitialData, setScheduleInitialData] = useState<any>(null);

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch(`${API_BASE}/gmb/leads`);
            const data = await res.json();
            const filtered = (data || []).filter((c: Client) => c.type !== 'COMPETITOR');
            setClients(filtered);
        } catch (error) {
            console.error('Failed to load CRM data:', error);
            toast.error('Error al cargar datos');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadData();
    }, [loadData]);

    // ALTA - Create new client
    const handleCreate = async () => {
        if (!formData.name) return toast.error('Nombre requerido');

        const toastId = toast.loading('Creando...');
        try {
            await fetch(`${API_BASE}/gmb/clients`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: formData.name,
                    address: formData.address || 'Sin dirección',
                    phone: formData.phone,
                    category: formData.category,
                    type: formData.type
                })
            });

            toast.success('Cliente creado!', { id: toastId });
            resetForm();
            setShowAddModal(false);
            loadData();
        } catch (error) {
            console.error(error);
            toast.error('Error al crear', { id: toastId });
        }
    };

    // SCHEDULE MEETING
    const handleOpenSchedule = () => {
        if (!selectedClient) return;
        setScheduleInitialData({
            title: `Reunión con ${selectedClient.name}`,
            description: `Cliente: ${selectedClient.name}\nTeléfono: ${selectedClient.phone || '-'}\nDirección: ${selectedClient.address || '-'}\n\nAgendado desde CRM.`,
            start: new Date().toISOString(),
        });
        setShowScheduleModal(true);
    };

    const handleSaveSchedule = async (eventData: any) => {
        const userId = localStorage.getItem('currentUserId');
        if (!userId) return;

        const toastId = toast.loading('Agendando...');
        try {
            const res = await fetch(`${API_BASE}/calendar/events`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...eventData, userId })
            });

            if (res.ok) {
                toast.success('Reunión agendada!', { id: toastId });
                // We don't need to reload CRM data, but we could close modal
            } else {
                const errData = await res.json().catch(() => ({}));
                throw new Error(errData.message || 'Failed to schedule');
            }
        } catch (error) {
            console.error(error);
            toast.error('Error al agendar', { id: toastId });
            throw error;
        }
    };

    // MODIFICACIÓN - Update client
    const handleUpdate = async () => {
        if (!selectedClient || !formData.name) return toast.error('Nombre requerido');

        const toastId = toast.loading('Actualizando...');
        try {
            await fetch(`${API_BASE}/gmb/clients/${selectedClient.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: formData.name,
                    address: formData.address,
                    phone: formData.phone,
                    category: formData.category
                })
            });

            toast.success('Cliente actualizado!', { id: toastId });
            setIsEditing(false);
            setSelectedClient(null);
            loadData();
        } catch (error) {
            console.error(error);
            toast.error('Error al actualizar', { id: toastId });
        }
    };

    // BAJA - Delete client
    const handleDelete = async () => {
        if (!selectedClient) return;
        if (!confirm(`¿Eliminar "${selectedClient.name}"? Esta acción no se puede deshacer.`)) return;

        const toastId = toast.loading('Eliminando...');
        try {
            await fetch(`${API_BASE}/gmb/clients/${selectedClient.id}`, {
                method: 'DELETE'
            });

            toast.success('Cliente eliminado!', { id: toastId });
            setSelectedClient(null);
            loadData();
        } catch (error) {
            console.error(error);
            toast.error('Error al eliminar', { id: toastId });
        }
    };

    // Add note
    const handleAddNote = async () => {
        if (!selectedClient || !newNote.trim()) return;

        const toastId = toast.loading('Agregando nota...');
        try {
            await fetch(`${API_BASE}/gmb/client/${selectedClient.id}/notes`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ content: newNote.trim() })
            });

            toast.success('Nota agregada!', { id: toastId });
            setNewNote('');

            // Refresh client data
            const res = await fetch(`${API_BASE}/gmb/leads`);
            const data = await res.json();
            const filtered = (data || []).filter((c: Client) => c.type !== 'COMPETITOR');
            setClients(filtered);

            // Update selected client with new notes
            const updated = filtered.find((c: Client) => c.id === selectedClient.id);
            if (updated) setSelectedClient(updated);
        } catch (error) {
            console.error(error);
            toast.error('Error al agregar nota', { id: toastId });
        }
    };

    // Convert Lead to Client
    const handleConvertToClient = async () => {
        if (!selectedClient) return;

        const toastId = toast.loading('Convirtiendo...');
        try {
            await fetch(`${API_BASE}/gmb/clients/${selectedClient.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ type: 'CLIENT' })
            });
            toast.success('¡Convertido a cliente activo!', { id: toastId });
            setSelectedClient(null);
            loadData();
        } catch (error) {
            console.error(error);
            toast.error('Error al convertir', { id: toastId });
        }
    };

    const resetForm = () => {
        setFormData({ name: '', address: '', phone: '', category: '', type: 'LEAD' });
    };

    const openEditMode = () => {
        if (selectedClient) {
            setFormData({
                name: selectedClient.name || '',
                address: selectedClient.address || '',
                phone: selectedClient.phone || '',
                category: selectedClient.category || '',
                type: selectedClient.type === 'COMPETITOR' ? 'LEAD' : selectedClient.type
            });
            setIsEditing(true);
        }
    };

    const filteredClients = clients.filter(c => {
        const matchesFilter = filter === 'ALL' || c.type === filter;
        const matchesSearch = !search ||
            c.name?.toLowerCase().includes(search.toLowerCase()) ||
            c.address?.toLowerCase().includes(search.toLowerCase()) ||
            c.category?.toLowerCase().includes(search.toLowerCase());
        return matchesFilter && matchesSearch;
    });

    const getTypeBadge = (type: string) => {
        switch (type) {
            case 'CLIENT': return { bg: 'bg-green-400', label: '✓ Cliente Activo' };
            case 'LEAD': return { bg: 'bg-neo-yellow', label: '🌱 Semilla / Posible' };
            default: return { bg: 'bg-gray-300', label: type };
        }
    };

    const stats = {
        total: clients.length,
        leads: clients.filter(c => c.type === 'LEAD').length,
        clientes: clients.filter(c => c.type === 'CLIENT').length
    };

    return (
        <div className="min-h-screen flex flex-col bg-neo-bg text-neo-text p-4 md:p-8 font-sans">
            {/* Header */}
            <header className="mb-6 flex flex-wrap justify-between items-center border-b-4 border-neo-border pb-6 gap-4">
                <div className="flex items-center gap-4">
                    <NeoButton onClick={() => window.location.href = '/'} size="sm" variant="secondary">
                        ← Inicio
                    </NeoButton>
                    <h1 className="text-3xl md:text-4xl font-black tracking-tighter uppercase italic">
                        📊 CRM
                    </h1>
                </div>
                <NeoButton onClick={() => { resetForm(); setShowAddModal(true); }} variant="primary">
                    + Nuevo Cliente
                </NeoButton>
            </header>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4 mb-6">
                <NeoCard
                    className={`p-4 text-center cursor-pointer transition-all ${filter === 'ALL' ? 'ring-4 ring-neo-blue' : 'hover:bg-gray-50'}`}
                    onClick={() => setFilter('ALL')}
                >
                    <p className="text-3xl font-black">{stats.total}</p>
                    <p className="text-xs font-bold uppercase text-gray-500">Total</p>
                </NeoCard>
                <NeoCard
                    className={`p-4 text-center cursor-pointer transition-all ${filter === 'LEAD' ? 'ring-4 ring-neo-yellow' : 'hover:bg-neo-yellow/20'}`}
                    onClick={() => setFilter('LEAD')}
                >
                    <p className="text-3xl font-black">{stats.leads}</p>
                    <p className="text-xs font-bold uppercase text-gray-500">🌱 Semillas</p>
                </NeoCard>
                <NeoCard
                    className={`p-4 text-center cursor-pointer transition-all ${filter === 'CLIENT' ? 'ring-4 ring-green-500' : 'hover:bg-green-100'}`}
                    onClick={() => setFilter('CLIENT')}
                >
                    <p className="text-3xl font-black">{stats.clientes}</p>
                    <p className="text-xs font-bold uppercase text-gray-500">✓ Activos</p>
                </NeoCard>
            </div>

            {/* Search */}
            <div className="mb-6">
                <input
                    type="text"
                    placeholder="🔍 Buscar por nombre, dirección, categoría..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full px-4 py-3 border-2 border-neo-border font-medium text-lg"
                />
            </div>

            {/* Client Table */}
            {loading ? (
                <div className="flex justify-center py-12">
                    <div className="animate-spin w-12 h-12 border-4 border-neo-border border-t-neo-blue"></div>
                </div>
            ) : (
                <NeoCard className="p-0 overflow-hidden">
                    <table className="w-full">
                        <thead className="bg-gray-100 border-b-2 border-neo-border">
                            <tr>
                                <th className="text-left p-4 font-black uppercase text-sm">Nombre</th>
                                <th className="text-left p-4 font-black uppercase text-sm hidden md:table-cell">Dirección</th>
                                <th className="text-left p-4 font-black uppercase text-sm hidden lg:table-cell">Categoría</th>
                                <th className="text-center p-4 font-black uppercase text-sm">Estado</th>
                                <th className="text-center p-4 font-black uppercase text-sm hidden sm:table-cell">Notas</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredClients.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="text-center p-8 text-gray-500">
                                        No hay clientes. ¡Agrega el primero!
                                    </td>
                                </tr>
                            ) : (
                                filteredClients.map(client => {
                                    const badge = getTypeBadge(client.type);
                                    return (
                                        <tr
                                            key={client.id}
                                            className="border-b border-gray-200 hover:bg-neo-yellow/10 cursor-pointer transition-colors"
                                            onClick={() => { setSelectedClient(client); setIsEditing(false); setNewNote(''); }}
                                        >
                                            <td className="p-4">
                                                <p className="font-bold">{client.name}</p>
                                                <p className="text-xs text-gray-400">{client.phone || ''}</p>
                                            </td>
                                            <td className="p-4 hidden md:table-cell">
                                                <p className="text-sm">{client.address || '-'}</p>
                                            </td>
                                            <td className="p-4 hidden lg:table-cell">
                                                <span className="text-sm">{client.category || '-'}</span>
                                            </td>
                                            <td className="p-4 text-center">
                                                <span className={`px-2 py-1 text-xs font-bold border-2 border-neo-border ${badge.bg}`}>
                                                    {badge.label}
                                                </span>
                                            </td>
                                            <td className="p-4 text-center hidden sm:table-cell">
                                                <span className="text-lg">{client.notes?.length || 0} 📝</span>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </NeoCard>
            )}

            {/* ALTA - Add Client Modal */}
            {showAddModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowAddModal(false)}>
                    <div className="bg-white border-4 border-neo-border shadow-neo max-w-md w-full p-6" onClick={e => e.stopPropagation()}>
                        <h2 className="text-2xl font-black uppercase mb-6 border-b-2 border-black pb-2">➕ Alta de Cliente</h2>

                        <div className="space-y-4">
                            <div>
                                <label className="text-xs font-bold uppercase text-gray-500 block mb-1">Nombre *</label>
                                <input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="w-full p-3 border-2 border-black font-medium" />
                            </div>
                            <div>
                                <label className="text-xs font-bold uppercase text-gray-500 block mb-1">Dirección / Email</label>
                                <input type="text" value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} className="w-full p-3 border-2 border-black font-medium" />
                            </div>
                            <div>
                                <label className="text-xs font-bold uppercase text-gray-500 block mb-1">Teléfono</label>
                                <input type="tel" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} className="w-full p-3 border-2 border-black font-medium" />
                            </div>
                            <div>
                                <label className="text-xs font-bold uppercase text-gray-500 block mb-1">Categoría</label>
                                <input type="text" placeholder="ej: Restaurante, Tienda..." value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value })} className="w-full p-3 border-2 border-black font-medium" />
                            </div>
                            <div>
                                <label className="text-xs font-bold uppercase text-gray-500 block mb-2">Tipo de Registro</label>
                                <div className="flex gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setFormData({ ...formData, type: 'LEAD' })}
                                        className={`flex-1 p-3 border-2 border-black font-bold transition-all ${formData.type === 'LEAD' ? 'bg-neo-yellow' : 'bg-white hover:bg-gray-100'}`}
                                    >
                                        🌱 Semilla / Posible
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setFormData({ ...formData, type: 'CLIENT' })}
                                        className={`flex-1 p-3 border-2 border-black font-bold transition-all ${formData.type === 'CLIENT' ? 'bg-green-400' : 'bg-white hover:bg-gray-100'}`}
                                    >
                                        ✓ Cliente Activo
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div className="flex gap-4 mt-6">
                            <NeoButton variant="secondary" className="flex-1" onClick={() => setShowAddModal(false)}>Cancelar</NeoButton>
                            <NeoButton variant="primary" className="flex-1" onClick={handleCreate}>Crear</NeoButton>
                        </div>
                    </div>
                </div>
            )}

            {/* Client Detail / Edit Modal */}
            {selectedClient && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => { setSelectedClient(null); setIsEditing(false); }}>
                    <div className="bg-white border-4 border-neo-border shadow-neo max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                        {/* Header */}
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <span className={`px-2 py-1 text-xs font-bold border-2 border-neo-border ${getTypeBadge(selectedClient.type).bg}`}>
                                    {getTypeBadge(selectedClient.type).label}
                                </span>
                                <h2 className="text-2xl font-black uppercase mt-2">
                                    {isEditing ? '✏️ Editar' : selectedClient.name}
                                </h2>
                            </div>
                            <button onClick={() => { setSelectedClient(null); setIsEditing(false); }} className="text-2xl font-bold hover:text-red-500">✕</button>
                        </div>

                        {isEditing ? (
                            /* Edit Form */
                            <div className="space-y-4 mb-6">
                                <div>
                                    <label className="text-xs font-bold uppercase text-gray-500 block mb-1">Nombre *</label>
                                    <input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="w-full p-3 border-2 border-black font-medium" />
                                </div>
                                <div>
                                    <label className="text-xs font-bold uppercase text-gray-500 block mb-1">Dirección / Email</label>
                                    <input type="text" value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} className="w-full p-3 border-2 border-black font-medium" />
                                </div>
                                <div>
                                    <label className="text-xs font-bold uppercase text-gray-500 block mb-1">Teléfono</label>
                                    <input type="tel" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} className="w-full p-3 border-2 border-black font-medium" />
                                </div>
                                <div>
                                    <label className="text-xs font-bold uppercase text-gray-500 block mb-1">Categoría</label>
                                    <input type="text" value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value })} className="w-full p-3 border-2 border-black font-medium" />
                                </div>

                                <div className="flex gap-3 pt-4">
                                    <NeoButton variant="secondary" className="flex-1" onClick={() => setIsEditing(false)}>Cancelar</NeoButton>
                                    <NeoButton variant="primary" className="flex-1" onClick={handleUpdate}>Guardar</NeoButton>
                                </div>
                            </div>
                        ) : (
                            /* View Mode */
                            <>
                                {/* Client Info */}
                                <div className="grid grid-cols-2 gap-3 mb-6 p-4 bg-gray-50 border-2 border-neo-border text-sm">
                                    <p><strong>📍 Dirección:</strong> {selectedClient.address || '-'}</p>
                                    <p><strong>📞 Teléfono:</strong> {selectedClient.phone || '-'}</p>
                                    <p><strong>🏷️ Categoría:</strong> {selectedClient.category || '-'}</p>
                                    <p><strong>📅 Creado:</strong> {new Date(selectedClient.createdAt).toLocaleDateString('es-AR')}</p>
                                </div>

                                {/* Notes Section */}
                                <div className="mb-6">
                                    <h3 className="font-black uppercase text-sm mb-3 border-b-2 border-black pb-1">📝 Notas ({selectedClient.notes?.length || 0})</h3>

                                    {/* Add Note */}
                                    <div className="flex gap-2 mb-4">
                                        <input
                                            type="text"
                                            value={newNote}
                                            onChange={(e) => setNewNote(e.target.value)}
                                            placeholder="Agregar nota..."
                                            className="flex-1 p-2 border-2 border-neo-border text-sm"
                                            onKeyDown={(e) => e.key === 'Enter' && handleAddNote()}
                                        />
                                        <NeoButton size="sm" variant="accent" onClick={handleAddNote} disabled={!newNote.trim()}>
                                            + Agregar
                                        </NeoButton>
                                    </div>

                                    {/* Notes List */}
                                    <div className="space-y-2 max-h-48 overflow-y-auto">
                                        {selectedClient.notes?.length === 0 && (
                                            <p className="text-gray-400 text-sm italic">Sin notas aún</p>
                                        )}
                                        {selectedClient.notes?.map(note => (
                                            <div key={note.id} className="p-3 bg-neo-yellow/10 border-l-4 border-neo-yellow text-sm">
                                                <p>{note.content}</p>
                                                <p className="text-xs text-gray-400 mt-1">
                                                    {new Date(note.createdAt).toLocaleString('es-AR')}
                                                </p>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Actions */}
                                <div className="space-y-3 border-t-2 border-gray-200 pt-4">
                                    <div className="flex gap-3">
                                        <NeoButton variant="secondary" className="flex-1" onClick={() => setIsEditing(true)}>✏️ Editar</NeoButton>
                                        <NeoButton variant="danger" className="flex-1" onClick={handleDelete}>🗑️ Eliminar</NeoButton>
                                    </div>

                                    <NeoButton variant="secondary" className="w-full bg-purple-100 border-purple-900 text-purple-900 hover:bg-purple-200" onClick={handleOpenSchedule}>
                                        📅 Agendar Reunión
                                    </NeoButton>

                                    {selectedClient.type === 'LEAD' && (
                                        <NeoButton variant="accent" className="w-full" onClick={handleConvertToClient}>
                                            🎉 Convertir a Cliente Activo
                                        </NeoButton>
                                    )}

                                    <NeoButton variant="primary" className="w-full" onClick={() => window.location.href = `/projects?client=${selectedClient.id}`}>
                                        + Crear Proyecto
                                    </NeoButton>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}

            <CalendarEventModal
                isOpen={showScheduleModal}
                onClose={() => setShowScheduleModal(false)}
                onSave={handleSaveSchedule}
                initialData={scheduleInitialData}
            />
        </div>
    );
}

export default withAuth(CRMPage);
