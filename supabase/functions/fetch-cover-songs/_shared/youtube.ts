import type { YouTubeVideo, YouTubeSearchResponse } from '../../../../lib/api-types';

/**
 * YouTube Data API v3 クライアント
 */
export class YouTubeClient {
    private apiKey: string;
    private baseUrl = 'https://www.googleapis.com/youtube/v3';

    constructor(apiKey: string) {
        this.apiKey = apiKey;
    }

    /**
     * チャンネルの最新動画を取得（過去24時間）
     */
    async getRecentVideos(channelId: string, maxResults: number = 50): Promise<YouTubeVideo[]> {
        const publishedAfter = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

        const url = new URL(`${this.baseUrl}/search`);
        url.searchParams.set('part', 'snippet');
        url.searchParams.set('channelId', channelId);
        url.searchParams.set('order', 'date');
        url.searchParams.set('type', 'video');
        url.searchParams.set('publishedAfter', publishedAfter);
        url.searchParams.set('maxResults', maxResults.toString());
        url.searchParams.set('key', this.apiKey);

        try {
            const response = await fetch(url.toString());

            if (!response.ok) {
                const error = await response.json();
                throw new Error(`YouTube API Error: ${error.error?.message || response.statusText}`);
            }

            const data: YouTubeSearchResponse = await response.json();

            return data.items.map(item => ({
                id: item.id.videoId,
                title: item.snippet.title,
                description: item.snippet.description,
                thumbnailUrl:
                    item.snippet.thumbnails.maxresdefault?.url ||
                    item.snippet.thumbnails.high?.url ||
                    item.snippet.thumbnails.medium?.url ||
                    '',
                publishedAt: item.snippet.publishedAt,
                channelId: item.snippet.channelId,
                channelTitle: item.snippet.channelTitle,
            }));
        } catch (error) {
            console.error(`Failed to fetch videos for channel ${channelId}:`, error);
            throw error;
        }
    }

    /**
     * 複数チャンネルの最新動画を取得
     */
    async getRecentVideosFromChannels(channelIds: string[]): Promise<YouTubeVideo[]> {
        const allVideos: YouTubeVideo[] = [];

        for (const channelId of channelIds) {
            try {
                const videos = await this.getRecentVideos(channelId);
                allVideos.push(...videos);
            } catch (error) {
                console.error(`Skipping channel ${channelId} due to error:`, error);
                // エラーが発生しても次のチャンネルに進む
                continue;
            }
        }

        return allVideos;
    }
}
