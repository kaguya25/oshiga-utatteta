import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'edge';
export const maxDuration = 300; // 5分

/**
 * GitHub Actionsから呼び出されるCron APIルート
 * バッチ処理を直接実行する
 */
export async function GET(request: NextRequest) {
    try {
        // 認証チェック
        const authHeader = request.headers.get('authorization');
        if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        console.log('Cron job triggered, starting batch process...');

        // 環境変数の取得
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
        const youtubeApiKey = process.env.YOUTUBE_API_KEY!;
        const spotifyClientId = process.env.SPOTIFY_CLIENT_ID;
        const spotifyClientSecret = process.env.SPOTIFY_CLIENT_SECRET;

        // Supabaseクライアントの初期化
        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        // 監視対象チャンネルの取得
        const { data: channels, error: channelsError } = await supabase
            .from('monitored_channels')
            .select('*')
            .eq('is_active', true);

        if (channelsError) {
            throw new Error(`Failed to fetch monitored channels: ${channelsError.message}`);
        }

        if (!channels || channels.length === 0) {
            console.log('No active monitored channels found.');
            return NextResponse.json({ message: 'No active channels to process' });
        }

        console.log(`Found ${channels.length} active channels to monitor`);

        let processedCount = 0;
        let savedCount = 0;
        let errorCount = 0;

        // 各チャンネルの動画を取得して処理
        for (const channel of channels) {
            try {
                console.log(`Processing channel: ${channel.channel_name} (${channel.channel_id})`);

                // YouTube から最新動画を取得
                const videos = await getRecentVideos(youtubeApiKey, channel.channel_id);
                console.log(`Found ${videos.length} recent videos from ${channel.channel_name}`);

                // カバー曲のみをフィルタリング
                const coverVideos = videos.filter((video: any) => isCoverSong(video.title));
                console.log(`${coverVideos.length} cover songs detected`);

                for (const video of coverVideos) {
                    try {
                        processedCount++;

                        // 楽曲情報を抽出
                        const { songTitle, artistName } = parseSongInfo(video.title, video.description);

                        if (!songTitle || !artistName) {
                            console.log(`Could not parse song info from: ${video.title}`);
                            continue;
                        }

                        // Spotify でマッチング (if credentials exist)
                        let spotifyTrackId = null;
                        let spotifyTrackUrl = null;

                        if (spotifyClientId && spotifyClientSecret) {
                            const spotifyTrack = await searchSpotifyTrack(
                                spotifyClientId,
                                spotifyClientSecret,
                                songTitle,
                                artistName
                            );
                            if (spotifyTrack) {
                                spotifyTrackId = spotifyTrack.id;
                                spotifyTrackUrl = spotifyTrack.external_urls.spotify;
                            }
                        }

                        // Supabase に保存（upsert）
                        const { error: insertError } = await supabase
                            .from('cover_songs')
                            .upsert(
                                {
                                    youtube_video_id: video.id,
                                    vtuber_name: video.channelTitle,
                                    channel_id: video.channelId,
                                    video_title: video.title,
                                    thumbnail_url: video.thumbnailUrl,
                                    published_at: video.publishedAt,
                                    song_title: songTitle,
                                    artist_name: artistName,
                                    spotify_track_id: spotifyTrackId,
                                    spotify_track_url: spotifyTrackUrl,
                                    updated_at: new Date().toISOString(),
                                },
                                { onConflict: 'youtube_video_id' }
                            );

                        if (insertError) {
                            console.error(`Failed to save cover song ${video.id}:`, insertError);
                            errorCount++;
                        } else {
                            console.log(`Saved: ${songTitle} / ${artistName} (Spotify: ${spotifyTrackId ? 'matched' : 'not found'})`);
                            savedCount++;
                        }
                    } catch (videoError) {
                        console.error(`Error processing video ${video.id}:`, videoError);
                        errorCount++;
                    }
                }
            } catch (channelError) {
                console.error(`Error processing channel ${channel.channel_name}:`, channelError);
                errorCount++;
                continue;
            }
        }

        const summary = {
            message: 'Batch process completed',
            channelsProcessed: channels.length,
            videosProcessed: processedCount,
            songsSaved: savedCount,
            errors: errorCount,
        };

        console.log('Batch process summary:', summary);

        return NextResponse.json(summary);
    } catch (error) {
        console.error('Cron job error:', error);
        return NextResponse.json(
            { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
            { status: 500 }
        );
    }
}

// === Helper Functions ===

async function getRecentVideos(apiKey: string, channelId: string, maxResults: number = 50) {
    const publishedAfter = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const url = new URL('https://www.googleapis.com/youtube/v3/search');
    url.searchParams.set('part', 'snippet');
    url.searchParams.set('channelId', channelId);
    url.searchParams.set('order', 'date');
    url.searchParams.set('type', 'video');
    url.searchParams.set('publishedAfter', publishedAfter);
    url.searchParams.set('maxResults', maxResults.toString());
    url.searchParams.set('key', apiKey);

    const response = await fetch(url.toString());

    if (!response.ok) {
        const error = await response.json();
        throw new Error(`YouTube API Error: ${error.error?.message || response.statusText}`);
    }

    const data = await response.json();

    return data.items.map((item: any) => ({
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
}

function parseSongInfo(
    title: string,
    description: string = ""
): { songTitle: string | null; artistName: string | null } {
    // パターン1: 【歌ってみた】曲名 / アーティスト名
    let match = title.match(/【(?:歌ってみた|カバー|cover|COVER)】(.+?)\s*[/／]\s*(.+?)(?:【|$)/);
    if (match) {
        return { songTitle: match[1].trim(), artistName: match[2].trim() };
    }

    // パターン2: 曲名 / アーティスト【歌ってみた】
    match = title.match(/^(.+?)\s*[/／]\s*(.+?)\s*【(?:歌ってみた|カバー|cover|COVER)】/);
    if (match) {
        return { songTitle: match[1].trim(), artistName: match[2].trim() };
    }

    // パターン3: 曲名 - アーティスト cover
    match = title.match(/^(.+?)\s*[-−]\s*(.+?)\s*(?:cover|カバー|COVER)/i);
    if (match) {
        return { songTitle: match[1].trim(), artistName: match[2].trim() };
    }

    // パターン4: 【カバー】曲名（アーティスト名）
    match = title.match(/【(?:歌ってみた|カバー|cover|COVER)】(.+?)(?:（|[(])(.+?)(?:）|[)])/);
    if (match) {
        return { songTitle: match[1].trim(), artistName: match[2].trim() };
    }

    // パターン5: 曲名（アーティスト名）【歌ってみた】
    match = title.match(/^(.+?)(?:（|[(])(.+?)(?:）|[)])\s*【(?:歌ってみた|カバー|cover|COVER)】/);
    if (match) {
        return { songTitle: match[1].trim(), artistName: match[2].trim() };
    }

    // パターン6: タイトルに / や - が含まれる場合
    match = title.match(/^(.+?)\s*[/／\-−]\s*(.+?)(?:\s*(?:歌ってみた|カバー|cover|COVER))?$/i);
    if (match) {
        const songTitle = match[1].trim();
        let artistName = match[2].trim();
        artistName = artistName.replace(/(?:歌ってみた|カバー|cover|COVER|\s*【.*】)$/i, '').trim();
        if (songTitle && artistName) {
            return { songTitle, artistName };
        }
    }

    return { songTitle: null, artistName: null };
}

function isCoverSong(title: string): boolean {
    const coverKeywords = ['歌ってみた', 'カバー', 'COVER', 'cover', 'Cover'];
    return coverKeywords.some(keyword => title.includes(keyword));
}

function normalizeString(str: string): string {
    return str
        .replace(/\s*[\(（].*?[\)）]\s*/g, '')
        .replace(/[～〜]/g, '-')
        .replace(/[!！]/g, '')
        .replace(/[?？]/g, '')
        .replace(/\s+/g, ' ')
        .trim();
}

let spotifyAccessToken: string | null = null;
let spotifyTokenExpiresAt: number = 0;

async function getSpotifyAccessToken(clientId: string, clientSecret: string): Promise<string> {
    if (spotifyAccessToken && Date.now() < spotifyTokenExpiresAt) {
        return spotifyAccessToken;
    }

    const credentials = btoa(`${clientId}:${clientSecret}`);

    const response = await fetch('https://accounts.spotify.com/api/token', {
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

    const data: any = await response.json();
    spotifyAccessToken = data.access_token as string;
    spotifyTokenExpiresAt = Date.now() + (data.expires_in - 60) * 1000;

    return spotifyAccessToken;
}

async function searchSpotifyTrack(
    clientId: string,
    clientSecret: string,
    songTitle: string,
    artistName: string
): Promise<any | null> {
    try {
        const token = await getSpotifyAccessToken(clientId, clientSecret);

        const normalizedSong = normalizeString(songTitle);
        const normalizedArtist = normalizeString(artistName);
        const query = `track:${normalizedSong} artist:${normalizedArtist}`;

        const url = new URL('https://api.spotify.com/v1/search');
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

        const data = await response.json();

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
