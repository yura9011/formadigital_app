import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { GoogleAuthService } from '../google-auth/google-auth.service';
import { google } from 'googleapis';

@Injectable()
export class CalendarService {
    private readonly logger = new Logger(CalendarService.name);

    constructor(private googleAuthService: GoogleAuthService) { }

    async getEvents(userId: string, start?: string, end?: string) {
        this.logger.log(`getEvents called for user: ${userId}`);
        let auth = await this.googleAuthService.getAuthenticatedClient(userId);

        if (auth) {
            this.logger.log(`Using PERSONAL credentials for ${userId}`);
        } else {
            this.logger.log(`No personal credentials for ${userId}, trying shared client`);
            auth = await this.googleAuthService.getSharedClient();
            if (auth) this.logger.log(`Using SHARED credentials for ${userId}`);
        }

        if (!auth) {
            this.logger.warn(`User ${userId} - Authentication Failed (Both Personal and Shared failed)`);
            throw new UnauthorizedException('Calendario no conectado (Error del sistema). Contacta al administrador.');
        }

        const calendar = google.calendar({ version: 'v3', auth });

        try {
            // Default to one month window if not specified
            const timeMin = start || new Date().toISOString();
            const timeMax = end || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

            this.logger.log(`Fetching Google Events from ${timeMin} to ${timeMax}`);

            const res = await calendar.events.list({
                calendarId: 'primary',
                timeMin,
                timeMax,
                singleEvents: true,
                orderBy: 'startTime',
            });

            this.logger.log(`Fetched ${res.data.items?.length || 0} events`);
            return res.data.items;
        } catch (error) {
            this.logger.error(`Error fetching calendar events for user ${userId}: ${error.message}`, error.stack);
            // Check if it's a 401 from Google
            if (error.code === 401 || (error.response && error.response.status === 401)) {
                throw new UnauthorizedException('La sesión de Google ha expirado. Contacta al administrador.');
            }
            throw error;
        }
    }

    async createEvent(userId: string, eventData: any) {
        let auth = await this.googleAuthService.getAuthenticatedClient(userId);
        if (!auth) auth = await this.googleAuthService.getSharedClient();
        if (!auth) throw new UnauthorizedException('Calendario no conectado (Error del sistema). Contacta al administrador.');

        const calendar = google.calendar({ version: 'v3', auth });

        try {
            const res = await calendar.events.insert({
                calendarId: 'primary',
                requestBody: {
                    summary: eventData.title,
                    description: eventData.description,
                    start: { dateTime: eventData.start }, // Must be ISO string
                    end: { dateTime: eventData.end },     // Must be ISO string
                },
            });
            return res.data;
        } catch (error) {
            this.logger.error(`Error creating event for user ${userId}`, error);
            throw error;
        }
    }


    async updateEvent(userId: string, eventId: string, eventData: any) {
        let auth = await this.googleAuthService.getAuthenticatedClient(userId);
        if (!auth) auth = await this.googleAuthService.getSharedClient();
        if (!auth) throw new UnauthorizedException('Calendario no conectado (Error del sistema). Contacta al administrador.');

        const calendar = google.calendar({ version: 'v3', auth });

        try {
            const res = await calendar.events.patch({
                calendarId: 'primary',
                eventId: eventId,
                requestBody: {
                    summary: eventData.title,
                    description: eventData.description,
                    start: eventData.start ? { dateTime: eventData.start } : undefined,
                    end: eventData.end ? { dateTime: eventData.end } : undefined,
                },
            });
            return res.data;
        } catch (error) {
            this.logger.error(`Error updating event ${eventId} for user ${userId}`, error);
            throw error;
        }
    }

    async deleteEvent(userId: string, eventId: string) {
        let auth = await this.googleAuthService.getAuthenticatedClient(userId);
        if (!auth) auth = await this.googleAuthService.getSharedClient();
        if (!auth) throw new UnauthorizedException('Calendario no conectado (Error del sistema). Contacta al administrador.');

        const calendar = google.calendar({ version: 'v3', auth });

        try {
            await calendar.events.delete({
                calendarId: 'primary',
                eventId: eventId,
            });
            return { success: true };
        } catch (error) {
            this.logger.error(`Error deleting event ${eventId} for user ${userId}`, error);
            throw error;
        }
    }
}
