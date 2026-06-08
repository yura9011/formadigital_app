/**
 * Shared Lead/Client types
 * Unified from 4+ different definitions across the codebase.
 * All pages should import from this file instead of defining locally.
 */

// --- Enums / Unions ---

export type ClientType = 'LEAD' | 'CLIENT' | 'COMPETITOR';

export type PipelineStage =
  | 'DISCOVERED'
  | 'ANALYZED'
  | 'CONTACTED'
  | 'RESPONDED'
  | 'CONVERTED'
  | 'DISCARDED';

export type ContactStatus =
  | 'none'
  | 'pending'
  | 'approved'
  | 'sent'
  | 'rejected'
  | 'responded';

export type OutreachChannel = 'instagram' | 'whatsapp' | 'email';

export type FilterType = 'ALL' | 'LEAD' | 'CLIENT';

// --- Service Opportunities ---

export interface ServiceOpportunity {
  detected: boolean;
  reason: string | null;
  priority: 'alta' | 'media' | 'baja' | null;
}

export interface ServiceOpportunities {
  web: ServiceOpportunity;
  gbp: ServiceOpportunity;
  whatsapp: ServiceOpportunity;
  odoo: ServiceOpportunity;
}

// --- Contact Record ---

export interface ContactRecord {
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

// --- Message Template ---

export interface MessageTemplate {
  id: string;
  name: string;
  channel: OutreachChannel;
  scenario: string;
  content: string;
  isDefault: boolean;
}

// --- Notes ---

export interface ClientNote {
  id: string;
  content: string;
  createdAt: string;
  clientId?: string;
}

// --- Scoring ---

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

// --- Stage Transitions ---

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

// --- Lead (unified) ---
// Merges: prospect/Lead, pipeline.service/Lead, gmb/today/Lead

export interface Lead {
  // Core fields (all pages)
  id: string;
  name: string;
  address: string;

  // Contact info
  phone?: string | null;
  website?: string | null;
  instagram?: string | null;
  email?: string | null;
  facebook?: string | null;
  linkedin?: string | null;

  // Business info
  category?: string | null;
  categories?: string | null;
  rating?: number | null;
  reviewCount?: number | null;
  photoCount?: number | null;

  // Scoring
  score?: number | null;
  tier?: string | null;
  opportunityScore?: number;

  // Pipeline (from pipeline.service)
  stage?: PipelineStage;
  daysInStage?: number;

  // Contact status (from prospect)
  contactStatus?: ContactStatus;
  availableChannels?: OutreachChannel[];

  // Outreach (from gmb/today)
  contactAttempts?: number;
  hasValidWhatsapp?: boolean;
  hasValidInstagram?: boolean;
  hasValidEmail?: boolean;

  // Enrichment
  gaps?: string[];
  serviceOpportunities?: ServiceOpportunities;
  ownerName?: string | null;
  businessDescription?: string | null;
  instagramFollowers?: number | null;
  instagramPosts?: number | null;
  instagramLastPostDate?: string | null;
  instagramBio?: string | null;

  // Timestamps
  createdAt?: string;
  updatedAt?: string;
}

// --- Lead views ---
// API endpoints expose different required subsets of the same lead.

export interface ProspectLead extends Lead {
  opportunityScore: number;
  contactStatus: ContactStatus;
  availableChannels: OutreachChannel[];
}

export interface PipelineLead extends Lead {
  stage: PipelineStage;
  daysInStage: number;
  createdAt: string;
  updatedAt: string;
}

export interface OutreachLead extends Lead {
  contactAttempts: number;
  hasValidWhatsapp: boolean;
  hasValidInstagram: boolean;
  hasValidEmail: boolean;
  daysInStage: number;
}

// --- LeadDetail (extends Lead) ---

export interface LeadDetail extends PipelineLead {
  scoreBreakdown?: ScoreBreakdown;
  transitionHistory?: StageTransition[];
  hours?: any;
  attributes?: string[];
}

// --- Client (unified) ---
// Merges: crm/Client, gmb/leads/Client, gmb/types/StoredClient

export interface Client extends Lead {
  type: ClientType;
  createdAt: string;
  notes?: ClientNote[];
  audits?: { id: string; createdAt: string }[];
}

// --- Recent Contact (from prospect) ---

export interface RecentContact {
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

// --- Pipeline Metrics ---

export interface PipelineMetrics {
  totalLeads: number;
  conversionRate: number;
  averageDaysPerStage: Record<PipelineStage, number>;
  leadsConvertedThisMonth: number;
  leadsDiscardedThisMonth: number;
  topCategories: { category: string; count: number }[];
}

// --- Paginated response ---

export interface PaginatedLeads<TLead extends Lead = Lead> {
  leads: TLead[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
