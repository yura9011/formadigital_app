'use client';

import React, { useState, useEffect } from 'react';
import { Language } from '../types';
import { harv3stService } from '@/services/harv3st';

interface SettingsPanelProps {
  language: Language;
  onClose: () => void;
}

const STORAGE_KEY = 'harv3st_server_url';
const DEFAULT_URL = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000') + '/api/harv3st';

const TRANSLATIONS = {
  en: {
    title: 'Harv3st Settings', serverUrl: 'Server URL', save: 'Save', cancel: 'Cancel',
    reset: 'Reset to Default', saved: 'Settings saved!', testConnection: 'Test Connection',
    testing: 'Testing...', connected: 'Connected!', failed: 'Connection failed',
  },
  es: {
    title: 'Configuración Harv3st', serverUrl: 'URL del Servidor', save: 'Guardar', cancel: 'Cancelar',
    reset: 'Restaurar Predeterminado', saved: '¡Configuración guardada!', testConnection: 'Probar Conexión',
    testing: 'Probando...', connected: '¡Conectado!', failed: 'Conexión fallida',
  },
};

export function getStoredServerUrl(): string {
  if (typeof window === 'undefined') return DEFAULT_URL;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored || stored.startsWith('http://localhost:5050') || stored.startsWith('http://127.0.0.1:5050')) {
      localStorage.setItem(STORAGE_KEY, DEFAULT_URL);
      return DEFAULT_URL;
    }
    return stored;
  } catch {
    return DEFAULT_URL;
  }
}

export function setStoredServerUrl(url: string): void {
  try {
    localStorage.setItem(STORAGE_KEY, url);
    harv3stService.setBaseUrl(url);
  } catch {
    console.warn('Failed to save server URL');
  }
}

const SettingsPanel: React.FC<SettingsPanelProps> = ({ language, onClose }) => {
  const t = TRANSLATIONS[language];
  const [url, setUrl] = useState(DEFAULT_URL);
  const [saved, setSaved] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<'connected' | 'failed' | null>(null);

  useEffect(() => {
    setUrl(getStoredServerUrl());
    harv3stService.setBaseUrl(getStoredServerUrl());
  }, []);

  const handleSave = () => {
    setStoredServerUrl(url);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleReset = () => {
    setUrl(DEFAULT_URL);
    setStoredServerUrl(DEFAULT_URL);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    const originalUrl = harv3stService.getConfig().baseUrl;
    harv3stService.setBaseUrl(url);
    const status = await harv3stService.checkConnection();
    setTestResult(status === 'connected' ? 'connected' : 'failed');
    harv3stService.setBaseUrl(originalUrl);
    setTesting(false);
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white border-4 border-neo-border shadow-neo-lg p-6 w-full max-w-md mx-4" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-lg font-black uppercase text-neo-text mb-4">{t.title}</h2>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-bold text-gray-600 mb-1">{t.serverUrl}</label>
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="w-full px-3 py-2 border-2 border-neo-border focus:outline-none focus:ring-2 focus:ring-neo-blue"
              placeholder={DEFAULT_URL}
            />
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleTest}
              disabled={testing}
              className="text-sm text-neo-blue hover:underline font-bold disabled:text-gray-400"
            >
              {testing ? t.testing : t.testConnection}
            </button>
            {testResult && (
              <span className={`text-sm font-bold ${testResult === 'connected' ? 'text-green-600' : 'text-red-600'}`}>
                {testResult === 'connected' ? t.connected : t.failed}
              </span>
            )}
          </div>

          {saved && <div className="text-sm text-green-600 bg-green-50 px-3 py-2 border-2 border-green-300">{t.saved}</div>}
        </div>

        <div className="flex justify-between mt-6">
          <button onClick={handleReset} className="text-sm text-gray-500 hover:text-gray-700 font-bold">{t.reset}</button>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-100 border-2 border-neo-border font-bold hover:bg-gray-200 transition-colors"
            >
              {t.cancel}
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-2 bg-neo-blue text-white border-2 border-neo-border font-bold hover:bg-blue-600 transition-colors"
            >
              {t.save}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsPanel;
