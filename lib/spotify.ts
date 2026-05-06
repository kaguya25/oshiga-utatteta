import { prisma } from "./prisma";

export async function getUserSpotifyToken(userId?: string): Promise<string> {
    const account = await prisma.account.findFirst({
        where: userId ? { provider: "spotify", userId } : { provider: "spotify" },
        orderBy: { expires_at: 'desc' }
    });

    if (!account || !account.access_token) {
        throw new Error(`Spotify access token not found for user: ${userId || "any"}`);
    }

    // Check if expected to be expired
    // expires_at is typically seconds since epoch. We check proactively using 5 minutes margin
    if (account.expires_at && account.expires_at * 1000 < Date.now() + 5 * 60 * 1000) {
        if (!account.refresh_token) throw new Error("No refresh token to renew Spotify access token");

        const url = "https://accounts.spotify.com/api/token";
        const basicAuth = Buffer.from(
            `${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`
        ).toString("base64");

        const response = await fetch(url, {
            method: "POST",
            headers: {
                Authorization: `Basic ${basicAuth}`,
                "Content-Type": "application/x-www-form-urlencoded",
            },
            body: new URLSearchParams({
                grant_type: "refresh_token",
                refresh_token: account.refresh_token,
            }),
            cache: "no-store",
        });

        if (!response.ok) {
            throw new Error(`Failed to refresh token: ${response.statusText}`);
        }

        const data = await response.json();
        
        // Update DB
        await prisma.account.update({
            where: { id: account.id },
            data: {
                access_token: data.access_token,
                expires_at: Math.floor(Date.now() / 1000) + data.expires_in,
                refresh_token: data.refresh_token || account.refresh_token // Sometimes they don't return a new mapped refresh_token
            }
        });

        return data.access_token;
    }

    return account.access_token;
}

export async function getRecentlyPlayed(accessToken: string, limit: number = 50, after?: number | string) {
    const url = new URL("https://api.spotify.com/v1/me/player/recently-played");
    url.searchParams.append("limit", limit.toString());
    if (after) {
        url.searchParams.append("after", after.toString());
    }

    const response = await fetch(url.toString(), {
        method: "GET",
        headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
        },
    });

    if (!response.ok) {
        throw new Error(`Failed to fetch recently played: ${response.statusText} (${response.status})`);
    }

    return response.json();
}

export async function getClientCredentialsToken(): Promise<string> {
    const url = "https://accounts.spotify.com/api/token";
    const basicAuth = Buffer.from(
        `${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`
    ).toString("base64");

    const response = await fetch(url, {
        method: "POST",
        headers: {
            Authorization: `Basic ${basicAuth}`,
            "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
            grant_type: "client_credentials",
        }),
        cache: "no-store",
    });

    if (!response.ok) {
        throw new Error(`Failed to get client credentials token: ${response.statusText}`);
    }

    const data = await response.json();
    return data.access_token;
}
