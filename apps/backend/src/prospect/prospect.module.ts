import { Module } from '@nestjs/common';
import { ProspectController } from './prospect.controller';
import { Harv3stProxyController } from './harv3st-proxy.controller';
import { ProspectService } from './prospect.service';
import { EnrichmentService } from './services/enrichment.service';
import { PrismaModule } from '../prisma/prisma.module';
import { PipelineModule } from '../pipeline/pipeline.module';

@Module({
  imports: [PrismaModule, PipelineModule],
  controllers: [ProspectController, Harv3stProxyController],
  providers: [ProspectService, EnrichmentService],
  exports: [ProspectService, EnrichmentService],
})
export class ProspectModule {}
