'use client';

import { useState, useEffect } from 'react';
import { NeoCard } from '../../components/neo/NeoCard';
import { NeoButton } from '../../components/neo/NeoButton';
import { NeoInput } from '../../components/neo/NeoInput';
import { NeoSelect } from '../../components/neo/NeoSelect';

interface Integration {
    id: string;
    name: string;
    provider: string;
    picture?: string;
}

export default function SettingsPage() {
    const [integrations, setIntegrations] = useState<Integration[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Form State
    const [name, setName] = useState('');
    const [provider, setProvider] = useState('instagram');
    const [token, setToken] = useState('');
    const [accountId, setAccountId] = useState('');

    useEffect(() => {
        fetchIntegrations();
    }, []);

    const fetchIntegrations = async () => {
        try {
            const res = await fetch('http://localhost:3001/integrations');
            const data = await res.json();
            setIntegrations(data);
        } catch (error) {
            console.error('Failed to fetch integrations', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleDisconnect = async (id: string) => {
        if (!confirm('¿Estás seguro de que quieres desconectar esta cuenta?')) return;

        try {
            await fetch(`http://localhost:3001/integrations/${id}`, { method: 'DELETE' });
            setIntegrations(prev => prev.filter(i => i.id !== id));
        } catch (error) {
            console.error('Failed to disconnect', error);
            alert('Error al desconectar');
        }
    };

    const handleConnect = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);

        try {
            const res = await fetch('http://localhost:3001/integrations', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, provider, token, accountId }),
            });

            if (!res.ok) throw new Error('Failed to connect');

            const newIntegration = await res.json();
            setIntegrations(prev => [...prev, newIntegration]);

            // Reset form
            setName('');
            setToken('');
            setAccountId('');
            alert('¡Cuenta conectada exitosamente!');
        } catch (error) {
            console.error('Failed to connect', error);
            alert('Error al conectar la cuenta. Verifica los datos.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="p-4 md:p-8 max-w-4xl mx-auto">
            <div className="flex justify-between items-center mb-8">
                <h1 className="text-4xl font-black uppercase tracking-tighter">Configuración</h1>
                <NeoButton onClick={() => window.location.href = '/'}>Volver</NeoButton>
            </div>

            <div className="grid gap-8">
                {/* Connected Accounts */}
                <NeoCard title="Cuentas Conectadas">
                    {isLoading ? (
                        <div className="p-4 text-center font-mono">Cargando...</div>
                    ) : integrations.length > 0 ? (
                        <div className="grid gap-4">
                            {integrations.map((int) => (
                                <div key={int.id} className="flex items-center justify-between p-4 border-2 border-neo-border bg-gray-50 shadow-neo-sm">
                                    <div className="flex items-center gap-4">
                                        <div className={`w-12 h-12 rounded-full border-2 border-black flex items-center justify-center text-2xl ${int.provider === 'instagram' ? 'bg-neo-pink text-white' : 'bg-neo-blue text-white'}`}>
                                            {int.provider === 'instagram' ? 'IG' : 'FB'}
                                        </div>
                                        <div>
                                            <div className="font-bold text-lg">{int.name}</div>
                                            <div className="text-xs font-mono uppercase text-gray-500">{int.provider}</div>
                                        </div>
                                    </div>
                                    <NeoButton
                                        onClick={() => handleDisconnect(int.id)}
                                        className="bg-red-500 text-white hover:bg-red-600 border-red-700"
                                    >
                                        Desconectar
                                    </NeoButton>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="p-8 text-center text-gray-500 italic border-2 border-dashed border-gray-300">
                            No hay cuentas conectadas.
                        </div>
                    )}
                </NeoCard>

                {/* Add New Account */}
                <NeoCard title="Conectar Nueva Cuenta">
                    <form onSubmit={handleConnect} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <NeoSelect
                                label="Plataforma"
                                value={provider}
                                onChange={(e) => setProvider(e.target.value)}
                            >
                                <option value="instagram">Instagram Business</option>
                                <option value="facebook">Facebook Page</option>
                            </NeoSelect>
                            <NeoInput
                                label="Nombre de la Cuenta"
                                placeholder="Ej. Mi Negocio"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                required
                            />
                        </div>

                        <NeoInput
                            label="Access Token (Graph API)"
                            placeholder="EAAB..."
                            value={token}
                            onChange={(e) => setToken(e.target.value)}
                            required
                        />

                        <NeoInput
                            label="Account ID / Page ID"
                            placeholder="123456789..."
                            value={accountId}
                            onChange={(e) => setAccountId(e.target.value)}
                            required
                        />

                        <div className="pt-4">
                            <NeoButton
                                type="submit"
                                className="w-full md:w-auto bg-neo-green text-black"
                                disabled={isSubmitting}
                            >
                                {isSubmitting ? 'Conectando...' : 'Conectar Cuenta'}
                            </NeoButton>
                        </div>

                        <div className="text-xs text-gray-500 mt-2">
                            * Por ahora, debes generar el token manualmente en el <a href="https://developers.facebook.com/tools/explorer/" target="_blank" className="underline font-bold text-blue-600">Graph API Explorer</a>.
                        </div>
                    </form>
                </NeoCard>
            </div>
        </div>
    );
}
