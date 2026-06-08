/**
 * Pipeline Service
 * API client for pipeline management endpoints
 */

import { API_URL as API_BASE } from '@/config/api';

export type PipelineStage = 'DISCOVERED' | 'ANALYZED' | 'CONTACTED' | 'RESPONDED' | 'CONVERTED' | 'DISCARDED';

export interface PipelineSummary {
  total: number;
  byStage: Record<PipelineStage, number>;
}

export interface Lead {
  id: string;
  name: string;
  address: string;
  phone?: string | null;
  website?: string | null;
  category?: string | null;
  rating?: number | null;
  reviewCount?: number | null;
  score?: number | null;
  tier?: string | null;
  stage: PipelineStage;
  daysInStage: number;
  instagram?: string | null;
  email?: string | null;
  instagramFollowers?: number | null;
  instagramPosts?: number | null;
  photoCount?: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface PaginatedLeads {
  leads: Lead[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ScoreComponent {
  ruleId: string;
  ruleName: string;
  description: string;
  points: number;
  applied: boolean;
  reason?: string;
}

export interface ScoreBreakdown {
  total: number;
  maxScore: number;
  components: ScoreComponent[];
  calculatedAt: string;
}

export interface StageTransition {
  id: string;
  clientId: string;
  fromStage: PipelineStage;
  toStage: PipelineStage;
  reason?: string;
  actorType: 'USER' | 'AGENT' | 'SYSTEM';
  actorId?: string;
  createdAt: string;
}

export interface LeadDetail extends Lead {
  scoreBreakdown: ScoreBreakdown;
  transitionHistory: StageTransition[];
  gaps?: string[];
  instagramBio?: string | null;
  instagramLastPostDate?: string | null;
  hours?: any;
  attributes?: string[];
}

export interface PipelineMetrics {
  totalLeads: number;
  conversionRate: number;
  averageDaysPerStage: Record<PipelineStage, number>;
  leadsConvertedThisMonth: number;
  leadsDiscardedThisMonth: number;
  topCategories: { category: string; count: number }[];
}

export interface ScoringRule {
  id: string;
  name: string;
  description: string;
  weight: number;
  condition: any;
}

export interface ScoringConfig {
  version: string;
  maxScore: number;
  description: string;
  rules: ScoringRule[];
}

// API Functions
export async function getPipelineSummary(): Promise<PipelineSummary> {
  const res = await fetch(`${API_BASE}/api/pipeline/summary`);
  if (!res.ok) throw new Error('Failed to fetch pipeline summary');
  return res.json();
}

export async function getLeadsByStage(options: {
  stage?: PipelineStage;
  page?: number;
  limit?: number;
  sortBy?: 'score' | 'createdAt' | 'name' | 'daysInStage';
  sortOrder?: 'asc' | 'desc';
  search?: string;
}): Promise<PaginatedLeads> {
  const params = new URLSearchParams();
  if (options.stage) params.append('stage', options.stage);
  if (options.page) params.append('page', String(options.page));
  if (options.limit) params.append('limit', String(options.limit));
  if (options.sortBy) params.append('sortBy', options.sortBy);
  if (options.sortOrder) params.append('sortOrder', options.sortOrder);
  if (options.search) params.append('search', options.search);
  
  const res = await fetch(`${API_BASE}/api/pipeline/leads?${params.toString()}`);
  if (!res.ok) throw new Error('Failed to fetch leads');
  return res.json();
}

export async function getLeadDetail(leadId: string): Promise<LeadDetail> {
  const res = await fetch(`${API_BASE}/api/pipeline/leads/${leadId}`);
  if (!res.ok) throw new Error('Failed to fetch lead detail');
  return res.json();
}

export async function transitionLead(leadId: string, toStage: PipelineStage, reason?: string): Promise<any> {
  const res = await fetch(`${API_BASE}/api/pipeline/leads/${leadId}/transition`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ toStage, reason, actorType: 'USER' }),
  });
  if (!res.ok) throw new Error('Failed to transition lead');
  return res.json();
}

export async function reviveLead(leadId: string, reason?: string): Promise<any> {
  const res = await fetch(`${API_BASE}/api/pipeline/leads/${leadId}/revive`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ reason, actorType: 'USER' }),
  });
  if (!res.ok) throw new Error('Failed to revive lead');
  return res.json();
}

export async function convertLead(leadId: string, projectName: string, projectDetails?: string): Promise<any> {
  const res = await fetch(`${API_BASE}/api/pipeline/leads/${leadId}/convert`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ projectName, projectDetails, actorType: 'USER' }),
  });
  if (!res.ok) throw new Error('Failed to convert lead');
  return res.json();
}

export async function getLeadHistory(leadId: string): Promise<StageTransition[]> {
  const res = await fetch(`${API_BASE}/api/pipeline/leads/${leadId}/history`);
  if (!res.ok) throw new Error('Failed to fetch lead history');
  return res.json();
}

export async function getPipelineMetrics(): Promise<PipelineMetrics> {
  const res = await fetch(`${API_BASE}/api/pipeline/metrics`);
  if (!res.ok) throw new Error('Failed to fetch metrics');
  return res.json();
}

export async function getScoringRules(): Promise<ScoringConfig> {
  const res = await fetch(`${API_BASE}/api/scoring/rules`);
  if (!res.ok) throw new Error('Failed to fetch scoring rules');
  return res.json();
}

export async function getScoreBreakdown(leadId: string): Promise<ScoreBreakdown> {
  const res = await fetch(`${API_BASE}/api/scoring/breakdown/${leadId}`);
  if (!res.ok) throw new Error('Failed to fetch score breakdown');
  return res.json();
}

export async function enrichInstagram(leadId: string, handle?: string): Promise<any> {
  const res = await fetch(`${API_BASE}/api/enrich/instagram/${leadId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ handle }),
  });
  if (!res.ok) throw new Error('Failed to enrich Instagram');
  return res.json();
}

// Stage display helpers
export const STAGE_CONFIG: Record<PipelineStage, { label: string; icon: string; color: string }> = {
  DISCOVERED: { label: 'Descubiertos', icon: '🔍', color: 'bg-gray-200' },
  ANALYZED: { label: 'Analizados', icon: '📊', color: 'bg-blue-200' },
  CONTACTED: { label: 'Contactados', icon: '📨', color: 'bg-purple-200' },
  RESPONDED: { label: 'Respondieron', icon: '💬', color: 'bg-green-200' },
  CONVERTED: { label: 'Convertidos', icon: '🎉', color: 'bg-neo-yellow' },
  DISCARDED: { label: 'Descartados', icon: '🗑️', color: 'bg-red-200' },
};

export const VALID_TRANSITIONS: Record<PipelineStage, PipelineStage[]> = {
  DISCOVERED: ['ANALYZED', 'DISCARDED'],
  ANALYZED: ['CONTACTED', 'DISCARDED'],
  CONTACTED: ['RESPONDED', 'DISCARDED'],
  RESPONDED: ['CONVERTED', 'DISCARDED'],
  CONVERTED: [],
  DISCARDED: ['DISCOVERED'],
};
