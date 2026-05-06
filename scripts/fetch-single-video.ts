/**
 * YouTube動画IDを指定して1本だけ手動登録するスクリプト
 *
 * 使い方: npx tsx scripts/fetch-single-video.ts <youtube_video_id>
 * 例: npx tsx scripts/fetch-single-video.ts y29Pup5BE1o
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const youtubeApiKey = process.env.YOUTUBE_API_KEY!;
const spotifyClientId = process.env.SPOTIFY_CLIENT_ID;
const spotifyClientSecret = process.env.SPOTIFY_CLIENT_SECRET;

const videoId = process.argv[2];
if (!videoId) {
    console.error('使い方: npx tsx scripts/fetch-single-video.ts <youtube_video_id>');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

let spotifyAccessToken: string | null = null;
let spotifyTokenExpiresAt = 0;

async function getSpotifyToken(): Promise<string> {
    if (spotifyAccessToken && Date.now() < spotifyTokenExpiresAt) return spotifyAccessToken;
    const credentials = Buffer.from(`${spotifyClientId}:${spotifyClientSecret}`).toString('base64');
    const res = await fetch('https://accounts.spotify.com/api/token', {
        method: 'POST',
        headers: { Authorization: `Basic ${credentials}`, 'Content-Type': 'application/x-www-form-urlencoded' },
        body: 'grant_type=client_credentials',
    });
    const data = await res.json();
    spotifyAccessToken = data.access_token;
    spotifyTokenExpiresAt = Date.now() + (data.expires_in - 60) * 1000;
    return spotifyAccessToken!;
}

async function searchSpotify(song: string, artist: string): Promise<{ id: string; url: string } | null> {
    if (!spotifyClientId || !spotifyClientSecret) return null;
    try {
        const token = await getSpotifyToken();
        const q = encodeURIComponent(`track:${song} artist:${artist}`);
        const res = await fetch(`https://api.spotify.com/v1/search?q=${q}&type=track&limit=1`, {
            headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        const item = data.tracks?.items?.[0];
        if (!item) return null;
        return { id: item.id, url: item.external_urls.spotify };
    } catch {
        return null;
    }
}

function parseSongInfo(title: string, channelName: string): { songTitle: string | null; artistName: string | null } {
    title = title.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'");

    // KMNZ 歌枠パターン
    if (channelName.includes('KMNZ')) {
        const m = title.match(/【[^】]*歌枠[^】]*】([^【]+?)(?=【|$)/);
        if (m && m[1].trim()) {
            const streamTitle = m[1].trim();
            let artistName = 'KMNZ';
            if (title.includes('KMNZTINA') || title.includes('TINA誕生')) artistName = 'KMNZ TINA';
            else if (title.includes('KMNZNERO') || title.includes('NERO生誕')) artistName = 'KMNZ NERO';
            else if (title.includes('KMNZLITA') || title.includes('LITA生誕')) artistName = 'KMNZ LITA';
            return { songTitle: streamTitle, artistName };
        }
    }

    // 汎用カバー曲パターン
    let match = title.match(/【(?:歌ってみた|カバー|cover|COVER)】(.+?)\s*[/／]\s*(.+?)(?:【|$)/);
    if (match) return { songTitle: match[1].trim(), artistName: match[2].trim() };

    match = title.match(/^(.+?)\s*[-−]\s*(.+?)\s*[\(（]Cover[\)）]\s*[/／]/i);
    if (match) return { songTitle: match[1].trim(), artistName: match[2].trim() };

    match = title.match(/^(.+?)\s*[/／]\s*(.+?)\s*【(?:歌ってみた|カバー|cover|COVER)】/);
    if (match) return { songTitle: match[1].trim(), artistName: match[2].trim() };

    return { songTitle: null, artistName: null };
}

async function main() {
    console.log(`=== 動画ID: ${videoId} を手動登録 ===\n`);

    // YouTube APIで動画情報取得
    const url = new URL('https://www.googleapis.com/youtube/v3/videos');
    url.searchParams.set('part', 'snippet,contentDetails');
    url.searchParams.set('id', videoId);
    url.searchParams.set('key', youtubeApiKey);

    const res = await fetch(url.toString());
    const data = await res.json();
    const item = data.items?.[0];

    if (!item) {
        console.error('❌ 動画が見つかりませんでした');
        process.exit(1);
    }

    const snippet = item.snippet;
    const title = snippet.title;
    const channelId = snippet.channelId;
    const channelTitle = snippet.channelTitle;
    const publishedAt = snippet.publishedAt;
    const thumbnailUrl = snippet.thumbnails?.maxres?.url || snippet.thumbnails?.high?.url || '';

    // 動画長確認
    const durRaw = item.contentDetails?.duration || '';
    const durMatch = durRaw.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
    const durationSec = durMatch
        ? parseInt(durMatch[1] || '0') * 3600 + parseInt(durMatch[2] || '0') * 60 + parseInt(durMatch[3] || '0')
        : 0;

    console.log(`タイトル: ${title}`);
    console.log(`チャンネル: ${channelTitle} (${channelId})`);
    console.log(`公開日: ${publishedAt}`);
    console.log(`動画長: ${durationSec}秒`);

    if (durationSec <= 65) {
        console.log('\n⚠️  Shorts（65秒以下）のため登録をスキップします');
        process.exit(0);
    }

    // DBからチャンネル名を取得
    const { data: ch } = await supabase
        .from('monitored_channels')
        .select('channel_name')
        .eq('channel_id', channelId)
        .single();
    const channelName = ch?.channel_name || channelTitle;

    const { songTitle, artistName } = parseSongInfo(title, channelName);
    console.log(`\nパース結果: "${songTitle}" / "${artistName}"`);

    if (!songTitle || !artistName) {
        console.log('❌ パース失敗: 登録できません');
        process.exit(1);
    }

    // Spotify検索
    const spotify = await searchSpotify(songTitle, artistName);
    if (spotify) {
        console.log(`Spotify: ${spotify.url}`);
    } else {
        console.log('Spotify: マッチなし');
    }

    // Supabase upsert
    const { error } = await supabase.from('cover_songs').upsert(
        {
            youtube_video_id: videoId,
            vtuber_name: channelTitle,
            channel_id: channelId,
            video_title: title,
            thumbnail_url: thumbnailUrl,
            published_at: publishedAt,
            song_title: songTitle,
            artist_name: artistName,
            spotify_track_id: spotify?.id || null,
            spotify_track_url: spotify?.url || null,
            updated_at: new Date().toISOString(),
        },
        { onConflict: 'youtube_video_id' }
    );

    if (error) {
        console.error('❌ 保存失敗:', error.message);
        process.exit(1);
    }

    console.log(`\n✅ 保存成功: ${songTitle} / ${artistName}`);
}

main().catch(e => {
    console.error('❌ エラー:', e);
    process.exit(1);
});
