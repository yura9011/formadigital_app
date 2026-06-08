'use client';

import { useState } from 'react';
import { NeoCard } from '../../components/neo/NeoCard';
import { NeoButton } from '../../components/neo/NeoButton';
import { NeoInput } from '../../components/neo/NeoInput';
import toast from 'react-hot-toast';

import { API_URL as API_BASE } from '@/config/api';

export default function LoginPage() {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            const res = await fetch(`${API_BASE}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });

            if (!res.ok) {
                const error = await res.json().catch(() => ({ message: 'Error de autenticación' }));
                throw new Error(error.message || 'Credenciales inválidas');
            }

            const data = await res.json();

            // Store user session in localStorage
            localStorage.setItem('currentUserId', data.user.id);
            localStorage.setItem('currentUserName', data.user.name || data.user.email);
            localStorage.setItem('currentUserEmail', data.user.email);

            toast.success(`¡Bienvenido, ${data.user.name || data.user.email}!`);

            // Redirect to home
            window.location.href = '/';
        } catch (error) {
            console.error('Login failed:', error);
            toast.error(error instanceof Error ? error.message : 'Error al iniciar sesión');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-neo-bg flex items-center justify-center p-4">
            <div className="w-full max-w-md">
                <div className="text-center mb-8">
                    <h1 className="text-4xl font-black tracking-tighter uppercase italic text-neo-text drop-shadow-[4px_4px_0px_rgba(0,0,0,1)] mb-2">
                        Forma Digital
                    </h1>
                    <p className="text-lg font-bold text-gray-600 uppercase tracking-widest">
                        Iniciar Sesión
                    </p>
                </div>

                <NeoCard className="p-8">
                    <form onSubmit={handleLogin} className="space-y-6">
                        <NeoInput
                            label="Usuario"
                            type="text"
                            placeholder="admin, lucas o marcos"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            required
                        />

                        <NeoInput
                            label="Contraseña"
                            type="password"
                            placeholder="••••••••"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />

                        <NeoButton
                            type="submit"
                            className="w-full bg-neo-blue text-white"
                            disabled={isLoading}
                        >
                            {isLoading ? 'Ingresando...' : 'Ingresar'}
                        </NeoButton>
                    </form>

                </NeoCard>
            </div>
        </div>
    );
}
