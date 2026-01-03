import {
  Controller,
  Get,
  Put,
  Post,
  Body,
  Param,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ScoringConfigService, ScoringRule, ScoringRulesConfig } from './scoring-config.service';
import { ScoringService } from './scoring.service';

class UpdateRulesDto {
  rules: ScoringRule[];
}

class UpdateConfigDto {
  maxScore?: number;
  description?: string;
  rules?: ScoringRule[];
}

@Controller('api/scoring')
export class ScoringController {
  constructor(
    private readonly scoringConfigService: ScoringConfigService,
    private readonly scoringService: ScoringService,
  ) {}

  @Get('rules')
  getRules() {
    return this.scoringConfigService.getConfig();
  }

  @Put('rules')
  updateRules(@Body() dto: UpdateRulesDto) {
    return this.scoringConfigService.updateRules(dto.rules);
  }

  @Put('config')
  updateConfig(@Body() dto: UpdateConfigDto) {
    return this.scoringConfigService.updateConfig(dto);
  }

  @Get('breakdown/:leadId')
  async getBreakdown(@Param('leadId') leadId: string) {
    return this.scoringService.getScoreBreakdown(leadId);
  }

  @Post('recalculate')
  @HttpCode(HttpStatus.OK)
  async recalculateAll() {
    return this.scoringService.recalculateAllScores();
  }

  @Post('calculate/:leadId')
  @HttpCode(HttpStatus.OK)
  async calculateAndSave(@Param('leadId') leadId: string) {
    return this.scoringService.calculateAndSaveScore(leadId);
  }
}
