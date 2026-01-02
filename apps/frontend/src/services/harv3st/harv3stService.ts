/**
 * Harv3st Service
 * Handles all communication with the Harv3st scraper API
 */

import {
  HarvestedLead,
  Harv3stStatusResponse,
  Harv3stSearchResponse,
  Harv3stCollectResponse,
  CampaignStatus,
  Harv3stConnectionStatus,
  Harv3stConfig,
  DEFAULT_HARV3ST_CONFIG,
} from './harv3stTypes';

/**
 * Service class for Harv3st API interactions
 */
export class Harv3stService {
  private config: Harv3stConfig;

  constructor(config: Partial<Harv3stConfig> = {}) {
    this.config = { ...DEFAULT_HARV3ST_CONFIG, ...config };
  }

  setBaseUrl(url: string): void {
    this.config.baseUrl = url;
  }

  getConfig(): Harv3stConfig {
    return { ...this.config };
  }

  async checkConnection(): Promise<Harv3stConnectionStatus> {
    try {
      const response = await fetch(`${this.config.baseUrl}/api/status`, {
        method: 'GET',
        signal: AbortSignal.timeout(5000),
      });
      return response.ok ? 'connected' : 'offline';
    } catch {
      return 'offline';
    }
  }

  async getStatus(): Promise<Harv3stStatusResponse> {
    const response = await fetch(`${this.config.baseUrl}/api/status`);
    if (!response.ok) {
      throw new Error(`Failed to get status: ${response.statusText}`);
    }
    return response.json();
  }

  async triggerSearch(query: string, headless: boolean = true): Promise<Harv3stSearchResponse> {
    const response = await fetch(`${this.config.baseUrl}/api/search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, headless }),
    });
    if (!response.ok) {
      throw new Error(`Failed to trigger search: ${response.statusText}`);
    }
    return response.json();
  }

  async getData(): Promise<HarvestedLead[]> {
    const response = await fetch(`${this.config.baseUrl}/api/data`);
    if (!response.ok) {
      throw new Error(`Failed to get data: ${response.statusText}`);
    }
    return response.json();
  }

  async getScoredData(): Promise<HarvestedLead[]> {
    const response = await fetch(`${this.config.baseUrl}/api/data/scored`);
    if (!response.ok) {
      throw new Error(`Failed to get scored data: ${response.statusText}`);
    }
    return response.json();
  }


  async getFilteredData(filters: {
    minRating?: number;
    maxRating?: number;
    hasWebsite?: boolean;
    category?: string;
    search?: string;
  }): Promise<HarvestedLead[]> {
    const params = new URLSearchParams();
    if (filters.minRating !== undefined) params.set('minRating', String(filters.minRating));
    if (filters.maxRating !== undefined) params.set('maxRating', String(filters.maxRating));
    if (filters.hasWebsite !== undefined) params.set('hasWebsite', String(filters.hasWebsite));
    if (filters.category) params.set('category', filters.category);
    if (filters.search) params.set('search', filters.search);

    const response = await fetch(`${this.config.baseUrl}/api/data/filter?${params}`);
    if (!response.ok) {
      throw new Error(`Failed to get filtered data: ${response.statusText}`);
    }
    return response.json();
  }

  async collectData(data: HarvestedLead[]): Promise<Harv3stCollectResponse> {
    const response = await fetch(`${this.config.baseUrl}/api/collect`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      throw new Error(`Failed to collect data: ${response.statusText}`);
    }
    return response.json();
  }

  async startCampaign(queries: string[], delaySeconds: number = 30): Promise<{ status: string; message: string }> {
    const response = await fetch(`${this.config.baseUrl}/api/campaign`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ queries, delay_seconds: delaySeconds }),
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: response.statusText }));
      throw new Error(error.message || `Failed to start campaign: ${response.statusText}`);
    }
    return response.json();
  }

  async getCampaignStatus(): Promise<CampaignStatus> {
    const response = await fetch(`${this.config.baseUrl}/api/campaign/status`);
    if (!response.ok) {
      throw new Error(`Failed to get campaign status: ${response.statusText}`);
    }
    return response.json();
  }

  async stopCampaign(): Promise<{ status: string; message: string }> {
    const response = await fetch(`${this.config.baseUrl}/api/campaign/stop`, {
      method: 'POST',
    });
    if (!response.ok) {
      throw new Error(`Failed to stop campaign: ${response.statusText}`);
    }
    return response.json();
  }

  getExportCsvUrl(): string {
    return `${this.config.baseUrl}/api/export/csv`;
  }

  async downloadCsv(): Promise<Blob> {
    const response = await fetch(this.getExportCsvUrl());
    if (!response.ok) {
      throw new Error(`Failed to download CSV: ${response.statusText}`);
    }
    return response.blob();
  }

  async clearAllData(): Promise<{ status: string; message: string }> {
    const response = await fetch(`${this.config.baseUrl}/api/data/clear`, {
      method: 'DELETE',
    });
    if (!response.ok) {
      throw new Error(`Failed to clear data: ${response.statusText}`);
    }
    return response.json();
  }
}

export const harv3stService = new Harv3stService();
export default Harv3stService;
