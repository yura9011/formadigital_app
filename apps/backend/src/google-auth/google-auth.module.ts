import { Module } from '@nestjs/common';
import { GoogleAuthService } from './google-auth.service';
import { GoogleAuthController } from './google-auth.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
    imports: [PrismaModule],
    controllers: [GoogleAuthController],
    providers: [GoogleAuthService],
    exports: [GoogleAuthService],
})
export class GoogleAuthModule { }
