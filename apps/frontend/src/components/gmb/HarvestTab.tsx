'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Language } from './types';
import {
  HarvestedLead,
  HarvestFilters,
  DEFAULT_HARVEST_FILTERS,
  Harv3stConnectionStatus,
  CampaignStatus,
  harv3stService,
  scoreAllLeads,
  applyFilters,
  sortLeads,
  SortField,
  SortDirection,
  cacheService,
} from '@/services/harv3st';
import ConnectionStatus from './harvest/ConnectionStatus';
import SearchForm from './harvest/SearchForm';
import ProgressIndicator from './harvest/ProgressIndicator';
import CampaignPanel from './harvest/CampaignPanel';
import LeadDataGrid from './harvest/LeadDataGrid';
import FilterPanel from './harvest/FilterPanel';
import SelectionSummary from './harvest/SelectionSummary';
import SettingsPanel, { getStoredServerUrl } from './harvest/SettingsPanel';

interface HarvestTabProps {
  language: Language;
  harv3stStatus: Harv3stConnectionStatus;
  setHarv3stStatus: (status: Harv3stConnectionStatus) => void;
  harvestedLeads: HarvestedLead[];
  setHarvestedLeads: (leads: HarvestedLead[]) => void;
  selectedLeadIds: Set<string>;
  setSelectedLeadIds: (ids: Set<string>) => void;
  harvestFilters: HarvestFilters;
  setHarvestFilters: (filters: HarvestFilters) => void;
  onTransferToAudit: (leads: HarvestedLead[]) => void;
}

const HARVEST_TRANSLATIONS = {
  en: {
    title: 'Harvest Leads', subtitle: 'Scrape Google Maps data for free using Harv3st',
    searchPlaceholder: 'e.g., restaurants in Buenos Aires', startHarvest: 'Start Harvest',
    loadData: 'Load Data', exportAll: 'Export All (CSV)', exportSelected: 'Export Selected',
    transferToAudit: 'Send to Audit', noLeads: 'No leads harvested yet. Start a search to begin.',
    campaign: 'Campaign Mode', singleSearch: 'Single Search', refreshData: 'Refresh',
    warningLargeSelection: 'You have selected more than 20 leads. This may slow down the audit process. Continue?',
    confirm: 'Confirm', cancel: 'Cancel',
  },
  es: {
    title: 'Cosechar Leads', subtitle: 'Scrapea datos de Google Maps gratis usando Harv3st',
    searchPlaceholder: 'ej. restaurantes en Buenos Aires', startHarvest: 'Iniciar Cosecha',
    loadData: 'Cargar Datos', exportAll: 'Exportar Todo (CSV)', exportSelected: 'Exportar Selección',
    transferToAudit: 'Enviar a Auditoría', noLeads: 'No hay leads cosechados. Inicia una búsqueda para comenzar.',
    campaign: 'Modo Campaña', singleSearch: 'Búsqueda Simple', refreshData: 'Actualizar',
    warningLargeSelection: 'Has seleccionado más de 20 leads. Esto puede ralentizar el proceso de auditoría. ¿Continuar?',
    confirm: 'Confirmar', cancel: 'Cancelar',
  },
};

const HarvestTab: React.FC<HarvestTabProps> = ({
  language, harv3stStatus, setHarv3stStatus, harvestedLeads, setHarvestedLeads,
  selectedLeadIds, setSelectedLeadIds, harvestFilters, setHarvestFilters, onTransferToAudit,
}) => {
  const t = HARVEST_TRANSLATIONS[language];

  const [isLoading, setIsLoading] = useState(false);
  const [currentTask, setCurrentTask] = useState<string | null>(null);
  const [campaignStatus, setCampaignStatus] = useState<CampaignStatus | null>(null);
  const [showCampaign, setShowCampaign] = useState(false);
  const [sortField, setSortField] = useState<SortField>('score');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [showWarning, setShowWarning] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    harv3stService.setBaseUrl(getStoredServerUrl());
  }, []);

  useEffect(() => {
    const checkConnection = async () => {
      const status = await harv3stService.checkConnection();
      setHarv3stStatus(status);
    };
    checkConnection();
    const interval = setInterval(checkConnection, 30000);
    return () => clearInterval(interval);
  }, [setHarv3stStatus]);

  useEffect(() => {
    const cached = cacheService.getFreshCache();
    if (cached && cached.length > 0 && harvestedLeads.length === 0) {
      setHarvestedLeads(cached);
    }
  }, [harvestedLeads.length, setHarvestedLeads]);

  useEffect(() => {
    if (!currentTask) return;
    const pollStatus = async () => {
      try {
        const status = await harv3stService.getStatus();
        if (!status.active_tasks.includes(currentTask)) {
          setCurrentTask(null);
          await loadData();
        }
      } catch (e) {
        console.error('Failed to poll status:', e);
      }
    };
    const interval = setInterval(pollStatus, 2000);
    return () => clearInterval(interval);
  }, [currentTask]);

  // Poll for data when campaign is running
  useEffect(() => {
    if (!campaignStatus?.is_running) return;
    
    const pollData = async () => {
      try {
        const data = await harv3stService.getData();
        if (data.length > 0) {
          const scored = scoreAllLeads(data);
          setHarvestedLeads(scored);
        }
      } catch (e) {
        console.error('Failed to poll data:', e);
      }
    };
    
    const interval = setInterval(pollData, 5000); // Every 5 seconds
    return () => clearInterval(interval);
  }, [campaignStatus?.is_running, setHarvestedLeads]);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await harv3stService.getScoredData();
      const scored = scoreAllLeads(data);
      setHarvestedLeads(scored);
      cacheService.cacheLeadsForSession(scored);
    } catch (e) {
      setError(`Failed to load data: ${e instanceof Error ? e.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  }, [setHarvestedLeads]);

  const handleSearch = async (query: string) => {
    setError(null);
    try {
      await harv3stService.triggerSearch(query);
      setCurrentTask(query);
    } catch (e) {
      setError(`Failed to start search: ${e instanceof Error ? e.message : 'Unknown error'}`);
    }
  };

  const handleSelectLead = (placeId: string, selected: boolean) => {
    const newSelection = new Set(selectedLeadIds);
    if (selected) newSelection.add(placeId);
    else newSelection.delete(placeId);
    setSelectedLeadIds(newSelection);
  };

  const handleSelectAll = () => {
    const filtered = getFilteredAndSortedLeads();
    setSelectedLeadIds(new Set(filtered.map(l => l.placeId)));
  };

  const handleClearSelection = () => setSelectedLeadIds(new Set());

  const handleTransferToAudit = () => {
    if (selectedLeadIds.size > 20) {
      setShowWarning(true);
      return;
    }
    doTransfer();
  };

  const doTransfer = () => {
    const selectedLeads = harvestedLeads.filter(l => selectedLeadIds.has(l.placeId));
    onTransferToAudit(selectedLeads);
    setShowWarning(false);
  };

  const handleExportAll = () => window.open(harv3stService.getExportCsvUrl(), '_blank');

  const handleExportSelected = () => {
    const selectedLeads = harvestedLeads.filter(l => selectedLeadIds.has(l.placeId));
    exportToCsv(selectedLeads);
  };

  const exportToCsv = (leads: HarvestedLead[]) => {
    const headers = ['name', 'averageRating', 'reviewCount', 'phones', 'website', 'fullAddress', 'categories', 'score'];
    const rows = leads.map(l => headers.map(h => {
      const val = l[h as keyof HarvestedLead];
      return val !== null && val !== undefined ? String(val) : '';
    }));
    const csv = [headers.join(','), ...rows.map(r => r.map(c => `"${c}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'selected_leads.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const getFilteredAndSortedLeads = useCallback(() => {
    const filtered = applyFilters(harvestedLeads, harvestFilters);
    return sortLeads(filtered, sortField, sortDirection);
  }, [harvestedLeads, harvestFilters, sortField, sortDirection]);

  const filteredLeads = getFilteredAndSortedLeads();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black uppercase text-neo-text">{t.title}</h2>
          <p className="text-gray-500 text-sm">{t.subtitle}</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => setShowSettings(true)} className="p-2 text-gray-400 hover:text-gray-600 transition-colors" title="Settings">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>
          <ConnectionStatus status={harv3stStatus} language={language} />
        </div>
      </div>

      {error && <div className="bg-red-50 border-2 border-red-300 text-red-700 px-4 py-3">{error}</div>}

      {/* Search / Campaign */}
      <div className="bg-white border-2 border-neo-border shadow-neo p-4">
        <div className="flex gap-4 mb-4">
          <button
            onClick={() => setShowCampaign(false)}
            className={`px-4 py-2 font-black uppercase border-2 border-neo-border transition-all ${!showCampaign ? 'bg-neo-blue text-white shadow-neo translate-x-[-2px] translate-y-[-2px]' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
          >
            {t.singleSearch}
          </button>
          <button
            onClick={() => setShowCampaign(true)}
            className={`px-4 py-2 font-black uppercase border-2 border-neo-border transition-all ${showCampaign ? 'bg-neo-blue text-white shadow-neo translate-x-[-2px] translate-y-[-2px]' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
          >
            {t.campaign}
          </button>
        </div>

        {!showCampaign ? (
          <SearchForm language={language} onSearch={handleSearch} disabled={harv3stStatus === 'offline' || !!currentTask} placeholder={t.searchPlaceholder} />
        ) : (
          <CampaignPanel language={language} campaignStatus={campaignStatus} setCampaignStatus={setCampaignStatus} disabled={harv3stStatus === 'offline'} onComplete={loadData} />
        )}

        {currentTask && <ProgressIndicator language={language} currentTask={currentTask} onCancel={() => setCurrentTask(null)} />}
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-3">
        <button onClick={loadData} disabled={isLoading || harv3stStatus === 'offline'} className="px-4 py-2 bg-gray-100 border-2 border-neo-border font-bold uppercase hover:bg-gray-200 transition-colors disabled:opacity-50">
          {isLoading ? '...' : t.refreshData}
        </button>
        <button onClick={handleExportAll} disabled={harvestedLeads.length === 0} className="px-4 py-2 bg-gray-100 border-2 border-neo-border font-bold uppercase hover:bg-gray-200 transition-colors disabled:opacity-50">
          {t.exportAll}
        </button>
        <button onClick={handleExportSelected} disabled={selectedLeadIds.size === 0} className="px-4 py-2 bg-gray-100 border-2 border-neo-border font-bold uppercase hover:bg-gray-200 transition-colors disabled:opacity-50">
          {t.exportSelected}
        </button>
        <button onClick={handleTransferToAudit} disabled={selectedLeadIds.size === 0} className="px-4 py-2 bg-green-500 text-white border-2 border-neo-border font-bold uppercase shadow-neo hover:translate-x-[-2px] hover:translate-y-[-2px] transition-all disabled:opacity-50">
          {t.transferToAudit} ({selectedLeadIds.size})
        </button>
      </div>

      <FilterPanel language={language} filters={harvestFilters} setFilters={setHarvestFilters} totalCount={harvestedLeads.length} filteredCount={filteredLeads.length} />
      <SelectionSummary language={language} selectedCount={selectedLeadIds.size} totalCount={filteredLeads.length} onSelectAll={handleSelectAll} onClearSelection={handleClearSelection} />

      {filteredLeads.length > 0 ? (
        <LeadDataGrid
          language={language} leads={filteredLeads} selectedIds={selectedLeadIds} onSelectLead={handleSelectLead}
          sortField={sortField} sortDirection={sortDirection}
          onSort={(field) => {
            if (field === sortField) setSortDirection(d => d === 'asc' ? 'desc' : 'asc');
            else { setSortField(field); setSortDirection('desc'); }
          }}
        />
      ) : (
        <div className="text-center py-12 text-gray-500 bg-white border-2 border-neo-border">{t.noLeads}</div>
      )}

      {showWarning && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-white border-4 border-neo-border shadow-neo-lg p-6 max-w-md mx-4">
            <p className="text-gray-700 mb-4">{t.warningLargeSelection}</p>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setShowWarning(false)} className="px-4 py-2 bg-gray-100 border-2 border-neo-border font-bold">{t.cancel}</button>
              <button onClick={doTransfer} className="px-4 py-2 bg-neo-blue text-white border-2 border-neo-border font-bold">{t.confirm}</button>
            </div>
          </div>
        </div>
      )}

      {showSettings && <SettingsPanel language={language} onClose={() => setShowSettings(false)} />}
    </div>
  );
};

export default HarvestTab;
