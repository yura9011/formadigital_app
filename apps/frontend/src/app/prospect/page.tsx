'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { NeoButton } from '@/components/neo/NeoButton';
import { NeoCard } from '@/components/neo/NeoCard';
import toast from 'react-hot-toast';
import { withAuth } from '@/components/auth/withAuth';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

// Types
type ContactStatus = 'none' | 'pending' | 'approved' | 'sent' | 'rejected' | 'responded';
type OutreachChannel = 'instagram' | 'whatsapp' | 'email';
type TabType = 'leads' | 'contacts' | 'templates' | 'stats';

interface Lead {
  id: string;
  name: string;
  address: string;
  phone?: string | null;
  website?: string | null;
  instagram?: string | null;
  email?: string | null;
  rating?: number | null;
  reviewCount?: number | null;
  opportunityScore: number;
  categories?: string | null;
  contactStatus: ContactStatus;
  availableChannels: OutreachChannel[];
}

interface ContactRecord {
  id: string;
  leadId: string;
  leadName: string;
  channel: OutreachChannel;
  message: string;
  status: ContactStatus;
  notes?: string | null;
  createdAt: string;
  sentAt?: string;
  respondedAt?: string;
}

interface MessageTemplate {
  id: string;
  name: string;
  channel: OutreachChannel;
  scenario: string;
  content: string;
  isDefault: boolean;
}

interface RecentContact {
  id: string;
  leadId: string;
  leadName: string;
  leadCategory: string | null;
  channel: OutreachChannel;
  status: ContactStatus;
  createdAt: string;
  sentAt?: string;
  respondedAt?: string;
}

interface TopLead {
  id: string;
  name: string;
  count: number;
}

interface ContactStats {
  totalContacts: number;
  byStatus: Record<string, number>;
  byChannel: Record<string, number>;
  byCategory: Record<string, number>;
  contactsToday: number;
  contactsThisWeek: number;
  responseRate: number;
  recentContacts: RecentContact[];
  topLeads: TopLead[];
}

function ProspectPage() {
  const [activeTab, setActiveTab] = useState<TabType>('leads');
  const [loading, setLoading] = useState(true);
  
  // Leads state
  const [leads, setLeads] = useState<Lead[]>([]);
  const [leadsTotal, setLeadsTotal] = useState(0);
  const [leadFilters, setLeadFilters] = useState({
    minScore: 0,
    hasWebsite: undefined as boolean | undefined,
    hasPhone: undefined as boolean | undefined,
    includeContacted: false,
  });
  
  // Contacts state
  const [contacts, setContacts] = useState<ContactRecord[]>([]);
  const [contactsTotal, setContactsTotal] = useState(0);
  
  // Templates state
  const [templates, setTemplates] = useState<MessageTemplate[]>([]);
  
  // Stats state
  const [stats, setStats] = useState<ContactStats | null>(null);
  
  // Modal states
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [showContactModal, setShowContactModal] = useState(false);
  const [contactForm, setContactForm] = useState({
    channel: 'instagram' as OutreachChannel,
    message: '',
    notes: '',
  });

  // Search businesses state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchStatus, setSearchStatus] = useState<'idle' | 'checking' | 'searching' | 'completed' | 'error'>('idle');
  const [harv3stConnected, setHarv3stConnected] = useState<boolean | null>(null);
  const [searchResult, setSearchResult] = useState<{ found: number; imported: number; duplicates: number } | null>(null);

  // Lead detail modal state
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [leadDetail, setLeadDetail] = useState<{
    lead: Lead;
    contacts: ContactRecord[];
    opportunities: string[];
  } | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // Load leads
  const loadLeads = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (leadFilters.minScore > 0) params.append('minScore', String(leadFilters.minScore));
      if (leadFilters.hasWebsite !== undefined) params.append('hasWebsite', String(leadFilters.hasWebsite));
      if (leadFilters.hasPhone !== undefined) params.append('hasPhone', String(leadFilters.hasPhone));
      if (leadFilters.includeContacted) params.append('includeContacted', 'true');
      params.append('limit', '50');
      
      const res = await fetch(`${API_BASE}/api/prospect/leads?${params.toString()}`);
      const data = await res.json();
      setLeads(data.leads || []);
      setLeadsTotal(data.total || 0);
    } catch (error) {
      console.error('Failed to load leads:', error);
      toast.error('Error al cargar leads');
    } finally {
      setLoading(false);
    }
  }, [leadFilters]);

  // Load contacts
  const loadContacts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/prospect/contacts?limit=50`);
      const data = await res.json();
      setContacts(data.contacts || []);
      setContactsTotal(data.total || 0);
    } catch (error) {
      console.error('Failed to load contacts:', error);
      toast.error('Error al cargar contactos');
    } finally {
      setLoading(false);
    }
  }, []);

  // Load templates
  const loadTemplates = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/prospect/templates`);
      const data = await res.json();
      setTemplates(data || []);
    } catch (error) {
      console.error('Failed to load templates:', error);
      toast.error('Error al cargar templates');
    } finally {
      setLoading(false);
    }
  }, []);

  // Load stats
  const loadStats = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/prospect/contacts/stats`);
      const data = await res.json();
      setStats(data);
    } catch (error) {
      console.error('Failed to load stats:', error);
      toast.error('Error al cargar estadísticas');
    } finally {
      setLoading(false);
    }
  }, []);

  // Load data based on active tab
  useEffect(() => {
    switch (activeTab) {
      case 'leads': loadLeads(); break;
      case 'contacts': loadContacts(); break;
      case 'templates': loadTemplates(); break;
      case 'stats': loadStats(); break;
    }
  }, [activeTab, loadLeads, loadContacts, loadTemplates, loadStats]);

  // Check Harv3st status on mount
  useEffect(() => {
    const checkHarv3st = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/prospect/harv3st/status`);
        const data = await res.json();
        setHarv3stConnected(data.connected);
      } catch {
        setHarv3stConnected(false);
      }
    };
    checkHarv3st();
  }, []);

  // Load templates on mount for contact modal
  useEffect(() => {
    const fetchTemplates = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/prospect/templates`);
        const data = await res.json();
        setTemplates(data || []);
      } catch (error) {
        console.error('Failed to load templates:', error);
      }
    };
    fetchTemplates();
  }, []);

  // Search businesses via Harv3st
  const handleSearchBusinesses = async () => {
    if (!searchQuery.trim()) {
      toast.error('Ingresa una búsqueda (ej: "restaurantes en Haedo")');
      return;
    }
    
    setSearchStatus('searching');
    setSearchResult(null);
    const toastId = toast.loading('Buscando en Google Maps...');
    
    try {
      const res = await fetch(`${API_BASE}/api/prospect/search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: searchQuery }),
      });
      
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || 'Error en búsqueda');
      }
      
      const data = await res.json();
      setSearchResult({
        found: data.found || 0,
        imported: data.imported || 0,
        duplicates: data.duplicates || 0,
      });
      setSearchStatus('completed');
      toast.success(`✅ ${data.imported} leads importados!`, { id: toastId });
      
      // Reload leads to show new results
      loadLeads();
    } catch (error) {
      console.error('Search failed:', error);
      setSearchStatus('error');
      toast.error(error instanceof Error ? error.message : 'Error al buscar', { id: toastId });
    }
  };

  // Load lead detail
  const handleViewDetail = async (lead: Lead) => {
    setSelectedLead(lead);
    setShowDetailModal(true);
    setLoadingDetail(true);
    
    try {
      const res = await fetch(`${API_BASE}/api/prospect/leads/${lead.id}`);
      const data = await res.json();
      setLeadDetail({
        lead: data.lead || lead,
        contacts: data.contacts || [],
        opportunities: data.opportunities || [],
      });
    } catch (error) {
      console.error('Failed to load lead detail:', error);
      toast.error('Error al cargar detalle');
      // Still show basic info
      setLeadDetail({
        lead,
        contacts: [],
        opportunities: [],
      });
    } finally {
      setLoadingDetail(false);
    }
  };

  // Enrich lead data
  const handleEnrichLead = async (leadId: string) => {
    const toastId = toast.loading('Enriqueciendo datos...');
    try {
      const res = await fetch(`${API_BASE}/api/prospect/leads/${leadId}/enrich`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fields: ['email', 'instagram'] }),
      });
      
      if (!res.ok) throw new Error('Error al enriquecer');
      
      const data = await res.json();
      toast.success(`✅ Datos actualizados!`, { id: toastId });
      
      // Refresh detail
      if (selectedLead) {
        handleViewDetail(selectedLead);
      }
      loadLeads();
    } catch (error) {
      console.error('Enrich failed:', error);
      toast.error('Error al enriquecer datos', { id: toastId });
    }
  };

  // Create contact record
  const handleCreateContact = async () => {
    if (!selectedLead || !contactForm.message) {
      toast.error('Mensaje requerido');
      return;
    }

    const toastId = toast.loading('Creando contacto...');
    try {
      await fetch(`${API_BASE}/api/prospect/contacts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leadId: selectedLead.id,
          channel: contactForm.channel,
          message: contactForm.message,
          status: 'pending',
          notes: contactForm.notes || undefined,
        }),
      });
      
      toast.success('Contacto creado!', { id: toastId });
      setShowContactModal(false);
      setSelectedLead(null);
      setContactForm({ channel: 'instagram', message: '', notes: '' });
      loadLeads();
    } catch (error) {
      console.error(error);
      toast.error('Error al crear contacto', { id: toastId });
    }
  };

  // Update contact status
  const handleUpdateStatus = async (contactId: string, newStatus: ContactStatus) => {
    const toastId = toast.loading('Actualizando...');
    try {
      await fetch(`${API_BASE}/api/prospect/contacts/${contactId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      
      toast.success('Estado actualizado!', { id: toastId });
      loadContacts();
    } catch (error) {
      console.error(error);
      toast.error('Error al actualizar', { id: toastId });
    }
  };

  // Get status badge
  const getStatusBadge = (status: ContactStatus) => {
    const badges: Record<ContactStatus, { bg: string; label: string }> = {
      none: { bg: 'bg-gray-200', label: 'Sin contactar' },
      pending: { bg: 'bg-neo-yellow', label: '⏳ Pendiente' },
      approved: { bg: 'bg-blue-300', label: '✓ Aprobado' },
      sent: { bg: 'bg-purple-300', label: '📤 Enviado' },
      rejected: { bg: 'bg-red-300', label: '✕ Rechazado' },
      responded: { bg: 'bg-green-400', label: '💬 Respondió' },
    };
    return badges[status] || badges.none;
  };

  // Get channel icon
  const getChannelIcon = (channel: OutreachChannel) => {
    const icons: Record<OutreachChannel, string> = {
      instagram: '📸',
      whatsapp: '💬',
      email: '📧',
    };
    return icons[channel];
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
            🎯 Prospección
          </h1>
        </div>
      </header>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {(['leads', 'contacts', 'templates', 'stats'] as TabType[]).map((tab) => (
          <NeoButton
            key={tab}
            variant={activeTab === tab ? 'primary' : 'secondary'}
            onClick={() => setActiveTab(tab)}
          >
            {tab === 'leads' && '🎯 Leads'}
            {tab === 'contacts' && '📋 Contactos'}
            {tab === 'templates' && '📝 Templates'}
            {tab === 'stats' && '📊 Stats'}
          </NeoButton>
        ))}
      </div>

      {/* LEADS TAB */}
      {activeTab === 'leads' && (
        <>
          {/* Search Businesses Panel */}
          <NeoCard className="p-4 mb-4 bg-gradient-to-r from-neo-yellow/20 to-neo-blue/10">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xl">🔍</span>
              <h3 className="font-black uppercase text-sm">Buscar Negocios en Google Maps</h3>
              {harv3stConnected === true && (
                <span className="ml-auto px-2 py-1 text-xs font-bold bg-green-200 border-2 border-neo-border">🟢 Harv3st Online</span>
              )}
              {harv3stConnected === false && (
                <span className="ml-auto px-2 py-1 text-xs font-bold bg-red-200 border-2 border-neo-border">🔴 Harv3st Offline</span>
              )}
              {harv3stConnected === null && (
                <span className="ml-auto px-2 py-1 text-xs font-bold bg-gray-200 border-2 border-neo-border">⏳ Verificando...</span>
              )}
            </div>
            <div className="flex gap-2 flex-wrap">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearchBusinesses()}
                placeholder='Ej: "restaurantes en Haedo", "gimnasios en Morón"'
                className="flex-1 min-w-[250px] p-3 border-2 border-neo-border font-medium"
                disabled={searchStatus === 'searching' || !harv3stConnected}
              />
              <NeoButton
                variant="primary"
                onClick={handleSearchBusinesses}
                disabled={searchStatus === 'searching' || !harv3stConnected}
              >
                {searchStatus === 'searching' ? '⏳ Buscando...' : '🚀 Buscar'}
              </NeoButton>
            </div>
            {searchStatus === 'searching' && (
              <div className="mt-3">
                <div className="h-2 bg-gray-200 border border-neo-border overflow-hidden">
                  <div className="h-full bg-neo-blue animate-pulse" style={{ width: '60%' }}></div>
                </div>
                <p className="text-xs text-gray-500 mt-1">Scrapeando Google Maps... esto puede tomar unos segundos</p>
              </div>
            )}
            {searchResult && searchStatus === 'completed' && (
              <div className="mt-3 flex gap-4 text-sm">
                <span className="px-2 py-1 bg-blue-100 border border-neo-border font-bold">📍 {searchResult.found} encontrados</span>
                <span className="px-2 py-1 bg-green-100 border border-neo-border font-bold">✅ {searchResult.imported} importados</span>
                {searchResult.duplicates > 0 && (
                  <span className="px-2 py-1 bg-gray-100 border border-neo-border font-bold">🔄 {searchResult.duplicates} duplicados</span>
                )}
              </div>
            )}
          </NeoCard>

          {/* Filters */}
          <NeoCard className="p-4 mb-6">
            <div className="flex flex-wrap gap-4 items-center">
              <div>
                <label className="text-xs font-bold uppercase text-gray-500 block mb-1">Score mínimo</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={leadFilters.minScore}
                  onChange={(e) => setLeadFilters({ ...leadFilters, minScore: Number(e.target.value) })}
                  className="w-24 p-2 border-2 border-neo-border"
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="hasWebsite"
                  checked={leadFilters.hasWebsite === false}
                  onChange={(e) => setLeadFilters({ ...leadFilters, hasWebsite: e.target.checked ? false : undefined })}
                  className="w-5 h-5"
                />
                <label htmlFor="hasWebsite" className="font-bold text-sm">Sin sitio web</label>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="includeContacted"
                  checked={leadFilters.includeContacted}
                  onChange={(e) => setLeadFilters({ ...leadFilters, includeContacted: e.target.checked })}
                  className="w-5 h-5"
                />
                <label htmlFor="includeContacted" className="font-bold text-sm">Incluir contactados</label>
              </div>
              <NeoButton variant="accent" onClick={loadLeads}>🔍 Buscar</NeoButton>
            </div>
          </NeoCard>

          {/* Leads count */}
          <p className="text-sm font-bold text-gray-500 mb-4">{leadsTotal} leads encontrados</p>

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
                    <th className="text-center p-4 font-black uppercase text-sm hidden lg:table-cell">Score</th>
                    <th className="text-center p-4 font-black uppercase text-sm">Canales</th>
                    <th className="text-center p-4 font-black uppercase text-sm">Estado</th>
                    <th className="text-center p-4 font-black uppercase text-sm">Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {leads.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center p-8 text-gray-500">
                        No hay leads. Ajusta los filtros.
                      </td>
                    </tr>
                  ) : (
                    leads.map((lead) => {
                      const badge = getStatusBadge(lead.contactStatus);
                      return (
                        <tr key={lead.id} className="border-b border-gray-200 hover:bg-neo-yellow/10">
                          <td className="p-4">
                            <p className="font-bold">{lead.name}</p>
                            <p className="text-xs text-gray-400">{lead.categories || lead.address}</p>
                          </td>
                          <td className="p-4 text-center hidden md:table-cell">
                            {lead.rating ? (
                              <span className="font-bold">⭐ {lead.rating.toFixed(1)}</span>
                            ) : '-'}
                          </td>
                          <td className="p-4 text-center hidden lg:table-cell">
                            <span className={`px-2 py-1 font-bold ${lead.opportunityScore >= 70 ? 'bg-green-200' : lead.opportunityScore >= 40 ? 'bg-yellow-200' : 'bg-gray-200'}`}>
                              {lead.opportunityScore}
                            </span>
                          </td>
                          <td className="p-4 text-center">
                            {lead.availableChannels.map((ch) => (
                              <span key={ch} className="mx-1" title={ch}>{getChannelIcon(ch)}</span>
                            ))}
                            {lead.availableChannels.length === 0 && <span className="text-gray-400">-</span>}
                          </td>
                          <td className="p-4 text-center">
                            <span className={`px-2 py-1 text-xs font-bold border-2 border-neo-border ${badge.bg}`}>
                              {badge.label}
                            </span>
                          </td>
                          <td className="p-4 text-center">
                            <div className="flex gap-1 justify-center">
                              <NeoButton
                                size="sm"
                                variant="secondary"
                                onClick={() => handleViewDetail(lead)}
                              >
                                👁️
                              </NeoButton>
                              <NeoButton
                                size="sm"
                                variant="accent"
                                onClick={() => { setSelectedLead(lead); setShowContactModal(true); }}
                              >
                                📨
                              </NeoButton>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </NeoCard>
          )}
        </>
      )}


      {/* CONTACTS TAB */}
      {activeTab === 'contacts' && (
        <>
          <p className="text-sm font-bold text-gray-500 mb-4">{contactsTotal} contactos registrados</p>

          {loading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin w-12 h-12 border-4 border-neo-border border-t-neo-blue"></div>
            </div>
          ) : (
            <NeoCard className="p-0 overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-100 border-b-2 border-neo-border">
                  <tr>
                    <th className="text-left p-4 font-black uppercase text-sm">Lead</th>
                    <th className="text-center p-4 font-black uppercase text-sm">Canal</th>
                    <th className="text-left p-4 font-black uppercase text-sm hidden md:table-cell">Mensaje</th>
                    <th className="text-center p-4 font-black uppercase text-sm">Estado</th>
                    <th className="text-center p-4 font-black uppercase text-sm">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {contacts.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="text-center p-8 text-gray-500">
                        No hay contactos registrados.
                      </td>
                    </tr>
                  ) : (
                    contacts.map((contact) => {
                      const badge = getStatusBadge(contact.status);
                      return (
                        <tr key={contact.id} className="border-b border-gray-200 hover:bg-neo-yellow/10">
                          <td className="p-4">
                            <p className="font-bold">{contact.leadName}</p>
                            <p className="text-xs text-gray-400">{new Date(contact.createdAt).toLocaleDateString('es-AR')}</p>
                          </td>
                          <td className="p-4 text-center text-2xl">
                            {getChannelIcon(contact.channel)}
                          </td>
                          <td className="p-4 hidden md:table-cell">
                            <p className="text-sm truncate max-w-xs">{contact.message}</p>
                          </td>
                          <td className="p-4 text-center">
                            <span className={`px-2 py-1 text-xs font-bold border-2 border-neo-border ${badge.bg}`}>
                              {badge.label}
                            </span>
                          </td>
                          <td className="p-4 text-center">
                            <div className="flex gap-1 justify-center flex-wrap">
                              {contact.status === 'pending' && (
                                <>
                                  <NeoButton size="sm" variant="accent" onClick={() => handleUpdateStatus(contact.id, 'approved')}>✓</NeoButton>
                                  <NeoButton size="sm" variant="danger" onClick={() => handleUpdateStatus(contact.id, 'rejected')}>✕</NeoButton>
                                </>
                              )}
                              {contact.status === 'approved' && (
                                <NeoButton size="sm" variant="primary" onClick={() => handleUpdateStatus(contact.id, 'sent')}>📤 Enviado</NeoButton>
                              )}
                              {contact.status === 'sent' && (
                                <NeoButton size="sm" variant="accent" onClick={() => handleUpdateStatus(contact.id, 'responded')}>💬 Respondió</NeoButton>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </NeoCard>
          )}
        </>
      )}

      {/* TEMPLATES TAB */}
      {activeTab === 'templates' && (
        <>
          <p className="text-sm font-bold text-gray-500 mb-4">{templates.length} templates disponibles</p>

          {loading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin w-12 h-12 border-4 border-neo-border border-t-neo-blue"></div>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {templates.map((template) => (
                <NeoCard key={template.id} className="p-4">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-bold">{template.name}</h3>
                    <span className="text-xl">{getChannelIcon(template.channel)}</span>
                  </div>
                  <p className="text-xs text-gray-500 mb-2">Escenario: {template.scenario}</p>
                  <p className="text-sm bg-gray-50 p-2 border border-gray-200 whitespace-pre-wrap max-h-32 overflow-y-auto">
                    {template.content}
                  </p>
                  {template.isDefault && (
                    <span className="inline-block mt-2 px-2 py-1 text-xs font-bold bg-neo-yellow border-2 border-neo-border">
                      ⭐ Default
                    </span>
                  )}
                </NeoCard>
              ))}
            </div>
          )}
        </>
      )}


      {/* STATS TAB */}
      {activeTab === 'stats' && (
        <>
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin w-12 h-12 border-4 border-neo-border border-t-neo-blue"></div>
            </div>
          ) : stats ? (
            <div className="space-y-6">
              {/* Overview Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <NeoCard className="p-4 text-center">
                  <p className="text-4xl font-black">{stats.totalContacts}</p>
                  <p className="text-xs font-bold uppercase text-gray-500">Total Contactos</p>
                </NeoCard>
                <NeoCard className="p-4 text-center bg-neo-yellow/20">
                  <p className="text-4xl font-black">{stats.contactsToday}</p>
                  <p className="text-xs font-bold uppercase text-gray-500">Hoy</p>
                </NeoCard>
                <NeoCard className="p-4 text-center bg-blue-100">
                  <p className="text-4xl font-black">{stats.contactsThisWeek}</p>
                  <p className="text-xs font-bold uppercase text-gray-500">Esta Semana</p>
                </NeoCard>
                <NeoCard className="p-4 text-center bg-green-100">
                  <p className="text-4xl font-black">{stats.responseRate.toFixed(1)}%</p>
                  <p className="text-xs font-bold uppercase text-gray-500">Tasa Respuesta</p>
                </NeoCard>
              </div>

              {/* By Status */}
              <NeoCard className="p-4">
                <h3 className="font-black uppercase text-sm mb-4 border-b-2 border-black pb-2">Por Estado</h3>
                <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
                  {Object.entries(stats.byStatus).map(([status, count]) => {
                    const badge = getStatusBadge(status as ContactStatus);
                    return (
                      <div key={status} className={`p-3 text-center ${badge.bg} border-2 border-neo-border`}>
                        <p className="text-2xl font-black">{count}</p>
                        <p className="text-xs font-bold">{badge.label}</p>
                      </div>
                    );
                  })}
                </div>
              </NeoCard>

              {/* By Channel */}
              <NeoCard className="p-4">
                <h3 className="font-black uppercase text-sm mb-4 border-b-2 border-black pb-2">Por Canal</h3>
                <div className="grid grid-cols-3 gap-4">
                  {Object.entries(stats.byChannel).map(([channel, count]) => (
                    <div key={channel} className="p-4 text-center bg-gray-50 border-2 border-neo-border">
                      <p className="text-3xl mb-2">{getChannelIcon(channel as OutreachChannel)}</p>
                      <p className="text-2xl font-black">{count}</p>
                      <p className="text-xs font-bold uppercase text-gray-500">{channel}</p>
                    </div>
                  ))}
                </div>
              </NeoCard>

              {/* By Category */}
              {stats.byCategory && Object.keys(stats.byCategory).length > 0 && (
                <NeoCard className="p-4">
                  <h3 className="font-black uppercase text-sm mb-4 border-b-2 border-black pb-2">Por Categoría</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    {Object.entries(stats.byCategory).map(([category, count]) => (
                      <div key={category} className="p-3 text-center bg-purple-50 border-2 border-neo-border">
                        <p className="text-xl font-black">{count}</p>
                        <p className="text-xs font-bold truncate" title={category}>{category}</p>
                      </div>
                    ))}
                  </div>
                </NeoCard>
              )}

              {/* Recent Contacts */}
              {stats.recentContacts && stats.recentContacts.length > 0 && (
                <NeoCard className="p-4">
                  <h3 className="font-black uppercase text-sm mb-4 border-b-2 border-black pb-2">📋 Contactos Recientes</h3>
                  <div className="space-y-2">
                    {stats.recentContacts.slice(0, 5).map((contact) => {
                      const badge = getStatusBadge(contact.status);
                      return (
                        <div key={contact.id} className="flex items-center justify-between p-3 bg-gray-50 border-2 border-neo-border">
                          <div className="flex items-center gap-3">
                            <span className="text-xl">{getChannelIcon(contact.channel)}</span>
                            <div>
                              <p className="font-bold">{contact.leadName}</p>
                              <p className="text-xs text-gray-500">{contact.leadCategory || 'Sin categoría'}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className={`px-2 py-1 text-xs font-bold border-2 border-neo-border ${badge.bg}`}>
                              {badge.label}
                            </span>
                            <span className="text-xs text-gray-400">
                              {new Date(contact.createdAt).toLocaleDateString('es-AR')}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </NeoCard>
              )}

              {/* Top Leads */}
              {stats.topLeads && stats.topLeads.length > 0 && (
                <NeoCard className="p-4">
                  <h3 className="font-black uppercase text-sm mb-4 border-b-2 border-black pb-2">🏆 Leads Más Contactados</h3>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                    {stats.topLeads.slice(0, 5).map((lead, index) => (
                      <div key={lead.id} className={`p-3 text-center border-2 border-neo-border ${index === 0 ? 'bg-neo-yellow' : 'bg-gray-50'}`}>
                        <p className="text-lg font-black">{lead.count}</p>
                        <p className="text-xs font-bold truncate" title={lead.name}>{lead.name}</p>
                      </div>
                    ))}
                  </div>
                </NeoCard>
              )}
            </div>
          ) : (
            <p className="text-center text-gray-500">No hay estadísticas disponibles</p>
          )}
        </>
      )}

      {/* Contact Modal */}
      {showContactModal && selectedLead && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowContactModal(false)}>
          <div className="bg-white border-4 border-neo-border shadow-neo max-w-lg w-full p-6" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-2xl font-black uppercase mb-4 border-b-2 border-black pb-2">
              📨 Contactar: {selectedLead.name}
            </h2>

            <div className="space-y-4">
              {/* Channel Selection */}
              <div>
                <label className="text-xs font-bold uppercase text-gray-500 block mb-2">Canal</label>
                <div className="flex gap-2">
                  {(['instagram', 'whatsapp', 'email'] as OutreachChannel[]).map((ch) => (
                    <button
                      key={ch}
                      onClick={() => setContactForm({ ...contactForm, channel: ch })}
                      disabled={!selectedLead.availableChannels.includes(ch)}
                      className={`flex-1 p-3 border-2 border-black font-bold transition-all ${
                        contactForm.channel === ch ? 'bg-neo-yellow' : 'bg-white hover:bg-gray-100'
                      } ${!selectedLead.availableChannels.includes(ch) ? 'opacity-30 cursor-not-allowed' : ''}`}
                    >
                      {getChannelIcon(ch)} {ch}
                    </button>
                  ))}
                </div>
              </div>

              {/* Template Selector */}
              <div>
                <label className="text-xs font-bold uppercase text-gray-500 block mb-1">Template (opcional)</label>
                <select
                  onChange={(e) => {
                    const template = templates.find(t => t.id === e.target.value);
                    if (template) {
                      const msg = template.content
                        .replace(/{nombre}/g, selectedLead.name)
                        .replace(/{nombre_negocio}/g, selectedLead.name);
                      setContactForm({ ...contactForm, message: msg });
                    }
                  }}
                  className="w-full p-3 border-2 border-black font-medium"
                >
                  <option value="">-- Seleccionar template --</option>
                  {templates
                    .filter(t => t.channel === contactForm.channel)
                    .map(t => (
                      <option key={t.id} value={t.id}>{t.name} ({t.scenario})</option>
                    ))
                  }
                </select>
              </div>

              {/* Message */}
              <div>
                <label className="text-xs font-bold uppercase text-gray-500 block mb-1">Mensaje *</label>
                <textarea
                  value={contactForm.message}
                  onChange={(e) => setContactForm({ ...contactForm, message: e.target.value })}
                  rows={5}
                  className="w-full p-3 border-2 border-black font-medium"
                  placeholder="Escribe tu mensaje..."
                />
              </div>

              {/* WhatsApp Direct Link */}
              {contactForm.channel === 'whatsapp' && selectedLead.phone && contactForm.message && (
                <div className="p-3 bg-green-50 border-2 border-green-300">
                  <p className="text-xs font-bold text-green-700 mb-2">📱 Link directo de WhatsApp:</p>
                  <a
                    href={`https://wa.me/${selectedLead.phone.replace(/\D/g, '')}?text=${encodeURIComponent(contactForm.message)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block px-4 py-2 bg-green-500 text-white font-bold border-2 border-black hover:bg-green-600"
                  >
                    💬 Abrir WhatsApp
                  </a>
                </div>
              )}

              {/* Notes */}
              <div>
                <label className="text-xs font-bold uppercase text-gray-500 block mb-1">Notas (opcional)</label>
                <input
                  type="text"
                  value={contactForm.notes}
                  onChange={(e) => setContactForm({ ...contactForm, notes: e.target.value })}
                  className="w-full p-3 border-2 border-black font-medium"
                  placeholder="Notas internas..."
                />
              </div>
            </div>

            <div className="flex gap-4 mt-6">
              <NeoButton variant="secondary" className="flex-1" onClick={() => setShowContactModal(false)}>
                Cancelar
              </NeoButton>
              <NeoButton variant="primary" className="flex-1" onClick={handleCreateContact}>
                Crear Contacto
              </NeoButton>
            </div>
          </div>
        </div>
      )}

      {/* Lead Detail Modal */}
      {showDetailModal && selectedLead && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => { setShowDetailModal(false); setLeadDetail(null); }}>
          <div className="bg-white border-4 border-neo-border shadow-neo max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-2xl font-black uppercase mb-4 border-b-2 border-black pb-2">
              🎯 {selectedLead.name}
            </h2>

            {loadingDetail ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin w-8 h-8 border-4 border-neo-border border-t-neo-blue"></div>
              </div>
            ) : leadDetail ? (
              <div className="space-y-4">
                {/* Basic Info */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs font-bold uppercase text-gray-500">Dirección</p>
                    <p className="font-medium">{leadDetail.lead.address || '-'}</p>
                  </div>
                  <div>
                    <p className="text-xs font-bold uppercase text-gray-500">Categoría</p>
                    <p className="font-medium">{leadDetail.lead.categories || '-'}</p>
                  </div>
                  <div>
                    <p className="text-xs font-bold uppercase text-gray-500">Rating</p>
                    <p className="font-medium">{leadDetail.lead.rating ? `⭐ ${leadDetail.lead.rating.toFixed(1)} (${leadDetail.lead.reviewCount} reseñas)` : '-'}</p>
                  </div>
                  <div>
                    <p className="text-xs font-bold uppercase text-gray-500">Score</p>
                    <span className={`px-2 py-1 font-bold ${leadDetail.lead.opportunityScore >= 70 ? 'bg-green-200' : leadDetail.lead.opportunityScore >= 40 ? 'bg-yellow-200' : 'bg-gray-200'}`}>
                      {leadDetail.lead.opportunityScore}
                    </span>
                  </div>
                </div>

                {/* Contact Info */}
                <div className="p-3 bg-gray-50 border-2 border-neo-border">
                  <p className="text-xs font-bold uppercase text-gray-500 mb-2">Datos de Contacto</p>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <p>📞 {leadDetail.lead.phone || <span className="text-gray-400">Sin teléfono</span>}</p>
                    <p>📧 {leadDetail.lead.email || <span className="text-gray-400">Sin email</span>}</p>
                    <p>📸 {leadDetail.lead.instagram || <span className="text-gray-400">Sin Instagram</span>}</p>
                    <p>🌐 {leadDetail.lead.website ? <a href={leadDetail.lead.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">Ver sitio</a> : <span className="text-gray-400">Sin sitio web</span>}</p>
                  </div>
                </div>

                {/* Opportunities */}
                {leadDetail.opportunities.length > 0 && (
                  <div className="p-3 bg-neo-yellow/20 border-2 border-neo-border">
                    <p className="text-xs font-bold uppercase text-gray-500 mb-2">💡 Oportunidades Detectadas</p>
                    <ul className="space-y-1">
                      {leadDetail.opportunities.map((opp, i) => (
                        <li key={i} className="text-sm flex items-center gap-2">
                          <span className="text-green-600">✓</span> {opp}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Contact History */}
                <div>
                  <p className="text-xs font-bold uppercase text-gray-500 mb-2">📋 Historial de Contactos ({leadDetail.contacts.length})</p>
                  {leadDetail.contacts.length === 0 ? (
                    <p className="text-sm text-gray-400">Sin contactos previos</p>
                  ) : (
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                      {leadDetail.contacts.map((contact) => {
                        const badge = getStatusBadge(contact.status);
                        return (
                          <div key={contact.id} className="p-2 bg-gray-50 border border-gray-200 text-sm flex justify-between items-center">
                            <div className="flex items-center gap-2">
                              <span>{getChannelIcon(contact.channel)}</span>
                              <span className="truncate max-w-[200px]">{contact.message}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className={`px-2 py-0.5 text-xs font-bold ${badge.bg}`}>{badge.label}</span>
                              <span className="text-xs text-gray-400">{new Date(contact.createdAt).toLocaleDateString('es-AR')}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex gap-2 flex-wrap pt-4 border-t-2 border-gray-200">
                  <NeoButton
                    variant="accent"
                    onClick={() => { setShowDetailModal(false); setShowContactModal(true); }}
                  >
                    📨 Contactar
                  </NeoButton>
                  {leadDetail.lead.website && (
                    <NeoButton
                      variant="secondary"
                      onClick={() => handleEnrichLead(leadDetail.lead.id)}
                    >
                      🔍 Enriquecer Datos
                    </NeoButton>
                  )}
                  {leadDetail.lead.website && (
                    <a href={leadDetail.lead.website} target="_blank" rel="noopener noreferrer">
                      <NeoButton variant="secondary">🌐 Ver Sitio</NeoButton>
                    </a>
                  )}
                </div>
              </div>
            ) : null}

            <div className="flex justify-end mt-6">
              <NeoButton variant="secondary" onClick={() => { setShowDetailModal(false); setLeadDetail(null); }}>
                Cerrar
              </NeoButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default withAuth(ProspectPage);
