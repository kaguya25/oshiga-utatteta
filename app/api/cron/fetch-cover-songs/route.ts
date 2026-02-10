import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

/**
 * Vercel Cron Jobから呼び出されるAPIルート
 * Supabase Edge Functionを実行する
 */
export async function GET(request: NextRequest) {
    try {
        // Vercel Cronからの呼び出しを検証
        const authHeader = request.headers.get('authorization');
        if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        console.log('Cron job triggered, calling Supabase Edge Function...');

        // Supabase Edge Functionのエンドポイント
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
        const functionUrl = `${supabaseUrl}/functions/v1/fetch-cover-songs`;

        // Edge Functionを呼び出し
        const response = await fetch(functionUrl, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${supabaseAnonKey}`,
                'Content-Type': 'application/json',
            },
        });

        const data = await response.json();

        if (!response.ok) {
            console.error('Edge Function error:', data);
            return NextResponse.json(
                { error: 'Edge Function failed', details: data },
                { status: response.status }
            );
        }

        console.log('Edge Function completed successfully:', data);

        return NextResponse.json({
            success: true,
            message: 'Batch process completed',
            result: data,
        });
    } catch (error) {
        console.error('Cron job error:', error);
        return NextResponse.json(
            { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
            { status: 500 }
        );
    }
}
