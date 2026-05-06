/**
 * KMNZメンバー個人チャンネルをmonitored_channelsに追加し、
 * 過去365日分の歌枠をフェッチするスクリプト
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

const KMNZ_MEMBERS = [
    { channel_id: 'UCh5pc3_3l8ouUgdUAI2TtNg', channel_name: 'KMNZ NERO' },
    { channel_id: 'UCCPGAOlGQ-SEiThLjS-teQw', channel_name: 'KMNZ TINA' },
    { channel_id: 'UCMxpgHUmLm5m-K-GkcBLQ9A', channel_name: 'KMNZ LITA' },
];

async function main() {
    console.log('=== KMNZメンバー個人チャンネル登録 ===\n');

    for (const member of KMNZ_MEMBERS) {
        const { error } = await supabase
            .from('monitored_channels')
            .upsert(
                { ...member, is_active: true },
                { onConflict: 'channel_id' }
            );

        if (error) {
            console.error(`❌ 登録失敗 (${member.channel_name}): ${error.message}`);
        } else {
            console.log(`✅ 登録成功: ${member.channel_name} (${member.channel_id})`);
        }
    }

    console.log('\n完了！monitored_channelsに追加しました。');
    console.log('次のコマンドで過去分をフェッチしてください:');
    for (const m of KMNZ_MEMBERS) {
        console.log(`  npx tsx scripts/initial-fetch.ts 365 ${m.channel_id}`);
    }
}

main().catch(e => {
    console.error('❌ エラー:', e);
    process.exit(1);
});
