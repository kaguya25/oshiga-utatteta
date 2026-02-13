import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env.local') });

const youtubeApiKey = process.env.YOUTUBE_API_KEY!;
const kmnzChannelId = 'UCwuS0uY-Z2Gr_5OV2oFybFA';

async function main() {
    console.log(`Fetching recent videos for KMNZ (${kmnzChannelId})...`);

    const allTitles: string[] = [];
    let nextPageToken: string | null = null;
    let keepGoing = true;

    while (keepGoing && allTitles.length < 500) {
        const url = new URL('https://www.googleapis.com/youtube/v3/search');
        url.searchParams.set('part', 'snippet');
        url.searchParams.set('channelId', kmnzChannelId);
        url.searchParams.set('order', 'date');
        url.searchParams.set('type', 'video');
        url.searchParams.set('maxResults', '50');
        url.searchParams.set('key', youtubeApiKey);
        if (nextPageToken) url.searchParams.set('pageToken', nextPageToken);

        const response = await fetch(url.toString());
        const data = await response.json();

        if (!data.items || data.items.length === 0) {
            keepGoing = false;
            break;
        }

        data.items.forEach((item: any) => {
            allTitles.push(item.snippet.title);
        });

        console.log(`Fetched ${data.items.length} items. Total: ${allTitles.length}`);

        nextPageToken = data.nextPageToken;
        if (!nextPageToken) keepGoing = false;
    }

    console.log(`Found ${allTitles.length} videos total.`);
    const titles = allTitles;

    const fs = require('fs');
    fs.writeFileSync('kmnz_titles.json', JSON.stringify(titles, null, 2));
    console.log('Saved titles to kmnz_titles.json');
}

main();
