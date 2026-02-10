// YouTube API Types
export interface YouTubeVideo {
    id: string;
    title: string;
    description: string;
    thumbnailUrl: string;
    publishedAt: string;
    channelId: string;
    channelTitle: string;
}

export interface YouTubeSearchResponse {
    items: {
        id: { videoId: string };
        snippet: {
            title: string;
            description: string;
            thumbnails: {
                maxresdefault?: { url: string };
                high?: { url: string };
                medium?: { url: string };
            };
            publishedAt: string;
            channelId: string;
            channelTitle: string;
        };
    }[];
}

// Spotify API Types
export interface SpotifyTrack {
    id: string;
    name: string;
    artists: { name: string }[];
    external_urls: { spotify: string };
}

export interface SpotifySearchResponse {
    tracks: {
        items: SpotifyTrack[];
    };
}

export interface SpotifyAuthResponse {
    access_token: string;
    token_type: string;
    expires_in: number;
}

// Parsed Cover Song Data
export interface ParsedCoverSong {
    youtubeVideoId: string;
    vtuberName: string;
    channelId: string;
    videoTitle: string;
    thumbnailUrl: string;
    publishedAt: string;
    songTitle: string | null;
    artistName: string | null;
}

// Cover Song with Spotify Match
export interface CoverSongWithSpotify extends ParsedCoverSong {
    spotifyTrackId: string | null;
    spotifyTrackUrl: string | null;
}

// Monitored Channel
export interface MonitoredChannel {
    id: string;
    channel_id: string;
    channel_name: string;
    is_active: boolean;
}
