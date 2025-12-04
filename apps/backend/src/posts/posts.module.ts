import { Module } from '@nestjs/common';
import { PostsService } from './posts.service';
import { PostsController } from './posts.controller';
import { PostsProcessor } from './posts.processor';
import { BullModule } from '@nestjs/bullmq';

@Module({
    imports: [
        BullModule.registerQueue({
            name: 'posts',
        }),
    ],
    controllers: [PostsController],
    providers: [PostsService, PostsProcessor],
})
export class PostsModule { }
