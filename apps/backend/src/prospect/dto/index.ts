// Types
export type ContactStatus = 'none' | 'pending' | 'approved' | 'sent' | 'rejected' | 'responded';
export type OutreachChannel = 'instagram' | 'whatsapp' | 'email';
export type TemplateScenario = 'sin_sitio' | 'rating_bajo' | 'sin_fotos' | 'sin_redes' | 'general';

// ==================== LEAD DTOs ====================

export class GetLeadsDto {
  minScore?: number;
  maxScore?: number;
  hasWebsite?: boolean;
  hasPhone?: boolean;
  hasInstagram?: boolean;
  hasEmail?: boolean;
  category?: string;
  includeContacted?: boolean;
  limit?: number;
  offset?: number;
}

export interface LeadSummary {
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

export interface GetLeadsResult {
  leads: LeadSummary[];
  total: number;
  hasMore: boolean;
}

export interface LeadDetail {
  id: string;
  name: string;
  address: string;
  phone?: string | null;
  website?: string | null;
  email?: string | null;
  instagram?: string | null;
  facebook?: string | null;
  linkedin?: string | null;
  rating?: number | null;
  reviewCount?: number | null;
  category?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  googleMapsUri?: string | null;
  tier?: string | null;
  score?: number | null;
  gaps?: string[] | null;
  summary?: string | null;
  source?: string | null;
  placeId?: string | null;
  contactStatus: ContactStatus;
  lastContactedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ContactRecord {
  id: string;
  leadId: string;
  leadName: string;
  channel: OutreachChannel;
  message: string;
  status: ContactStatus;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
  sentAt?: string;
  respondedAt?: string;
}

export interface GetLeadDetailResult {
  lead: LeadDetail;
  contactHistory: ContactRecord[];
  suggestedScenario: TemplateScenario;
  opportunities: string[];
}

// ==================== CONTACT DTOs ====================

export class CreateContactDto {
  leadId: string;
  channel: OutreachChannel;
  message: string;
  status?: 'pending' | 'approved';
  notes?: string;
}

export class UpdateContactStatusDto {
  status: ContactStatus;
  notes?: string;
}

export class GetContactHistoryDto {
  status?: ContactStatus;
  channel?: OutreachChannel;
  leadId?: string;
  dateFrom?: string;
  dateTo?: string;
  limit?: number;
  offset?: number;
}

export interface GetContactHistoryResult {
  contacts: ContactRecord[];
  total: number;
  hasMore: boolean;
}

export class GetStatsDto {
  dateFrom?: string;
  dateTo?: string;
}

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

export interface TopLead {
  id: string;
  name: string;
  count: number;
}

export interface ContactStats {
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

// ==================== TEMPLATE DTOs ====================

export class GetTemplatesDto {
  channel?: OutreachChannel;
  scenario?: TemplateScenario;
}

export class SaveTemplateDto {
  id?: string;
  name: string;
  channel: OutreachChannel;
  scenario: TemplateScenario;
  content: string;
  isDefault?: boolean;
}

export interface MessageTemplate {
  id: string;
  name: string;
  channel: OutreachChannel;
  scenario: TemplateScenario;
  content: string;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

// ==================== CONFIG DTOs ====================

export class UpdateConfigDto {
  userName?: string;
  companyName?: string;
  defaultChannel?: OutreachChannel;
  maxContactsPerSession?: number;
  signature?: string;
  instagramHandle?: string;
  whatsappNumber?: string;
  emailAddress?: string;
}

export interface UserConfig {
  userName: string;
  companyName: string;
  defaultChannel: OutreachChannel;
  maxContactsPerSession: number;
  signature: string;
  instagramHandle: string;
  whatsappNumber: string;
  emailAddress: string;
}

// ==================== VALIDATION DTOs ====================

export class ValidateContactDto {
  channel: OutreachChannel;
  value: string;
}

export interface ValidateContactResult {
  isValid: boolean;
  normalizedValue?: string;
  errorMessage?: string;
}

// ==================== ENRICHMENT DTOs ====================

export class EnrichContactDto {
  fields: ('email' | 'instagram')[];
}

export interface EnrichContactResult {
  leadId: string;
  found: {
    email?: string;
    instagram?: string;
  };
  notFound: string[];
  error?: string;
}

// ==================== SEARCH DTOs (Harv3st Integration) ====================

export class SearchBusinessesDto {
  query: string;
  headless?: boolean;
  waitForResults?: boolean;
  maxWaitSeconds?: number;
}

export interface SearchBusinessesResult {
  query: string;
  status: 'started' | 'completed' | 'error';
  leadsFound: number;
  leadsImported: number;
  leadsUpdated: number;
  leads?: LeadSummary[];
  error?: string;
}
