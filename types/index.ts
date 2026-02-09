export interface CoverSong {
    id: string;
    youtube_video_id: string;
    vtuber_name: string;
    channel_id: string;
    video_title: string;
    thumbnail_url: string;
    published_at: string;
    song_title: string;
    artist_name: string;
    spotify_track_id: string | null;
    spotify_track_url: string | null;
    created_at: string;
    updated_at: string;
}

export interface MonitoredChannel {
    id: string;
    channel_id: string;
    channel_name: string;
    is_active: boolean;
    created_at: string;
}

export interface UserFavorite {
    id: string;
    user_id: string;
    cover_song_id: string;
    created_at: string;
}
