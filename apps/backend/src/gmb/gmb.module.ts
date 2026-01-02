import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { GmbController } from './gmb.controller';
import { GmbService } from './gmb.service';
import { PrismaModule } from '../prisma/prisma.module';
import { SerpApiService } from './serp-api.service';
import { GeminiService } from './gemini.service';

@Module({
    imports: [PrismaModule, ConfigModule],
    controllers: [GmbController],
    providers: [GmbService, SerpApiService, GeminiService],
    exports: [GeminiService],
})
export class GmbModule { }
