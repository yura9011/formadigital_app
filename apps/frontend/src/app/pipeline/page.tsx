'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { NeoButton } from '@/components/neo/NeoButton';
import { NeoCard } from '@/components/neo/NeoCard';
import toast from 'react-hot-toast';
import { withAuth } from '@/components/auth/withAuth';
import {
  PipelineStage,
  PipelineSummary,
  Lead,
  LeadDetail,
  PipelineMetrics,
  getPipelineSummary,
  getLeadsByStage,
  getLeadDetail,
  transitionLead,
  reviveLead,
  convertLead,
  enrichInstagram,
  getPipelineMetrics,
  STAGE_CONFIG,
  VALID_TRANSITIONS,
} from '@/services/pipeline.service';

const STAGES: PipelineStage[] = ['DISCOVERED', 'ANALYZED', 'CONTACTED', 'RESPONDED', 'CONVERTED', 'DISCARDED'];

function PipelinePage() {
  const [activeStage, setActiveStage] = useState<PipelineStage>('DISCOVERED');
  const [summary, setSummary] = useState<PipelineSummary | null>(null);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [totalLeads, setTotalLeads] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState<PipelineMetrics | null>(null);
  
  // Detail modal
  const [selectedLead, setSelectedLead] = useState<LeadDetail | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);
  
  // Convert modal
  const [showConvertModal, setShowConvertModal] = useState(false);
  const [convertForm, setConvertForm] = useState({ projectName: '', projectDetails: '' });
  
  // Discard modal
  const [showDiscardModal, setShowDiscardModal] = useState(false);
  const [discardReason, setDiscardReason] = useState('');
  const [leadToDiscard, setLeadToDiscard] = useState<Lead | null>(null);

  // Search and sort
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'score' | 'createdAt' | 'name' | 'daysInStage'>('score');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Load summary
  const loadSummary = useCallback(async () => {
    try {
      const data = await getPipelineSummary();
      setSummary(data);
    } catch (error) {
      console.error('Failed to load summary:', error);
    }
  }, []);

  // Load leads
  const loadLeads = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getLeadsByStage({
        stage: activeStage,
        page: currentPage,
        limit: 50,
        sortBy,
        sortOrder,
        search: searchQuery || undefined,
      });
      setLeads(data.leads);
      setTotalLeads(data.total);
    } catch (error) {
      console.error('Failed to load leads:', error);
      toast.error('Error al cargar leads');
    } finally {
      setLoading(false);
    }
  }, [activeStage, currentPage, sortBy, sortOrder, searchQuery]);

  // Load metrics
  const loadMetrics = useCallback(async () => {
    try {
      const data = await getPipelineMetrics();
      setMetrics(data);
    } catch (error) {
      console.error('Failed to load metrics:', error);
    }
  }, []);

  useEffect(() => {
    loadSummary();
    loadMetrics();
  }, [loadSummary, loadMetrics]);

  useEffect(() => {
    loadLeads();
  }, [loadLeads]);

  // View lead detail
  const handleViewDetail = async (lead: Lead) => {
    setShowDetailModal(true);
    setLoadingDetail(true);
    try {
      const detail = await getLeadDetail(lead.id);
      setSelectedLead(detail);
    } catch (error) {
      console.error('Failed to load detail:', error);
      toast.error('Error al cargar detalle');
    } finally {
      setLoadingDetail(false);
    }
  };

  // Transition lead
  const handleTransition = async (lead: Lead, toStage: PipelineStage) => {
    if (toStage === 'DISCARDED') {
      setLeadToDiscard(lead);
      setShowDiscardModal(true);
      return;
    }
    
    const toastId = toast.loading('Moviendo lead...');
    try {
      await transitionLead(lead.id, toStage);
      toast.success(`Lead movido a ${STAGE_CONFIG[toStage].label}`, { id: toastId });
      loadLeads();
      loadSummary();
    } catch (error) {
      console.error('Transition failed:', error);
      toast.error('Error al mover lead', { id: toastId });
    }
  };

  // Confirm discard
  const handleConfirmDiscard = async () => {
    if (!leadToDiscard || !discardReason.trim()) {
      toast.error('Ingresa una razón para descartar');
      return;
    }
    
    const toastId = toast.loading('Descartando lead...');
    try {
      await transitionLead(leadToDiscard.id, 'DISCARDED', discardReason);
      toast.success('Lead descartado', { id: toastId });
      setShowDiscardModal(false);
      setDiscardReason('');
      setLeadToDiscard(null);
      loadLeads();
      loadSummary();
    } catch (error) {
      console.error('Discard failed:', error);
      toast.error('Error al descartar', { id: toastId });
    }
  };

  // Revive lead
  const handleRevive = async (lead: Lead) => {
    const toastId = toast.loading('Reviviendo lead...');
    try {
      await reviveLead(lead.id, 'Revivido desde UI');
      toast.success('Lead revivido', { id: toastId });
      loadLeads();
      loadSummary();
    } catch (error) {
      console.error('Revive failed:', error);
      toast.error('Error al revivir', { id: toastId });
    }
  };

  // Convert lead
  const handleConvert = async () => {
    if (!selectedLead || !convertForm.projectName.trim()) {
      toast.error('Nombre del proyecto requerido');
      return;
    }
    
    const toastId = toast.loading('Convirtiendo lead...');
    try {
      await convertLead(selectedLead.id, convertForm.projectName, convertForm.projectDetails);
      toast.success('🎉 Lead convertido a cliente!', { id: toastId });
      setShowConvertModal(false);
      setShowDetailModal(false);
      setConvertForm({ projectName: '', projectDetails: '' });
      loadLeads();
      loadSummary();
      loadMetrics();
    } catch (error) {
      console.error('Convert failed:', error);
      toast.error('Error al convertir', { id: toastId });
    }
  };

  // Enrich Instagram
  const handleEnrichInstagram = async (leadId: string, handle?: string) => {
    const toastId = toast.loading('Enriqueciendo Instagram...');
    try {
      const result = await enrichInstagram(leadId, handle);
      if (result.success) {
        toast.success('Instagram enriquecido!', { id: toastId });
        if (selectedLead) {
          const detail = await getLeadDetail(leadId);
          setSelectedLead(detail);
        }
      } else {
        toast.error(result.error || 'Error al enriquecer', { id: toastId });
      }
    } catch (error) {
      console.error('Enrich failed:', error);
      toast.error('Error al enriquecer Instagram', { id: toastId });
    }
  };

  const getTierBadge = (tier?: string | null) => {
    if (!tier) return null;
    const colors: Record<string, string> = {
      HOT: 'bg-red-400',
      WARM: 'bg-orange-300',
      COLD: 'bg-blue-300',
    };
    return (
      <span className={`px-2 py-0.5 text-xs font-bold ${colors[tier] || 'bg-gray-200'}`}>
        {tier}
      </span>
    );
  };

  return (
    <div className="min-h-screen flex flex-col bg-neo-bg text-neo-text p-4 md:p-8 font-sans">
      {/* Header */}
      <header className="mb-6 flex flex-wrap justify-between items-center border-b-4 border-neo-border pb-6 gap-4">
        <div className="flex items-center gap-4">
          <NeoButton onClick={() => window.location.href = '/'} size="sm" variant="secondary">
            ← Inicio
          </NeoButton>
          <h1 className="text-3xl md:text-4xl font-black tracking-tighter uppercase italic">
            📊 Pipeline
          </h1>
        </div>
      </header>

      {/* Metrics Dashboard */}
      {metrics && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 mb-6">
          <NeoCard className="p-3 text-center">
            <p className="text-2xl font-black">{summary?.total || 0}</p>
            <p className="text-xs font-bold uppercase text-gray-500">Total Leads</p>
          </NeoCard>
          <NeoCard className="p-3 text-center bg-green-100">
            <p className="text-2xl font-black">{metrics.conversionRate.toFixed(1)}%</p>
            <p className="text-xs font-bold uppercase text-gray-500">Conversión</p>
          </NeoCard>
          <NeoCard className="p-3 text-center bg-neo-yellow/30">
            <p className="text-2xl font-black">{metrics.leadsConvertedThisMonth}</p>
            <p className="text-xs font-bold uppercase text-gray-500">Convertidos/Mes</p>
          </NeoCard>
          <NeoCard className="p-3 text-center bg-red-100">
            <p className="text-2xl font-black">{metrics.leadsDiscardedThisMonth}</p>
            <p className="text-xs font-bold uppercase text-gray-500">Descartados/Mes</p>
          </NeoCard>
          <NeoCard className="p-3 text-center bg-blue-100">
            <p className="text-2xl font-black">{metrics.averageDaysPerStage?.DISCOVERED?.toFixed(0) || 0}d</p>
            <p className="text-xs font-bold uppercase text-gray-500">Prom. Descubierto</p>
          </NeoCard>
          <NeoCard className="p-3 text-center bg-purple-100">
            <p className="text-2xl font-black">{metrics.averageDaysPerStage?.CONTACTED?.toFixed(0) || 0}d</p>
            <p className="text-xs font-bold uppercase text-gray-500">Prom. Contactado</p>
          </NeoCard>
        </div>
      )}

      {/* Top Categories */}
      {metrics && metrics.topCategories && metrics.topCategories.length > 0 && (
        <div className="mb-6 flex flex-wrap gap-2 items-center">
          <span className="text-xs font-bold uppercase text-gray-500">Top categorías:</span>
          {metrics.topCategories.slice(0, 5).map((cat, i) => (
            <span key={i} className="px-2 py-1 text-xs font-bold bg-gray-100 border border-neo-border">
              {cat.category} ({cat.count})
            </span>
          ))}
        </div>
      )}

      {/* Stage Tabs */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {STAGES.map((stage) => {
          const config = STAGE_CONFIG[stage];
          const count = summary?.byStage[stage] || 0;
          return (
            <NeoButton
              key={stage}
              variant={activeStage === stage ? 'primary' : 'secondary'}
              onClick={() => { setActiveStage(stage); setCurrentPage(1); }}
              className="relative"
            >
              <span className="mr-1">{config.icon}</span>
              {config.label}
              <span className={`ml-2 px-2 py-0.5 text-xs font-bold ${config.color} border border-neo-border`}>
                {count}
              </span>
            </NeoButton>
          );
        })}
      </div>

      {/* Search and Sort */}
      <NeoCard className="p-4 mb-4">
        <div className="flex flex-wrap gap-4 items-center">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && loadLeads()}
            placeholder="Buscar por nombre, categoría..."
            className="flex-1 min-w-[200px] p-2 border-2 border-neo-border"
          />
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="p-2 border-2 border-neo-border font-bold"
          >
            <option value="score">Score</option>
            <option value="createdAt">Fecha</option>
            <option value="name">Nombre</option>
            <option value="daysInStage">Días en etapa</option>
          </select>
          <NeoButton
            variant="secondary"
            size="sm"
            onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
          >
            {sortOrder === 'desc' ? '↓' : '↑'}
          </NeoButton>
          <NeoButton variant="accent" onClick={loadLeads}>🔍 Buscar</NeoButton>
        </div>
      </NeoCard>

      {/* Leads count */}
      <p className="text-sm font-bold text-gray-500 mb-4">{totalLeads} leads en {STAGE_CONFIG[activeStage].label}</p>

      {/* Leads Table */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin w-12 h-12 border-4 border-neo-border border-t-neo-blue"></div>
        </div>
      ) : (
        <NeoCard className="p-0 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-100 border-b-2 border-neo-border">
              <tr>
                <th className="text-left p-4 font-black uppercase text-sm">Negocio</th>
                <th className="text-center p-4 font-black uppercase text-sm hidden md:table-cell">Rating</th>
                <th className="text-center p-4 font-black uppercase text-sm">Score</th>
                <th className="text-center p-4 font-black uppercase text-sm hidden lg:table-cell">Días</th>
                <th className="text-center p-4 font-black uppercase text-sm">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {leads.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center p-8 text-gray-500">
                    No hay leads en esta etapa.
                  </td>
                </tr>
              ) : (
                leads.map((lead) => (
                  <tr key={lead.id} className="border-b border-gray-200 hover:bg-neo-yellow/10">
                    <td className="p-4">
                      <p className="font-bold">{lead.name}</p>
                      <p className="text-xs text-gray-400">{lead.category || lead.address}</p>
                    </td>
                    <td className="p-4 text-center hidden md:table-cell">
                      {lead.rating ? <span className="font-bold">⭐ {lead.rating.toFixed(1)}</span> : '-'}
                    </td>
                    <td className="p-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <span className={`px-2 py-1 font-bold ${(lead.score || 0) >= 60 ? 'bg-green-200' : (lead.score || 0) >= 30 ? 'bg-yellow-200' : 'bg-gray-200'}`}>
                          {lead.score || 0}
                        </span>
                        {getTierBadge(lead.tier)}
                      </div>
                    </td>
                    <td className="p-4 text-center hidden lg:table-cell">
                      <span className="text-sm">{lead.daysInStage}d</span>
                    </td>
                    <td className="p-4 text-center">
                      <div className="flex gap-1 justify-center flex-wrap">
                        <NeoButton size="sm" variant="secondary" onClick={() => handleViewDetail(lead)}>
                          👁️
                        </NeoButton>
                        {activeStage === 'DISCARDED' ? (
                          <NeoButton size="sm" variant="accent" onClick={() => handleRevive(lead)}>
                            ♻️ Revivir
                          </NeoButton>
                        ) : (
                          VALID_TRANSITIONS[activeStage].filter(s => s !== 'DISCARDED').map((nextStage) => (
                            <NeoButton
                              key={nextStage}
                              size="sm"
                              variant="primary"
                              onClick={() => handleTransition(lead, nextStage)}
                            >
                              → {STAGE_CONFIG[nextStage].icon}
                            </NeoButton>
                          ))
                        )}
                        {activeStage !== 'CONVERTED' && activeStage !== 'DISCARDED' && (
                          <NeoButton size="sm" variant="danger" onClick={() => handleTransition(lead, 'DISCARDED')}>
                            🗑️
                          </NeoButton>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </NeoCard>
      )}

      {/* Detail Modal */}
      {showDetailModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <NeoCard className="w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6">
            <div className="flex justify-between items-start mb-4">
              <h2 className="text-2xl font-black">{selectedLead?.name || 'Cargando...'}</h2>
              <NeoButton size="sm" variant="secondary" onClick={() => setShowDetailModal(false)}>✕</NeoButton>
            </div>
            
            {loadingDetail ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin w-8 h-8 border-4 border-neo-border border-t-neo-blue"></div>
              </div>
            ) : selectedLead && (
              <div className="space-y-4">
                {/* Basic Info */}
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div><span className="font-bold">Dirección:</span> {selectedLead.address}</div>
                  <div><span className="font-bold">Categoría:</span> {selectedLead.category || '-'}</div>
                  <div><span className="font-bold">Teléfono:</span> {selectedLead.phone || '-'}</div>
                  <div><span className="font-bold">Website:</span> {selectedLead.website ? <a href={selectedLead.website} target="_blank" className="text-blue-600 underline">{selectedLead.website}</a> : '-'}</div>
                  <div><span className="font-bold">Rating:</span> {selectedLead.rating ? `⭐ ${selectedLead.rating.toFixed(1)} (${selectedLead.reviewCount} reviews)` : '-'}</div>
                  <div><span className="font-bold">Fotos:</span> {selectedLead.photoCount || 0}</div>
                </div>

                {/* Score Breakdown */}
                <div className="border-t-2 border-neo-border pt-4">
                  <h3 className="font-black mb-2">📊 Score Breakdown</h3>
                  <div className="flex items-center gap-4 mb-2">
                    <span className={`text-3xl font-black px-4 py-2 ${(selectedLead.score || 0) >= 60 ? 'bg-green-200' : (selectedLead.score || 0) >= 30 ? 'bg-yellow-200' : 'bg-gray-200'}`}>
                      {selectedLead.scoreBreakdown?.total || selectedLead.score || 0}
                    </span>
                    <span className="text-gray-500">/ {selectedLead.scoreBreakdown?.maxScore || 100}</span>
                    {getTierBadge(selectedLead.tier)}
                  </div>
                  {selectedLead.scoreBreakdown?.components && (
                    <div className="space-y-1">
                      {selectedLead.scoreBreakdown.components.map((comp) => (
                        <div key={comp.ruleId} className={`flex justify-between text-sm p-2 ${comp.applied ? 'bg-green-50' : 'bg-gray-50'}`}>
                          <span>{comp.applied ? '✓' : '○'} {comp.ruleName}</span>
                          <span className="font-bold">{comp.applied ? `+${comp.points}` : '0'}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Instagram */}
                <div className="border-t-2 border-neo-border pt-4">
                  <h3 className="font-black mb-2">📸 Instagram</h3>
                  {selectedLead.instagram ? (
                    <div className="space-y-2">
                      <p><span className="font-bold">Handle:</span> @{selectedLead.instagram}</p>
                      {selectedLead.instagramFollowers && (
                        <p><span className="font-bold">Followers:</span> {selectedLead.instagramFollowers.toLocaleString()}</p>
                      )}
                      {selectedLead.instagramPosts && (
                        <p><span className="font-bold">Posts:</span> {selectedLead.instagramPosts}</p>
                      )}
                      {selectedLead.instagramBio && (
                        <p><span className="font-bold">Bio:</span> {selectedLead.instagramBio}</p>
                      )}
                      <NeoButton size="sm" variant="accent" onClick={() => handleEnrichInstagram(selectedLead.id)}>
                        🔄 Actualizar datos
                      </NeoButton>
                    </div>
                  ) : (
                    <div className="flex gap-2 items-center">
                      <input
                        type="text"
                        placeholder="@handle"
                        className="p-2 border-2 border-neo-border"
                        id="instagram-handle"
                      />
                      <NeoButton
                        size="sm"
                        variant="accent"
                        onClick={() => {
                          const input = document.getElementById('instagram-handle') as HTMLInputElement;
                          if (input.value) handleEnrichInstagram(selectedLead.id, input.value);
                        }}
                      >
                        📸 Enriquecer
                      </NeoButton>
                    </div>
                  )}
                </div>

                {/* Transition History */}
                {selectedLead.transitionHistory && selectedLead.transitionHistory.length > 0 && (
                  <div className="border-t-2 border-neo-border pt-4">
                    <h3 className="font-black mb-2">📜 Historial</h3>
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                      {selectedLead.transitionHistory.map((t) => (
                        <div key={t.id} className="text-sm flex justify-between items-center p-2 bg-gray-50">
                          <span>
                            {STAGE_CONFIG[t.fromStage]?.icon} → {STAGE_CONFIG[t.toStage]?.icon}
                            {t.reason && <span className="text-gray-500 ml-2">({t.reason})</span>}
                          </span>
                          <span className="text-xs text-gray-400">
                            {new Date(t.createdAt).toLocaleDateString('es-AR')}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="border-t-2 border-neo-border pt-4 flex gap-2 flex-wrap">
                  {selectedLead.stage === 'RESPONDED' && (
                    <NeoButton variant="primary" onClick={() => setShowConvertModal(true)}>
                      🎉 Convertir a Cliente
                    </NeoButton>
                  )}
                  {selectedLead.stage !== 'CONVERTED' && selectedLead.stage !== 'DISCARDED' && (
                    <NeoButton variant="danger" onClick={() => { setLeadToDiscard(selectedLead); setShowDiscardModal(true); }}>
                      🗑️ Descartar
                    </NeoButton>
                  )}
                </div>
              </div>
            )}
          </NeoCard>
        </div>
      )}

      {/* Convert Modal */}
      {showConvertModal && selectedLead && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <NeoCard className="w-full max-w-md p-6">
            <h2 className="text-xl font-black mb-4">🎉 Convertir a Cliente</h2>
            <p className="text-sm text-gray-500 mb-4">Creando cliente y proyecto para: {selectedLead.name}</p>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold mb-1">Nombre del Proyecto *</label>
                <input
                  type="text"
                  value={convertForm.projectName}
                  onChange={(e) => setConvertForm({ ...convertForm, projectName: e.target.value })}
                  placeholder="Ej: Desarrollo Web"
                  className="w-full p-2 border-2 border-neo-border"
                />
              </div>
              <div>
                <label className="block text-sm font-bold mb-1">Detalles (opcional)</label>
                <textarea
                  value={convertForm.projectDetails}
                  onChange={(e) => setConvertForm({ ...convertForm, projectDetails: e.target.value })}
                  placeholder="Notas adicionales..."
                  className="w-full p-2 border-2 border-neo-border h-24"
                />
              </div>
              <div className="flex gap-2 justify-end">
                <NeoButton variant="secondary" onClick={() => setShowConvertModal(false)}>Cancelar</NeoButton>
                <NeoButton variant="primary" onClick={handleConvert}>✓ Convertir</NeoButton>
              </div>
            </div>
          </NeoCard>
        </div>
      )}

      {/* Discard Modal */}
      {showDiscardModal && leadToDiscard && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <NeoCard className="w-full max-w-md p-6">
            <h2 className="text-xl font-black mb-4">🗑️ Descartar Lead</h2>
            <p className="text-sm text-gray-500 mb-4">Descartando: {leadToDiscard.name}</p>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold mb-1">Razón *</label>
                <input
                  type="text"
                  value={discardReason}
                  onChange={(e) => setDiscardReason(e.target.value)}
                  placeholder="Ej: No interesado, fuera de zona..."
                  className="w-full p-2 border-2 border-neo-border"
                />
              </div>
              <div className="flex gap-2 justify-end">
                <NeoButton variant="secondary" onClick={() => { setShowDiscardModal(false); setDiscardReason(''); }}>Cancelar</NeoButton>
                <NeoButton variant="danger" onClick={handleConfirmDiscard}>🗑️ Descartar</NeoButton>
              </div>
            </div>
          </NeoCard>
        </div>
      )}
    </div>
  );
}

export default withAuth(PipelinePage);
