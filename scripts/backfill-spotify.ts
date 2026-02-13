
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { SpotifyClient } from '../supabase/functions/fetch-cover-songs/_shared/spotify';

// Load environment variables
dotenv.config({ path: path.join(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const spotifyClientId = process.env.SPOTIFY_CLIENT_ID!;
const spotifyClientSecret = process.env.SPOTIFY_CLIENT_SECRET!;

if (!supabaseUrl || !supabaseKey || !spotifyClientId || !spotifyClientSecret) {
    console.error('Missing environment variables');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);
const spotify = new SpotifyClient(spotifyClientId, spotifyClientSecret);

async function main() {
    console.log('Starting Spotify backfill...');

    // Fetch songs without Spotify data
    const { data: songs, error } = await supabase
        .from('cover_songs')
        .select('*')
        .is('spotify_track_id', null);

    if (error) {
        console.error('Error fetching songs:', error);
        return;
    }

    if (!songs || songs.length === 0) {
        console.log('No songs to backfill.');
        return;
    }

    console.log(`Found ${songs.length} songs to check.`);

    let updatedCount = 0;

    for (const song of songs) {
        try {
            console.log(`Checking: ${song.song_title} / ${song.artist_name}`);

            // Search Spotify
            let track = await spotify.searchTrack(song.song_title, song.artist_name);

            // Retry with Title only if not found
            if (!track) {
                console.log(`  Please wait... Retrying with Title only: ${song.song_title}`);
                await new Promise(resolve => setTimeout(resolve, 500)); // Wait before retry
                track = await spotify.searchTrack(song.song_title, "");
            }

            if (track) {
                console.log(`  ✅ Found on Spotify: ${track.name} (${track.id})`);

                const { error: updateError } = await supabase
                    .from('cover_songs')
                    .update({
                        spotify_track_id: track.id,
                        spotify_track_url: track.external_urls.spotify
                    })
                    .eq('id', song.id);

                if (updateError) {
                    console.error(`  ❌ Failed to update DB: ${updateError.message}`);
                } else {
                    updatedCount++;
                }
            } else {
                console.log(`  ⚠️ Not found on Spotify`);
            }

            // Sleep to respect API rate limits (mildly)
            await new Promise(resolve => setTimeout(resolve, 500));

        } catch (err) {
            console.error(`  ❌ Error processing ${song.song_title}:`, err);
        }
    }

    console.log(`Backfill complete. Updated ${updatedCount}/${songs.length} songs.`);
}

main();
