import { Controller, Get, Post, Delete, Param, Body, Query } from '@nestjs/common';
import { IntegrationsService } from './integrations.service';

@Controller('integrations')
export class IntegrationsController {
    constructor(private readonly integrationsService: IntegrationsService) { }

    @Get()
    findAll() {
        return this.integrationsService.findAll();
    }

    @Get(':id/analytics')
    getAnalytics(
        @Param('id') id: string,
        @Query('since') since?: string,
        @Query('until') until?: string
    ) {
        return this.integrationsService.getAnalytics(id, since, until);
    }

    @Get(':id/media')
    getMedia(@Param('id') id: string) {
        return this.integrationsService.getMedia(id);
    }

    @Post()
    create(@Body() createIntegrationDto: { name: string; provider: string; token: string; accountId: string }) {
        return this.integrationsService.create(createIntegrationDto);
    }

    @Delete(':id')
    remove(@Param('id') id: string) {
        return this.integrationsService.remove(id);
    }
}
