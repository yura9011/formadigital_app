
'use client';

import React, { useEffect, useState, useCallback } from 'react';
import * as gmbService from '../../services/gmb.service';
import { AgencyClient, User } from '../../services/gmb.service';
import { Project } from '../../components/gmb/types';
import { NeoButton } from '../../components/neo/NeoButton';
import { NeoCard } from '../../components/neo/NeoCard';
import { CreateClientModal } from '../../components/projects/CreateClientModal';
import { CreateProjectModal } from '../../components/projects/CreateProjectModal';
import { PhaseItem } from '../../components/projects/PhaseItem';
import toast from 'react-hot-toast';
import { withAuth } from '../../components/auth/withAuth';

interface Template {
    id: string;
    name: string;
    description?: string;
    phases: { name: string; description?: string }[];
}

function ProjectsDashboard() {
    const [projects, setProjects] = useState<Project[]>([]);
    const [clients, setClients] = useState<any[]>([]);
    const [templates, setTemplates] = useState<Template[]>([]);
    const [users, setUsers] = useState<User[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [filter, setFilter] = useState('ALL');
    const [expandedProjectId, setExpandedProjectId] = useState<string | null>(null);

    // Modal states
    const [showClientModal, setShowClientModal] = useState(false);
    const [showProjectModal, setShowProjectModal] = useState(false);
    const [completionProjectId, setCompletionProjectId] = useState<string | null>(null);
    const [showReminderModal, setShowReminderModal] = useState<{ projectId: string; clientId: string } | null>(null);
    const [reminderForm, setReminderForm] = useState({ title: '', dueDate: '', userId: '' });

    const loadData = useCallback(async () => {
        setIsLoading(true);
        try {
            const [projectsData, clientsData, templatesData, usersData] = await Promise.all([
                gmbService.getAllProjects(),
                gmbService.fetchLeads(),
                gmbService.getTemplates(),
                gmbService.getUsers()
            ]);
            setProjects(projectsData);
            setClients(clientsData);
            setTemplates(templatesData);
            // Filter to only show real app users (with email containing @, excluding admin)
            const appUsers = usersData.filter(u =>
                u.email &&
                u.email.includes('@') &&
                !u.email.toLowerCase().includes('admin')
            );
            setUsers(appUsers);
        } catch (error) {
            console.error("Failed to load data", error);
            toast.error("Error al cargar datos");
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const handleSeedTemplates = async () => {
        const toastId = toast.loading('Creando plantillas...');
        try {
            await gmbService.createTemplate({
                name: 'GMB Optimization',
                description: 'Workflow estándar para optimización de perfil GMB.',
                phases: [
                    { name: 'Auditoría', description: 'Auditoría inicial del perfil.' },
                    { name: 'Keywords', description: 'Investigación de palabras clave.' },
                    { name: 'Actualizar Perfil', description: 'Actualizar categorías, horarios, descripción.' },
                    { name: 'Fotos', description: 'Subir fotos de alta calidad.' },
                    { name: 'Estrategia Reviews', description: 'Plan para conseguir más reseñas.' },
                    { name: 'Posts', description: 'Crear publicaciones iniciales.' }
                ]
            });
            await gmbService.createTemplate({
                name: 'RRSS Management',
                description: 'Gestión mensual de redes sociales.',
                phases: [
                    { name: 'Plan de Contenido', description: 'Crear calendario mensual.' },
                    { name: 'Diseño', description: 'Crear visuales para posts.' },
                    { name: 'Copywriting', description: 'Escribir textos y hashtags.' },
                    { name: 'Aprobación Cliente', description: 'Enviar al cliente para revisión.' },
                    { name: 'Programación', description: 'Programar posts en herramientas.' },
                    { name: 'Reporte', description: 'Informe de rendimiento mensual.' }
                ]
            });
            toast.success("Plantillas creadas!", { id: toastId });
            loadData();
        } catch (error) {
            console.error(error);
            toast.error("Error. Las plantillas podrían ya existir.", { id: toastId });
        }
    };

    const handleCreateClient = async (data: { name: string; address: string; phone?: string; category?: string }) => {
        const toastId = toast.loading('Creando cliente...');
        try {
            await gmbService.createClient(data);
            toast.success("Cliente creado!", { id: toastId });
            loadData();
        } catch (error) {
            console.error(error);
            toast.error("Error al crear cliente", { id: toastId });
        }
    };

    const handleCreateProject = async (data: { clientId: string; clientName: string; name: string; templateId?: string }) => {
        const toastId = toast.loading('Creando proyecto...');
        try {
            // First, create a Client record from the AgencyClient info
            const client = await gmbService.createClient({
                name: data.clientName,
                address: 'Via Clientes Dashboard'
            });

            // Then create the project with the new client ID
            await gmbService.createProject(client.id, {
                name: data.name,
                templateId: data.templateId
            });
            toast.success("Proyecto creado!", { id: toastId });
            loadData();
        } catch (error) {
            console.error(error);
            toast.error("Error al crear proyecto", { id: toastId });
        }
    };

    const handleUpdatePhase = async (phaseId: string, status: string, note?: string) => {
        const toastId = toast.loading('Actualizando fase...');
        try {
            await gmbService.updatePhase(phaseId, {
                status,
                description: note || undefined
            });
            toast.success("Fase actualizada!", { id: toastId });
            loadData();
        } catch (error) {
            console.error(error);
            toast.error("Error al actualizar fase", { id: toastId });
        }
    };

    const handleDeleteProject = async (projectId: string, projectName: string) => {
        if (!confirm(`¿Eliminar proyecto "${projectName}"? Esta acción no se puede deshacer.`)) return;

        const toastId = toast.loading('Eliminando proyecto...');
        try {
            await gmbService.deleteProject(projectId);
            toast.success("Proyecto eliminado!", { id: toastId });
            loadData();
        } catch (error) {
            console.error(error);
            toast.error("Error al eliminar proyecto", { id: toastId });
        }
    };

    const handleChangeStatus = async (projectId: string, newStatus: string) => {
        // If marking as COMPLETED, show completion modal
        if (newStatus === 'COMPLETED') {
            setCompletionProjectId(projectId);
            return;
        }

        const toastId = toast.loading('Actualizando estado...');
        try {
            await gmbService.updateProject(projectId, { status: newStatus });
            toast.success("Estado actualizado!", { id: toastId });
            loadData();
        } catch (error) {
            console.error(error);
            toast.error("Error al actualizar estado", { id: toastId });
        }
    };

    const handleAddNote = async (phaseId: string, note: string) => {
        const toastId = toast.loading('Agregando nota...');
        try {
            // Get current phase description and append new note with timestamp
            const timestamp = new Date().toLocaleDateString('es-AR');
            const newNote = `[${timestamp}] ${note}`;

            await gmbService.updatePhase(phaseId, {
                description: newNote
            });
            toast.success("Nota agregada!", { id: toastId });
            loadData();
        } catch (error) {
            console.error(error);
            toast.error("Error al agregar nota", { id: toastId });
        }
    };

    const handleCompleteProject = async (createFollowUp: boolean) => {
        if (!completionProjectId) return;

        const toastId = toast.loading('Finalizando proyecto...');
        try {
            // Mark current project as COMPLETED
            await gmbService.updateProject(completionProjectId, { status: 'COMPLETED' });

            // If create follow-up, create new project for same client
            if (createFollowUp) {
                const currentProject = projects.find(p => p.id === completionProjectId);
                if (currentProject && currentProject.clientId) {
                    await gmbService.createProject(currentProject.clientId, {
                        name: `Seguimiento - ${currentProject.name}`
                    });
                    toast.success("Proyecto completado y seguimiento creado!", { id: toastId });
                }
            } else {
                toast.success("Proyecto completado!", { id: toastId });
            }

            setCompletionProjectId(null);
            loadData();
        } catch (error) {
            console.error(error);
            toast.error("Error al completar proyecto", { id: toastId });
        }
    };

    const handleCreateReminder = async () => {
        if (!showReminderModal || !reminderForm.title || !reminderForm.dueDate || !reminderForm.userId) {
            toast.error("Completar todos los campos");
            return;
        }

        const toastId = toast.loading('Creando recordatorio...');
        try {
            await gmbService.createReminder({
                title: reminderForm.title,
                dueDate: reminderForm.dueDate,
                userId: reminderForm.userId,
                projectId: showReminderModal.projectId,
                clientId: showReminderModal.clientId
            });
            toast.success("Recordatorio creado!", { id: toastId });
            setShowReminderModal(null);
            setReminderForm({ title: '', dueDate: '', userId: '' });
        } catch (error) {
            console.error(error);
            toast.error("Error al crear recordatorio", { id: toastId });
        }
    };

    const handleAssignProject = async (projectId: string, userId: string | undefined) => {
        const toastId = toast.loading('Asignando...');
        try {
            await gmbService.assignProject(projectId, userId);
            toast.success(userId ? "Proyecto asignado!" : "Asignación removida", { id: toastId });
            loadData();
        } catch (error) {
            console.error(error);
            toast.error("Error al asignar", { id: toastId });
        }
    };

    const toggleExpand = (projectId: string) => {
        setExpandedProjectId(prev => prev === projectId ? null : projectId);
    };

    const [viewFilter, setViewFilter] = useState<'ALL' | 'MINE'>('ALL');
    const [currentUserId, setCurrentUserId] = useState('');

    useEffect(() => {
        const userId = localStorage.getItem('currentUserId');
        if (userId) {
            setCurrentUserId(userId);
            setViewFilter('MINE'); // Default to showing my projects
        }
    }, []);

    const filteredProjects = projects.filter(p => {
        // Status filter
        if (filter !== 'ALL' && p.status !== filter) return false;

        // User filter
        if (viewFilter === 'MINE' && currentUserId) {
            return p.assignedToId === currentUserId;
        }

        return true;
    });

    const clientCount = clients.length;

    return (
        <div className="min-h-screen bg-neo-bg text-neo-text p-4 md:p-8 font-sans">
            <header className="mb-12 flex flex-wrap justify-between items-center border-b-4 border-neo-border pb-6 gap-4">
                <div className="flex items-center gap-4">
                    <NeoButton onClick={() => window.location.href = '/'} size="sm" variant="secondary">
                        ← Back
                    </NeoButton>
                    <h1 className="text-4xl md:text-6xl font-black tracking-tighter uppercase italic text-neo-text drop-shadow-[4px_4px_0px_rgba(0,0,0,1)]">
                        Projects
                    </h1>
                </div>
                <div className="flex gap-2 flex-wrap">
                    <NeoButton onClick={() => setShowClientModal(true)} variant="accent" size="sm">
                        + Cliente
                    </NeoButton>
                    <NeoButton
                        onClick={() => setShowProjectModal(true)}
                        variant="primary"
                        size="sm"
                        disabled={clientCount === 0}
                    >
                        + Proyecto
                    </NeoButton>
                    <NeoButton onClick={handleSeedTemplates} variant="secondary" size="sm">
                        Seed Templates
                    </NeoButton>
                    <NeoButton onClick={loadData} size="sm" variant="secondary">
                        ↻
                    </NeoButton>
                </div>
            </header>

            {/* View Filters */}
            <div className="flex gap-4 mb-6 border-b-2 border-gray-200">
                <button
                    onClick={() => setViewFilter('MINE')}
                    className={`pb-2 px-4 font-bold uppercase text-sm ${viewFilter === 'MINE'
                            ? 'border-b-4 border-neo-blue text-neo-blue'
                            : 'text-gray-400 hover:text-gray-600'
                        }`}
                >
                    👤 Mis Proyectos
                </button>
                <button
                    onClick={() => setViewFilter('ALL')}
                    className={`pb-2 px-4 font-bold uppercase text-sm ${viewFilter === 'ALL'
                            ? 'border-b-4 border-neo-blue text-neo-blue'
                            : 'text-gray-400 hover:text-gray-600'
                        }`}
                >
                    🌎 Todos
                </button>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                <NeoCard className="bg-neo-blue text-white">
                    <h3 className="text-white text-xs font-bold uppercase tracking-widest mb-1">Total</h3>
                    <p className="text-3xl font-black">{projects.length}</p>
                </NeoCard>
                <NeoCard className="bg-neo-yellow/30">
                    <h3 className="text-neo-text text-xs font-bold uppercase tracking-widest mb-1">En Progreso</h3>
                    <p className="text-3xl font-black">{projects.filter(p => p.status === 'IN_PROGRESS').length}</p>
                </NeoCard>
                <NeoCard className="bg-green-200">
                    <h3 className="text-green-800 text-xs font-bold uppercase tracking-widest mb-1">Completados</h3>
                    <p className="text-3xl font-black text-green-900">{projects.filter(p => p.status === 'COMPLETED').length}</p>
                </NeoCard>
                <NeoCard className="bg-gray-200">
                    <h3 className="text-gray-600 text-xs font-bold uppercase tracking-widest mb-1">Clientes</h3>
                    <p className="text-3xl font-black text-gray-800">{clientCount}</p>
                </NeoCard>
            </div>

            {/* Filter Bar */}
            <div className="flex space-x-2 mb-6 overflow-x-auto pb-2">
                {['ALL', 'PLANNING', 'IN_PROGRESS', 'COMPLETED', 'ON_HOLD'].map(status => (
                    <button
                        key={status}
                        onClick={() => setFilter(status)}
                        className={`px-4 py-2 border-2 border-neo-border font-bold uppercase text-xs transition-all whitespace-nowrap
                            ${filter === status
                                ? 'bg-neo-text text-white shadow-neo-sm translate-x-[2px] translate-y-[2px]'
                                : 'bg-white text-neo-text hover:bg-gray-100 shadow-neo hover:translate-x-[-2px] hover:translate-y-[-2px]'
                            }`}
                    >
                        {status === 'ALL' ? 'Todos' : status.replace('_', ' ')}
                    </button>
                ))}
            </div>

            {/* Projects List */}
            {isLoading ? (
                <div className="flex justify-center py-12">
                    <div className="animate-spin w-12 h-12 border-4 border-neo-border border-t-neo-blue rounded-full"></div>
                </div>
            ) : filteredProjects.length === 0 ? (
                <NeoCard className="bg-white text-center py-12">
                    <p className="text-gray-500 font-bold">No hay proyectos</p>
                    <p className="text-sm text-gray-400 mt-2">
                        {clientCount === 0
                            ? "Primero crea un cliente, luego podrás crear proyectos."
                            : "Crea tu primer proyecto con el botón + Proyecto"
                        }
                    </p>
                </NeoCard>
            ) : (
                <div className="space-y-4">
                    {filteredProjects.map(project => (
                        <NeoCard key={project.id} className="bg-white p-0 overflow-hidden">
                            {/* Project Header Row */}
                            <div
                                className="p-4 cursor-pointer hover:bg-gray-50 transition-colors flex items-center gap-4"
                                onClick={() => toggleExpand(project.id)}
                            >
                                <span className="text-xl font-bold text-gray-400">
                                    {expandedProjectId === project.id ? '▼' : '▶'}
                                </span>

                                {/* LEFT: Client Reference */}
                                <div className="flex-1 min-w-0">
                                    <p className="text-xs font-bold uppercase text-gray-500 tracking-wide">Cliente</p>
                                    <h3 className="font-black text-lg truncate">{project.client?.name || 'Sin cliente'}</h3>
                                    <p className="text-xs text-gray-400">{project.client?.category || ''}</p>
                                </div>

                                {/* RIGHT: Project Type */}
                                <div className="text-right flex-1 min-w-0 hidden md:block">
                                    <p className="text-xs font-bold uppercase text-gray-500 tracking-wide">Proyecto</p>
                                    <h4 className="font-bold truncate">{project.name}</h4>
                                    <p className="text-xs text-gray-400">{project.phases?.length || 0} fases</p>
                                </div>

                                <span className={`px-3 py-1 text-xs font-black uppercase border-2 border-neo-border whitespace-nowrap
                                    ${project.status === 'COMPLETED' ? 'bg-green-300' :
                                        project.status === 'IN_PROGRESS' ? 'bg-blue-300' :
                                            project.status === 'ON_HOLD' ? 'bg-orange-300' :
                                                'bg-gray-200'
                                    }`}>
                                    {project.status.replace('_', ' ')}
                                </span>

                                <div className="w-24 hidden lg:block">
                                    <div className="w-full bg-gray-200 h-3 border-2 border-neo-border">
                                        <div
                                            className="bg-neo-orange h-full transition-all"
                                            style={{
                                                width: `${(project.phases?.filter(p => p.status === 'DONE').length / (project.phases?.length || 1)) * 100}%`
                                            }}
                                        ></div>
                                    </div>
                                </div>
                            </div>

                            {/* Expanded Phases */}
                            {expandedProjectId === project.id && project.phases && (
                                <div className="border-t-4 border-neo-border bg-gray-50 p-4">
                                    {/* Project Actions */}
                                    <div className="flex flex-wrap gap-2 mb-4 pb-4 border-b-2 border-neo-border">
                                        <span className="font-bold text-sm uppercase text-gray-600 mr-2">Cambiar estado:</span>
                                        {['PLANNING', 'IN_PROGRESS', 'COMPLETED', 'ON_HOLD'].map(status => (
                                            <button
                                                key={status}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleChangeStatus(project.id, status);
                                                }}
                                                disabled={project.status === status}
                                                className={`px-3 py-1 text-xs font-bold uppercase border-2 border-neo-border transition-all
                                                    ${project.status === status
                                                        ? 'bg-neo-blue text-white cursor-default'
                                                        : 'bg-white hover:bg-gray-100 hover:shadow-neo-sm'
                                                    }`}
                                            >
                                                {status.replace('_', ' ')}
                                            </button>
                                        ))}
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleDeleteProject(project.id, project.name);
                                            }}
                                            className="px-3 py-1 text-xs font-bold uppercase border-2 border-neo-border bg-red-400 text-white hover:bg-red-500 transition-all"
                                        >
                                            🗑️ Eliminar
                                        </button>
                                    </div>

                                    {/* Assignment & Reminder Row */}
                                    <div className="flex flex-wrap gap-4 items-center mb-4 pb-4 border-b-2 border-gray-200">
                                        <div className="flex items-center gap-2">
                                            <span className="font-bold text-xs uppercase text-gray-500">Asignado a:</span>
                                            <select
                                                value={(project as unknown as { assignedToId?: string }).assignedToId || ''}
                                                onChange={(e) => {
                                                    e.stopPropagation();
                                                    handleAssignProject(project.id, e.target.value || undefined);
                                                }}
                                                onClick={(e) => e.stopPropagation()}
                                                className="px-2 py-1 text-sm border-2 border-neo-border font-medium bg-white"
                                            >
                                                <option value="">Sin asignar</option>
                                                {users.map(user => (
                                                    <option key={user.id} value={user.id}>
                                                        {user.name || user.email}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setShowReminderModal({ projectId: project.id, clientId: project.clientId });
                                            }}
                                            className="px-3 py-1 text-xs font-bold uppercase border-2 border-neo-border bg-neo-yellow hover:bg-neo-orange transition-all"
                                        >
                                            🔔 Crear Recordatorio
                                        </button>
                                    </div>

                                    <h4 className="font-bold uppercase text-sm mb-4 text-gray-600">Fases del Proyecto</h4>
                                    <div className="space-y-2">
                                        {project.phases
                                            .sort((a, b) => a.order - b.order)
                                            .map(phase => (
                                                <PhaseItem
                                                    key={phase.id}
                                                    phase={phase}
                                                    onUpdateStatus={handleUpdatePhase}
                                                    onAddNote={handleAddNote}
                                                />
                                            ))
                                        }
                                    </div>
                                    {project.phases.length === 0 && (
                                        <p className="text-gray-400 text-sm">Este proyecto no tiene fases definidas.</p>
                                    )}
                                </div>
                            )}
                        </NeoCard>
                    ))}
                </div>
            )}

            {/* Modals */}
            <CreateClientModal
                isOpen={showClientModal}
                onClose={() => setShowClientModal(false)}
                onSubmit={handleCreateClient}
            />

            <CreateProjectModal
                isOpen={showProjectModal}
                onClose={() => setShowProjectModal(false)}
                onSubmit={handleCreateProject}
                clients={clients}
                templates={templates}
            />

            {/* Completion Modal */}
            {completionProjectId && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white border-4 border-neo-border shadow-neo max-w-md w-full p-6">
                        <h2 className="text-2xl font-black uppercase mb-4">✅ Completar Proyecto</h2>
                        <p className="text-gray-600 mb-6">
                            ¿Qué deseas hacer al completar este proyecto?
                        </p>

                        <div className="space-y-3">
                            <button
                                onClick={() => handleCompleteProject(true)}
                                className="w-full p-4 border-2 border-neo-border bg-neo-yellow/30 hover:bg-neo-yellow/50 transition-all text-left"
                            >
                                <span className="font-bold block">🔄 Crear proyecto de seguimiento</span>
                                <span className="text-sm text-gray-600">Marca como completado y crea un nuevo proyecto para continuar con el cliente</span>
                            </button>

                            <button
                                onClick={() => handleCompleteProject(false)}
                                className="w-full p-4 border-2 border-neo-border bg-green-100 hover:bg-green-200 transition-all text-left"
                            >
                                <span className="font-bold block">✓ Solo cerrar proyecto</span>
                                <span className="text-sm text-gray-600">Marca como completado sin crear seguimiento</span>
                            </button>

                            <button
                                onClick={() => setCompletionProjectId(null)}
                                className="w-full p-3 border-2 border-neo-border bg-gray-100 hover:bg-gray-200 transition-all font-bold uppercase text-sm"
                            >
                                Cancelar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Reminder Creation Modal */}
            {showReminderModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowReminderModal(null)}>
                    <div className="bg-white border-4 border-neo-border shadow-neo max-w-md w-full p-6" onClick={e => e.stopPropagation()}>
                        <h2 className="text-2xl font-black uppercase mb-6 border-b-2 border-black pb-2">🔔 Nuevo Recordatorio</h2>

                        <div className="space-y-4">
                            <div>
                                <label className="text-xs font-bold uppercase text-gray-500 block mb-1">Título *</label>
                                <input
                                    type="text"
                                    value={reminderForm.title}
                                    onChange={(e) => setReminderForm({ ...reminderForm, title: e.target.value })}
                                    placeholder="ej: Llamar para seguimiento"
                                    className="w-full p-3 border-2 border-black font-medium"
                                />
                            </div>
                            <div>
                                <label className="text-xs font-bold uppercase text-gray-500 block mb-1">Fecha de recordatorio *</label>
                                <input
                                    type="datetime-local"
                                    value={reminderForm.dueDate}
                                    onChange={(e) => setReminderForm({ ...reminderForm, dueDate: e.target.value })}
                                    className="w-full p-3 border-2 border-black font-medium"
                                />
                            </div>
                            <div>
                                <label className="text-xs font-bold uppercase text-gray-500 block mb-1">Asignar a *</label>
                                <select
                                    value={reminderForm.userId}
                                    onChange={(e) => setReminderForm({ ...reminderForm, userId: e.target.value })}
                                    className="w-full p-3 border-2 border-black font-medium"
                                >
                                    <option value="">Seleccionar usuario</option>
                                    {users.map(user => (
                                        <option key={user.id} value={user.id}>
                                            {user.name || user.email}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="flex gap-4 mt-6">
                            <NeoButton variant="secondary" className="flex-1" onClick={() => setShowReminderModal(null)}>
                                Cancelar
                            </NeoButton>
                            <NeoButton variant="primary" className="flex-1" onClick={handleCreateReminder}>
                                Crear Recordatorio
                            </NeoButton>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default withAuth(ProjectsDashboard);
