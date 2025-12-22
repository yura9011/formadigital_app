import { Module } from '@nestjs/common';
import { GbpReviewsService } from './gbp-reviews.service';
import { GbpReviewsController } from './gbp-reviews.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { GoogleAuthModule } from '../google-auth/google-auth.module';
import { MockDataService } from '../common/mock-data.service';

@Module({
    imports: [PrismaModule, GoogleAuthModule],
    controllers: [GbpReviewsController],
    providers: [GbpReviewsService, MockDataService],
    exports: [GbpReviewsService],
})
export class GbpReviewsModule { }
