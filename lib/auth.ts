import { NextAuthOptions } from "next-auth";
import SpotifyProvider from "next-auth/providers/spotify";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { prisma } from "@/lib/prisma";

const scope = "user-read-recently-played user-read-email user-read-private";

async function refreshAccessToken(token: any) {
    try {
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
                refresh_token: token.refreshToken,
            }),
            cache: "no-store",
        });

        const refreshedTokens = await response.json();

        if (!response.ok) {
            throw refreshedTokens;
        }

        return {
            ...token,
            accessToken: refreshedTokens.access_token,
            accessTokenExpires: Date.now() + refreshedTokens.expires_in * 1000,
            refreshToken: refreshedTokens.refresh_token ?? token.refreshToken, // Fall back to old refresh token
        };
    } catch (error) {
        console.error("Error refreshing Access Token", error);
        return {
            ...token,
            error: "RefreshAccessTokenError",
        };
    }
}

export const authOptions: NextAuthOptions = {
    adapter: PrismaAdapter(prisma),
    providers: [
        SpotifyProvider({
            clientId: process.env.SPOTIFY_CLIENT_ID!,
            clientSecret: process.env.SPOTIFY_CLIENT_SECRET!,
            authorization: {
                params: {
                    scope: scope,
                },
            },
        }),
    ],
    session: {
        strategy: "jwt",
    },
    callbacks: {
        async jwt({ token, account, user }) {
            // Initial sign in
            if (account && user) {
                // To keep token in DB updated (if using JWT strategy + DB adapter, next-auth writes it on linkAccount, but manually handling JWT is safer for cron)
                // However, with PrismaAdapter + database strategy, tokens are naturally in the `Account` table.
                // We are using `strategy: "jwt"` here to have session tokens in cookies.
                // It's a common pattern to save access_token to DB manually if we need to access via CRON offline without requiring user session in memory.
                
                // Ensure token is stored in DB for offline Cron access.
                await prisma.account.updateMany({
                   where: { providerAccountId: account.providerAccountId, provider: "spotify" },
                   data: {
                       access_token: account.access_token,
                       refresh_token: account.refresh_token,
                       expires_at: account.expires_at,
                   }
                });

                return {
                    ...token,
                    accessToken: account.access_token,
                    refreshToken: account.refresh_token,
                    accountId: account.providerAccountId,
                    accessTokenExpires: account.expires_at ? account.expires_at * 1000 : 0,
                    userId: user.id,
                };
            }

            // Return previous token if the access token has not expired yet
            if (Date.now() < (token.accessTokenExpires as number)) {
                return token;
            }

            // Access token has expired, try to update it
            const refreshedToken = await refreshAccessToken(token);

            // Also update the DB so CRON jobs can use the new refresh token
            if (refreshedToken.accessToken && refreshedToken.userId) {
                await prisma.account.updateMany({
                    where: { userId: refreshedToken.userId as string, provider: "spotify" },
                    data: {
                        access_token: refreshedToken.accessToken as string,
                        refresh_token: refreshedToken.refreshToken as string,
                        expires_at: Math.floor((refreshedToken.accessTokenExpires as number) / 1000),
                    }
                });
            }

            return refreshedToken;
        },
        async session({ session, token }) {
            (session.user as any).id = token.userId;
            (session as any).error = token.error;
            return session;
        },
    },
    secret: process.env.NEXTAUTH_SECRET,
};
