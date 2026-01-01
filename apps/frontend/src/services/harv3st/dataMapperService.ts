/**
 * Data Mapper Service
 * Converts HarvestedLead data from Harv3st to Business format
 */

import { Business } from '@/components/gmb/types';
import { HarvestedLead, DayHours } from './harv3stTypes';
import { calculateLeadScore } from './scoringService';

export function normalizeWebsite(website: string | null | undefined): string | undefined {
  if (!website) return undefined;
  if (website.includes('search.google.com')) return undefined;
  return website;
}

export function generateBusinessId(lead: HarvestedLead): string {
  if (lead.placeId) return lead.placeId;
  const base = `${lead.name || ''}-${lead.fullAddress || ''}`;
  return base.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase().slice(0, 50);
}

export function harvestLeadToBusiness(
  lead: HarvestedLead,
  calculateScore: boolean = true
): Business {
  const harvestScore = calculateScore ? calculateLeadScore(lead) : undefined;
  
  return {
    id: generateBusinessId(lead),
    name: lead.name || 'Unknown Business',
    address: lead.fullAddress || '',
    rating: lead.averageRating ?? 0,
    reviewCount: lead.reviewCount ?? 0,
    website: normalizeWebsite(lead.website),
    phone: lead.phones || undefined,
    latitude: lead.latitude ?? 0,
    longitude: lead.longitude ?? 0,
    category: lead.categories || undefined,
    isClient: false,
    googleMapsUri: lead.reviewsUrl || undefined,
    placeId: lead.placeId,
    photoCount: lead.photoCount,
    hours: lead.hours as DayHours[] | undefined,
    isOpenNow: lead.isOpenNow,
    attributes: lead.attributes,
    priceLevel: lead.priceLevel,
    harvestScore,
    capturedAt: lead._captured_at,
  };
}

export function harvestLeadsToBusinesses(
  leads: HarvestedLead[],
  calculateScores: boolean = true
): Business[] {
  return leads.map(lead => harvestLeadToBusiness(lead, calculateScores));
}

export function mergeBusinessData(
  existing: Business[],
  harvested: Business[]
): Business[] {
  const byPlaceId = new Map<string, Business>();
  const byId = new Map<string, Business>();
  
  for (const business of existing) {
    if (business.placeId) byPlaceId.set(business.placeId, business);
    byId.set(business.id, business);
  }
  
  for (const business of harvested) {
    if (business.placeId) byPlaceId.set(business.placeId, business);
    byId.set(business.id, business);
  }
  
  const result = new Map<string, Business>();
  for (const [, business] of byPlaceId) {
    result.set(business.id, business);
  }
  for (const [id, business] of byId) {
    if (!result.has(id)) result.set(id, business);
  }
  
  return Array.from(result.values());
}

export function extractCategories(leads: HarvestedLead[]): string[] {
  const categories = new Set<string>();
  for (const lead of leads) {
    if (lead.categories) {
      const parts = lead.categories.split(',').map(c => c.trim());
      parts.forEach(c => { if (c) categories.add(c); });
    }
  }
  return Array.from(categories).sort();
}
