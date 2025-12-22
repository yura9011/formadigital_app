import { Controller, Get, Post, Query, Body, Logger } from '@nestjs/common';
import { GscService } from './gsc.service';
import type { SearchAnalyticsRequest } from './gsc.service';

@Controller('gsc')
export class GscController {
    private readonly logger = new Logger(GscController.name);

    constructor(private readonly gscService: GscService) { }

    /**
     * Get all GSC properties for the user
     */
    @Get('properties')
    async getProperties(@Query('userId') userId: string) {
        const effectiveUserId = userId || 'default-user-id';
        return this.gscService.getProperties(effectiveUserId);
    }

    /**
     * Get search analytics data
     */
    @Post('analytics')
    async getSearchAnalytics(
        @Query('userId') userId: string,
        @Body() request: SearchAnalyticsRequest,
    ) {
        const effectiveUserId = userId || 'default-user-id';
        return this.gscService.getSearchAnalytics(effectiveUserId, request);
    }

    /**
     * Get search analytics with query params (GET alternative)
     */
    @Get('analytics')
    async getSearchAnalyticsGet(
        @Query('userId') userId: string,
        @Query('siteUrl') siteUrl: string,
        @Query('startDate') startDate?: string,
        @Query('endDate') endDate?: string,
    ) {
        const effectiveUserId = userId || 'default-user-id';
        const today = new Date();
        const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

        const request: SearchAnalyticsRequest = {
            siteUrl: siteUrl || 'sc-domain:formadigital.com',
            startDate: startDate || thirtyDaysAgo.toISOString().split('T')[0],
            endDate: endDate || today.toISOString().split('T')[0],
        };

        return this.gscService.getSearchAnalytics(effectiveUserId, request);
    }

    /**
     * Get index coverage status
     */
    @Get('index-coverage')
    async getIndexCoverage(
        @Query('userId') userId: string,
        @Query('siteUrl') siteUrl: string,
    ) {
        const effectiveUserId = userId || 'default-user-id';
        return this.gscService.getIndexCoverage(effectiveUserId, siteUrl || 'sc-domain:formadigital.com');
    }

    /**
     * Get sitemaps for a property
     */
    @Get('sitemaps')
    async getSitemaps(
        @Query('userId') userId: string,
        @Query('siteUrl') siteUrl: string,
    ) {
        const effectiveUserId = userId || 'default-user-id';
        return this.gscService.getSitemaps(effectiveUserId, siteUrl || 'sc-domain:formadigital.com');
    }
}
