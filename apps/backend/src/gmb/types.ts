
export type Language = 'en' | 'es';

export interface Business {
    id: string;
    name: string;
    category?: string;
    address: string;
    rating: number;
    reviewCount: number;
    website?: string;
    googleMapsUri?: string;
    phone?: string;
    socialLinks?: string[];
    description?: string;
    isClient: boolean;
    latitude: number;
    longitude: number;
    weightedScore?: number;
}

export interface SearchParams {
    address: string;
    radius: number;
    keywords: string;
    products: string;
}

export interface AuditResult {
    lastUpdated: number;
    nameCompliance: {
        status: 'pass' | 'fail' | 'warning';
        details: string;
        suggestedName?: string;
    };
    basicChecklist: ChecklistItem[];
    swotAnalysis: {
        strengths: string[];
        weaknesses: string[];
        opportunities: string[];
        threats: string[];
    };
    seoInsights: {
        topLocalKeywords: {
            keyword: string;
            volumeEstimate: 'High' | 'Medium' | 'Low';
            competition: 'High' | 'Medium' | 'Low';
            userIntent: 'Transactional' | 'Informational' | 'Navigation';
        }[];
        contentOpportunities: {
            title: string;
            description: string;
            targetProduct: string;
        }[];
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
    completenessScore: number;
    executiveSummary: string;
}

export interface ChecklistItem {
    item: string;
    status: 'ok' | 'missing' | 'fix';
    note: string;
}

export const DEFAULT_CONFIG = {
    C: 3.9,
    m: 150,
};
