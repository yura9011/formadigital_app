/**
 * Filter Service
 * Client-side filtering for harvested leads
 */

import { HarvestedLead, HarvestFilters } from './harv3stTypes';
import { isNoWebsite } from './scoringService';

export function applyFilters(
  leads: HarvestedLead[],
  filters: HarvestFilters
): HarvestedLead[] {
  return leads.filter(lead => {
    if (filters.minRating !== null) {
      const rating = lead.averageRating ?? 0;
      if (rating < filters.minRating) return false;
    }
    
    if (filters.maxRating !== null) {
      const rating = lead.averageRating ?? 5;
      if (rating > filters.maxRating) return false;
    }
    
    if (filters.hasWebsite !== null) {
      const hasRealWebsite = !isNoWebsite(lead.website);
      if (filters.hasWebsite && !hasRealWebsite) return false;
      if (!filters.hasWebsite && hasRealWebsite) return false;
    }
    
    if (filters.minReviews !== null) {
      const reviewCount = lead.reviewCount ?? 0;
      if (reviewCount < filters.minReviews) return false;
    }
    
    if (filters.categoryKeyword) {
      const categories = (lead.categories || '').toLowerCase();
      const keyword = filters.categoryKeyword.toLowerCase();
      if (!categories.includes(keyword)) return false;
    }
    
    if (filters.searchText) {
      const searchLower = filters.searchText.toLowerCase();
      const name = (lead.name || '').toLowerCase();
      const address = (lead.fullAddress || '').toLowerCase();
      if (!name.includes(searchLower) && !address.includes(searchLower)) {
        return false;
      }
    }
    
    return true;
  });
}

export interface FilterCounts {
  total: number;
  withWebsite: number;
  withoutWebsite: number;
  withPhone: number;
  byRatingRange: { low: number; medium: number; high: number };
  byReviewRange: { few: number; some: number; many: number };
}

export function getFilterCounts(leads: HarvestedLead[]): FilterCounts {
  const counts: FilterCounts = {
    total: leads.length,
    withWebsite: 0,
    withoutWebsite: 0,
    withPhone: 0,
    byRatingRange: { low: 0, medium: 0, high: 0 },
    byReviewRange: { few: 0, some: 0, many: 0 },
  };
  
  for (const lead of leads) {
    if (isNoWebsite(lead.website)) {
      counts.withoutWebsite++;
    } else {
      counts.withWebsite++;
    }
    
    if (lead.phones) counts.withPhone++;
    
    const rating = lead.averageRating ?? 0;
    if (rating < 3.5) counts.byRatingRange.low++;
    else if (rating <= 4.5) counts.byRatingRange.medium++;
    else counts.byRatingRange.high++;
    
    const reviews = lead.reviewCount ?? 0;
    if (reviews < 10) counts.byReviewRange.few++;
    else if (reviews <= 100) counts.byReviewRange.some++;
    else counts.byReviewRange.many++;
  }
  
  return counts;
}

export type SortField = 'name' | 'rating' | 'reviewCount' | 'score' | 'capturedAt';
export type SortDirection = 'asc' | 'desc';

export function sortLeads(
  leads: HarvestedLead[],
  field: SortField,
  direction: SortDirection = 'desc'
): HarvestedLead[] {
  const sorted = [...leads];
  
  sorted.sort((a, b) => {
    let aVal: number | string;
    let bVal: number | string;
    
    switch (field) {
      case 'name':
        aVal = (a.name || '').toLowerCase();
        bVal = (b.name || '').toLowerCase();
        break;
      case 'rating':
        aVal = a.averageRating ?? 0;
        bVal = b.averageRating ?? 0;
        break;
      case 'reviewCount':
        aVal = a.reviewCount ?? 0;
        bVal = b.reviewCount ?? 0;
        break;
      case 'score':
        aVal = a.score ?? 0;
        bVal = b.score ?? 0;
        break;
      case 'capturedAt':
        aVal = a._captured_at ?? 0;
        bVal = b._captured_at ?? 0;
        break;
      default:
        return 0;
    }
    
    if (aVal < bVal) return direction === 'asc' ? -1 : 1;
    if (aVal > bVal) return direction === 'asc' ? 1 : -1;
    return 0;
  });
  
  return sorted;
}
