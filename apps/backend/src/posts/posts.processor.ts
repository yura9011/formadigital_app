import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';
import { FacebookProvider } from '../integrations/facebook.provider';
import { InstagramProvider } from '../integrations/instagram.provider';

@Processor('posts')
export class PostsProcessor extends WorkerHost {
    constructor(private readonly prisma: PrismaService) {
        super();
    }

    async process(job: Job): Promise<any> {
        const { postId } = job.data;
        console.log(`[PostsProcessor] Processing job for post: ${postId}`);

        const post = await this.prisma.post.findUnique({
            where: { id: postId },
            include: { integration: true },
        });

        if (!post) {
            console.error(`[PostsProcessor] Post not found: ${postId}`);
            return;
        }

        try {
            // Simple Factory (Expand later)
            let provider;
            if (post.integration.provider === 'instagram') {
                provider = new InstagramProvider();
            } else if (post.integration.provider === 'facebook') {
                provider = new FacebookProvider();
            } else {
                throw new Error(`Unknown provider: ${post.integration.provider}`);
            }

            if (!post.integration.accountId) {
                throw new Error(`Integration ${post.integration.name} is missing Account ID`);
            }

            // Use real media or fallback to default
            const media = (post.media as any[])?.length > 0
                ? post.media
                : [{ path: 'https://images.unsplash.com/photo-1516259762381-22954d7d3ad2' }];

            const postDetails = [{
                id: post.id,
                message: post.content,
                settings: {},
                media: media as any
            }];

            const responses = await provider.post(
                post.integration.accountId!,
                post.integration.token,
                postDetails,
                post.integration
            );

            console.log(`Posted successfully: ${JSON.stringify(responses)}`);

            await this.prisma.post.update({
                where: { id: post.id },
                data: { state: 'PUBLISHED' },
            });
        } catch (error) {
            console.error('Failed to post', error);
            await this.prisma.post.update({
                where: { id: post.id },
                data: { state: 'ERROR' }, // TODO: Save error message
            });
        }
    }
}
