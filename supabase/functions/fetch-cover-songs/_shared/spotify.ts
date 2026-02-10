import type { SpotifyTrack, SpotifySearchResponse, SpotifyAuthResponse } from '../../../../lib/api-types.ts';
import { normalizeString } from './parser.ts';

/**
 * Spotify Web API クライアント
 */
export class SpotifyClient {
    private clientId: string;
    private clientSecret: string;
    private accessToken: string | null = null;
    private tokenExpiresAt: number = 0;
    private baseUrl = 'https://api.spotify.com/v1';
    private authUrl = 'https://accounts.spotify.com/api/token';

    constructor(clientId: string, clientSecret: string) {
        this.clientId = clientId;
        this.clientSecret = clientSecret;
    }

    /**
     * アクセストークンを取得（Client Credentials Flow）
     */
    private async getAccessToken(): Promise<string> {
        // トークンがまだ有効な場合はキャッシュを返す
        if (this.accessToken && Date.now() < this.tokenExpiresAt) {
            return this.accessToken;
        }

        const credentials = btoa(`${this.clientId}:${this.clientSecret}`);

        try {
            const response = await fetch(this.authUrl, {
                method: 'POST',
                headers: {
                    'Authorization': `Basic ${credentials}`,
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: 'grant_type=client_credentials',
            });

            if (!response.ok) {
                throw new Error(`Spotify Auth Error: ${response.statusText}`);
            }

            const data: SpotifyAuthResponse = await response.json();
            this.accessToken = data.access_token;
            this.tokenExpiresAt = Date.now() + (data.expires_in - 60) * 1000; // 60秒余裕を持たせる

            return this.accessToken;
        } catch (error) {
            console.error('Failed to get Spotify access token:', error);
            throw error;
        }
    }

    /**
     * 楽曲を検索してマッチング
     */
    async searchTrack(songTitle: string, artistName: string): Promise<SpotifyTrack | null> {
        try {
            const token = await this.getAccessToken();

            // 検索クエリを正規化
            const normalizedSong = normalizeString(songTitle);
            const normalizedArtist = normalizeString(artistName);
            const query = `track:${normalizedSong} artist:${normalizedArtist}`;

            const url = new URL(`${this.baseUrl}/search`);
            url.searchParams.set('q', query);
            url.searchParams.set('type', 'track');
            url.searchParams.set('limit', '1');

            const response = await fetch(url.toString(), {
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
            });

            if (!response.ok) {
                throw new Error(`Spotify Search Error: ${response.statusText}`);
            }

            const data: SpotifySearchResponse = await response.json();

            if (data.tracks.items.length === 0) {
                console.log(`No Spotify match found for: ${songTitle} / ${artistName}`);
                return null;
            }

            return data.tracks.items[0];
        } catch (error) {
            console.error(`Failed to search Spotify for ${songTitle} / ${artistName}:`, error);
            return null;
        }
    }

    /**
     * 複数楽曲のバッチ検索
     */
    async searchTracks(
        songs: Array<{ songTitle: string; artistName: string }>
    ): Promise<Array<SpotifyTrack | null>> {
        const results: Array<SpotifyTrack | null> = [];

        for (const { songTitle, artistName } of songs) {
            const track = await this.searchTrack(songTitle, artistName);
            results.push(track);

            // レート制限を避けるため少し待機
            await new Promise(resolve => setTimeout(resolve, 100));
        }

        return results;
    }
}
