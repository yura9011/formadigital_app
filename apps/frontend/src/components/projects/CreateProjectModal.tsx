'use client';

import React, { useState, useEffect } from 'react';
import { NeoButton } from '../neo/NeoButton';
import { NeoInput } from '../neo/NeoInput';
import { NeoSelect } from '../neo/NeoSelect';
import { AgencyClient } from '../../services/gmb.service';

interface Template {
    id: string;
    name: string;
    description?: string;
    phases: { name: string; description?: string }[];
}

interface CreateProjectModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (data: { clientId: string; clientName: string; name: string; templateId?: string }) => void;
    clients: any[];
    templates: Template[];
}

export const CreateProjectModal: React.FC<CreateProjectModalProps> = ({
    isOpen,
    onClose,
    onSubmit,
    clients,
    templates
}) => {
    const [clientId, setClientId] = useState('');
    const [projectName, setProjectName] = useState('');
    const [templateId, setTemplateId] = useState('');

    useEffect(() => {
        if (isOpen && clients.length > 0 && !clientId) {
            setClientId(clients[0].id);
        }
    }, [isOpen, clients, clientId]);

    if (!isOpen) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!clientId || !projectName.trim()) return;

        const selectedClient = clients.find(c => c.id === clientId);

        onSubmit({
            clientId,
            clientName: selectedClient?.name || 'Unknown',
            name: projectName.trim(),
            templateId: templateId || undefined
        });

        // Reset form
        setProjectName('');
        setTemplateId('');
        setClientId('');
        onClose();
    };

    const selectedTemplate = templates.find(t => t.id === templateId);

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white border-4 border-neo-border shadow-neo max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto">
                <h2 className="text-2xl font-black uppercase mb-6">Nuevo Proyecto</h2>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-bold uppercase mb-2">Cliente *</label>
                        <NeoSelect
                            value={clientId}
                            onChange={(e) => setClientId(e.target.value)}
                            className="w-full"
                            required
                        >
                            <option value="">Seleccionar cliente...</option>
                            {clients.map(client => (
                                <option key={client.id} value={client.id}>
                                    {client.name} {client.email ? `(${client.email})` : ''}
                                </option>
                            ))}
                        </NeoSelect>
                        {clients.length === 0 && (
                            <p className="text-sm text-red-600 mt-1">No hay clientes. Crea uno en la sección CLIENTES.</p>
                        )}
                    </div>

                    <div>
                        <label className="block text-sm font-bold uppercase mb-2">Nombre del Proyecto *</label>
                        <NeoInput
                            type="text"
                            value={projectName}
                            onChange={(e) => setProjectName(e.target.value)}
                            placeholder="Ej: GMB Optimización Marzo 2024"
                            required
                            className="w-full"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-bold uppercase mb-2">Plantilla</label>
                        <NeoSelect
                            value={templateId}
                            onChange={(e) => setTemplateId(e.target.value)}
                            className="w-full"
                        >
                            <option value="">Sin plantilla (proyecto vacío)</option>
                            {templates.map(template => (
                                <option key={template.id} value={template.id}>
                                    {template.name}
                                </option>
                            ))}
                        </NeoSelect>
                    </div>

                    {selectedTemplate && (
                        <div className="bg-gray-100 border-2 border-neo-border p-4">
                            <h4 className="font-bold text-sm uppercase mb-2">Fases incluidas:</h4>
                            <ul className="text-sm space-y-1">
                                {selectedTemplate.phases.map((phase, idx) => (
                                    <li key={idx} className="flex items-center gap-2">
                                        <span className="w-6 h-6 bg-neo-yellow border-2 border-neo-border flex items-center justify-center font-bold text-xs">
                                            {idx + 1}
                                        </span>
                                        {phase.name}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}

                    <div className="flex gap-4 pt-4">
                        <NeoButton type="button" variant="secondary" onClick={onClose} className="flex-1">
                            Cancelar
                        </NeoButton>
                        <NeoButton
                            type="submit"
                            variant="primary"
                            className="flex-1"
                            disabled={!clientId || !projectName.trim()}
                        >
                            Crear Proyecto
                        </NeoButton>
                    </div>
                </form>
            </div>
        </div>
    );
};
