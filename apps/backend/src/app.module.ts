import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { PostsModule } from './posts/posts.module';
import { BullModule } from '@nestjs/bullmq';
import { ConfigModule } from '@nestjs/config';
import { IntegrationsModule } from './integrations/integrations.module';
import { AuthModule } from './auth/auth.module';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { MediaModule } from './media/media.module';
import { LoggerModule } from './common/logger/logger.module';
import { GmbModule } from './gmb/gmb.module';
import { GoogleAuthModule } from './google-auth/google-auth.module';
import { GbpReviewsModule } from './gbp/gbp-reviews.module';
import { GscModule } from './gsc/gsc.module';
import { AgencyModule } from './agency/agency.module';
import { CalendarModule } from './calendar/calendar.module';
import { ProspectModule } from './prospect/prospect.module';
import { PipelineModule } from './pipeline/pipeline.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    ServeStaticModule.forRoot({
      rootPath: join(process.cwd(), 'uploads'),
      serveRoot: '/uploads',
    }),
    BullModule.forRoot({
      connection: {
        host: process.env.REDIS_HOST || 'localhost',
        port: Number(process.env.REDIS_PORT) || 6379,
      },
    }),
    PrismaModule,
    PostsModule,
    IntegrationsModule,
    AuthModule,
    MediaModule,
    LoggerModule,
    GmbModule,
    GoogleAuthModule,
    GbpReviewsModule,
    GscModule,
    AgencyModule,
    CalendarModule,
    ProspectModule,
    PipelineModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }
