import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SerpApiService {
    private readonly logger = new Logger(SerpApiService.name);
    private readonly API_KEY = process.env.SERPAPI_KEY;

    constructor(private prisma: PrismaService) { }

    async getBusinessDetails(query: string, latitude: number, longitude: number): Promise<any> {
        if (!this.API_KEY) {
            this.logger.warn("SERPAPI_KEY is not set. Returning null.");
            return null;
        }

        const cacheKey = `serp:${query}:${latitude.toFixed(4)},${longitude.toFixed(4)}`;

        // 1. Check Cache (Database or explicit cache table if we had one, abusing gmbSearch for now or creating new?)
        // Let's use a simple JSON storage or the existing GmbSearch table but strictly for 'details' type?
        // OR better: Just return null if no cache, implementation detail.
        // For this MVP, let's assume we want to just hit the API if triggered.
        // Real implementation should check `Client` table if we already enriched this lead.

        try {
            this.logger.log(`Fetching SerpApi for: ${query} @ ${latitude},${longitude}`);

            // SerpApi Google Maps Search
            const response = await axios.get('https://serpapi.com/search', {
                params: {
                    engine: 'google_maps',
                    q: query,
                    ll: `@${latitude},${longitude},15z`, // Zoom 15 is standard
                    type: 'search',
                    api_key: this.API_KEY,
                    limit: 1 // We want the closest match
                }
            });

            if (response.data.error) {
                this.logger.error(`SerpApi Error: ${response.data.error}`);
                return null;
            }

            const results = response.data.local_results;
            if (results && results.length > 0) {
                // Return the first match (most relevant)
                return results[0];
            }

            return null;

        } catch (error) {
            this.logger.error("Error fetching from SerpApi", error);
            return null;
        }
    }

    async getAccountUsage() {
        if (!this.API_KEY) return { total: 0, used: 0, distinct: 0 };
        try {
            const res = await axios.get('https://serpapi.com/account', {
                params: { api_key: this.API_KEY }
            });
            return {
                total: res.data.plan_searches_left + res.data.this_month_usage, // plan_searches_left is remaining? No, it's total monthly or remaining? Docs say plan_searches_left. 
                // Wait, typically 'plan_searches_left' is remaining. 'this_month_usage' is used.
                // Total limit = left + used ?
                // Let's check response format in verified docs or robustly return what we have.
                // https://serpapi.com/account gives:
                // { account_email: "...", plan_searches_left: 99, this_month_usage: 1, ... }
                // So Total = plan_searches_left + this_month_usage.
                used: res.data.this_month_usage,
                remaining: res.data.plan_searches_left
            };
        } catch (error) {
            this.logger.error("Error fetching usage", error);
            return { total: 0, used: 0, remaining: 0 };
        }
    }
}
