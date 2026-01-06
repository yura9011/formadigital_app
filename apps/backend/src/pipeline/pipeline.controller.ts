import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { PipelineService, LeadsQueryOptions } from './pipeline.service';
import { TransitionService, TransitionActor } from './transition.service';
import { ConversionService, ConversionInput } from './conversion.service';
import { PipelineStage, ActorType } from '@prisma/client';

class TransitionDto {
  toStage: PipelineStage;
  reason?: string;
  actorType?: ActorType;
  actorId?: string;
}

class ReviveDto {
  reason?: string;
  actorType?: ActorType;
  actorId?: string;
}

class ConvertDto {
  projectName: string;
  projectDetails?: string;
  assignedToId?: string;
  actorType?: ActorType;
  actorId?: string;
}

@Controller('api/pipeline')
export class PipelineController {
  constructor(
    private readonly pipelineService: PipelineService,
    private readonly transitionService: TransitionService,
    private readonly conversionService: ConversionService,
  ) { }

  @Get('summary')
  async getSummary() {
    return this.pipelineService.getPipelineSummary();
  }

  @Get('leads')
  async getLeads(
    @Query('stage') stage?: PipelineStage,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('sortBy') sortBy?: 'score' | 'createdAt' | 'name' | 'daysInStage',
    @Query('sortOrder') sortOrder?: 'asc' | 'desc',
    @Query('search') search?: string,
  ) {
    const options: LeadsQueryOptions = {
      stage,
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 50,
      sortBy: sortBy || 'score',
      sortOrder: sortOrder || 'desc',
      search,
    };
    return this.pipelineService.getLeadsByStage(options);
  }

  @Get('leads/:id')
  async getLeadDetail(@Param('id') id: string) {
    return this.pipelineService.getLeadDetail(id);
  }

  @Get('leads/:id/history')
  async getLeadHistory(@Param('id') id: string) {
    return this.transitionService.getTransitionHistory(id);
  }

  @Post('leads/:id/transition')
  @HttpCode(HttpStatus.OK)
  async transitionLead(@Param('id') id: string, @Body() dto: TransitionDto) {
    const actor: TransitionActor = {
      type: dto.actorType || ActorType.USER,
      id: dto.actorId,
    };
    return this.transitionService.executeTransition(id, dto.toStage, actor, dto.reason);
  }

  @Post('leads/:id/revive')
  @HttpCode(HttpStatus.OK)
  async reviveLead(@Param('id') id: string, @Body() dto: ReviveDto) {
    const actor: TransitionActor = {
      type: dto.actorType || ActorType.USER,
      id: dto.actorId,
    };
    return this.transitionService.reviveLead(id, actor, dto.reason);
  }

  @Post('leads/:id/convert')
  @HttpCode(HttpStatus.OK)
  async convertLead(@Param('id') id: string, @Body() dto: ConvertDto) {
    const actor: TransitionActor = {
      type: dto.actorType || ActorType.USER,
      id: dto.actorId,
    };
    const input: ConversionInput = {
      projectName: dto.projectName,
      projectDetails: dto.projectDetails,
      assignedToId: dto.assignedToId,
    };
    return this.conversionService.convertLead(id, input, actor);
  }

  @Get('metrics')
  async getMetrics() {
    return this.pipelineService.getPipelineMetrics();
  }

  // === Prospecting v2.0 Endpoints ===

  @Get('ready-to-contact')
  async getReadyToContact(@Query('limit') limit?: string) {
    const leadLimit = limit ? parseInt(limit, 10) : 20;
    return this.pipelineService.getReadyToContact(leadLimit);
  }

  @Post('leads/:id/snooze')
  @HttpCode(HttpStatus.OK)
  async snoozeLead(
    @Param('id') id: string,
    @Body() body: { until: string; reason?: string },
  ) {
    const untilDate = new Date(body.until);
    return this.pipelineService.snoozeLead(id, untilDate, body.reason);
  }

  @Post('leads/:id/quick-contact')
  @HttpCode(HttpStatus.OK)
  async quickContact(
    @Param('id') id: string,
    @Body() body: { channel: string; message: string; userId?: string },
  ) {
    return this.pipelineService.quickContact(id, body.channel, body.message, body.userId);
  }

  @Post('leads/:id/validate-channels')
  @HttpCode(HttpStatus.OK)
  async validateChannels(@Param('id') id: string) {
    return this.pipelineService.validateContactChannels(id);
  }

  @Post('validate-all-channels')
  @HttpCode(HttpStatus.OK)
  async validateAllChannels() {
    return this.pipelineService.validateAllContactChannels();
  }

  @Post('leads/:id/register-contact')
  @HttpCode(HttpStatus.OK)
  async registerManualContact(
    @Param('id') id: string,
    @Body() body: { channel: string; contactedAt?: string; notes?: string },
  ) {
    const contactedAt = body.contactedAt ? new Date(body.contactedAt) : new Date();
    return this.pipelineService.registerManualContact(id, body.channel, contactedAt, body.notes);
  }
}
