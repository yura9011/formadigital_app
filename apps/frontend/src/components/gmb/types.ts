
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

export type ClientType = 'CLIENT' | 'LEAD' | 'COMPETITOR';

export interface ClientNote {
    id: string;
    content: string;
    createdAt: string;
    clientId: string;
}

export type ProjectStatus = 'PLANNING' | 'IN_PROGRESS' | 'COMPLETED' | 'ON_HOLD' | 'CANCELLED';
export type PhaseStatus = 'PENDING' | 'IN_PROGRESS' | 'REVIEW' | 'DONE';
export type AttachmentType = 'IMAGE' | 'AUDIO' | 'FILE';

export interface PhaseAttachment {
    id: string;
    type: AttachmentType;
    filePath: string;
    fileName: string;
    phaseId: string;
    createdAt: string;
}

export interface ProjectPhase {
    id: string;
    name: string;
    description?: string;
    status: PhaseStatus;
    order: number;
    startDate?: string;
    endDate?: string;
    attachments: PhaseAttachment[];
    projectId: string;
    createdAt: string;
    updatedAt: string;
}

export interface Project {
    id: string;
    name: string;
    status: ProjectStatus;
    startDate?: string;
    endDate?: string;
    budget?: number;
    actualCost?: number;
    phases: ProjectPhase[];
    createdAt: string;
    updatedAt: string;
    clientId: string;
    client?: { name: string; category?: string }; // For master dashboard
    assignedToId?: string;
    assignedTo?: { id: string; name?: string; email: string };
}

export interface ProjectTemplate {
    id: string;
    name: string;
    description?: string;
    phases: any[];
}

export interface StoredClient extends Business {
    id: string;
    type: ClientType;
    createdAt: string;
    updatedAt: string;
    notes?: ClientNote[];
    projects?: Project[];
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
            volumeEstimate: 'High' | 'Medium' | 'Low'; // AI Estimation
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
