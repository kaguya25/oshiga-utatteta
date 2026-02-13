import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { YouTubeClient } from './_shared/youtube';
import { SpotifyClient } from './_shared/spotify';
import { parseSongInfo, isCoverSong } from './_shared/parser';
import type { MonitoredChannel, CoverSongWithSpotify } from '../../../lib/api-types';

serve(async (req) => {
    try {
        console.log('Starting fetch-cover-songs batch process...');

        // 環境変数の取得
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
        const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
        const youtubeApiKey = Deno.env.get('YOUTUBE_API_KEY')!;
        const spotifyClientId = Deno.env.get('SPOTIFY_CLIENT_ID')!;
        const spotifyClientSecret = Deno.env.get('SPOTIFY_CLIENT_SECRET')!;

        // Supabaseクライアントの初期化
        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        // APIクライアントの初期化
        const youtube = new YouTubeClient(youtubeApiKey);
        const spotify = new SpotifyClient(spotifyClientId, spotifyClientSecret);

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
            return new Response(
                JSON.stringify({ message: 'No active channels to process' }),
                { headers: { 'Content-Type': 'application/json' }, status: 200 }
            );
        }

        console.log(`Found ${channels.length} active channels to monitor`);

        let processedCount = 0;
        let savedCount = 0;
        let errorCount = 0;

        // 各チャンネルの動画を取得して処理
        for (const channel of channels as MonitoredChannel[]) {
            try {
                console.log(`Processing channel: ${channel.channel_name} (${channel.channel_id})`);

                // YouTube から最新動画を取得
                const videos = await youtube.getRecentVideos(channel.channel_id);
                console.log(`Found ${videos.length} recent videos from ${channel.channel_name}`);

                // カバー曲のみをフィルタリング
                const coverVideos = videos.filter(video => isCoverSong(video.title));
                console.log(`${coverVideos.length} cover songs detected`);

                for (const video of coverVideos) {
                    try {
                        processedCount++;

                        // 楽曲情報を抽出
                        const { songTitle, artistName } = parseSongInfo(video.title, video.description, channel.channel_name);

                        if (!songTitle || !artistName) {
                            console.log(`Could not parse song info from: ${video.title}`);
                            continue;
                        }

                        // Spotify でマッチング
                        const spotifyTrack = await spotify.searchTrack(songTitle, artistName);

                        const coverSong: CoverSongWithSpotify = {
                            youtubeVideoId: video.id,
                            vtuberName: video.channelTitle,
                            channelId: video.channelId,
                            videoTitle: video.title,
                            thumbnailUrl: video.thumbnailUrl,
                            publishedAt: video.publishedAt,
                            songTitle,
                            artistName,
                            spotifyTrackId: spotifyTrack?.id || null,
                            spotifyTrackUrl: spotifyTrack?.external_urls.spotify || null,
                        };

                        // Supabase に保存（upsert）
                        const { error: insertError } = await supabase
                            .from('cover_songs')
                            .upsert(
                                {
                                    youtube_video_id: coverSong.youtubeVideoId,
                                    vtuber_name: coverSong.vtuberName,
                                    channel_id: coverSong.channelId,
                                    video_title: coverSong.videoTitle,
                                    thumbnail_url: coverSong.thumbnailUrl,
                                    published_at: coverSong.publishedAt,
                                    song_title: coverSong.songTitle,
                                    artist_name: coverSong.artistName,
                                    spotify_track_id: coverSong.spotifyTrackId,
                                    spotify_track_url: coverSong.spotifyTrackUrl,
                                    updated_at: new Date().toISOString(),
                                },
                                { onConflict: 'youtube_video_id' }
                            );

                        if (insertError) {
                            console.error(`Failed to save cover song ${video.id}:`, insertError);
                            errorCount++;
                        } else {
                            console.log(`Saved: ${songTitle} / ${artistName} (Spotify: ${spotifyTrack ? 'matched' : 'not found'})`);
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
                // 次のチャンネルに進む
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

        return new Response(JSON.stringify(summary), {
            headers: { 'Content-Type': 'application/json' },
            status: 200,
        });
    } catch (error) {
        console.error('Batch process error:', error);
        return new Response(
            JSON.stringify({ error: error.message }),
            { headers: { 'Content-Type': 'application/json' }, status: 500 }
        );
    }
});
