import { Controller, Get, Post, Patch, Delete, Body, Query, Param, InternalServerErrorException } from '@nestjs/common';
import { CalendarService } from './calendar.service';

@Controller('calendar')
export class CalendarController {
    constructor(private readonly calendarService: CalendarService) { }

    @Get('events')
    async getEvents(
        @Query('userId') userId: string,
        @Query('start') start?: string,
        @Query('end') end?: string
    ) {
        if (!userId) throw new Error('UserId is required');
        return this.calendarService.getEvents(userId, start, end);
    }

    @Post('events')
    async createEvent(@Body() body: { userId: string, title: string, description?: string, start: string, end: string }) {
        return this.calendarService.createEvent(body.userId, body);
    }

    @Patch('events/:eventId')
    async updateEvent(
        @Param('eventId') eventId: string,
        @Body() body: { userId: string, title?: string, description?: string, start?: string, end?: string }
    ) {
        return this.calendarService.updateEvent(body.userId, eventId, body);
    }

    @Delete('events/:eventId')
    async deleteEvent(
        @Param('eventId') eventId: string,
        @Query('userId') userId: string
    ) {
        return this.calendarService.deleteEvent(userId, eventId);
    }
}
