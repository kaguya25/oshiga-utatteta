import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// .env.localファイルを明示的に読み込む
dotenv.config({ path: path.join(process.cwd(), '.env.local') });

// 環境変数の取得
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Error: Missing Supabase credentials in .env.local');
    process.exit(1);
}

// Supabaseクライアントの初期化
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function main() {
    const targetName = '湊あくあ';
    console.log(`Disabling channel matching: ${targetName}...`);

    // 全チャンネルを表示して名前を確認
    const { data: channels, error: searchError } = await supabase
        .from('monitored_channels')
        .select('*');

    if (searchError) {
        console.error('Error listing channels:', searchError);
        return;
    }

    console.log(`Listing all ${channels?.length} channels:`);
    channels?.forEach(c => console.log(`- Name: '${c.channel_name}', ID: ${c.channel_id}, Active: ${c.is_active}`));

    // 一旦終了
    return;

    // 更新実行
    const { error: updateError } = await supabase
        .from('monitored_channels')
        .update({ is_active: false })
        .ilike('channel_name', `%${targetName}%`);

    if (updateError) {
        console.error('Error updating channel:', updateError);
    } else {
        console.log('✅ Successfully disabled the channel(s).');
    }
}

main();
