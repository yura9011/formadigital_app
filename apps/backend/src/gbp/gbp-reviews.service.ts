import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { GoogleAuthService } from '../google-auth/google-auth.service';
import { MockDataService } from '../common/mock-data.service';

@Injectable()
export class GbpReviewsService {
    private readonly logger = new Logger(GbpReviewsService.name);
    private readonly useMockData: boolean;

    constructor(
        private prisma: PrismaService,
        private configService: ConfigService,
        private googleAuthService: GoogleAuthService,
        private mockDataService: MockDataService,
    ) {
        this.useMockData = this.configService.get<string>('USE_MOCK_DATA') !== 'false';
        if (this.useMockData) {
            this.logger.log('GBP Reviews Service running in MOCK mode');
        }
    }

    /**
     * Get all locations for a user
     */
    async getLocations(userId: string) {
        if (this.useMockData) {
            return this.mockDataService.getMockLocations();
        }

        const client = await this.googleAuthService.getAuthenticatedClient(userId);
        if (!client) {
            throw new Error('No authenticated client available');
        }

        // Real API call would go here
        // const response = await client.request({
        //   url: 'https://mybusinessaccountmanagement.googleapis.com/v1/accounts/{accountId}/locations',
        //   method: 'GET',
        // });

        return [];
    }

    /**
     * Get reviews for a specific location
     */
    async getReviews(userId: string, locationId?: string) {
        if (this.useMockData) {
            return {
                reviews: this.mockDataService.getMockReviews(locationId),
                nextPageToken: null,
            };
        }

        const client = await this.googleAuthService.getAuthenticatedClient(userId);
        if (!client) {
            throw new Error('No authenticated client available');
        }

        // Real API call would go here
        // Uses: https://mybusiness.googleapis.com/v4/{name}/reviews

        return { reviews: [], nextPageToken: null };
    }

    /**
     * Reply to a review
     */
    async replyToReview(
        userId: string,
        locationId: string,
        reviewId: string,
        replyText: string,
    ) {
        if (this.useMockData) {
            this.logger.log(`[MOCK] Replying to review ${reviewId}: "${replyText}"`);
            return {
                success: true,
                mock: true,
                reply: {
                    comment: replyText,
                    updateTime: new Date().toISOString(),
                },
            };
        }

        const client = await this.googleAuthService.getAuthenticatedClient(userId);
        if (!client) {
            throw new Error('No authenticated client available');
        }

        // Real API call would go here
        // PUT https://mybusiness.googleapis.com/v4/{name}/reply

        return { success: true, mock: false };
    }

    /**
     * Delete a review reply
     */
    async deleteReply(userId: string, locationId: string, reviewId: string) {
        if (this.useMockData) {
            this.logger.log(`[MOCK] Deleting reply for review ${reviewId}`);
            return { success: true, mock: true };
        }

        const client = await this.googleAuthService.getAuthenticatedClient(userId);
        if (!client) {
            throw new Error('No authenticated client available');
        }

        // Real API call would go here
        // DELETE https://mybusiness.googleapis.com/v4/{name}/reply

        return { success: true, mock: false };
    }

    /**
     * Get review statistics for a location
     */
    async getReviewStats(userId: string, locationId?: string) {
        const reviews = this.useMockData
            ? this.mockDataService.getMockReviews(locationId)
            : [];

        const stats = {
            totalReviews: reviews.length,
            averageRating:
                reviews.length > 0
                    ? reviews.reduce((acc, r) => acc + r.starRating, 0) / reviews.length
                    : 0,
            pendingReplies: reviews.filter((r) => !r.reviewReply).length,
            ratingDistribution: {
                5: reviews.filter((r) => r.starRating === 5).length,
                4: reviews.filter((r) => r.starRating === 4).length,
                3: reviews.filter((r) => r.starRating === 3).length,
                2: reviews.filter((r) => r.starRating === 2).length,
                1: reviews.filter((r) => r.starRating === 1).length,
            },
        };

        return stats;
    }

    /**
     * Generate AI-powered response suggestion
     */
    async generateResponseSuggestion(review: any) {
        // For now, use the mock data service's simple generator
        // Later can integrate with Gemini for smarter responses
        return {
            suggestion: this.mockDataService.generateReviewResponseSuggestion(review),
        };
    }
}
