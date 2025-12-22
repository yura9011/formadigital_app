'use client';

import React, { useState } from 'react';
import { NeoButton } from '../neo/NeoButton';

interface Phase {
    id: string;
    name: string;
    description?: string;
    status: 'PENDING' | 'IN_PROGRESS' | 'REVIEW' | 'DONE';
    order: number;
}

interface PhaseItemProps {
    phase: Phase;
    onUpdateStatus: (phaseId: string, status: Phase['status'], note?: string) => void;
    onAddNote: (phaseId: string, note: string) => void;
}

const statusConfig = {
    PENDING: { label: 'Pendiente', bg: 'bg-gray-200', icon: '○' },
    IN_PROGRESS: { label: 'En Progreso', bg: 'bg-blue-300', icon: '●' },
    REVIEW: { label: 'Revisión', bg: 'bg-yellow-300', icon: '◐' },
    DONE: { label: 'Completado', bg: 'bg-green-300', icon: '✓' }
};

const nextStatus: Record<Phase['status'], Phase['status']> = {
    PENDING: 'IN_PROGRESS',
    IN_PROGRESS: 'REVIEW',
    REVIEW: 'DONE',
    DONE: 'DONE'
};

export const PhaseItem: React.FC<PhaseItemProps> = ({ phase, onUpdateStatus, onAddNote }) => {
    const [showNoteInput, setShowNoteInput] = useState(false);
    const [showAddNote, setShowAddNote] = useState(false);
    const [note, setNote] = useState('');
    const [additionalNote, setAdditionalNote] = useState('');

    const config = statusConfig[phase.status];
    const canAdvance = phase.status !== 'DONE';

    const handleAdvance = () => {
        if (canAdvance) {
            setShowNoteInput(true);
        }
    };

    const handleConfirmAdvance = () => {
        onUpdateStatus(phase.id, nextStatus[phase.status], note.trim() || undefined);
        setNote('');
        setShowNoteInput(false);
    };

    const handleCancel = () => {
        setNote('');
        setShowNoteInput(false);
    };

    const handleAddNote = () => {
        if (additionalNote.trim()) {
            onAddNote(phase.id, additionalNote.trim());
            setAdditionalNote('');
            setShowAddNote(false);
        }
    };

    return (
        <div className="border-l-4 border-neo-border pl-4 py-3 hover:bg-gray-50 transition-colors">
            <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 flex-1">
                    <span className={`w-8 h-8 ${config.bg} border-2 border-neo-border flex items-center justify-center font-bold text-sm`}>
                        {config.icon}
                    </span>
                    <div className="flex-1">
                        <p className="font-bold">{phase.name}</p>
                        {phase.description && (
                            <p className="text-sm text-gray-600 italic">📝 {phase.description}</p>
                        )}
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <span className={`px-3 py-1 text-xs font-bold uppercase border-2 border-neo-border ${config.bg}`}>
                        {config.label}
                    </span>

                    {!showNoteInput && !showAddNote && (
                        <button
                            onClick={() => setShowAddNote(true)}
                            className="px-2 py-1 text-xs font-bold border-2 border-neo-border bg-white hover:bg-gray-100 transition-all"
                            title="Agregar nota"
                        >
                            📝+
                        </button>
                    )}

                    {canAdvance && !showNoteInput && !showAddNote && (
                        <NeoButton
                            size="sm"
                            variant="accent"
                            onClick={handleAdvance}
                        >
                            Avanzar →
                        </NeoButton>
                    )}
                </div>
            </div>

            {/* Add Note Panel */}
            {showAddNote && (
                <div className="mt-3 ml-11 p-3 bg-blue-50 border-2 border-neo-border">
                    <p className="text-sm font-bold mb-2">📝 Agregar nota a esta fase:</p>
                    <textarea
                        value={additionalNote}
                        onChange={(e) => setAdditionalNote(e.target.value)}
                        placeholder="Escribir nota..."
                        className="w-full px-3 py-2 border-2 border-neo-border mb-2 text-sm resize-none"
                        rows={2}
                        autoFocus
                    />
                    <div className="flex gap-2">
                        <NeoButton size="sm" variant="secondary" onClick={() => { setShowAddNote(false); setAdditionalNote(''); }}>
                            Cancelar
                        </NeoButton>
                        <NeoButton size="sm" variant="primary" onClick={handleAddNote} disabled={!additionalNote.trim()}>
                            Guardar Nota
                        </NeoButton>
                    </div>
                </div>
            )}

            {/* Advance Status Panel */}
            {showNoteInput && (
                <div className="mt-3 ml-11 p-3 bg-neo-yellow/20 border-2 border-neo-border">
                    <p className="text-sm font-bold mb-2">
                        Cambiar a: <span className="text-neo-blue">{statusConfig[nextStatus[phase.status]].label}</span>
                    </p>
                    <input
                        type="text"
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        placeholder="Agregar nota (opcional)..."
                        className="w-full px-3 py-2 border-2 border-neo-border mb-2 text-sm"
                        autoFocus
                    />
                    <div className="flex gap-2">
                        <NeoButton size="sm" variant="secondary" onClick={handleCancel}>
                            Cancelar
                        </NeoButton>
                        <NeoButton size="sm" variant="primary" onClick={handleConfirmAdvance}>
                            Confirmar
                        </NeoButton>
                    </div>
                </div>
            )}
        </div>
    );
};
