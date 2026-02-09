// YouTube Data APIを使ってチャンネルハンドルからチャンネルIDを取得するスクリプト
require('dotenv').config({ path: '.env.local' });

const channelHandles = [
    { handle: '@KMNZOFFICIAL', name: 'KMNZ' },
    { handle: '@Nanahira_Confetto', name: 'ななひら' },
    { handle: '@VESPERBELL', name: 'VESPERBELL' },
    { handle: '@somunia_official', name: 'somunia' }
];

const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;

if (!YOUTUBE_API_KEY || YOUTUBE_API_KEY === 'your_youtube_api_key_here') {
    console.error('❌ YouTube API キーが設定されていません');
    console.error('.env.local ファイルに YOUTUBE_API_KEY を設定してください');
    process.exit(1);
}

async function getChannelIdFromHandle(handle) {
    const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=channel&q=${encodeURIComponent(handle)}&key=${YOUTUBE_API_KEY}`;

    try {
        const response = await fetch(url);
        const data = await response.json();

        if (data.error) {
            console.error(`❌ APIエラー (${handle}):`, data.error.message);
            return null;
        }

        if (data.items && data.items.length > 0) {
            return {
                channelId: data.items[0].snippet.channelId,
                channelTitle: data.items[0].snippet.channelTitle
            };
        }

        return null;
    } catch (error) {
        console.error(`❌ エラー (${handle}):`, error.message);
        return null;
    }
}

async function main() {
    console.log('📺 YouTube チャンネルIDを取得中...\n');

    const results = [];

    // HIMEHINAは既にチャンネルIDが分かっている
    results.push({
        name: 'HIMEHINA',
        channelId: 'UCFv2z4iM5vHrS8bZPq4fHQQ',
        channelTitle: 'HIMEHINA Channel'
    });

    for (const channel of channelHandles) {
        console.log(`🔍 ${channel.name} (${channel.handle}) を検索中...`);
        const result = await getChannelIdFromHandle(channel.handle);

        if (result) {
            console.log(`✅ 取得成功: ${result.channelTitle}`);
            console.log(`   チャンネルID: ${result.channelId}\n`);

            results.push({
                name: channel.name,
                channelId: result.channelId,
                channelTitle: result.channelTitle
            });
        } else {
            console.log(`❌ 取得失敗\n`);
        }

        // APIレート制限対策（少し待つ）
        await new Promise(resolve => setTimeout(resolve, 500));
    }

    console.log('\n📋 取得結果:');
    console.log('─'.repeat(60));
    results.forEach(r => {
        console.log(`${r.name.padEnd(15)} | ${r.channelId} | ${r.channelTitle}`);
    });
    console.log('─'.repeat(60));

    // SQLクエリを生成
    console.log('\n📝 Supabase登録用SQLクエリ:\n');
    console.log('INSERT INTO monitored_channels (channel_id, channel_name, is_active) VALUES');
    const values = results.map((r, i) => {
        const comma = i < results.length - 1 ? ',' : ';';
        return `  ('${r.channelId}', '${r.channelTitle}', true)${comma}`;
    });
    console.log(values.join('\n'));
}

main().catch(console.error);
