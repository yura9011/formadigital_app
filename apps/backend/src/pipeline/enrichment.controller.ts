import {
  Controller,
  Post,
  Body,
  Param,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { EnrichmentService } from './enrichment.service';

class EnrichInstagramDto {
  handle?: string;
}

class BatchEnrichDto {
  clientIds: string[];
}

@Controller('api/enrich')
export class EnrichmentController {
  constructor(private readonly enrichmentService: EnrichmentService) {}

  @Post('instagram/:clientId')
  @HttpCode(HttpStatus.OK)
  async enrichInstagram(
    @Param('clientId') clientId: string,
    @Body() dto: EnrichInstagramDto,
  ) {
    return this.enrichmentService.enrichInstagram(clientId, dto.handle);
  }

  @Post('instagram/batch')
  @HttpCode(HttpStatus.OK)
  async batchEnrichInstagram(@Body() dto: BatchEnrichDto) {
    return this.enrichmentService.batchEnrichInstagram(dto.clientIds);
  }
}
