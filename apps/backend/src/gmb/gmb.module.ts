import { Module } from '@nestjs/common';
import { GmbController } from './gmb.controller';
import { GmbService } from './gmb.service';
import { PrismaModule } from '../prisma/prisma.module';
import { SerpApiService } from './serp-api.service';

@Module({
    imports: [PrismaModule],
    controllers: [GmbController],
    providers: [GmbService, SerpApiService],
})
export class GmbModule { }
