/**
 * Types for Harv3st integration
 * These types match the data structures returned by the Harv3st scraper API
 */

// Hours for a single day (from Harv3st)
export interface DayHours {
  day: string;
  hours: string;
}

/**
 * Lead data as returned by Harv3st API
 * This is the raw format from /api/data endpoint
 */
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

export interface HarvestedLead {
  placeId: string;
  name: string;
  averageRating: number | null;
  reviewCount: number | null;
  phones: string | null;
  website: string | null;
  latitude: number | null;
  longitude: number | null;
  categories: string | null;
  fullAddress: string | null;
  reviewsUrl?: string | null;
  photoCount?: number | null;
  priceLevel?: number | null;
  hours?: DayHours[] | null;
  isOpenNow?: boolean | null;
  attributes?: string[] | null;
  instagram?: string | null;
  facebook?: string | null;
  linkedin?: string | null;
  businessDescription?: string | null;
  ownerName?: string | null;
  _captured_at: number;
  score?: number;
  serviceOpportunities?: ServiceOpportunities;
}

/**
 * Filter criteria for harvested leads
 */
export interface HarvestFilters {
  minRating: number | null;
  maxRating: number | null;
  hasWebsite: boolean | null; // true = must have, false = must not have, null = any
  minReviews: number | null;
  categoryKeyword: string;
  searchText: string;
}

/**
 * Default filter values (no filtering)
 */
export const DEFAULT_HARVEST_FILTERS: HarvestFilters = {
  minRating: null,
  maxRating: null,
  hasWebsite: null,
  minReviews: null,
  categoryKeyword: '',
  searchText: '',
};

/**
 * Status of a single query in a campaign
 */
export interface CampaignQueryResult {
  query: string;
  status: 'pending' | 'running' | 'completed' | string;
}

/**
 * Overall campaign status from /api/campaign/status
 */
export interface CampaignStatus {
  is_running: boolean;
  total: number;
  current_index: number;
  current_query: string | null;
  completed: number;
  results: CampaignQueryResult[];
}

/**
 * Response from /api/status endpoint
 */
export interface Harv3stStatusResponse {
  active_tasks: string[];
}

/**
 * Response from /api/search endpoint
 */
export interface Harv3stSearchResponse {
  status: 'success' | 'error';
  message: string;
}

/**
 * Response from /api/collect endpoint
 */
export interface Harv3stCollectResponse {
  status: 'success' | 'error';
  added: number;
}

/**
 * Connection status for Harv3st server
 */
export type Harv3stConnectionStatus = 'connected' | 'offline' | 'checking';

/**
 * Configuration for Harv3st service
 */
export interface Harv3stConfig {
  baseUrl: string;
  pollIntervalMs: number;
  connectionCheckIntervalMs: number;
}

export const DEFAULT_HARV3ST_CONFIG: Harv3stConfig = {
  baseUrl: (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000') + '/api/harv3st',
  pollIntervalMs: 2000,
  connectionCheckIntervalMs: 30000,
};
