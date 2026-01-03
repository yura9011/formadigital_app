import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { ScoringConfigService } from './scoring-config.service';
import { ScoringService } from './scoring.service';
import { TransitionService } from './transition.service';
import { PipelineService } from './pipeline.service';
import { ConversionService } from './conversion.service';
import { EnrichmentService } from './enrichment.service';
import { PipelineController } from './pipeline.controller';
import { ScoringController } from './scoring.controller';
import { EnrichmentController } from './enrichment.controller';

@Module({
  imports: [PrismaModule],
  controllers: [PipelineController, ScoringController, EnrichmentController],
  providers: [
    ScoringConfigService,
    ScoringService,
    TransitionService,
    PipelineService,
    ConversionService,
    EnrichmentService,
  ],
  exports: [
    ScoringConfigService,
    ScoringService,
    TransitionService,
    PipelineService,
    ConversionService,
    EnrichmentService,
  ],
})
export class PipelineModule {}
