
import { Injectable, Logger } from '@nestjs/common';
import { google } from 'googleapis';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class GoogleService {
    private readonly logger = new Logger(GoogleService.name);
    private oauth2Client;

    constructor(private configService: ConfigService) {
        const clientId = this.configService.get<string>('GOOGLE_CLIENT_ID');
        const clientSecret = this.configService.get<string>('GOOGLE_CLIENT_SECRET');
        const callbackUrl = this.configService.get<string>('GOOGLE_CALLBACK_URL') || 'http://localhost:3000/google/callback';

        if (!clientId || !clientSecret) {
            this.logger.warn('GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET not configured');
        }

        this.oauth2Client = new google.auth.OAuth2(
            clientId,
            clientSecret,
            callbackUrl
        );
    }

    getAuthUrl() {
        const scopes = [
            'https://www.googleapis.com/auth/calendar',
            'https://www.googleapis.com/auth/calendar.events'
        ];

        return this.oauth2Client.generateAuthUrl({
            access_type: 'offline',
            scope: scopes,
            prompt: 'consent' // Force refresh token
        });
    }

    async handleCallback(code: string) {
        const { tokens } = await this.oauth2Client.getToken(code);
        this.oauth2Client.setCredentials(tokens);
        return tokens;
    }

    async listEvents(tokens: any) {
        this.oauth2Client.setCredentials(tokens);
        const calendar = google.calendar({ version: 'v3', auth: this.oauth2Client });

        const response = await calendar.events.list({
            calendarId: 'primary',
            timeMin: (new Date()).toISOString(),
            maxResults: 20,
            singleEvents: true,
            orderBy: 'startTime',
        });

        return response.data.items;
    }

    async createEvent(tokens: any, eventData: any) {
        this.oauth2Client.setCredentials(tokens);
        const calendar = google.calendar({ version: 'v3', auth: this.oauth2Client });

        const event = {
            summary: eventData.title,
            description: eventData.description,
            start: {
                dateTime: eventData.startTime, // ISO String
                timeZone: eventData.timeZone || 'UTC',
            },
            end: {
                dateTime: eventData.endTime, // ISO String
                timeZone: eventData.timeZone || 'UTC',
            },
        };

        const response = await calendar.events.insert({
            calendarId: 'primary',
            requestBody: event,
        });

        return response.data;
    }
}
