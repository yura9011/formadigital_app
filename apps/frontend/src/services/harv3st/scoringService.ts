/**
 * Scoring Service
 * Calculates opportunity scores for leads based on configurable rules.
 */

import { HarvestedLead } from './harv3stTypes';

export interface ScoringRules {
  noWebsite: number;
  lowRatingHighTraffic: number;
  moderateRatingVeryHighTraffic: number;
  noPhotos: number;
  fewPhotos: number;
  highSuccess: number;
  hasPhone: number;
  isOpenNow: number;
}

export const DEFAULT_SCORING_RULES: ScoringRules = {
  noWebsite: 25,
  lowRatingHighTraffic: 20,
  moderateRatingVeryHighTraffic: 15,
  noPhotos: 15,
  fewPhotos: 5,
  highSuccess: 10,
  hasPhone: 5,
  isOpenNow: 5,
};

export function isNoWebsite(website: string | null | undefined): boolean {
  if (!website) return true;
  if (website.includes('search.google.com')) return true;
  return false;
}

export function calculateLeadScore(
  lead: HarvestedLead,
  rules: ScoringRules = DEFAULT_SCORING_RULES
): number {
  let score = 0;

  if (isNoWebsite(lead.website)) {
    score += rules.noWebsite;
  }

  const rating = lead.averageRating ?? 5;
  const reviewCount = lead.reviewCount ?? 0;

  if (reviewCount > 30 && rating < 4.0) {
    score += rules.lowRatingHighTraffic;
  } else if (reviewCount > 100 && rating < 4.5) {
    score += rules.moderateRatingVeryHighTraffic;
  }

  const photoCount = lead.photoCount ?? 0;
  if (photoCount === 0) {
    score += rules.noPhotos;
  } else if (photoCount < 5) {
    score += rules.fewPhotos;
  }

  if (rating >= 4.5 && reviewCount > 100) {
    score += rules.highSuccess;
  }

  if (lead.phones) {
    score += rules.hasPhone;
  }

  if (lead.isOpenNow === true) {
    score += rules.isOpenNow;
  }

  return Math.min(score, 100);
}

export function scoreAllLeads(
  leads: HarvestedLead[],
  rules: ScoringRules = DEFAULT_SCORING_RULES
): HarvestedLead[] {
  const scored = leads.map(lead => ({
    ...lead,
    score: calculateLeadScore(lead, rules),
  }));
  scored.sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
  return scored;
}

export interface ScoreBreakdown {
  total: number;
  components: {
    label: string;
    points: number;
    applied: boolean;
  }[];
}

export function getScoreBreakdown(
  lead: HarvestedLead,
  rules: ScoringRules = DEFAULT_SCORING_RULES
): ScoreBreakdown {
  const rating = lead.averageRating ?? 5;
  const reviewCount = lead.reviewCount ?? 0;
  const photoCount = lead.photoCount ?? 0;

  const components = [
    { label: 'No website', points: rules.noWebsite, applied: isNoWebsite(lead.website) },
    { label: 'Low rating with traffic', points: rules.lowRatingHighTraffic, applied: reviewCount > 30 && rating < 4.0 },
    { label: 'Moderate rating, high traffic', points: rules.moderateRatingVeryHighTraffic, applied: reviewCount > 100 && rating < 4.5 && !(reviewCount > 30 && rating < 4.0) },
    { label: 'No photos', points: rules.noPhotos, applied: photoCount === 0 },
    { label: 'Few photos', points: rules.fewPhotos, applied: photoCount > 0 && photoCount < 5 },
    { label: 'High success business', points: rules.highSuccess, applied: rating >= 4.5 && reviewCount > 100 },
    { label: 'Has phone', points: rules.hasPhone, applied: !!lead.phones },
    { label: 'Currently open', points: rules.isOpenNow, applied: lead.isOpenNow === true },
  ];

  const total = Math.min(components.reduce((sum, c) => sum + (c.applied ? c.points : 0), 0), 100);
  return { total, components };
}
