/**
 * KMNZのShortsをDBから削除するスクリプト
 *
 * YouTubeのcontentDetails APIで動画の実際の長さを確認し、
 * 60秒以下（Shorts相当）のKMNZ動画をDBから削除する
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const youtubeApiKey = process.env.YOUTUBE_API_KEY!;

const KMNZ_CHANNEL_ID = 'UCwuS0uY-Z2Gr_5OV2oFybFA';
// 60秒以下はShortsとみなす（YouTubeの現行仕様は最大3分だが、KMNZは60秒以下が多い）
const SHORTS_MAX_DURATION_SEC = 65;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

function parseDuration(duration: string): number {
    const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
    if (!match) return 0;
    const h = parseInt(match[1] || '0');
    const m = parseInt(match[2] || '0');
    const s = parseInt(match[3] || '0');
    return h * 3600 + m * 60 + s;
}

async function getDurations(videoIds: string[]): Promise<Map<string, number>> {
    const map = new Map<string, number>();
    const chunkSize = 50;

    for (let i = 0; i < videoIds.length; i += chunkSize) {
        const chunk = videoIds.slice(i, i + chunkSize);
        const url = new URL('https://www.googleapis.com/youtube/v3/videos');
        url.searchParams.set('part', 'contentDetails');
        url.searchParams.set('id', chunk.join(','));
        url.searchParams.set('key', youtubeApiKey);

        const res = await fetch(url.toString());
        if (!res.ok) {
            console.error(`YouTube API Error: ${res.statusText}`);
            continue;
        }

        const data = await res.json();
        for (const item of data.items || []) {
            const durationSec = parseDuration(item.contentDetails?.duration || '');
            map.set(item.id, durationSec);
        }
    }

    return map;
}

async function main() {
    console.log('=== KMNZ Shorts 削除スクリプト ===\n');

    // KMNZのエントリを全取得
    const { data: songs, error } = await supabase
        .from('cover_songs')
        .select('id, youtube_video_id, video_title, song_title, artist_name')
        .eq('channel_id', KMNZ_CHANNEL_ID);

    if (error) throw new Error(`DB取得失敗: ${error.message}`);
    if (!songs || songs.length === 0) {
        console.log('KMNZのエントリが見つかりませんでした');
        return;
    }

    console.log(`KMNZエントリ数: ${songs.length}件\n`);

    // YouTubeで実際の動画長を確認
    const videoIds = songs.map(s => s.youtube_video_id);
    console.log(`YouTube APIで動画長を確認中...`);
    const durations = await getDurations(videoIds);

    const shortsToDelete: typeof songs = [];
    const keepList: typeof songs = [];

    for (const song of songs) {
        const dur = durations.get(song.youtube_video_id);
        if (dur === undefined) {
            // API応答なし（削除済みor非公開）→ 削除対象
            console.log(`  ❓ 動画取得不可 (削除済み？): [${song.youtube_video_id}] ${song.video_title}`);
            shortsToDelete.push(song);
        } else if (dur <= SHORTS_MAX_DURATION_SEC) {
            console.log(`  📱 Short確定 (${dur}s): ${song.song_title} / ${song.artist_name}`);
            shortsToDelete.push(song);
        } else {
            keepList.push(song);
        }
    }

    console.log(`\n--- 結果 ---`);
    console.log(`残す動画: ${keepList.length}件`);
    console.log(`削除対象(Shorts/非公開): ${shortsToDelete.length}件`);

    if (shortsToDelete.length === 0) {
        console.log('\nShortsは見つかりませんでした。何もしません。');
        return;
    }

    console.log('\n削除対象一覧:');
    for (const s of shortsToDelete) {
        console.log(`  - [${s.youtube_video_id}] ${s.song_title} / ${s.artist_name}`);
    }

    // 削除実行
    const idsToDelete = shortsToDelete.map(s => s.id);
    const { error: deleteError } = await supabase
        .from('cover_songs')
        .delete()
        .in('id', idsToDelete);

    if (deleteError) throw new Error(`削除失敗: ${deleteError.message}`);

    console.log(`\n✅ ${shortsToDelete.length}件のShortsを削除しました`);
}

main().catch(e => {
    console.error('❌ エラー:', e);
    process.exit(1);
});
