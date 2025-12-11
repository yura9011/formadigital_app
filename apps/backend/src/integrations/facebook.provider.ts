import { SocialAbstract, SocialProvider, AuthTokenDetails, PostDetails, PostResponse } from './social.interface';

export class FacebookProvider extends SocialAbstract implements SocialProvider {
    identifier = 'facebook';
    name = 'Facebook Page';

    async refreshToken(refreshToken: string): Promise<AuthTokenDetails> {
        // Mock implementation
        return {
            id: 'mock-fb-id',
            name: 'Mock FB User',
            accessToken: 'mock-fb-access-token',
            refreshToken: 'mock-fb-refresh-token',
            expiresIn: 3600,
            picture: '',
            username: 'mock_fb_user',
        };
    }

    async authenticate(params: { code: string; codeVerifier: string; refresh: string }): Promise<AuthTokenDetails> {
        // Mock implementation
        return {
            id: 'mock-fb-id',
            name: 'Mock FB User',
            accessToken: 'mock-fb-access-token',
            refreshToken: 'mock-fb-refresh-token',
            expiresIn: 3600,
            picture: '',
            username: 'mock_fb_user',
        };
    }

    async post(
        id: string,
        accessToken: string,
        postDetails: PostDetails[],
        integration: any
    ): Promise<PostResponse[]> {
        console.log(`[FacebookProvider] Posting to page ${id}...`);

        // MOCK MODE CHECK
        if (accessToken.startsWith('mock-')) {
            console.log('[FacebookProvider] MOCK MODE: Skipping real API call.');
            await new Promise((resolve) => setTimeout(resolve, 2000));
            return postDetails.map((post) => ({
                id: post.id,
                postId: `mock-fb-post-${Date.now()}`,
                releaseURL: 'https://facebook.com/mock-post',
                status: 'success',
            }));
        }

        const [firstPost] = postDetails;
        const type = 'graph.facebook.com';
        const mediaUrl = firstPost.media?.[0]?.path;

        if (!mediaUrl) {
            // Text only post
            const url = `https://${type}/v20.0/${id}/feed?message=${encodeURIComponent(firstPost.message)}&access_token=${accessToken}`;
            const response = await this.fetch(url, { method: 'POST' });
            const data = await response.json();

            if (!response.ok || data.error) {
                console.error('[FacebookProvider] Text Post Failed:', JSON.stringify(data));
                throw new Error(`Facebook API Error: ${data.error?.message || 'Unknown error'}`);
            }

            return [{
                id: firstPost.id,
                postId: data.id,
                releaseURL: `https://facebook.com/${data.id}`,
                status: 'success',
            }];
        } else {
            // Photo post
            const url = `https://${type}/v20.0/${id}/photos?url=${encodeURIComponent(mediaUrl)}&message=${encodeURIComponent(firstPost.message)}&access_token=${accessToken}`;
            const response = await this.fetch(url, { method: 'POST' });
            const data = await response.json();

            if (!response.ok || data.error) {
                console.error('[FacebookProvider] Photo Post Failed:', JSON.stringify(data));
                throw new Error(`Facebook API Error: ${data.error?.message || 'Unknown error'}`);
            }

            return [{
                id: firstPost.id,
                postId: data.post_id || data.id,
                releaseURL: `https://facebook.com/${data.post_id || data.id}`,
                status: 'success',
            }];
        }
    }

    async getAccountInfo(accountId: string, accessToken: string) {
        try {
            const type = 'graph.facebook.com';
            const url = `https://${type}/v20.0/${accountId}?fields=name,picture,followers_count,username&access_token=${accessToken}`;
            const response = await this.fetch(url);

            if (!response.ok) {
                console.error(`[FacebookProvider] Failed to fetch account info: ${response.status}`);
                throw new Error('Failed to fetch account info');
            }

            const data = await response.json();
            return {
                name: data.name,
                username: data.username || data.name, // Pages might not have username field exposed easily
                profile_picture_url: data.picture?.data?.url,
                followers_count: data.followers_count
            };
        } catch (error) {
            console.warn('[FacebookProvider] Falling back to MOCK data for Account Info', error);
            return {
                name: 'Forma Digital Page (Mock)',
                username: 'forma_digital_page',
                profile_picture_url: 'https://ui-avatars.com/api/?name=Forma+Digital+FB&background=1877F2&color=fff',
                followers_count: 5420
            };
        }
    }

    async getMedia(accountId: string, accessToken: string) {
        try {
            const type = 'graph.facebook.com';
            // Fetch feed posts with fields relevant for display
            const url = `https://${type}/v20.0/${accountId}/feed?fields=id,message,full_picture,permalink_url,created_time&access_token=${accessToken}`;
            const response = await this.fetch(url);

            if (!response.ok) {
                const errorBody = await response.text();
                console.error(`[FacebookProvider] Failed to fetch media: ${response.status}`, errorBody);
                throw new Error('Failed to fetch media');
            }

            const data = await response.json();
            console.log('[FacebookProvider] Media Data Sample:', JSON.stringify(data.data.slice(0, 2), null, 2));

            // Normalize to match Instagram structure somewhat or just return raw and let frontend handle?
            // Frontend expects: caption, media_url, thumbnail_url, permalink, timestamp
            return data.data.map((item: any) => ({
                id: item.id,
                caption: item.message,
                media_type: item.full_picture ? 'IMAGE' : 'TEXT',
                media_url: item.full_picture,
                thumbnail_url: item.full_picture,
                permalink: item.permalink_url,
                timestamp: item.created_time
            }));
        } catch (error) {
            console.warn('[FacebookProvider] Falling back to MOCK data for Media', error);
            return [
                {
                    id: 'mock-fb-1',
                    caption: 'Mock FB Post 1 #FormaDigital',
                    media_type: 'IMAGE',
                    media_url: 'https://via.placeholder.com/300/1877F2/FFFFFF?text=FB+Post+1',
                    permalink: 'https://facebook.com',
                    timestamp: new Date(Date.now() - 86400000).toISOString()
                },
                {
                    id: 'mock-fb-2',
                    caption: 'Mock FB Post 2 #Updates',
                    media_type: 'TEXT',
                    media_url: null,
                    permalink: 'https://facebook.com',
                    timestamp: new Date(Date.now() - 172800000).toISOString()
                }
            ];
        }
    }
    async getInsights(accountId: string, accessToken: string, since?: string, until?: string) {
        try {
            const type = 'graph.facebook.com';
            // Facebook Page Insights Metrics
            // page_impressions: Total impressions
            // page_post_engagements: Total engagement
            // page_fans: Total Likes
            let url = `https://${type}/v20.0/${accountId}/insights?metric=page_impressions,page_post_engagements,page_fans&period=day&access_token=${accessToken}`;

            if (since && until) {
                const sinceUnix = Math.floor(new Date(since).getTime() / 1000);
                const untilUnix = Math.floor(new Date(until).getTime() / 1000);
                url += `&since=${sinceUnix}&until=${untilUnix}`;
            }

            const response = await this.fetch(url);

            if (!response.ok) {
                const errorBody = await response.text();
                // If permission is missing, it will error here. We catch and mock.
                console.error(`[FacebookProvider] Failed to fetch insights: ${response.status}`, errorBody);
                throw new Error('Failed to fetch insights');
            }

            const data = await response.json();
            console.log('[FacebookProvider] Insights Data Success:', JSON.stringify(data, null, 2));

            // Normalize data structure for frontend (same as IG)
            const normalizedData = data.data.map((item: any) => {
                if (item.values) {
                    return item;
                }
                return item;
            });

            return { data: normalizedData };
        } catch (error) {
            console.warn('[FacebookProvider] Falling back to MOCK data for Insights', error);
            return {
                data: [
                    {
                        name: 'page_impressions',
                        period: 'day',
                        values: [{ value: 10520, end_time: new Date().toISOString() }],
                        title: 'Page Impressions',
                        description: 'Total number of times any content from your Page or about your Page entered a person\'s screen.'
                    },
                    {
                        name: 'page_post_engagements',
                        period: 'day',
                        values: [{ value: 850, end_time: new Date().toISOString() }],
                        title: 'Post Engagement',
                        description: 'The number of times people have engaged with your posts through likes, comments and shares and more.'
                    },
                    {
                        name: 'page_fans',
                        period: 'day',
                        values: [{ value: 5420, end_time: new Date().toISOString() }],
                        title: 'Page Likes (Fans)',
                        description: 'The number of people who like your Page.'
                    }
                ]
            };
        }
    }
}
