// チャンネルIDから詳細情報を取得
require('dotenv').config({ path: '.env.local' });

const channelIds = [
    'UCwuS0uY-Z2Gr_5OV2oFybFA',
    'UC_fYA9QRK-aJnFTgvR_4zug'
];

const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;

async function getChannelInfo(channelId) {
    const url = `https://www.googleapis.com/youtube/v3/channels?part=snippet&id=${channelId}&key=${YOUTUBE_API_KEY}`;

    try {
        const response = await fetch(url);
        const data = await response.json();

        if (data.items && data.items.length > 0) {
            const channel = data.items[0];
            return {
                channelId: channel.id,
                channelTitle: channel.snippet.title,
                customUrl: channel.snippet.customUrl
            };
        }

        return null;
    } catch (error) {
        console.error(`❌ エラー:`, error.message);
        return null;
    }
}

async function main() {
    console.log('📺 チャンネル情報を取得中...\n');

    for (const channelId of channelIds) {
        const info = await getChannelInfo(channelId);
        if (info) {
            console.log(`✅ ${info.channelTitle}`);
            console.log(`   ID: ${info.channelId}`);
            console.log(`   URL: ${info.customUrl || 'N/A'}\n`);
        }
    }
}

main();
