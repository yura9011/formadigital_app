import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { OAuth2Client } from 'google-auth-library';

// Scopes required for GBP and GSC access
const SCOPES = [
    'https://www.googleapis.com/auth/business.manage',      // GBP - Read/Write
    'https://www.googleapis.com/auth/webmasters.readonly',  // GSC - Read
    'https://www.googleapis.com/auth/webmasters',           // GSC - Write
    'https://www.googleapis.com/auth/calendar',             // Calendar - Read/Write
    'openid',
    'email',
    'profile',
];

@Injectable()
export class GoogleAuthService {
    private readonly logger = new Logger(GoogleAuthService.name);
    private oauth2Client: OAuth2Client | null = null;
    private readonly useMockData: boolean;

    constructor(
        private prisma: PrismaService,
        private configService: ConfigService,
    ) {
        const clientId = this.configService.get<string>('GOOGLE_CLIENT_ID');
        const clientSecret = this.configService.get<string>('GOOGLE_CLIENT_SECRET');
        const redirectUri = this.configService.get<string>('GOOGLE_REDIRECT_URI') || 'http://localhost:3001/google-auth/callback';

        this.useMockData = this.configService.get<string>('USE_MOCK_DATA') === 'true';

        if (clientId && clientSecret) {
            this.oauth2Client = new OAuth2Client(clientId, clientSecret, redirectUri);
            this.logger.log('Google OAuth2 client initialized');
        } else {
            this.logger.warn('Google OAuth credentials not configured. Running in mock mode.');
        }
    }

    /**
     * Generate the OAuth consent URL
     */
    getAuthUrl(userId: string): { url: string; mock: boolean } {
        if (!this.oauth2Client || this.useMockData) {
            return {
                url: '/google-auth/mock-callback',
                mock: true,
            };
        }

        const url = this.oauth2Client.generateAuthUrl({
            access_type: 'offline',
            scope: SCOPES,
            prompt: 'consent', // Force consent to get refresh token
            state: userId, // Pass userId as state to retrieve it in callback
        });

        return { url, mock: false };
    }

    /**
     * Handle OAuth callback and store tokens
     */
    async handleCallback(code: string, userId: string): Promise<{ success: boolean; email?: string }> {
        if (!this.oauth2Client) {
            throw new Error('OAuth client not initialized');
        }

        try {
            const { tokens } = await this.oauth2Client.getToken(code);
            this.oauth2Client.setCredentials(tokens);

            // Get user info
            const ticket = await this.oauth2Client.verifyIdToken({
                idToken: tokens.id_token!,
                audience: this.configService.get<string>('GOOGLE_CLIENT_ID'),
            });
            const payload = ticket.getPayload();
            const email = payload?.email || 'unknown';

            // Store credentials in database
            await this.prisma.googleCredential.upsert({
                where: { userId },
                update: {
                    accessToken: tokens.access_token!,
                    refreshToken: tokens.refresh_token || '', // May not be returned if already granted
                    expiresAt: new Date(tokens.expiry_date || Date.now() + 3600000),
                    scopes: SCOPES,
                    accountEmail: email,
                },
                create: {
                    userId,
                    accessToken: tokens.access_token!,
                    refreshToken: tokens.refresh_token!,
                    expiresAt: new Date(tokens.expiry_date || Date.now() + 3600000),
                    scopes: SCOPES,
                    accountEmail: email,
                },
            });

            this.logger.log(`Google credentials saved for user: ${userId}`);
            return { success: true, email };
        } catch (error) {
            this.logger.error('OAuth callback failed', error);
            throw error;
        }
    }

    /**
     * Handle mock OAuth for development
     */
    async handleMockCallback(userId: string): Promise<{ success: boolean; email: string }> {
        const mockEmail = 'mock-user@formadigital.com';

        await this.prisma.googleCredential.upsert({
            where: { userId },
            update: {
                accessToken: 'mock-access-token',
                refreshToken: 'mock-refresh-token',
                expiresAt: new Date(Date.now() + 86400000), // 24 hours
                scopes: SCOPES,
                accountEmail: mockEmail,
            },
            create: {
                userId,
                accessToken: 'mock-access-token',
                refreshToken: 'mock-refresh-token',
                expiresAt: new Date(Date.now() + 86400000),
                scopes: SCOPES,
                accountEmail: mockEmail,
            },
        });

        this.logger.log(`Mock Google credentials created for user: ${userId}`);
        return { success: true, email: mockEmail };
    }

    /**
     * Check if user has Google credentials connected
     */
    async getConnectionStatus(userId: string): Promise<{ connected: boolean; email?: string; mock: boolean }> {
        const credential = await this.prisma.googleCredential.findUnique({
            where: { userId },
        });

        if (!credential) {
            return { connected: false, mock: this.useMockData };
        }

        return {
            connected: true,
            email: credential.accountEmail,
            mock: credential.accessToken === 'mock-access-token',
        };
    }

    /**
     * Disconnect Google account
     */
    async disconnect(userId: string): Promise<void> {
        await this.prisma.googleCredential.delete({
            where: { userId },
        }).catch(() => {
            // Ignore if doesn't exist
        });
        this.logger.log(`Google credentials removed for user: ${userId}`);
    }

    /**
     * Get authenticated OAuth client for API calls
     */
    async getAuthenticatedClient(userId: string): Promise<OAuth2Client | null> {
        if (this.useMockData || !this.oauth2Client) {
            return null; // Will use mock data
        }

        let credential = await this.prisma.googleCredential.findUnique({
            where: { userId },
        });

        if (!credential) {
            return null;
        }

        // Check if token needs refresh
        if (new Date() >= credential.expiresAt) {
            try {
                await this.refreshAccessToken(userId);
                // Re-fetch after refresh to get new token
                const updated = await this.prisma.googleCredential.findUnique({ where: { userId } });
                if (updated) credential = updated;
            } catch (error) {
                this.logger.warn(`Failed to refresh token for user ${userId}. Token may be revoked.`);
                return null;
            }
        }

        return this.createClientFromCredential(credential);
    }

    private createClientFromCredential(credential: any): OAuth2Client {
        const client = new OAuth2Client(
            this.configService.get<string>('GOOGLE_CLIENT_ID'),
            this.configService.get<string>('GOOGLE_CLIENT_SECRET'),
        );

        client.setCredentials({
            access_token: credential.accessToken,
            refresh_token: credential.refreshToken,
        });

        return client;
    }

    /**
     * Get a shared client (system-wide) using any available credential,
     * prioritizing the agency email.
     */
    async getSharedClient(): Promise<OAuth2Client | null> {
        if (this.useMockData) return null;

        // 1. Try to find the agency account
        let credential = await this.prisma.googleCredential.findFirst({
            where: { accountEmail: { contains: 'forma.digital' } }
        });

        if (credential) {
            this.logger.log(`Found Agency Credential: ${credential.accountEmail}`);
        } else {
            this.logger.warn(`No Agency Credential found matching 'forma.digital'. Trying fallback.`);
        }

        // 2. Fallback to any credential
        if (!credential) {
            credential = await this.prisma.googleCredential.findFirst();
            if (credential) {
                this.logger.log(`Fallback Credential found: ${credential.accountEmail}`);
            } else {
                this.logger.warn(`No credentials found in database at all.`);
            }
        }

        if (!credential) return null;

        // Check expiration
        if (new Date() >= credential.expiresAt) {
            this.logger.log(`Token for ${credential.accountEmail} expired. Refreshing...`);
            try {
                await this.refreshAccessToken(credential.userId);
                const updated = await this.prisma.googleCredential.findUnique({ where: { userId: credential.userId } });
                if (updated) credential = updated;
                this.logger.log(`Token refreshed successfully.`);
            } catch (error) {
                this.logger.error(`Failed to refresh SHARED token: ${error.message}`);
                return null;
            }
        }

        return this.createClientFromCredential(credential);
    }

    /**
     * Refresh access token
     */
    private async refreshAccessToken(userId: string): Promise<void> {
        const credential = await this.prisma.googleCredential.findUnique({
            where: { userId },
        });

        if (!credential || !this.oauth2Client) {
            throw new Error('No credentials found');
        }

        this.oauth2Client.setCredentials({
            refresh_token: credential.refreshToken,
        });

        const { credentials } = await this.oauth2Client.refreshAccessToken();

        await this.prisma.googleCredential.update({
            where: { userId },
            data: {
                accessToken: credentials.access_token!,
                expiresAt: new Date(credentials.expiry_date || Date.now() + 3600000),
            },
        });

        this.logger.log(`Access token refreshed for user: ${userId}`);
    }
}
