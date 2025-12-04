import { Injectable, Inject } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { InstagramProvider } from './instagram.provider';
import { FacebookProvider } from './facebook.provider';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';

@Injectable()
export class IntegrationsService {
    constructor(
        private prisma: PrismaService,
        @Inject(CACHE_MANAGER) private cacheManager: Cache
    ) { }

    async findAll() {
        return this.prisma.integration.findMany();
    }

    async getAnalytics(id: string, since?: string, until?: string) {
        const integration = await this.prisma.integration.findUnique({ where: { id } });
        if (!integration) throw new Error('Integration not found');

        // Factory (Expand later)
        let provider;
        if (integration.provider === 'instagram') {
            provider = new InstagramProvider(this.cacheManager);
        } else if (integration.provider === 'facebook') {
            provider = new FacebookProvider();
        } else {
            throw new Error('Provider not supported for analytics');
        }

        if (!integration.accountId) throw new Error('Account ID missing');

        const accountInfo = await provider.getAccountInfo(integration.accountId, integration.token);
        // Facebook might not have insights implemented yet or same structure, but let's try
        const insights = (provider as any).getInsights ? await (provider as any).getInsights(integration.accountId, integration.token, since, until) : { data: [] };

        return {
            account: accountInfo,
            insights: insights.data || [],
            tokenExpiration: integration.tokenExpiration
        };
    }
    async getMedia(id: string) {
        const integration = await this.prisma.integration.findUnique({ where: { id } });
        if (!integration) throw new Error('Integration not found');

        let provider;
        if (integration.provider === 'instagram') {
            provider = new InstagramProvider(this.cacheManager);
        } else if (integration.provider === 'facebook') {
            provider = new FacebookProvider();
        } else {
            throw new Error('Provider not supported for media');
        }

        if (!integration.accountId) throw new Error('Account ID missing');

        // Facebook provider might not have getMedia implemented exactly same way or at all yet, but let's assume it does or fallback
        if ((provider as any).getMedia) {
            return (provider as any).getMedia(integration.accountId, integration.token);
        }
        return [];
    }

    async create(data: { name: string; provider: string; token: string; accountId: string }) {
        return this.prisma.integration.create({
            data: {
                name: data.name,
                provider: data.provider,
                token: data.token,
                accountId: data.accountId,
                pictureUrl: `https://ui-avatars.com/api/?name=${encodeURIComponent(data.name)}&background=random`
            }
        });
    }

    async remove(id: string) {
        return this.prisma.integration.delete({
            where: { id }
        });
    }
}
