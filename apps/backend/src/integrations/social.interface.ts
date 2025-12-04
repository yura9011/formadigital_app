export interface PostDetails {
    id: string;
    message: string;
    settings: any;
    media?: { path: string; thumbnailTimestamp?: number }[];
}

export interface PostResponse {
    id: string;
    postId: string;
    releaseURL: string;
    status: string;
}

export interface AuthTokenDetails {
    id: string;
    name: string;
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
    picture: string;
    username: string;
}

export interface SocialProvider {
    identifier: string;
    name: string;
    authenticate(params: { code: string; codeVerifier: string; refresh: string }): Promise<AuthTokenDetails>;
    post(id: string, accessToken: string, postDetails: PostDetails[], integration: any): Promise<PostResponse[]>;
    refreshToken(refreshToken: string): Promise<AuthTokenDetails>;
}

export abstract class SocialAbstract {
    abstract identifier: string;
    abstract name: string;

    async fetch(url: string, options?: any) {
        return fetch(url, options);
    }
}
