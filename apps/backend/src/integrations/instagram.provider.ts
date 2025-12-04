import { SocialAbstract, SocialProvider, AuthTokenDetails, PostDetails, PostResponse } from './social.interface';
import * as dayjs from 'dayjs';
import { Cache } from 'cache-manager';

export class InstagramProvider extends SocialAbstract implements SocialProvider {
    identifier = 'instagram';
    name = 'Instagram Business';

    constructor(private cacheManager?: Cache) {
        super();
    }

    async refreshToken(refreshToken: string): Promise<AuthTokenDetails> {
        // Mock implementation for now
        return {
            id: 'mock-id',
            name: 'Mock User',
            accessToken: 'mock-access-token',
            refreshToken: 'mock-refresh-token',
            expiresIn: 3600,
            picture: '',
            username: 'mock_user',
        };
    }

    async authenticate(params: { code: string; codeVerifier: string; refresh: string }): Promise<AuthTokenDetails> {
        // TODO: Implement real OAuth flow
        return {
            id: 'mock-id',
            name: 'Mock User',
            accessToken: 'mock-access-token',
            refreshToken: 'mock-refresh-token',
            expiresIn: 3600,
            picture: '',
            username: 'mock_user',
        };
    }

    async post(
        id: string,
        accessToken: string,
        postDetails: PostDetails[],
        integration: any
    ): Promise<PostResponse[]> {
        console.log(`[InstagramProvider] Posting to account ${id}...`);

        // MOCK MODE CHECK
        if (accessToken.startsWith('mock-')) {
            console.log('[InstagramProvider] MOCK MODE: Skipping real API call.');
            await new Promise((resolve) => setTimeout(resolve, 2000)); // Simulate network delay
            return postDetails.map((post) => ({
                id: post.id,
                postId: `mock-instagram-post-${Date.now()}`,
                releaseURL: 'https://instagram.com/p/mock-post',
                status: 'success',
            }));
        }

        // REAL IMPLEMENTATION (Ported from Postiz)
        // This will fail if used without real credentials
        const [firstPost] = postDetails;
        const type = 'graph.facebook.com';

        // Simplified single image posting for MVP
        const mediaUrl = firstPost.media?.[0]?.path;
        if (!mediaUrl) throw new Error('No media provided');

        // 1. Create Media Container
        const containerUrl = `https://${type}/v20.0/${id}/media?image_url=${encodeURIComponent(mediaUrl)}&caption=${encodeURIComponent(firstPost.message)}&access_token=${accessToken}`;
        console.log(`[InstagramProvider] Creating container: ${containerUrl}`);

        const containerRes = await this.fetch(containerUrl, { method: 'POST' });
        const containerData = await containerRes.json();

        if (!containerRes.ok || containerData.error) {
            console.error('[InstagramProvider] Container Creation Failed:', JSON.stringify(containerData));
            throw new Error(`Instagram API Error (Container): ${containerData.error?.message || 'Unknown error'}`);
        }

        const containerId = containerData.id;
        console.log(`[InstagramProvider] Container Created: ${containerId}`);

        // WAIT for Instagram to process the image (Crucial step)
        console.log('[InstagramProvider] Waiting 5s for media processing...');
        await new Promise(resolve => setTimeout(resolve, 5000));

        // 2. Publish Media
        const publishUrl = `https://${type}/v20.0/${id}/media_publish?creation_id=${containerId}&access_token=${accessToken}`;
        const publishRes = await this.fetch(publishUrl, { method: 'POST' });
        const publishData = await publishRes.json();

        if (!publishRes.ok || publishData.error) {
            console.error('[InstagramProvider] Publish Failed:', JSON.stringify(publishData));
            throw new Error(`Instagram API Error (Publish): ${publishData.error?.message || 'Unknown error'}`);
        }

        const mediaId = publishData.id;
        console.log(`[InstagramProvider] Published Media ID: ${mediaId}`);

        // 3. Get Permalink (Optional, just for return)
        const permalinkRes = await this.fetch(`https://${type}/v20.0/${mediaId}?fields=permalink&access_token=${accessToken}`);
        const permalinkData = await permalinkRes.json();
        const permalink = permalinkData.permalink || '';

        return [{
            id: firstPost.id,
            postId: mediaId,
            releaseURL: permalink,
            status: 'success',
        }];
    }

    async getAccountInfo(accountId: string, accessToken: string) {
        const cacheKey = `ig_account_${accountId}`;
        if (this.cacheManager) {
            const cached = await this.cacheManager.get(cacheKey);
            if (cached) {
                console.log('[InstagramProvider] Returning CACHED Account Info');
                return cached;
            }
        }

        try {
            const type = 'graph.facebook.com';
            const url = `https://${type}/v20.0/${accountId}?fields=name,profile_picture_url,followers_count,username&access_token=${accessToken}`;
            const response = await this.fetch(url);

            if (!response.ok) {
                console.error(`[InstagramProvider] Failed to fetch account info: ${response.status}`);
                throw new Error('Failed to fetch account info');
            }

            const data = await response.json();

            if (this.cacheManager) {
                await this.cacheManager.set(cacheKey, data, 3600000); // 1 hour
            }

            return data;
        } catch (error) {
            console.warn('[InstagramProvider] Falling back to MOCK data for Account Info', error);
            return {
                name: 'Forma Digital (Mock)',
                username: 'forma_digital_mock',
                profile_picture_url: 'https://ui-avatars.com/api/?name=Forma+Digital&background=833AB4&color=fff',
                followers_count: 12543
            };
        }
    }

    async getInsights(accountId: string, accessToken: string, since?: string, until?: string) {
        const cacheKey = `ig_insights_${accountId}_${since || 'default'}_${until || 'default'}`;
        if (this.cacheManager) {
            const cached = await this.cacheManager.get(cacheKey);
            if (cached) {
                console.log('[InstagramProvider] Returning CACHED Insights');
                return cached;
            }
        }

        try {
            const type = 'graph.facebook.com';
            // Fetch Reach, Profile Views, Impressions, and Website Clicks
            // Removed metric_type=total_value to get time series data
            let url = `https://${type}/v20.0/${accountId}/insights?metric=reach,profile_views,impressions,website_clicks&period=day&access_token=${accessToken}`;

            if (since && until) {
                const sinceUnix = Math.floor(new Date(since).getTime() / 1000);
                const untilUnix = Math.floor(new Date(until).getTime() / 1000);
                url += `&since=${sinceUnix}&until=${untilUnix}`;
            }

            const response = await this.fetch(url);

            if (!response.ok) {
                const errorBody = await response.text();
                console.error(`[InstagramProvider] Failed to fetch insights: ${response.status}`, errorBody);
                throw new Error('Failed to fetch insights');
            }

            const data = await response.json();
            console.log('[InstagramProvider] Insights Data Success:', JSON.stringify(data, null, 2));

            // Normalize data structure for frontend
            // If values array exists, use it. If total_value exists, wrap it.
            const normalizedData = data.data.map((item: any) => {
                if (item.values) {
                    return item; // Already has values array (time series)
                }
                if (item.total_value) {
                    return {
                        ...item,
                        values: [{ value: item.total_value.value, end_time: new Date().toISOString() }]
                    };
                }
                return item;
            });

            const result = { data: normalizedData };

            if (this.cacheManager) {
                await this.cacheManager.set(cacheKey, result, 900000); // 15 minutes
            }

            return result;
        } catch (error) {
            console.warn('[InstagramProvider] Falling back to MOCK data for Insights', error);
            return {
                data: [
                    {
                        name: 'impressions',
                        period: 'day',
                        values: [{ value: 4520, end_time: new Date().toISOString() }],
                        title: 'Impressions',
                        description: 'Total number of times the media objects have been viewed'
                    },
                    {
                        name: 'reach',
                        period: 'day',
                        values: [{ value: 3150, end_time: new Date().toISOString() }],
                        title: 'Reach',
                        description: 'Total number of unique accounts that have seen the media objects'
                    },
                    {
                        name: 'profile_views',
                        period: 'day',
                        values: [{ value: 120, end_time: new Date().toISOString() }],
                        title: 'Profile Views',
                        description: 'Total number of users who have viewed the user\'s profile'
                    },
                    {
                        name: 'website_clicks',
                        period: 'day',
                        values: [{ value: 45, end_time: new Date().toISOString() }],
                        title: 'Website Clicks',
                        description: 'Total number of taps on the website link in the user\'s profile'
                    }
                ]
            };
        }
    }

    async getMedia(accountId: string, accessToken: string) {
        const cacheKey = `ig_media_${accountId}`;
        if (this.cacheManager) {
            const cached = await this.cacheManager.get(cacheKey);
            if (cached) {
                console.log('[InstagramProvider] Returning CACHED Media');
                return cached;
            }
        }

        try {
            const type = 'graph.facebook.com';
            const url = `https://${type}/v20.0/${accountId}/media?fields=id,caption,media_type,media_url,thumbnail_url,permalink,timestamp&access_token=${accessToken}`;
            const response = await this.fetch(url);

            if (!response.ok) {
                const errorBody = await response.text();
                console.error(`[InstagramProvider] Failed to fetch media: ${response.status}`, errorBody);
                throw new Error('Failed to fetch media');
            }

            const data = await response.json();
            console.log('[InstagramProvider] Media Data Sample:', JSON.stringify(data.data.slice(0, 2), null, 2));

            if (this.cacheManager) {
                await this.cacheManager.set(cacheKey, data.data, 900000); // 15 minutes
            }

            return data.data;
        } catch (error) {
            console.warn('[InstagramProvider] Falling back to MOCK data for Media', error);
            // Return some mock posts for testing if API fails
            return [
                {
                    id: 'mock-1',
                    caption: 'Mock Post 1 #FormaDigital',
                    media_type: 'IMAGE',
                    media_url: 'https://via.placeholder.com/300/D02020/FFFFFF?text=Mock+Post+1',
                    permalink: 'https://instagram.com',
                    timestamp: new Date(Date.now() - 86400000).toISOString() // Yesterday
                },
                {
                    id: 'mock-2',
                    caption: 'Mock Post 2 #Bauhaus',
                    media_type: 'IMAGE',
                    media_url: 'https://via.placeholder.com/300/000000/FFFFFF?text=Mock+Post+2',
                    permalink: 'https://instagram.com',
                    timestamp: new Date(Date.now() - 172800000).toISOString() // 2 days ago
                }
            ];
        }
    }
}
