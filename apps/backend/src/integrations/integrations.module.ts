import { Module } from '@nestjs/common';
import { IntegrationsService } from './integrations.service';
import { IntegrationsController } from './integrations.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { CacheModule } from '@nestjs/cache-manager';

@Module({
    imports: [
        PrismaModule,
        CacheModule.register({
            ttl: 900000, // 15 minutes default
            max: 100,
        }),
    ],
    controllers: [IntegrationsController],
    providers: [IntegrationsService],
})
export class IntegrationsModule { }
