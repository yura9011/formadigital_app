'use client';

import React, { useState } from 'react';
import { NeoButton } from '../neo/NeoButton';
import { NeoInput } from '../neo/NeoInput';

interface CreateClientModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (data: { name: string; address: string; phone?: string; category?: string }) => void;
}

export const CreateClientModal: React.FC<CreateClientModalProps> = ({ isOpen, onClose, onSubmit }) => {
    const [name, setName] = useState('');
    const [address, setAddress] = useState('');
    const [phone, setPhone] = useState('');
    const [category, setCategory] = useState('');

    if (!isOpen) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim() || !address.trim()) return;

        onSubmit({
            name: name.trim(),
            address: address.trim(),
            phone: phone.trim() || undefined,
            category: category.trim() || undefined
        });

        // Reset form
        setName('');
        setAddress('');
        setPhone('');
        setCategory('');
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white border-4 border-neo-border shadow-neo max-w-md w-full p-6">
                <h2 className="text-2xl font-black uppercase mb-6">Nuevo Cliente</h2>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-bold uppercase mb-2">Nombre *</label>
                        <NeoInput
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Nombre del negocio"
                            required
                            className="w-full"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-bold uppercase mb-2">Dirección *</label>
                        <NeoInput
                            type="text"
                            value={address}
                            onChange={(e) => setAddress(e.target.value)}
                            placeholder="Dirección completa"
                            required
                            className="w-full"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-bold uppercase mb-2">Teléfono</label>
                        <NeoInput
                            type="tel"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            placeholder="Número de teléfono"
                            className="w-full"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-bold uppercase mb-2">Categoría</label>
                        <NeoInput
                            type="text"
                            value={category}
                            onChange={(e) => setCategory(e.target.value)}
                            placeholder="Ej: Restaurante, Peluquería..."
                            className="w-full"
                        />
                    </div>

                    <div className="flex gap-4 pt-4">
                        <NeoButton type="button" variant="secondary" onClick={onClose} className="flex-1">
                            Cancelar
                        </NeoButton>
                        <NeoButton type="submit" variant="primary" className="flex-1">
                            Crear Cliente
                        </NeoButton>
                    </div>
                </form>
            </div>
        </div>
    );
};
