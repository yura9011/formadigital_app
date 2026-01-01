'use client';

/**
 * SearchTab Component (Unified)
 * Combines Harv3st (free scraping) and Radar/Google Places (paid API) into single interface
 * PASO 1 in the workflow - Búsqueda Inteligente
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Language, Business, SearchParams } from './types';
import {
  HarvestedLead,
  HarvestFilters,
  DEFAULT_HARVEST_FILTERS,
  Harv3stConnectionStatus,
  harv3stService,
  scoreAllLeads,
  applyFilters as applyHarvestFilters,
  sortLeads,
  SortField,
  SortDirection,
  cacheService,
  harvestLeadsToBusinesses,
} from '@/services/harv3st';
import { searchCompetitors } from '@/services/gmb.service';
import ConnectionStatus from './harvest/ConnectionStatus';
import SearchForm from './harvest/SearchForm';
import ProgressIndicator from './harvest/ProgressIndicator';
import LeadDataGrid from './harvest/LeadDataGrid';
import FilterPanel from './harvest/FilterPanel';
import SelectionSummary from './harvest/SelectionSummary';
import SettingsPanel, { getStoredServerUrl } from './harvest/SettingsPanel';
import toast from 'react-hot-toast';

// Extended lead type with source info
interface UnifiedLead extends HarvestedLead {
  source: 'harv3st' | 'radar' | 'both';
}

interface SearchTabProps {
  language: Language;
  harv3stStatus: Harv3stConnectionStatus;
  setHarv3stStatus: (status: Harv3stConnectionStatus) => void;
  onTransferToAnalysis: (businesses: Business[]) => void;
  searchParams: SearchParams;
  setSearchParams: (params: SearchParams) => void;
}

// Data source configuration
interface DataSourceConfig {
  harv3st: { enabled: boolean; status: Harv3stConnectionStatus };
  radar: { enabled: boolean; hasApiKey: boolean };
}

const TRANSLATIONS = {
  en: {
    title: 'Smart Search',
    subtitle: 'Search Google Maps using free scraping or paid API',
    dataSources: 'Data Sources',
    harv3st: 'Harv3st (Free)',
    radar: 'Radar API (Paid)',
    connected: 'Connected',
    offline: 'Offline',
    checking: 'Checking...',
    apiKeyOk: 'API Key OK',
    noApiKey: 'No API Key',
    freeSlower: 'Free, more data, slower',
    paidFaster: 'Paid per request, faster',
    searchPlaceholder: 'e.g., restaurants in Buenos Aires',
    startSearch: 'Start Search',
    searching: 'Searching...',
    noResults: 'No results yet. Configure data sources and start a search.',
    resultsCount: 'results found',
    selected: 'selected',
    transferToAnalysis: 'Send to Analysis',
    exportAll: 'Export All (CSV)',
    exportSelected: 'Export Selected',
    refreshData: 'Refresh',
    warningLargeSelection: 'You have selected more than 20 leads. This may slow down the process. Continue?',
    confirm: 'Confirm',
    cancel: 'Cancel',
    sourceHarv3st: 'Harv3st',
    sourceRadar: 'Radar',
    sourceBoth: 'Both',
  },
  es: {
    title: 'Búsqueda Inteligente',
    subtitle: 'Busca en Google Maps usando scraping gratis o API de pago',
    dataSources: 'Fuentes de Datos',
    harv3st: 'Harv3st (Gratis)',
    radar: 'Radar API (Pago)',
    connected: 'Conectado',
    offline: 'Desconectado',
    checking: 'Verificando...',
    apiKeyOk: 'API Key OK',
    noApiKey: 'Sin API Key',
    freeSlower: 'Gratis, más datos, más lento',
    paidFaster: 'Costo por request, más rápido',
    searchPlaceholder: 'ej. restaurantes en Buenos Aires',
    startSearch: 'Iniciar Búsqueda',
    searching: 'Buscando...',
    noResults: 'Sin resultados aún. Configura las fuentes de datos e inicia una búsqueda.',
    resultsCount: 'resultados encontrados',
    selected: 'seleccionados',
    transferToAnalysis: 'Enviar a Análisis',
    exportAll: 'Exportar Todo (CSV)',
    exportSelected: 'Exportar Selección',
    refreshData: 'Actualizar',
    warningLargeSelection: 'Has seleccionado más de 20 leads. Esto puede ralentizar el proceso. ¿Continuar?',
    confirm: 'Confirmar',
    cancel: 'Cancelar',
    sourceHarv3st: 'Harv3st',
    sourceRadar: 'Radar',
    sourceBoth: 'Ambos',
  },
};

const SearchTab: React.FC<SearchTabProps> = ({
  language,
  harv3stStatus,
  setHarv3stStatus,
  onTransferToAnalysis,
  searchParams,
  setSearchParams,
}) => {
  const t = TRANSLATIONS[language];

  // Data sources state
  const [dataSources, setDataSources] = useState<DataSourceConfig>({
    harv3st: { enabled: true, status: harv3stStatus },
    radar: { enabled: true, hasApiKey: !!process.env.NEXT_PUBLIC_RADAR_PUBLISHABLE_KEY },
  });

  // Search state
  const [unifiedLeads, setUnifiedLeads] = useState<UnifiedLead[]>([]);
  const [selectedLeadIds, setSelectedLeadIds] = useState<Set<string>>(new Set());
  const [harvestFilters, setHarvestFilters] = useState<HarvestFilters>(DEFAULT_HARVEST_FILTERS);
  const [sortField, setSortField] = useState<SortField>('score');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  // Progress state
  const [isSearching, setIsSearching] = useState(false);
  const [currentTask, setCurrentTask] = useState<string | null>(null);
  const [searchProgress, setSearchProgress] = useState<{ harv3st: string; radar: string }>({
    harv3st: 'idle',
    radar: 'idle',
  });

  // UI state
  const [showSettings, setShowSettings] = useState(false);
  const [showWarning, setShowWarning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize Harv3st service
  useEffect(() => {
    harv3stService.setBaseUrl(getStoredServerUrl());
  }, []);

  // Check Harv3st connection periodically
  useEffect(() => {
    const checkConnection = async () => {
      const status = await harv3stService.checkConnection();
      setHarv3stStatus(status);
      setDataSources(prev => ({
        ...prev,
        harv3st: { ...prev.harv3st, status },
      }));
    };
    checkConnection();
    const interval = setInterval(checkConnection, 30000);
    return () => clearInterval(interval);
  }, [setHarv3stStatus]);

  // Load cached data on mount
  useEffect(() => {
    const cached = cacheService.getFreshCache();
    if (cached && cached.length > 0 && unifiedLeads.length === 0) {
      const withSource = cached.map(lead => ({ ...lead, source: 'harv3st' as const }));
      setUnifiedLeads(withSource);
    }
  }, [unifiedLeads.length]);

  // Deduplicate results by placeId or name+address
  const deduplicateResults = useCallback((
    harv3stLeads: HarvestedLead[],
    radarBusinesses: Business[]
  ): UnifiedLead[] => {
    const seen = new Map<string, UnifiedLead>();

    // Add Harv3st leads first
    harv3stLeads.forEach(lead => {
      const key = lead.placeId || `${lead.name.toLowerCase()}_${lead.fullAddress?.toLowerCase() || ''}`;
      seen.set(key, { ...lead, source: 'harv3st' });
    });

    // Add Radar results, marking duplicates as 'both'
    radarBusinesses.forEach(biz => {
      const key = biz.placeId || `${biz.name.toLowerCase()}_${biz.address.toLowerCase()}`;
      const existing = seen.get(key);
      
      if (existing) {
        // Merge data, prefer Harv3st data but add Radar extras
        seen.set(key, {
          ...existing,
          source: 'both',
          // Add any missing fields from Radar
          website: existing.website || biz.website || null,
          phones: existing.phones || biz.phone || null,
        });
      } else {
        // Convert Business to UnifiedLead format
        const lead: UnifiedLead = {
          placeId: biz.placeId || biz.id,
          name: biz.name,
          fullAddress: biz.address,
          averageRating: biz.rating,
          reviewCount: biz.reviewCount,
          website: biz.website || null,
          phones: biz.phone || null,
          categories: biz.category || null,
          latitude: biz.latitude,
          longitude: biz.longitude,
          score: biz.weightedScore || 0,
          source: 'radar',
          _captured_at: Date.now(),
        };
        seen.set(key, lead);
      }
    });

    return Array.from(seen.values());
  }, []);

  // Unified search handler
  const handleUnifiedSearch = async (query: string) => {
    setError(null);
    setIsSearching(true);
    setSearchProgress({ harv3st: 'idle', radar: 'idle' });

    const harv3stEnabled = dataSources.harv3st.enabled && dataSources.harv3st.status === 'connected';
    const radarEnabled = dataSources.radar.enabled && dataSources.radar.hasApiKey;

    let harv3stResults: HarvestedLead[] = [];
    let radarResults: Business[] = [];

    try {
      // Run searches in parallel
      const promises: Promise<void>[] = [];

      if (harv3stEnabled) {
        setSearchProgress(prev => ({ ...prev, harv3st: 'searching' }));
        promises.push(
          harv3stService.triggerSearch(query)
            .then(async () => {
              // Wait for results
              await new Promise(resolve => setTimeout(resolve, 3000));
              const data = await harv3stService.getScoredData();
              harv3stResults = scoreAllLeads(data);
              setSearchProgress(prev => ({ ...prev, harv3st: 'done' }));
            })
            .catch(e => {
              console.error('Harv3st search error:', e);
              setSearchProgress(prev => ({ ...prev, harv3st: 'error' }));
            })
        );
      }

      if (radarEnabled) {
        setSearchProgress(prev => ({ ...prev, radar: 'searching' }));
        promises.push(
          searchCompetitors({
            ...searchParams,
            keywords: query || searchParams.keywords,
          })
            .then(results => {
              radarResults = results;
              setSearchProgress(prev => ({ ...prev, radar: 'done' }));
            })
            .catch(e => {
              console.error('Radar search error:', e);
              setSearchProgress(prev => ({ ...prev, radar: 'error' }));
            })
        );
      }

      await Promise.all(promises);

      // Deduplicate and merge results
      const unified = deduplicateResults(harv3stResults, radarResults);
      const scored = scoreAllLeads(unified);
      const scoredWithSource = scored.map((lead, i) => ({
        ...lead,
        source: unified[i]?.source || 'harv3st',
      })) as UnifiedLead[];
      setUnifiedLeads(scoredWithSource);
      cacheService.cacheLeadsForSession(scored);

      toast.success(`${unified.length} ${t.resultsCount}`, {
        style: { borderRadius: '0px', border: '2px solid black', boxShadow: '4px 4px 0 #000' },
      });
    } catch (e) {
      setError(`Search error: ${e instanceof Error ? e.message : 'Unknown error'}`);
    } finally {
      setIsSearching(false);
    }
  };

  // Selection handlers
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

  // Transfer to analysis
  const handleTransferToAnalysis = () => {
    if (selectedLeadIds.size > 20) {
      setShowWarning(true);
      return;
    }
    doTransfer();
  };

  const doTransfer = () => {
    const selectedLeads = unifiedLeads.filter(l => selectedLeadIds.has(l.placeId));
    const businesses = harvestLeadsToBusinesses(selectedLeads);
    onTransferToAnalysis(businesses);
    setShowWarning(false);
  };

  // Export handlers
  const handleExportAll = () => {
    exportToCsv(unifiedLeads);
  };

  const handleExportSelected = () => {
    const selectedLeads = unifiedLeads.filter(l => selectedLeadIds.has(l.placeId));
    exportToCsv(selectedLeads);
  };

  const exportToCsv = (leads: UnifiedLead[]) => {
    const headers = ['name', 'averageRating', 'reviewCount', 'phones', 'website', 'fullAddress', 'categories', 'score', 'source'];
    const rows = leads.map(l => headers.map(h => {
      const val = l[h as keyof UnifiedLead];
      return val !== null && val !== undefined ? String(val) : '';
    }));
    const csv = [headers.join(','), ...rows.map(r => r.map(c => `"${c}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `busqueda_unificada_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Refresh data from Harv3st
  const loadData = useCallback(async () => {
    setError(null);
    try {
      const data = await harv3stService.getScoredData();
      const scored = scoreAllLeads(data);
      const withSource = scored.map(lead => ({ ...lead, source: 'harv3st' as const }));
      setUnifiedLeads(withSource);
      cacheService.cacheLeadsForSession(scored);
    } catch (e) {
      setError(`Failed to load data: ${e instanceof Error ? e.message : 'Unknown error'}`);
    }
  }, []);

  // Filter and sort
  const getFilteredAndSortedLeads = useCallback(() => {
    const filtered = applyHarvestFilters(unifiedLeads, harvestFilters);
    return sortLeads(filtered, sortField, sortDirection);
  }, [unifiedLeads, harvestFilters, sortField, sortDirection]);

  const filteredLeads = getFilteredAndSortedLeads();

  // Toggle data sources
  const toggleHarv3st = () => {
    setDataSources(prev => ({
      ...prev,
      harv3st: { ...prev.harv3st, enabled: !prev.harv3st.enabled },
    }));
  };

  const toggleRadar = () => {
    setDataSources(prev => ({
      ...prev,
      radar: { ...prev.radar, enabled: !prev.radar.enabled },
    }));
  };

  const canSearch = (dataSources.harv3st.enabled && dataSources.harv3st.status === 'connected') ||
                    (dataSources.radar.enabled && dataSources.radar.hasApiKey);

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
          <ConnectionStatus status={dataSources.harv3st.status} language={language} />
        </div>
      </div>

      {error && <div className="bg-red-50 border-2 border-red-300 text-red-700 px-4 py-3">{error}</div>}

      {/* Data Source Selector */}
      <div className="bg-white border-2 border-neo-border shadow-neo p-4">
        <h3 className="text-sm font-black uppercase text-neo-text mb-3">{t.dataSources}</h3>
        <div className="flex flex-wrap gap-4">
          {/* Harv3st Card */}
          <div
            onClick={toggleHarv3st}
            className={`flex-1 min-w-[200px] p-4 border-2 cursor-pointer transition-all ${
              dataSources.harv3st.enabled
                ? 'border-green-500 bg-green-50 shadow-neo translate-x-[-2px] translate-y-[-2px]'
                : 'border-neo-border bg-white hover:bg-gray-50'
            }`}
          >
            <div className="flex items-center gap-2 mb-2">
              <input type="checkbox" checked={dataSources.harv3st.enabled} onChange={() => {}} className="w-4 h-4" />
              <span className="font-black uppercase">{t.harv3st}</span>
            </div>
            <div className="flex items-center gap-1.5 mb-1">
              <span className={`w-2 h-2 rounded-full ${
                dataSources.harv3st.status === 'connected' ? 'bg-green-500' :
                dataSources.harv3st.status === 'offline' ? 'bg-red-500' : 'bg-yellow-500'
              }`} />
              <span className={`text-xs ${
                dataSources.harv3st.status === 'connected' ? 'text-green-600' :
                dataSources.harv3st.status === 'offline' ? 'text-red-600' : 'text-yellow-600'
              }`}>
                {dataSources.harv3st.status === 'connected' ? t.connected :
                 dataSources.harv3st.status === 'offline' ? t.offline : t.checking}
              </span>
            </div>
            <p className="text-xs text-gray-500">{t.freeSlower}</p>
          </div>

          {/* Radar Card */}
          <div
            onClick={toggleRadar}
            className={`flex-1 min-w-[200px] p-4 border-2 cursor-pointer transition-all ${
              dataSources.radar.enabled
                ? 'border-blue-500 bg-blue-50 shadow-neo translate-x-[-2px] translate-y-[-2px]'
                : 'border-neo-border bg-white hover:bg-gray-50'
            }`}
          >
            <div className="flex items-center gap-2 mb-2">
              <input type="checkbox" checked={dataSources.radar.enabled} onChange={() => {}} className="w-4 h-4" />
              <span className="font-black uppercase">{t.radar}</span>
            </div>
            <div className="flex items-center gap-1.5 mb-1">
              <span className={`w-2 h-2 rounded-full ${dataSources.radar.hasApiKey ? 'bg-green-500' : 'bg-gray-400'}`} />
              <span className={`text-xs ${dataSources.radar.hasApiKey ? 'text-green-600' : 'text-gray-500'}`}>
                {dataSources.radar.hasApiKey ? t.apiKeyOk : t.noApiKey}
              </span>
            </div>
            <p className="text-xs text-gray-500">{t.paidFaster}</p>
          </div>
        </div>
      </div>

      {/* Search Form */}
      <div className="bg-white border-2 border-neo-border shadow-neo p-4">
        <SearchForm
          language={language}
          onSearch={handleUnifiedSearch}
          disabled={!canSearch || isSearching}
          placeholder={t.searchPlaceholder}
        />

        {/* Progress Indicator */}
        {isSearching && (
          <div className="mt-4 p-4 bg-gray-50 border-2 border-neo-border">
            <div className="flex items-center gap-4">
              {dataSources.harv3st.enabled && (
                <div className="flex items-center gap-2">
                  <span className={`w-3 h-3 rounded-full ${
                    searchProgress.harv3st === 'searching' ? 'bg-yellow-500 animate-pulse' :
                    searchProgress.harv3st === 'done' ? 'bg-green-500' :
                    searchProgress.harv3st === 'error' ? 'bg-red-500' : 'bg-gray-300'
                  }`} />
                  <span className="text-sm font-bold">Harv3st</span>
                </div>
              )}
              {dataSources.radar.enabled && (
                <div className="flex items-center gap-2">
                  <span className={`w-3 h-3 rounded-full ${
                    searchProgress.radar === 'searching' ? 'bg-yellow-500 animate-pulse' :
                    searchProgress.radar === 'done' ? 'bg-green-500' :
                    searchProgress.radar === 'error' ? 'bg-red-500' : 'bg-gray-300'
                  }`} />
                  <span className="text-sm font-bold">Radar</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-3">
        <button onClick={loadData} disabled={isSearching || dataSources.harv3st.status === 'offline'} className="px-4 py-2 bg-gray-100 border-2 border-neo-border font-bold uppercase hover:bg-gray-200 transition-colors disabled:opacity-50">
          {t.refreshData}
        </button>
        <button onClick={handleExportAll} disabled={unifiedLeads.length === 0} className="px-4 py-2 bg-gray-100 border-2 border-neo-border font-bold uppercase hover:bg-gray-200 transition-colors disabled:opacity-50">
          {t.exportAll}
        </button>
        <button onClick={handleExportSelected} disabled={selectedLeadIds.size === 0} className="px-4 py-2 bg-gray-100 border-2 border-neo-border font-bold uppercase hover:bg-gray-200 transition-colors disabled:opacity-50">
          {t.exportSelected}
        </button>
        <button onClick={handleTransferToAnalysis} disabled={selectedLeadIds.size === 0} className="px-4 py-2 bg-green-500 text-white border-2 border-neo-border font-bold uppercase shadow-neo hover:translate-x-[-2px] hover:translate-y-[-2px] transition-all disabled:opacity-50">
          {t.transferToAnalysis} ({selectedLeadIds.size})
        </button>
      </div>

      {/* Filters */}
      <FilterPanel
        language={language}
        filters={harvestFilters}
        setFilters={setHarvestFilters}
        totalCount={unifiedLeads.length}
        filteredCount={filteredLeads.length}
      />

      {/* Selection Summary */}
      <SelectionSummary
        language={language}
        selectedCount={selectedLeadIds.size}
        totalCount={filteredLeads.length}
        onSelectAll={handleSelectAll}
        onClearSelection={handleClearSelection}
      />

      {/* Results Grid */}
      {filteredLeads.length > 0 ? (
        <div className="bg-white border-2 border-neo-border shadow-neo overflow-hidden">
          {/* Source badges legend */}
          <div className="px-4 py-2 bg-gray-50 border-b-2 border-neo-border flex items-center gap-4 text-xs">
            <span className="font-bold uppercase">Fuente:</span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-green-500"></span> {t.sourceHarv3st}
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-blue-500"></span> {t.sourceRadar}
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-purple-500"></span> {t.sourceBoth}
            </span>
          </div>
          <LeadDataGrid
            language={language}
            leads={filteredLeads}
            selectedIds={selectedLeadIds}
            onSelectLead={handleSelectLead}
            sortField={sortField}
            sortDirection={sortDirection}
            onSort={(field) => {
              if (field === sortField) setSortDirection(d => d === 'asc' ? 'desc' : 'asc');
              else { setSortField(field); setSortDirection('desc'); }
            }}
          />
        </div>
      ) : !isSearching && (
        <div className="text-center py-12 text-gray-500 bg-white border-2 border-neo-border">{t.noResults}</div>
      )}

      {/* Warning Modal */}
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

      {/* Settings Panel */}
      {showSettings && <SettingsPanel language={language} onClose={() => setShowSettings(false)} />}
    </div>
  );
};

export default SearchTab;
