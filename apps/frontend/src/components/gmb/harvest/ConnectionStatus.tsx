'use client';

import React from 'react';
import { Language } from '../types';
import { Harv3stConnectionStatus } from '@/services/harv3st';

interface ConnectionStatusProps {
  status: Harv3stConnectionStatus;
  language: Language;
}

const TRANSLATIONS = {
  en: { connected: 'Harv3st Connected', offline: 'Harv3st Offline', checking: 'Checking...' },
  es: { connected: 'Harv3st Conectado', offline: 'Harv3st Desconectado', checking: 'Verificando...' },
};

const ConnectionStatus: React.FC<ConnectionStatusProps> = ({ status, language }) => {
  const t = TRANSLATIONS[language];

  const statusConfig = {
    connected: { text: t.connected, bgColor: 'bg-green-100', textColor: 'text-green-700', dotColor: 'bg-green-500' },
    offline: { text: t.offline, bgColor: 'bg-red-100', textColor: 'text-red-700', dotColor: 'bg-red-500' },
    checking: { text: t.checking, bgColor: 'bg-yellow-100', textColor: 'text-yellow-700', dotColor: 'bg-yellow-500' },
  };

  const config = statusConfig[status];

  return (
    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border-2 border-neo-border ${config.bgColor}`}>
      <span className={`w-2 h-2 rounded-full ${config.dotColor} ${status === 'checking' ? 'animate-pulse' : ''}`} />
      <span className={`text-sm font-bold ${config.textColor}`}>{config.text}</span>
    </div>
  );
};

export default ConnectionStatus;
