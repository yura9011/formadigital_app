/**
 * Scoring Service v2.0
 * Calculates opportunity scores aligned with Forma Digital's 4 service lines:
 * 1. Presencia web (sitios web)
 * 2. Google Business (fichas optimizadas)
 * 3. WhatsApp con IA (automatización de atención)
 * 4. Odoo/ERP (operaciones y facturación)
 */

import { HarvestedLead, ServiceOpportunities, ServiceOpportunity } from './harv3stTypes';

const FOOD_CATEGORIES = [
  'restaurante', 'café', 'cafetería', 'bodega', 'pizzería', 'heladería',
  'panadería', 'bar', 'pub', 'cervecería', 'comida', 'delivery',
  'rotisería', 'sushi', 'hamburguesería', 'parrilla', 'comida rápida',
  'takeaway', 'catering', 'confitería', 'churrasquería',
];

const RETAIL_CATEGORIES = [
  'tienda', 'local', 'boutique', 'ferretería', 'librería', 'floristería',
  'kiosco', 'supermercado', 'minimarket', 'almacén', 'pollería',
  'carnicería', 'verdulería', 'lacteos', 'electrodomésticos',
  'mueblería', 'indumentaria', 'calzado', 'bazar', 'juguetería',
];

export interface ScoringRules {
  noWebsite: number;
  websiteObsolete: number;
  noPhotos: number;
  fewPhotos: number;
  lowRating: number;
  highVolumeLowRating: number;
  noInstagram: number;
  noFacebook: number;
  inactiveInstagram: number;
  deliveryBusiness: number;
  foodService: number;
  multiCategory: number;
  hasPhone: number;
  hasEmail: number;
}

export const DEFAULT_SCORING_RULES: ScoringRules = {
  noWebsite: 25,
  websiteObsolete: 20,
  noPhotos: 15,
  fewPhotos: 5,
  lowRating: 10,
  highVolumeLowRating: 20,
  noInstagram: 15,
  noFacebook: 10,
  inactiveInstagram: 15,
  deliveryBusiness: 15,
  foodService: 10,
  multiCategory: 10,
  hasPhone: 5,
  hasEmail: 5,
};

export function isNoWebsite(website: string | null | undefined): boolean {
  if (!website) return true;
  if (website.includes('search.google.com')) return true;
  return false;
}

export function detectServiceOpportunities(lead: HarvestedLead): ServiceOpportunities {
  const hasWebsite = !isNoWebsite(lead.website);
  const instagram = lead.instagram;
  const facebook = lead.facebook;
  const photoCount = lead.photoCount ?? 0;
  const rating = lead.averageRating;
  const reviewCount = lead.reviewCount ?? 0;
  const attributes = lead.attributes ?? [];
  const categoriesStr = (lead.categories ?? '').toLowerCase();

  // --- Web ---
  const web: ServiceOpportunity = { detected: false, reason: null, priority: null };
  if (!hasWebsite) {
    web.detected = true;
    web.reason = 'Sin sitio web';
    web.priority = 'alta';
  } else if (hasWebsite && !instagram && !facebook) {
    web.detected = true;
    web.reason = 'Sitio básico sin redes sociales';
    web.priority = 'media';
  }

  // --- Google Business ---
  const gbp: ServiceOpportunity = { detected: false, reason: null, priority: null };
  const gbpReasons: string[] = [];
  if (photoCount === 0) gbpReasons.push('Sin fotos');
  else if (photoCount < 5) gbpReasons.push('Pocas fotos');
  if (rating && rating < 4.0 && reviewCount > 10) gbpReasons.push(`Rating bajo (${rating})`);
  if (!instagram && !facebook) gbpReasons.push('Sin presencia en redes');
  if (gbpReasons.length > 0) {
    gbp.detected = true;
    gbp.reason = gbpReasons.join(', ');
    gbp.priority = photoCount === 0 || (rating !== null && rating < 3.5) ? 'alta' : 'media';
  }

  // --- WhatsApp con IA ---
  const whatsapp: ServiceOpportunity = { detected: false, reason: null, priority: null };
  const waReasons: string[] = [];
  const attrsLower = attributes.map(a => String(a).toLowerCase());
  const isFood = FOOD_CATEGORIES.some(cat => categoriesStr.includes(cat));
  const hasDelivery = attrsLower.some(a => a.includes('domicilio') || a.includes('delivery'));
  const highVolume = reviewCount > 50;

  if (isFood) waReasons.push('Negocio de comida');
  if (hasDelivery) waReasons.push('Ofrece delivery');
  if (highVolume && rating !== null && rating < 4.2) waReasons.push('Alto volumen con rating mejorable');
  if (highVolume && isFood) waReasons.push('Alto tráfico potencial');
  if (waReasons.length > 0) {
    whatsapp.detected = true;
    whatsapp.reason = waReasons.join(', ');
    whatsapp.priority = isFood && highVolume ? 'alta' : 'media';
  }

  // --- Odoo/ERP ---
  const odoo: ServiceOpportunity = { detected: false, reason: null, priority: null };
  const odooReasons: string[] = [];
  const isRetail = RETAIL_CATEGORIES.some(cat => categoriesStr.includes(cat));
  const isMulti = reviewCount > 200;

  if (isRetail) odooReasons.push('Negocio de retail/comercio');
  if (isMulti) odooReasons.push('Alto volumen de operación');
  if (odooReasons.length > 0) {
    odoo.detected = true;
    odoo.reason = odooReasons.join(', ');
    odoo.priority = isRetail && isMulti ? 'alta' : isRetail ? 'media' : 'baja';
  }

  return { web, gbp, whatsapp, odoo };
}

export function calculateLeadScore(
  lead: HarvestedLead,
  rules: ScoringRules = DEFAULT_SCORING_RULES
): number {
  const rawScore = computeRawScore(lead, rules);
  const maxRaw = Object.values(rules).reduce((sum, v) => sum + v, 0);
  const normalized = maxRaw > 0 ? Math.round((rawScore / maxRaw) * 100) : 0;
  return Math.min(normalized, 100);
}

function computeRawScore(lead: HarvestedLead, rules: ScoringRules): number {
  let score = 0;

  const hasWebsite = !isNoWebsite(lead.website);
  const instagram = lead.instagram;
  const facebook = lead.facebook;

  // Web rules
  if (!hasWebsite) {
    score += rules.noWebsite;
  } else if (!instagram && !facebook) {
    score += rules.websiteObsolete;
  }

  // GBP rules
  const photoCount = lead.photoCount ?? 0;
  if (photoCount === 0) score += rules.noPhotos;
  else if (photoCount < 5) score += rules.fewPhotos;

  const rating = lead.averageRating ?? 5;
  const reviewCount = lead.reviewCount ?? 0;
  if (reviewCount > 10 && rating < 4.0) score += rules.lowRating;
  if (reviewCount > 50 && rating < 4.0) score += rules.highVolumeLowRating;

  // Social rules
  if (!instagram) score += rules.noInstagram;
  if (!facebook) score += rules.noFacebook;

  // Food / delivery rules
  const categoriesStr = (lead.categories ?? '').toLowerCase();
  const attributes = lead.attributes ?? [];
  const attrsLower = attributes.map(a => String(a).toLowerCase());
  const isFood = FOOD_CATEGORIES.some(cat => categoriesStr.includes(cat));
  const hasDelivery = attrsLower.some(a => a.includes('domicilio') || a.includes('delivery'));

  if (hasDelivery) score += rules.deliveryBusiness;
  if (isFood) score += rules.foodService;

  // ERP rules
  const isRetail = RETAIL_CATEGORIES.some(cat => categoriesStr.includes(cat));
  if (isRetail && reviewCount > 100) score += rules.multiCategory;

  // Contact rules
  if (lead.phones) score += rules.hasPhone;
  if ((lead as any).email) score += rules.hasEmail;

  return score;
}

export function scoreAllLeads(
  leads: HarvestedLead[],
  rules: ScoringRules = DEFAULT_SCORING_RULES
): HarvestedLead[] {
  const scored = leads.map(lead => ({
    ...lead,
    score: calculateLeadScore(lead, rules),
    serviceOpportunities: detectServiceOpportunities(lead),
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
    service: string;
  }[];
}

export function getScoreBreakdown(
  lead: HarvestedLead,
  rules: ScoringRules = DEFAULT_SCORING_RULES
): ScoreBreakdown {
  const hasWebsite = !isNoWebsite(lead.website);
  const instagram = lead.instagram;
  const facebook = lead.facebook;
  const photoCount = lead.photoCount ?? 0;
  const rating = lead.averageRating ?? 5;
  const reviewCount = lead.reviewCount ?? 0;
  const categoriesStr = (lead.categories ?? '').toLowerCase();
  const attributes = lead.attributes ?? [];
  const attrsLower = attributes.map(a => String(a).toLowerCase());
  const isFood = FOOD_CATEGORIES.some(cat => categoriesStr.includes(cat));
  const hasDelivery = attrsLower.some(a => a.includes('domicilio') || a.includes('delivery'));
  const isRetail = RETAIL_CATEGORIES.some(cat => categoriesStr.includes(cat));

  const components = [
    { label: 'Sin sitio web', points: rules.noWebsite, applied: !hasWebsite, service: 'web' },
    { label: 'Sitio básico sin redes', points: rules.websiteObsolete, applied: hasWebsite && !instagram && !facebook, service: 'web' },
    { label: 'Sin fotos', points: rules.noPhotos, applied: photoCount === 0, service: 'gbp' },
    { label: 'Pocas fotos', points: rules.fewPhotos, applied: photoCount > 0 && photoCount < 5, service: 'gbp' },
    { label: 'Rating bajo', points: rules.lowRating, applied: reviewCount > 10 && rating < 4.0, service: 'gbp' },
    { label: 'Alto volumen, rating bajo', points: rules.highVolumeLowRating, applied: reviewCount > 50 && rating < 4.0, service: 'whatsapp' },
    { label: 'Sin Instagram', points: rules.noInstagram, applied: !instagram, service: 'web' },
    { label: 'Sin Facebook', points: rules.noFacebook, applied: !facebook, service: 'web' },
    { label: 'Con delivery', points: rules.deliveryBusiness, applied: hasDelivery, service: 'whatsapp' },
    { label: 'Negocio de comida', points: rules.foodService, applied: isFood, service: 'whatsapp' },
    { label: 'Retail con alto volumen', points: rules.multiCategory, applied: isRetail && reviewCount > 100, service: 'odoo' },
    { label: 'Tiene teléfono', points: rules.hasPhone, applied: !!lead.phones, service: 'contact' },
  ];

  const total = Math.min(components.reduce((sum, c) => sum + (c.applied ? c.points : 0), 0), 100);
  return { total, components };
}
