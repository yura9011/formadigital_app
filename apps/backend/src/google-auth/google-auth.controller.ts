import { Controller, Get, Query, Res, Logger } from '@nestjs/common';
import type { Response } from 'express';
import { GoogleAuthService } from './google-auth.service';

@Controller('google-auth')
export class GoogleAuthController {
    private readonly logger = new Logger(GoogleAuthController.name);

    constructor(private readonly googleAuthService: GoogleAuthService) { }

    /**
     * Get OAuth URL for initiating the connection flow
     */
    @Get('url')
    getAuthUrl(@Query('userId') userId: string) {
        // userId might be optional in mock mode, but for real oauth it's critical
        const effectiveId = userId || 'default-user-id';
        const result = this.googleAuthService.getAuthUrl(effectiveId);
        this.logger.log(`Auth URL requested for user ${effectiveId}. Mock mode: ${result.mock}`);
        return result;
    }

    /**
     * Handle OAuth callback from Google
     */
    @Get('callback')
    async handleCallback(
        @Query('code') code: string,
        @Query('state') state: string, // We'll pass userId in state
        @Res() res: Response,
    ) {
        try {
            // For now, use a default user ID (in production, extract from JWT/session)
            const userId = state || 'default-user-id';

            await this.googleAuthService.handleCallback(code, userId);

            // Redirect to frontend success page
            res.redirect('http://localhost:3001/settings?google=connected');
        } catch (error) {
            this.logger.error('OAuth callback failed', error);
            res.redirect('http://localhost:3001/settings?google=error');
        }
    }

    /**
     * Handle mock OAuth callback for development
     */
    @Get('mock-callback')
    async handleMockCallback(
        @Query('userId') userId: string,
        @Res() res: Response,
    ) {
        const effectiveUserId = userId || 'default-user-id';

        await this.googleAuthService.handleMockCallback(effectiveUserId);

        // Redirect to frontend success page
        res.redirect('http://localhost:3001/settings?google=connected&mock=true');
    }

    /**
     * Get current connection status
     */
    @Get('status')
    async getStatus(@Query('userId') userId: string) {
        const effectiveUserId = userId || 'default-user-id';
        return this.googleAuthService.getConnectionStatus(effectiveUserId);
    }

    /**
     * Disconnect Google account
     */
    @Get('disconnect')
    async disconnect(@Query('userId') userId: string) {
        const effectiveUserId = userId || 'default-user-id';
        await this.googleAuthService.disconnect(effectiveUserId);
        return { success: true, message: 'Google account disconnected' };
    }
}
