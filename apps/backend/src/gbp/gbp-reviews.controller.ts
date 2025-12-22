import { Controller, Get, Post, Delete, Query, Body, Param, Logger } from '@nestjs/common';
import { GbpReviewsService } from './gbp-reviews.service';

@Controller('gbp')
export class GbpReviewsController {
    private readonly logger = new Logger(GbpReviewsController.name);

    constructor(private readonly gbpReviewsService: GbpReviewsService) { }

    /**
     * Get all GBP locations for the user
     */
    @Get('locations')
    async getLocations(@Query('userId') userId: string) {
        const effectiveUserId = userId || 'default-user-id';
        return this.gbpReviewsService.getLocations(effectiveUserId);
    }

    /**
     * Get reviews for a location
     */
    @Get('reviews')
    async getReviews(
        @Query('userId') userId: string,
        @Query('locationId') locationId?: string,
    ) {
        const effectiveUserId = userId || 'default-user-id';
        return this.gbpReviewsService.getReviews(effectiveUserId, locationId);
    }

    /**
     * Get review statistics
     */
    @Get('reviews/stats')
    async getReviewStats(
        @Query('userId') userId: string,
        @Query('locationId') locationId?: string,
    ) {
        const effectiveUserId = userId || 'default-user-id';
        return this.gbpReviewsService.getReviewStats(effectiveUserId, locationId);
    }

    /**
     * Reply to a review
     */
    @Post('reviews/:reviewId/reply')
    async replyToReview(
        @Param('reviewId') reviewId: string,
        @Query('userId') userId: string,
        @Query('locationId') locationId: string,
        @Body() body: { replyText: string },
    ) {
        const effectiveUserId = userId || 'default-user-id';
        return this.gbpReviewsService.replyToReview(
            effectiveUserId,
            locationId,
            reviewId,
            body.replyText,
        );
    }

    /**
     * Delete a review reply
     */
    @Delete('reviews/:reviewId/reply')
    async deleteReply(
        @Param('reviewId') reviewId: string,
        @Query('userId') userId: string,
        @Query('locationId') locationId: string,
    ) {
        const effectiveUserId = userId || 'default-user-id';
        return this.gbpReviewsService.deleteReply(
            effectiveUserId,
            locationId,
            reviewId,
        );
    }

    /**
     * Generate AI response suggestion for a review
     */
    @Post('reviews/:reviewId/suggest')
    async generateSuggestion(@Body() review: any) {
        return this.gbpReviewsService.generateResponseSuggestion(review);
    }
}
