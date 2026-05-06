import { NextResponse } from 'next/server';
import { runSpotifySync } from '@/lib/sync';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

async function handleSync(req: Request) {
    const url = new URL(req.url);
    const cronSecret = url.searchParams.get("secret");

    // Allow requests with correct CRON_SECRET or from authenticated users
    let isAuthorizedCron = false;
    if (process.env.CRON_SECRET && cronSecret === process.env.CRON_SECRET) {
        isAuthorizedCron = true;
    }

    const session = await getServerSession(authOptions);

    if (!isAuthorizedCron && !session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        // If it's a cron job, sync everyone. If a user request, primarily sync the requesting user.
        // Actually, we can just sync the user requesting it so their request is fast.
        const userIdToSync = isAuthorizedCron ? undefined : (session?.user as any)?.id;

        const result = await runSpotifySync(userIdToSync);
        return NextResponse.json(result);
    } catch (error: any) {
        console.error("Sync API Error:", error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

export async function GET(req: Request) {
    return handleSync(req);
}

export async function POST(req: Request) {
    return handleSync(req);
}
