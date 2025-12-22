import { Module } from '@nestjs/common';
import { GscService } from './gsc.service';
import { GscController } from './gsc.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { GoogleAuthModule } from '../google-auth/google-auth.module';
import { MockDataService } from '../common/mock-data.service';

@Module({
    imports: [PrismaModule, GoogleAuthModule],
    controllers: [GscController],
    providers: [GscService, MockDataService],
    exports: [GscService],
})
export class GscModule { }
