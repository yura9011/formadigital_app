'use client';

import React, { useState, useEffect } from 'react';
import { Language } from '../types';
import { CampaignStatus, harv3stService } from '@/services/harv3st';

interface CampaignPanelProps {
  language: Language;
  campaignStatus: CampaignStatus | null;
  setCampaignStatus: (status: CampaignStatus | null) => void;
  disabled: boolean;
  onComplete: () => void;
}

const TRANSLATIONS = {
  en: {
    placeholder: 'Enter one query per line:\nrestaurants in Buenos Aires\ncafes in Palermo',
    startCampaign: 'Start Campaign',
    stopCampaign: 'Stop Campaign',
    delay: 'Delay between queries (seconds)',
    progress: 'Progress',
    currentQuery: 'Current',
    leadsFound: 'leads found',
  },
  es: {
    placeholder: 'Ingresa una búsqueda por línea:\nrestaurantes en Buenos Aires\ncafés en Palermo',
    startCampaign: 'Iniciar Campaña',
    stopCampaign: 'Detener Campaña',
    delay: 'Espera entre búsquedas (segundos)',
    progress: 'Progreso',
    currentQuery: 'Actual',
    leadsFound: 'leads encontrados',
  },
};

const CampaignPanel: React.FC<CampaignPanelProps> = ({
  language, campaignStatus, setCampaignStatus, disabled, onComplete,
}) => {
  const t = TRANSLATIONS[language];
  const [queries, setQueries] = useState('');
  const [delay, setDelay] = useState(30);
  const [error, setError] = useState<string | null>(null);
  const [leadsCount, setLeadsCount] = useState(0);

  // Poll campaign status AND reload data when running
  useEffect(() => {
    if (!campaignStatus?.is_running) return;

    const pollStatus = async () => {
      try {
        const status = await harv3stService.getCampaignStatus();
        setCampaignStatus(status);
        
        // Also fetch current leads count to show progress
        try {
          const data = await harv3stService.getData();
          setLeadsCount(data.length);
        } catch {}
        
        if (!status.is_running) {
          onComplete();
        }
      } catch (e) {
        console.error('Failed to poll campaign status:', e);
      }
    };

    // Poll immediately
    pollStatus();
    
    const interval = setInterval(pollStatus, 3000);
    return () => clearInterval(interval);
  }, [campaignStatus?.is_running, setCampaignStatus, onComplete]);

  const handleStart = async () => {
    const queryList = queries.split('\n').map(q => q.trim()).filter(q => q.length > 0);
    if (queryList.length === 0) return;

    setError(null);
    setLeadsCount(0);
    try {
      await harv3stService.startCampaign(queryList, delay);
      const status = await harv3stService.getCampaignStatus();
      setCampaignStatus(status);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to start campaign');
    }
  };

  const handleStop = async () => {
    try {
      await harv3stService.stopCampaign();
      setCampaignStatus(null);
      onComplete();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to stop campaign');
    }
  };

  const isRunning = campaignStatus?.is_running ?? false;

  return (
    <div className="space-y-4">
      <textarea
        value={queries}
        onChange={(e) => setQueries(e.target.value)}
        placeholder={t.placeholder}
        disabled={disabled || isRunning}
        rows={5}
        className="w-full px-4 py-3 border-2 border-neo-border shadow-neo font-mono text-sm focus:outline-none focus:ring-2 focus:ring-neo-blue disabled:bg-gray-100"
      />

      <div className="flex items-center gap-3">
        <label className="text-sm font-bold text-gray-600">{t.delay}:</label>
        <input
          type="number"
          value={delay}
          onChange={(e) => setDelay(Math.max(10, parseInt(e.target.value) || 30))}
          disabled={disabled || isRunning}
          min={10}
          max={120}
          className="w-20 px-3 py-1 border-2 border-neo-border focus:outline-none focus:ring-2 focus:ring-neo-blue"
        />
      </div>

      {error && <div className="text-red-600 text-sm bg-red-50 px-3 py-2 border-2 border-red-300">{error}</div>}

      <div className="flex gap-3">
        {!isRunning ? (
          <button
            onClick={handleStart}
            disabled={disabled || !queries.trim()}
            className="px-6 py-2 bg-neo-blue text-white font-black uppercase border-2 border-neo-border shadow-neo hover:translate-x-[-2px] hover:translate-y-[-2px] transition-all disabled:opacity-50"
          >
            {t.startCampaign}
          </button>
        ) : (
          <button
            onClick={handleStop}
            className="px-6 py-2 bg-red-500 text-white font-black uppercase border-2 border-neo-border shadow-neo hover:translate-x-[-2px] hover:translate-y-[-2px] transition-all"
          >
            {t.stopCampaign}
          </button>
        )}
      </div>

      {campaignStatus && (
        <div className="mt-4 p-4 bg-gray-50 border-2 border-neo-border">
          <div className="flex items-center justify-between mb-3">
            <span className="font-bold text-gray-700">{t.progress}</span>
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-500">{campaignStatus.completed} / {campaignStatus.total}</span>
              {leadsCount > 0 && (
                <span className="text-sm font-bold text-green-600 bg-green-100 px-2 py-1 border border-green-300">
                  📊 {leadsCount} {t.leadsFound}
                </span>
              )}
            </div>
          </div>
          <div className="w-full h-2 bg-gray-200 border border-neo-border overflow-hidden mb-3">
            <div
              className="h-full bg-neo-blue transition-all duration-300"
              style={{ width: `${(campaignStatus.completed / campaignStatus.total) * 100}%` }}
            />
          </div>
          {campaignStatus.current_query && (
            <p className="text-sm text-neo-blue font-bold">{t.currentQuery}: {campaignStatus.current_query}</p>
          )}
          <div className="mt-3 space-y-1 max-h-40 overflow-y-auto">
            {campaignStatus.results.map((result, i) => (
              <div
                key={i}
                className={`text-sm px-2 py-1 border ${
                  result.status === 'completed' ? 'bg-green-100 text-green-700 border-green-300' :
                  result.status === 'running' ? 'bg-blue-100 text-blue-700 border-blue-300' :
                  'bg-gray-100 text-gray-500 border-gray-300'
                }`}
              >
                {result.query}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default CampaignPanel;
