import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { GoogleAuthService } from '../google-auth/google-auth.service';
import { MockDataService } from '../common/mock-data.service';

export interface SearchAnalyticsRequest {
    siteUrl: string;
    startDate: string;
    endDate: string;
    dimensions?: ('query' | 'page' | 'country' | 'device' | 'date')[];
    rowLimit?: number;
}

@Injectable()
export class GscService {
    private readonly logger = new Logger(GscService.name);
    private readonly useMockData: boolean;

    constructor(
        private prisma: PrismaService,
        private configService: ConfigService,
        private googleAuthService: GoogleAuthService,
        private mockDataService: MockDataService,
    ) {
        this.useMockData = this.configService.get<string>('USE_MOCK_DATA') !== 'false';
        if (this.useMockData) {
            this.logger.log('GSC Service running in MOCK mode');
        }
    }

    /**
     * Get all GSC properties for a user
     */
    async getProperties(userId: string) {
        if (this.useMockData) {
            return this.mockDataService.getMockGscProperties();
        }

        const client = await this.googleAuthService.getAuthenticatedClient(userId);
        if (!client) {
            throw new Error('No authenticated client available');
        }

        // Real API call would go here
        // https://searchconsole.googleapis.com/v1/sites
        return [];
    }

    /**
     * Get search analytics data
     */
    async getSearchAnalytics(userId: string, request: SearchAnalyticsRequest) {
        if (this.useMockData) {
            return this.mockDataService.getMockSearchAnalytics(
                request.siteUrl,
                this.calculateDays(request.startDate, request.endDate),
            );
        }

        const client = await this.googleAuthService.getAuthenticatedClient(userId);
        if (!client) {
            throw new Error('No authenticated client available');
        }

        // Real API call would go here
        // POST https://searchconsole.googleapis.com/v1/sites/{siteUrl}/searchAnalytics/query
        return {
            summary: { totalClicks: 0, totalImpressions: 0, averageCtr: 0, averagePosition: 0 },
            queries: [],
            pages: [],
            dailyData: [],
        };
    }

    /**
     * Get index coverage status
     */
    async getIndexCoverage(userId: string, siteUrl: string) {
        if (this.useMockData) {
            return this.getMockIndexCoverage();
        }

        const client = await this.googleAuthService.getAuthenticatedClient(userId);
        if (!client) {
            throw new Error('No authenticated client available');
        }

        // Real API would use URL Inspection API
        return this.getMockIndexCoverage();
    }

    /**
     * Get sitemaps for a property
     */
    async getSitemaps(userId: string, siteUrl: string) {
        if (this.useMockData) {
            return this.getMockSitemaps(siteUrl);
        }

        const client = await this.googleAuthService.getAuthenticatedClient(userId);
        if (!client) {
            throw new Error('No authenticated client available');
        }

        // Real API: GET https://searchconsole.googleapis.com/v1/sites/{siteUrl}/sitemaps
        return this.getMockSitemaps(siteUrl);
    }

    // --- Mock Data Helpers ---

    private calculateDays(startDate: string, endDate: string): number {
        const start = new Date(startDate);
        const end = new Date(endDate);
        return Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    }

    private getMockIndexCoverage() {
        return {
            summary: {
                valid: 156,
                validWithWarnings: 12,
                error: 3,
                excluded: 45,
            },
            details: [
                { type: 'Indexed', count: 156, trend: '+5' },
                { type: 'Discovered - currently not indexed', count: 23, trend: '-2' },
                { type: 'Crawled - currently not indexed', count: 12, trend: '0' },
                { type: 'Excluded by noindex tag', count: 8, trend: '0' },
                { type: 'Duplicate without user-selected canonical', count: 2, trend: '0' },
            ],
            lastUpdated: new Date().toISOString(),
        };
    }

    private getMockSitemaps(siteUrl: string) {
        const domain = siteUrl.replace('sc-domain:', '').replace('https://', '').replace('/', '');
        return [
            {
                path: `https://${domain}/sitemap.xml`,
                lastSubmitted: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
                lastDownloaded: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
                isPending: false,
                isSitemapsIndex: true,
                warnings: 0,
                errors: 0,
                contents: [
                    { type: 'web', submitted: 45, indexed: 42 },
                ],
            },
            {
                path: `https://${domain}/sitemap-posts.xml`,
                lastSubmitted: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
                lastDownloaded: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
                isPending: false,
                isSitemapsIndex: false,
                warnings: 1,
                errors: 0,
                contents: [
                    { type: 'web', submitted: 28, indexed: 25 },
                ],
            },
        ];
    }
}
