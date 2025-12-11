import { Module } from '@nestjs/common';
import { IntegrationsService } from './integrations.service';
import { IntegrationsController } from './integrations.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { CacheModule } from '@nestjs/cache-manager';
import { GoogleService } from './google.service';
import { GoogleController } from './google.controller';

@Module({
    imports: [
        PrismaModule,
        CacheModule.register({
            ttl: 900000, // 15 minutes default
            max: 100,
        }),
    ],
    controllers: [IntegrationsController, GoogleController],
    providers: [IntegrationsService, GoogleService],
})
export class IntegrationsModule { }
