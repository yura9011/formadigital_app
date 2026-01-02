import { Module } from '@nestjs/common';
import { ProspectController } from './prospect.controller';
import { ProspectService } from './prospect.service';
import { EnrichmentService } from './services/enrichment.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [ProspectController],
  providers: [ProspectService, EnrichmentService],
  exports: [ProspectService, EnrichmentService],
})
export class ProspectModule {}
