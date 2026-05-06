import { prisma } from "./prisma";
import { getUserSpotifyToken, getRecentlyPlayed } from "./spotify";

export async function runSpotifySync(targetUserId?: string) {
    let usersToSync = [];
    
    if (targetUserId) {
        usersToSync = await prisma.account.findMany({
            where: { provider: "spotify", userId: targetUserId },
            select: { userId: true }
        });
    } else {
        // Sync for all spotify linked users
        usersToSync = await prisma.account.findMany({
            where: { provider: "spotify" },
            select: { userId: true }
        });
    }

    if (usersToSync.length === 0) {
        return { message: "No users to sync." };
    }

    let totalAdded = 0;
    const results = [];

    for (const { userId } of usersToSync) {
        try {
            // 1. Find the latest played_at for this user to fetch via cursor `after`
            const latestPlay = await prisma.playHistory.findFirst({
                where: { user_id: userId },
                orderBy: { played_at: 'desc' },
                select: { played_at: true }
            });

            // Spotify requires unix timestamp in milliseconds for `after`
            let afterParam: number | undefined = undefined;
            if (latestPlay && latestPlay.played_at) {
                afterParam = new Date(latestPlay.played_at).getTime();
            }

            // 2. Fetch tracks
            const accessToken = await getUserSpotifyToken(userId);
            
            console.log(`[Spotify Sync Debug] User: ${userId}, latestPlay:`, latestPlay?.played_at, `afterParam:`, afterParam);
            
            // Request up to 50 items. Without `after`, it brings 50 most recent ones overall.
            // With `after`, it guarantees to bring up to 50 tracks played AFTER the timestamp.
            const response = await getRecentlyPlayed(accessToken, 50, afterParam);
            const items = response.items || [];

            console.log(`[Spotify Sync Debug] Received ${items.length} items from Spotify for user ${userId}`);

            if (items.length === 0) {
                results.push({ userId, status: "No new tracks" });
                continue;
            }

            let addedCount = 0;

            // 3. Save new tracks and play history
            for (const item of items) {
                const track = item.track;
                const playedAt = new Date(item.played_at);
                const durationMs = track.duration_ms;

                // Make sure the track definition exists in DB
                await prisma.track.upsert({
                    where: { id: track.id },
                    update: {},
                    create: {
                        id: track.id,
                        name: track.name,
                        artist_name: track.artists.map((a: any) => a.name).join(", "),
                        album_image_url: track.album.images?.[0]?.url || null,
                    },
                });

                // Add to history
                try {
                    await prisma.playHistory.create({
                        data: {
                            user_id: userId,
                            track_id: track.id,
                            played_at: playedAt,
                            duration_ms: durationMs,
                        },
                    });
                    addedCount++;
                } catch (e: any) {
                    // Ignore duplicate errors (Unique constraint violations)
                    if (e.code === 'P2002') continue;
                    console.error("Failed to insert play history for user", userId, e);
                }
            }

            totalAdded += addedCount;
            results.push({ userId, added: addedCount });
            
        } catch (error: any) {
            console.error(`Sync failed for user ${userId}:`, error);
            results.push({ userId, error: error.message });
        }
    }

    return {
        success: true,
        message: `Successfully synced ${totalAdded} total tracks.`,
        details: results
    };
}
