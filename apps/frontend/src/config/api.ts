/**
 * API Configuration
 * Centralized API URL configuration for all frontend fetch calls
 */

// Backend API URL (NestJS)
export const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

// GMB API URL (if different - legacy support)
export const GMB_API_URL = process.env.NEXT_PUBLIC_GMB_API_URL || API_URL;

/**
 * Helper to build API endpoints
 */
export const api = {
    pipeline: {
        summary: () => `${API_URL}/api/pipeline/summary`,
        metrics: () => `${API_URL}/api/pipeline/metrics`,
        readyToContact: (limit = 50) => `${API_URL}/api/pipeline/ready-to-contact?limit=${limit}`,
        leads: (id?: string) => id ? `${API_URL}/api/pipeline/leads/${id}` : `${API_URL}/api/pipeline/leads`,
        snooze: (id: string) => `${API_URL}/api/pipeline/leads/${id}/snooze`,
        quickContact: (id: string) => `${API_URL}/api/pipeline/leads/${id}/quick-contact`,
    },
    gmb: {
        leads: () => `${API_URL}/gmb/leads`,
    },
};
