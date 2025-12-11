
import { Controller, Get, Query, Res, Post, Body, BadRequestException } from '@nestjs/common';
import { GoogleService } from './google.service';
import type { Response } from 'express';

// Simple in-memory storage for MVP. In production, use DB.
let TEMP_TOKENS: any = null;

@Controller('google')
export class GoogleController {
    constructor(private readonly googleService: GoogleService) { }

    @Get('auth')
    googleAuth(@Res() res: Response) {
        const url = this.googleService.getAuthUrl();
        return res.redirect(url);
    }

    @Get('callback')
    async googleAuthRedirect(@Query('code') code: string, @Res() res: Response) {
        if (!code) {
            return res.redirect('http://localhost:3001/calendar?error=no_code');
        }
        try {
            const tokens = await this.googleService.handleCallback(code);
            TEMP_TOKENS = tokens; // Store globally for MVP
            // Redirect back to frontend
            return res.redirect('http://localhost:3001/calendar?success=true');
        } catch (error) {
            console.error('Error in callback', error);
            return res.redirect('http://localhost:3001/calendar?error=auth_failed');
        }
    }

    @Get('events')
    async getEvents() {
        if (!TEMP_TOKENS) {
            // Return empty if not auth, or 401. For MVP return empty array to not break UI
            return [];
        }
        try {
            return await this.googleService.listEvents(TEMP_TOKENS);
        } catch (e) {
            console.error('Failed to fetch google events', e);
            return [];
        }
    }

    @Post('events')
    async createEvent(@Body() body: any) {
        if (!TEMP_TOKENS) {
            throw new BadRequestException('Not authenticated');
        }
        return this.googleService.createEvent(TEMP_TOKENS, body);
    }
}
