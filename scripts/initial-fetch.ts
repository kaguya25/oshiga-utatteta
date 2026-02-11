/**
 * 初回一括取得スクリプト（ローカル実行用）
 * 
 * 使い方:
 * npm run initial-fetch
 * 
 * または
 * npx tsx scripts/initial-fetch.ts
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// .env.localファイルを明示的に読み込む
dotenv.config({ path: path.join(process.cwd(), '.env.local') });

// 環境変数の取得
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const youtubeApiKey = process.env.YOUTUBE_API_KEY!;
const spotifyClientId = process.env.SPOTIFY_CLIENT_ID;
const spotifyClientSecret = process.env.SPOTIFY_CLIENT_SECRET;

// 取得日数の設定（デフォルト30日、引数で変更可能）
const fetchDays = parseInt(process.argv[2] || '30');

console.log(`=== 初回一括取得スクリプト ===`);
console.log(`取得期間: 過去 ${fetchDays} 日間`);
console.log(`開始時刻: ${new Date().toLocaleString('ja-JP')}`);
console.log('');

// Supabaseクライアントの初期化
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function main() {
    try {
        // 監視対象チャンネルの取得
        console.log('📡 監視対象チャンネルを取得中...');
        const { data: channels, error: channelsError } = await supabase
            .from('monitored_channels')
            .select('*')
            .eq('is_active', true);

        if (channelsError) {
            throw new Error(`Failed to fetch monitored channels: ${channelsError.message}`);
        }

        if (!channels || channels.length === 0) {
            console.log('⚠️  監視対象チャンネルが見つかりませんでした');
            return;
        }

        console.log(`✅ ${channels.length}個のチャンネルを発見`);
        console.log('');

        let totalVideosProcessed = 0;
        let totalSongsSaved = 0;
        let totalErrors = 0;

        // デバッグフィルタ解除: 全チャンネル対象
        const targetChannels = channels;
        // console.log(`✅ ${targetChannels.length}個のチャンネルを処理します (Debug Mode)`);

        // 各チャンネルの動画を取得して処理
        for (let i = 0; i < targetChannels.length; i++) {
            const channel = targetChannels[i];
            console.log(`[${i + 1}/${targetChannels.length}] 処理中: ${channel.channel_name} (ID: ${channel.channel_id})`);

            try {
                // YouTube から動画を取得
                const videos = await getRecentVideos(youtubeApiKey, channel.channel_id, 50, fetchDays);
                console.log(`  📹 ${videos.length}件の動画を取得`);

                // カバー曲のみをフィルタリング → 「攻め」の設定：全動画をパース対象にする！
                const coverVideos = videos;
                console.log(`  🎵 ${coverVideos.length}件の動画をパース対象として処理（攻めの設定）`);

                let savedCount = 0;
                let errorCount = 0;

                for (const video of coverVideos) {
                    try {
                        totalVideosProcessed++;

                        // 楽曲情報を抽出
                        // 楽曲情報を抽出
                        const { songTitle, artistName } = parseSongInfo(video.title, video.description, channel.channel_name);

                        if (!songTitle || !artistName) {
                            console.log(`  ⚠️  パース失敗: ${video.title}`);
                            continue;
                        }

                        // Spotify でマッチング
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

                        // Supabase に保存
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
                            console.log(`  ❌ 保存失敗: ${video.id} - ${insertError.message}`);
                            errorCount++;
                        } else {
                            console.log(`  ✅ 保存成功: ${songTitle} / ${artistName}`);
                            savedCount++;
                        }
                    } catch (videoError) {
                        console.log(`  ❌ エラー: ${video.id} - ${videoError}`);
                        errorCount++;
                    }
                }

                totalSongsSaved += savedCount;
                totalErrors += errorCount;

                console.log(`  📊 結果: 保存 ${savedCount}件, エラー ${errorCount}件`);
                console.log('');
            } catch (channelError) {
                console.log(`  ❌ チャンネルエラー: ${channelError}`);
                totalErrors++;
            }
        }

        // 最終結果
        console.log('');
        console.log('=== 完了 ===');
        console.log(`処理チャンネル数: ${channels.length}`);
        console.log(`処理動画数: ${totalVideosProcessed}`);
        console.log(`保存曲数: ${totalSongsSaved}`);
        console.log(`エラー数: ${totalErrors}`);
        console.log(`終了時刻: ${new Date().toLocaleString('ja-JP')}`);
    } catch (error) {
        console.error('❌ スクリプトエラー:', error);
        process.exit(1);
    }
}

// === Helper Functions ===

async function getRecentVideos(apiKey: string, channelId: string, maxResults: number = 50, daysToFetch: number = 30) {
    const publishedAfter = new Date(Date.now() - daysToFetch * 24 * 60 * 60 * 1000).toISOString();

    const url = new URL('https://www.googleapis.com/youtube/v3/search');
    url.searchParams.set('part', 'snippet');
    url.searchParams.set('channelId', channelId);
    url.searchParams.set('order', 'date');
    url.searchParams.set('type', 'video');
    // url.searchParams.set('publishedAfter', publishedAfter); // API側のフィルタは不安定なので使用しない
    url.searchParams.set('maxResults', maxResults.toString());
    url.searchParams.set('order', 'date'); // 日付順に取得
    url.searchParams.set('key', apiKey);

    // ... (debug URL log can be removed or kept commented)

    const response = await fetch(url.toString());

    if (!response.ok) {
        const error = await response.json();
        throw new Error(`YouTube API Error: ${error.error?.message || response.statusText}`);
    }

    const data = await response.json();
    console.log(`  🔍 Search API returned ${data.items?.length || 0} items for ${channelId}`);

    let videos = data.items.map((item: any) => ({
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

    // 公開日でフィルタリング (APIのpublishedAfterの代わり)
    const thresholdDate = new Date(publishedAfter); // publishedAfterはgetRecentVideos冒頭で定義済み
    videos = videos.filter((v: any) => new Date(v.publishedAt) >= thresholdDate);
    console.log(`  📅 ${videos.length} videos remaining after date filtering`);

    // 動画の詳細情報を取得してShortsを除外
    const videoIds = videos.map((v: any) => v.id).join(',');
    const detailsUrl = new URL('https://www.googleapis.com/youtube/v3/videos');
    detailsUrl.searchParams.set('part', 'contentDetails');
    detailsUrl.searchParams.set('id', videoIds);
    detailsUrl.searchParams.set('key', apiKey);

    const detailsResponse = await fetch(detailsUrl.toString());
    if (!detailsResponse.ok) {
        const error = await detailsResponse.json();
        throw new Error(`YouTube API Error: ${error.error?.message || detailsResponse.statusText}`);
    }

    const detailsData = await detailsResponse.json();

    // durationをパースしてShortsを除外（60秒以下）
    const videoDetailsMap = new Map();
    for (const item of detailsData.items) {
        if (item.contentDetails && item.contentDetails.duration) {
            const duration = parseDuration(item.contentDetails.duration);
            videoDetailsMap.set(item.id, duration);
        }
    }

    // Shorts（60秒以下）を除外、かつChannel IDが一致するもののみ（他人の動画混入防止）
    return videos.filter((video: any) => {
        if (video.channelId !== channelId) {
            console.log(`  ⚠️ Skipping video from different channel: ${video.title} (Channel: ${video.channelTitle}, ID: ${video.channelId})`);
            return false;
        }
        const duration = videoDetailsMap.get(video.id);
        return duration && duration > 60;
    });
}

// ISO 8601 duration形式（PT1M30Sなど）を秒数に変換
function parseDuration(duration: string): number {
    if (!duration) return 0;

    const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
    if (!match) return 0;

    const hours = parseInt(match[1] || '0');
    const minutes = parseInt(match[2] || '0');
    const seconds = parseInt(match[3] || '0');

    return hours * 3600 + minutes * 60 + seconds;
}

function parseSongInfo(
    title: string,
    description: string = "",
    channelName: string = ""
): { songTitle: string | null; artistName: string | null } {
    // パターン1: 【歌ってみた】曲名 / アーティスト名
    let match = title.match(/【(?:歌ってみた|カバー|cover|COVER)】(.+?)\s*[/／]\s*(.+?)(?:【|$)/);
    if (match) {
        return { songTitle: match[1].trim(), artistName: match[2].trim() };
    }

    // パターン2: 曲名 / アーティスト名【歌ってみた】
    match = title.match(/^(.+?)\s*[/／]\s*(.+?)\s*【(?:歌ってみた|カバー|cover|COVER)】/);
    if (match) {
        return { songTitle: match[1].trim(), artistName: match[2].trim() };
    }

    // パターン3: 曲名 - アーティスト名 cover
    match = title.match(/^(.+?)\s*[-−]\s*(.+?)\s*(?:cover|カバー|COVER)/i);
    if (match) {
        return { songTitle: match[1].trim(), artistName: match[2].trim() };
    }

    // パターン4: 【歌ってみた】曲名（アーティスト名）
    match = title.match(/【(?:歌ってみた|カバー|cover|COVER)】(.+?)(?:（|[(])(.+?)(?:）|[)])/);
    if (match) {
        return { songTitle: match[1].trim(), artistName: match[2].trim() };
    }

    // パターン5: 曲名（アーティスト名）【歌ってみた】
    match = title.match(/^(.+?)(?:（|[(])(.+?)(?:）|[)])\s*【(?:歌ってみた|カバー|cover|COVER)】/);
    if (match) {
        return { songTitle: match[1].trim(), artistName: match[2].trim() };
    }

    // パターン6: 【歌ってみた】曲名【VTuber名】（オリジナル曲の場合もあるため、慎重に）
    // 例: 【歌ってみた】ずうっといっしょ！【ヒメヒナ】
    // この場合、descriptionから情報を抽出するか、曲名のみ保存
    match = title.match(/【(?:歌ってみた|カバー|cover|COVER)】(.+?)【(.+?)】/);
    if (match) {
        const potentialSongTitle = match[1].trim();
        const potentialArtist = match[2].trim();

        // descriptionから "Original:" や "作詞・作曲:" などを探す
        const descMatch = description.match(/(?:original|作詞[・･]作曲|歌|アーティスト)[：:]\s*(.+?)(?:\n|$)/i);
        if (descMatch) {
            return { songTitle: potentialSongTitle, artistName: descMatch[1].trim() };
        }

        // descriptionに情報がない場合、VTuber名をアーティストとして扱わない
        // (オリジナル曲の可能性が高いためスキップ)
        return { songTitle: null, artistName: null };
    }

    // パターン7: 曲名 / アーティスト名 (【】なし)
    match = title.match(/^(.+?)\s*[/／\-−]\s*(.+?)(?:\s*(?:歌ってみた|カバー|cover|COVER))?$/i);
    if (match) {
        let songTitle = match[1].trim();
        let artistName = match[2].trim();
        artistName = artistName.replace(/(?:歌ってみた|カバー|cover|COVER|\s*【.*】)$/i, '').trim();

        // 攻めの設定: 曲名がチャンネル名と一致する場合、逆（アーティスト / 曲名）である可能性が高いので入れ替える
        if (channelName && songTitle.toLowerCase().includes(channelName.toLowerCase())) {
            console.log(`  🔄 スワップ発生: ${songTitle} <-> ${artistName} (Channel: ${channelName})`);
            const temp = songTitle;
            songTitle = artistName;
            artistName = temp;
        } else {
            // ログが多すぎる場合はコメントアウト
            // console.log(`  ℹ️  スワップ判定: Title='${songTitle}', Channel='${channelName}' -> Match? ${songTitle.toLowerCase().includes(channelName.toLowerCase())}`);
        }

        if (songTitle && artistName) {
            return { songTitle, artistName };
        }
    }

    // パターン8: HIMEHINA『モニタリング』Cover のような形式
    match = title.match(/(.+?)?『(.+?)』(?:.*(?:cover|COVER|カバー|歌ってみた))?/i);
    if (match) {
        const potentialSongTitle = match[2].trim();
        const potentialVtuberName = match[1] ? match[1].trim() : null;

        // descriptionから "Original:" や "作詞・作曲:" などを探す
        const descMatch = description.match(/(?:original|作詞[・･]作曲|歌|アーティスト|本家)[：:]\s*(.+?)(?:\n|$)/i);
        if (descMatch) {
            return { songTitle: potentialSongTitle, artistName: descMatch[1].trim() };
        }

        // descriptionに情報がない場合、タイトル冒頭のVtuber名をフォールバックとして使用
        if (potentialVtuberName) {
            return { songTitle: potentialSongTitle, artistName: potentialVtuberName };
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

    const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

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
            return null;
        }

        return data.tracks.items[0];
    } catch (error) {
        console.log(`  ⚠️  Spotify検索失敗: ${songTitle} / ${artistName}`);
        return null;
    }
}

// スクリプト実行
main();
