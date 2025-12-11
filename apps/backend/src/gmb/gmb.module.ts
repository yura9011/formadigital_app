import { Module } from '@nestjs/common';
import { GmbController } from './gmb.controller';
import { GmbService } from './gmb.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
    imports: [PrismaModule],
    controllers: [GmbController],
    providers: [GmbService],
})
export class GmbModule { }
