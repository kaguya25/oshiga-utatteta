import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { PrismaClient } from '@prisma/client';
import { getRecentlyPlayed, getUserSpotifyToken } from '../lib/spotify';

const prisma = new PrismaClient();

async function main() {
    console.log("Checking DB Accounts...");
    const accounts = await prisma.account.findMany({
        where: { provider: 'spotify' }
    });

    if (accounts.length === 0) {
        console.log("No Spotify accounts found in DB!");
        return;
    }

    const account = accounts[0];
    console.log(`Checking API for User ID: ${account.userId}`);

    try {
        const token = await getUserSpotifyToken(account.userId);
        console.log(`Access token retrieved (Length: ${token.length})`);
        
        const response = await getRecentlyPlayed(token, 5);
        console.log("Recently Played Response Items count:", response.items?.length);

        if (response.items && response.items.length > 0) {
            console.log("First item:", response.items[0].track.name, "played at", response.items[0].played_at);
        } else {
            console.log("Full response:", JSON.stringify(response, null, 2));
        }

    } catch (e: any) {
        console.error("Error fetching from Spotify:", e.message);
    } finally {
        await prisma.$disconnect();
    }
}

main().catch(console.error);
