import { prisma } from "@/lib/prisma";

const TOKEN_ENDPOINT = "https://accounts.spotify.com/api/token";

const getBasicToken = () => {
  return Buffer.from(
    `${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`
  ).toString("base64");
};

export const getAccessToken = async (refresh_token: string) => {
  const response = await fetch(TOKEN_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Basic ${getBasicToken()}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token,
    }),
  });

  if (!response.ok) {
    throw new Error(`Failed to refresh token: ${response.status}`);
  }

  return response.json();
};

export const getRecentlyPlayed = async (access_token: string) => {
  const RECENTLY_PLAYED_ENDPOINT =
    "https://api.spotify.com/v1/me/player/recently-played?limit=50";

  const response = await fetch(RECENTLY_PLAYED_ENDPOINT, {
    headers: {
      Authorization: `Bearer ${access_token}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch recently played: ${response.status}`);
  }

  return response.json();
};

/** 指定されたユーザー、または最初のSpotifyユーザーのトークンを取得する */
export const getUserSpotifyToken = async (userId?: string) => {
  const account = await prisma.account.findFirst({
    where: userId
      ? { provider: "spotify", userId }
      : { provider: "spotify" },
    select: { refresh_token: true },
  });

  if (!account || !account.refresh_token) {
    throw new Error(
      "No Spotify account linked or missing refresh token in Database."
    );
  }

  const { access_token } = await getAccessToken(account.refresh_token);
  return access_token;
};
