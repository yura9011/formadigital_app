'use client';

import React, { useState } from 'react';

interface ApiKeys {
    GEMINI_API_KEY?: string;
    OPENROUTER_API_KEY?: string;
    SERPAPI_API_KEY?: string;
}

interface AgentAnalysisButtonProps {
    query: string;
    location: string;
    apiKeys?: ApiKeys;
    onComplete?: (results: any) => void;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

export default function AgentAnalysisButton({ query, location, apiKeys, onComplete }: AgentAnalysisButtonProps) {
    const [isRunning, setIsRunning] = useState(false);
    const [status, setStatus] = useState<'idle' | 'running' | 'success' | 'error'>('idle');
    const [message, setMessage] = useState('');
    const [progress, setProgress] = useState(0);

    const startAnalysis = async () => {
        // Immediate visual feedback
        console.log('🚀 [AgentButton] Starting analysis...');
        console.log('   Query:', query, 'Location:', location);
        console.log('   API URL:', `${API_BASE}/gmb/analysis/start`);

        // Log keys presence (masked)
        if (apiKeys) {
            console.log('   🔑 Using Custom Keys:', Object.keys(apiKeys).filter(k => !!(apiKeys as any)[k]));
        }

        setIsRunning(true);
        setStatus('running');
        setMessage('Conectando con el agente...');
        setProgress(10);

        // Progress simulation while waiting
        const progressInterval = setInterval(() => {
            setProgress(prev => {
                if (prev >= 90) return 90;
                return prev + 10;
            });
        }, 2000);

        try {
            setMessage('Ejecutando análisis IA...');

            // Add timeout of 2 minutes
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 120000);

            const response = await fetch(`${API_BASE}/gmb/analysis/start`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    query: query || 'negocio',
                    location: location || 'Buenos Aires',
                    limit: 10,
                    dryRun: false,
                    apiKeys: apiKeys || {}
                }),
                signal: controller.signal,
            });

            clearTimeout(timeoutId);
            console.log('📥 [AgentButton] Response status:', response.status);

            if (!response.ok) {
                const errorText = await response.text();
                console.error('❌ [AgentButton] Error response:', errorText);
                throw new Error(`HTTP ${response.status}: ${errorText.slice(0, 100)}`);
            }

            const result = await response.json();
            console.log('✅ [AgentButton] Result:', result);

            setProgress(100);

            if (result.success) {
                setStatus('success');
                setMessage(`✅ ${result.stats?.total || 0} leads encontrados`);
                onComplete?.(result);
            } else {
                setStatus('error');
                setMessage(result.error || 'Error desconocido');
            }
        } catch (error: any) {
            console.error('❌ [AgentButton] Error:', error);
            setStatus('error');
            if (error.name === 'AbortError') {
                setMessage('⏱️ Timeout: El análisis tardó demasiado');
            } else {
                setMessage(`Error: ${error.message}`);
            }
        } finally {
            clearInterval(progressInterval);
            setIsRunning(false);
            setProgress(0);
        }
    };

    return (
        <div className="flex items-center gap-3">
            <button
                onClick={startAnalysis}
                disabled={isRunning}
                className={`
                    flex items-center gap-2 px-4 py-2 border-2 border-neo-border font-bold uppercase text-sm
                    transition-all shadow-neo relative overflow-hidden
                    ${isRunning
                        ? 'bg-yellow-400 text-black cursor-wait'
                        : 'bg-purple-500 text-white hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-neo-lg'
                    }
                `}
            >
                {/* Progress bar */}
                {isRunning && (
                    <div
                        className="absolute left-0 top-0 h-full bg-yellow-600 opacity-30 transition-all duration-500"
                        style={{ width: `${progress}%` }}
                    />
                )}

                <span className="relative z-10 flex items-center gap-2">
                    {isRunning ? (
                        <>
                            <span className="animate-spin">⚙️</span>
                            Analizando... {progress > 0 && `${progress}%`}
                        </>
                    ) : (
                        <>
                            <span>🤖</span>
                            Análisis IA
                        </>
                    )}
                </span>
            </button>

            {/* Status message */}
            {status !== 'idle' && (
                <span className={`text-sm font-bold px-2 py-1 border-2 border-neo-border ${status === 'success' ? 'bg-green-200 text-green-800' :
                    status === 'error' ? 'bg-red-200 text-red-800' :
                        'bg-yellow-200 text-yellow-800'
                    }`}>
                    {message}
                </span>
            )}
        </div>
    );
}
