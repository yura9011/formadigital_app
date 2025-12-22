import React, { useState, useEffect } from 'react';

interface ApiKeys {
    GEMINI_API_KEY?: string;
    OPENROUTER_API_KEY?: string;
    SERPAPI_API_KEY?: string;
}

interface ApiKeySettingsProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (keys: ApiKeys) => void;
    initialKeys: ApiKeys;
}

export default function ApiKeySettings({ isOpen, onClose, onSave, initialKeys }: ApiKeySettingsProps) {
    const [keys, setKeys] = useState<ApiKeys>(initialKeys);

    // Reset local state when modal opens with new initialKeys
    useEffect(() => {
        setKeys(initialKeys);
    }, [initialKeys, isOpen]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-white border-4 border-neo-border shadow-neo-lg p-6 w-full max-w-md relative">
                <button
                    onClick={onClose}
                    className="absolute top-2 right-2 text-2xl font-bold hover:text-red-500"
                >
                    ×
                </button>

                <h2 className="text-2xl font-black uppercase mb-4 italic">🔑 API Keys Personalizadas</h2>
                <p className="text-sm text-gray-600 mb-6">
                    Ingresá tus propias keys para usar el agente. Si las dejás vacías, se usarán las del servidor.
                </p>

                <div className="space-y-4">
                    <div>
                        <label className="block font-bold text-sm mb-1">GEMINI_API_KEY</label>
                        <input
                            type="password"
                            value={keys.GEMINI_API_KEY || ''}
                            onChange={(e) => setKeys({ ...keys, GEMINI_API_KEY: e.target.value })}
                            placeholder="AIzaSy..."
                            className="w-full border-2 border-neo-border p-2 focus:shadow-neo transition-all"
                        />
                    </div>

                    <div>
                        <label className="block font-bold text-sm mb-1">OPENROUTER_API_KEY</label>
                        <input
                            type="password"
                            value={keys.OPENROUTER_API_KEY || ''}
                            onChange={(e) => setKeys({ ...keys, OPENROUTER_API_KEY: e.target.value })}
                            placeholder="sk-or-..."
                            className="w-full border-2 border-neo-border p-2 focus:shadow-neo transition-all"
                        />
                    </div>

                    <div>
                        <label className="block font-bold text-sm mb-1">SERPAPI_API_KEY</label>
                        <input
                            type="password"
                            value={keys.SERPAPI_API_KEY || ''}
                            onChange={(e) => setKeys({ ...keys, SERPAPI_API_KEY: e.target.value })}
                            placeholder="e.g. 8d39..."
                            className="w-full border-2 border-neo-border p-2 focus:shadow-neo transition-all"
                        />
                    </div>
                </div>

                <div className="mt-8 flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 border-2 border-neo-border font-bold hover:bg-gray-100"
                    >
                        CANCELAR
                    </button>
                    <button
                        onClick={() => {
                            onSave(keys);
                            onClose();
                        }}
                        className="px-4 py-2 bg-neo-blue text-white border-2 border-neo-border font-bold shadow-neo hover:translate-x-[-2px] hover:translate-y-[-2px]"
                    >
                        GUARDAR
                    </button>
                </div>
            </div>
        </div>
    );
}
