import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkData() {
    console.log('🔍 Checking for unwanted data...');

    // 1. Check monitored channels
    console.log('\n📺 Monitored Channels:');
    const { data: channels, error: channelsError } = await supabase
        .from('monitored_channels')
        .select('*');

    if (channelsError) {
        console.error('Error fetching channels:', channelsError);
    } else {
        channels.forEach(channel => {
            console.log(`- ${channel.channel_name} (${channel.channel_id}) [Active: ${channel.is_active}]`);
        });
    }

    // 2. Check and DELETE "Minato Aqua" in cover_songs
    console.log('\n🎵 Cover Songs (Minato Aqua related):');
    const { data: songs, error: songsError } = await supabase
        .from('cover_songs')
        .select('*')
        .or('artist_name.ilike.%湊あくあ%,video_title.ilike.%湊あくあ%,vtuber_name.ilike.%湊あくあ%');

    if (songsError) {
        console.error('Error fetching songs:', songsError);
    } else {
        if (songs.length === 0) {
            console.log('No songs found matching "湊あくあ".');
        } else {
            console.log(`Found ${songs.length} songs. Deleting...`);
            const idsToDelete = songs.map(s => s.id);

            const { error: deleteError } = await supabase
                .from('cover_songs')
                .delete()
                .in('id', idsToDelete);

            if (deleteError) {
                console.error('Failed to delete songs:', deleteError);
            } else {
                console.log(`✅ Successfully deleted ${songs.length} songs.`);
                songs.forEach(song => {
                    console.log(`- Deleted: [${song.vtuber_name}] ${song.song_title} / ${song.artist_name} (ChannelId: ${song.channel_id})`);
                });
            }
        }
    }
}

checkData().catch(console.error);
