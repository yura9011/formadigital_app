import { Controller, Get, Post, Delete, Body, Param, Query, Logger } from '@nestjs/common';
import { AgencyService } from './agency.service';

@Controller('agency')
export class AgencyController {
    private readonly logger = new Logger(AgencyController.name);

    constructor(private readonly agencyService: AgencyService) { }

    /**
     * Get agency overview with all clients
     */
    @Get('overview')
    async getOverview() {
        return this.agencyService.getAgencyOverview();
    }

    /**
     * Get all clients
     */
    @Get('clients')
    async getClients() {
        return this.agencyService.getAgencyClients();
    }

    /**
     * Create a new client
     */
    @Post('clients')
    async createClient(@Body() body: { name: string; email: string }) {
        return this.agencyService.createClient(body);
    }

    /**
     * Get client invite link for OAuth connection
     */
    @Get('clients/:clientId/invite')
    async getInviteLink(
        @Param('clientId') clientId: string,
        @Query('baseUrl') baseUrl: string,
    ) {
        const link = await this.agencyService.getClientInviteLink(
            clientId,
            baseUrl || 'http://localhost:3000',
        );
        return { inviteLink: link };
    }

    /**
     * Delete a client
     */
    @Delete('clients/:clientId')
    async deleteClient(@Param('clientId') clientId: string) {
        await this.agencyService.deleteClient(clientId);
        return { success: true };
    }

    /**
     * Get review alerts across all clients
     */
    @Get('alerts')
    async getAlerts() {
        return this.agencyService.getReviewAlerts();
    }
}
