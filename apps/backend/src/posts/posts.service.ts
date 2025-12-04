import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import dayjs from 'dayjs';

@Injectable()
export class PostsService {
    constructor(
        private prisma: PrismaService,
        @InjectQueue('posts') private postsQueue: Queue,
    ) { }

    async createPost(data: { content: string; publishDate: string; integrationIds: string[]; media?: any[] }) {
        console.log('[PostsService] Creating post with data:', JSON.stringify(data, null, 2));
        const createdPosts = [];

        for (const integrationId of data.integrationIds) {
            const post = await this.prisma.post.create({
                data: {
                    content: data.content,
                    publishDate: new Date(data.publishDate),
                    integrationId: integrationId,
                    state: 'QUEUE',
                    media: data.media || [],
                },
            });

            const delay = dayjs(post.publishDate).diff(dayjs(), 'millisecond');

            await this.postsQueue.add(
                'publish-post',
                { postId: post.id },
                { delay: delay > 0 ? delay : 0 }
            );
            createdPosts.push(post);
        }

        return createdPosts;
    }

    async findAll() {
        return this.prisma.post.findMany({
            include: { integration: true }, // Media is stored as JSON, so it's already included in the root object if defined in schema, but let's check schema.
            orderBy: { publishDate: 'asc' },
        });
    }
}
