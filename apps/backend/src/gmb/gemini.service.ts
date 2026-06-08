import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Business data structure for competitor search
 */
export interface Business {
  id: string;
  name: string;
  category: string;
  address: string;
  rating: number;
  reviewCount: number;
  website?: string;
  googleMapsUri?: string;
  phone?: string;
  latitude: number;
  longitude: number;
  isClient: boolean;
  qualityScore: number;
}

/**
 * Search parameters for competitor search
 */
export interface CompetitorSearchParams {
  address: string;
  keywords: string;
  radius: number; // in km
  products?: string;
}

/**
 * Audit result structure
 */
export interface AuditResult {
  lastUpdated: number;
  completenessScore: number;
  executiveSummary: string;
  nameCompliance: {
    status: 'pass' | 'fail' | 'warning';
    details: string;
    suggestedName?: string;
  };
  basicChecklist: Array<{
    item: string;
    status: 'ok' | 'missing' | 'fix';
    note: string;
  }>;
  swotAnalysis: {
    strengths: string[];
    weaknesses: string[];
    opportunities: string[];
    threats: string[];
  };
  seoInsights: {
    topLocalKeywords: Array<{
      keyword: string;
      volumeEstimate: 'High' | 'Medium' | 'Low';
      competition: 'High' | 'Medium' | 'Low';
      userIntent: 'Transactional' | 'Informational' | 'Navigation';
    }>;
    contentOpportunities: Array<{
      title: string;
      description: string;
      targetProduct: string;
    }>;
    hyperLocalTips: string[];
  };
  gapAnalysis: {
    reviewGap: string;
    ratingGap: string;
    contentGap: string;
  };
  phasedActionPlan: {
    immediate: string[];
    shortTerm: string[];
    longTerm: string[];
  };
}

/**
 * Audit parameters
 */
export interface AuditParams {
  clientUrl?: string;
  clientData?: Business;
  competitors: Business[];
  language: 'en' | 'es';
  userSearchAddress: string;
  productsList?: string;
}

@Injectable()
export class GeminiService {
  private readonly logger = new Logger(GeminiService.name);
  private readonly apiKey: string | undefined;

  constructor(private configService: ConfigService) {
    this.apiKey = this.configService.get<string>('GEMINI_API_KEY');
    if (!this.apiKey) {
      this.logger.warn('GEMINI_API_KEY not configured - AI features will be disabled');
    }
  }


  /**
   * Calculate quality score for a business
   */
  private calculateQualityScore(rating: number, reviewCount: number): number {
    const ratingWeight = 0.6;
    const reviewWeight = 0.4;
    const normalizedRating = (rating / 5) * 100;
    const normalizedReviews = Math.min((reviewCount / 500) * 100, 100);
    return Math.round(normalizedRating * ratingWeight + normalizedReviews * reviewWeight);
  }

  /**
   * Search for competitors using Gemini AI
   * Interprets colloquial terms and expands search intelligently
   */
  async searchCompetitors(params: CompetitorSearchParams): Promise<Business[]> {
    if (!this.apiKey) {
      this.logger.warn('Gemini API key not configured, returning empty results');
      return [];
    }

    try {
      const { GoogleGenerativeAI } = await import('@google/generative-ai');
      const genAI = new GoogleGenerativeAI(this.apiKey);
      const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

      const searchRadius = Math.max(params.radius * 3, 5);

      const prompt = `
        Act as a local business data extractor.
        
        SEARCH CONTEXT:
        - User Input Keywords: "${params.keywords}"
        - Search Center Address: "${params.address}"
        
        CRITICAL MISSION 1: THE CLIENT (Target Address Lookup)
        You MUST identify the specific business entity located EXACTLY at "${params.address}".
        Mark it as 'isClient': true.

        CRITICAL MISSION 2: INTELLIGENT COMPETITOR SEARCH
        The user input might be colloquial. If the user types "Kiosco", also search for 
        "Convenience store", "Drugstore", "Newsstand", "Almacén", "Maxikiosco".
        
        TASK:
        Find a comprehensive list of competitors (target 30+) matching the keywords near the address.

        OUTPUT: Return ONLY a JSON array with these fields per item:
        - name (string)
        - category (string, exact category from Google Maps)
        - address (string)
        - rating (number, default 0)
        - reviewCount (integer, default 0)
        - website (string, optional)
        - googleMapsUri (string, optional)
        - phone (string, optional)
        - latitude (number)
        - longitude (number)
        - isClient (boolean, true ONLY for the business at ${params.address})
      `;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      let text = response.text();

      // Extract JSON from response
      const firstBracket = text.indexOf('[');
      const lastBracket = text.lastIndexOf(']');
      if (firstBracket !== -1 && lastBracket !== -1) {
        text = text.substring(firstBracket, lastBracket + 1);
      }

      const businesses: Business[] = JSON.parse(text).map((b: any, index: number) => ({
        id: `biz-${index}-${Date.now()}`,
        name: b.name || 'Unknown',
        category: b.category || 'Local Business',
        address: b.address || '',
        rating: Number(b.rating) || 0,
        reviewCount: Number(b.reviewCount) || 0,
        website: b.website,
        googleMapsUri: b.googleMapsUri,
        phone: b.phone,
        latitude: Number(b.latitude) || 0,
        longitude: Number(b.longitude) || 0,
        isClient: !!b.isClient,
        qualityScore: this.calculateQualityScore(Number(b.rating) || 0, Number(b.reviewCount) || 0),
      }));

      return businesses;
    } catch (error) {
      this.logger.error('Error searching competitors with Gemini:', error);
      return [];
    }
  }

  /**
   * Perform SEO/GMB audit using Gemini AI
   */
  async performAudit(params: AuditParams): Promise<AuditResult> {
    if (!this.apiKey) {
      throw new Error('GEMINI_API_KEY not configured');
    }

    try {
      const { GoogleGenerativeAI } = await import('@google/generative-ai');
      const genAI = new GoogleGenerativeAI(this.apiKey);
      const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

      const validCompetitors = params.competitors.filter(c => !c.isClient);
      const avgRating = validCompetitors.length 
        ? (validCompetitors.reduce((acc, c) => acc + c.rating, 0) / validCompetitors.length).toFixed(1) 
        : '0';
      const avgReviews = validCompetitors.length 
        ? Math.floor(validCompetitors.reduce((acc, c) => acc + c.reviewCount, 0) / validCompetitors.length) 
        : 0;

      const topCompetitors = params.competitors
        .filter(c => !c.isClient)
        .sort((a, b) => (b.qualityScore || 0) - (a.qualityScore || 0))
        .slice(0, 5)
        .map(c => `${c.name} (${c.category}) - R:${c.rating}, V:${c.reviewCount}`)
        .join(', ');

      const prompt = `
        You are an Elite Digital Marketing Consultant specializing in Local SEO and Google Business Profile.
        Language for Output: ${params.language === 'en' ? 'English' : 'Spanish'} (STRICTLY).

        TARGET BUSINESS:
        ${params.clientData ? JSON.stringify(params.clientData) : `URL: ${params.clientUrl}`}
        
        USER CLAIMED ADDRESS: "${params.userSearchAddress}"
        PRODUCTS & SERVICES: "${params.productsList || 'Not specified'}"

        MARKET LANDSCAPE (Top Competitors): ${topCompetitors}
        MARKET AVERAGES: Rating: ${avgRating}, Reviews: ${avgReviews}

        TASK: Perform a strategic audit and return JSON with:
        - completenessScore (0-100)
        - executiveSummary (string)
        - nameCompliance: { status: "pass"|"fail"|"warning", details, suggestedName? }
        - basicChecklist: [{ item, status: "ok"|"missing"|"fix", note }]
        - swotAnalysis: { strengths[], weaknesses[], opportunities[], threats[] }
        - seoInsights: { 
            topLocalKeywords: [{ keyword, volumeEstimate, competition, userIntent }],
            contentOpportunities: [{ title, description, targetProduct }],
            hyperLocalTips: []
          }
        - gapAnalysis: { reviewGap, ratingGap, contentGap }
        - phasedActionPlan: { immediate[], shortTerm[], longTerm[] }

        Return ONLY valid JSON.
      `;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      let text = response.text();

      // Extract JSON
      const firstBrace = text.indexOf('{');
      const lastBrace = text.lastIndexOf('}');
      if (firstBrace !== -1 && lastBrace !== -1) {
        text = text.substring(firstBrace, lastBrace + 1);
      }

      const auditResult = JSON.parse(text);
      auditResult.lastUpdated = Date.now();

      return auditResult as AuditResult;
    } catch (error) {
      this.logger.error('Error performing audit with Gemini:', error);
      throw error;
    }
  }
}
