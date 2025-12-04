'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const router = useRouter();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const res = await signIn('credentials', {
            email,
            password,
            redirect: false,
        });

        if (res?.error) {
            setError('Invalid email or password');
        } else {
            router.push('/calendar');
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white">
            <div className="bg-gray-800 p-8 rounded-lg shadow-lg w-full max-w-md border border-gray-700">
                <h1 className="text-2xl font-bold mb-6 text-center text-blue-500">Forma Digital Login</h1>

                {error && (
                    <div className="bg-red-900 text-red-200 p-3 rounded mb-4 text-sm">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">Email</label>
                        <input
                            type="email"
                            className="w-full p-2 border border-gray-600 rounded bg-gray-700 text-white focus:ring-2 focus:ring-blue-500 outline-none"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">Password</label>
                        <input
                            type="password"
                            className="w-full p-2 border border-gray-600 rounded bg-gray-700 text-white focus:ring-2 focus:ring-blue-500 outline-none"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                    </div>
                    <button
                        type="submit"
                        className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 font-semibold transition-colors"
                    >
                        Sign In
                    </button>
                </form>
            </div>
        </div>
    );
}
