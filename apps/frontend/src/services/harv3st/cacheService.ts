/**
 * Cache Service
 * Session-based caching for harvested leads
 */

import { HarvestedLead } from './harv3stTypes';

interface CacheEntry {
  leads: HarvestedLead[];
  cachedAt: number;
  query?: string;
}

export interface CacheConfig {
  stalenessThresholdMs: number;
  storageKey: string;
}

export const DEFAULT_CACHE_CONFIG: CacheConfig = {
  stalenessThresholdMs: 5 * 60 * 1000,
  storageKey: 'harv3st_session_cache',
};

export class CacheService {
  private config: CacheConfig;

  constructor(config: Partial<CacheConfig> = {}) {
    this.config = { ...DEFAULT_CACHE_CONFIG, ...config };
  }

  cacheLeadsForSession(leads: HarvestedLead[], query?: string): void {
    const entry: CacheEntry = { leads, cachedAt: Date.now(), query };
    try {
      sessionStorage.setItem(this.config.storageKey, JSON.stringify(entry));
    } catch (e) {
      console.warn('Failed to cache leads:', e);
    }
  }

  getSessionCache(): CacheEntry | null {
    try {
      const data = sessionStorage.getItem(this.config.storageKey);
      if (!data) return null;
      return JSON.parse(data) as CacheEntry;
    } catch (e) {
      console.warn('Failed to read cache:', e);
      return null;
    }
  }

  getFreshCache(): HarvestedLead[] | null {
    const entry = this.getSessionCache();
    if (!entry) return null;
    if (this.isCacheStale(entry.cachedAt)) return null;
    return entry.leads;
  }

  isCacheStale(cachedAt: number): boolean {
    const age = Date.now() - cachedAt;
    return age > this.config.stalenessThresholdMs;
  }

  getCacheAge(): number | null {
    const entry = this.getSessionCache();
    if (!entry) return null;
    return Date.now() - entry.cachedAt;
  }

  clearSessionCache(): void {
    try {
      sessionStorage.removeItem(this.config.storageKey);
    } catch (e) {
      console.warn('Failed to clear cache:', e);
    }
  }

  hasCache(): boolean {
    return this.getSessionCache() !== null;
  }

  getCacheInfo(): { cachedAt: number; count: number; query?: string } | null {
    const entry = this.getSessionCache();
    if (!entry) return null;
    return { cachedAt: entry.cachedAt, count: entry.leads.length, query: entry.query };
  }

  setStalenessThreshold(ms: number): void {
    this.config.stalenessThresholdMs = ms;
  }
}

export const cacheService = new CacheService();
export default CacheService;
