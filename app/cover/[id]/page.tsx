import { notFound } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { CoverSong } from '@/types';
import YouTubePlayer from '@/components/YouTubePlayer';
import SpotifyPlayer from '@/components/SpotifyPlayer';
import './page.css';

interface PageProps {
    params: Promise<{ id: string }>;
}

async function getCoverSong(id: string): Promise<CoverSong | null> {
    const { data, error } = await supabase
        .from('cover_songs')
        .select('*')
        .eq('id', id)
        .single();

    if (error || !data) {
        return null;
    }

    return data;
}

export default async function CoverDetailPage({ params }: PageProps) {
    const { id } = await params;
    const song = await getCoverSong(id);

    if (!song) {
        notFound();
    }

    const formattedDate = new Date(song.published_at).toLocaleDateString('ja-JP', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });

    return (
        <div className="detail-page">
            <div className="container">
                <div className="detail-content">
                    <div className="detail-hero">
                        <img
                            src={song.thumbnail_url}
                            alt={song.song_title}
                            className="detail-thumbnail"
                        />
                        <div className="detail-info">
                            <h1 className="detail-title">{song.song_title}</h1>
                            <div className="detail-meta">
                                <div className="meta-item">
                                    <svg
                                        width="20"
                                        height="20"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="2"
                                    >
                                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                                        <circle cx="12" cy="7" r="4"></circle>
                                    </svg>
                                    <span className="meta-label">Vtuber:</span>
                                    <span className="meta-value vtuber-name">{song.vtuber_name}</span>
                                </div>
                                <div className="meta-item">
                                    <svg
                                        width="20"
                                        height="20"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="2"
                                    >
                                        <path d="M9 18V5l12-2v13"></path>
                                        <circle cx="6" cy="18" r="3"></circle>
                                        <circle cx="18" cy="16" r="3"></circle>
                                    </svg>
                                    <span className="meta-label">原曲:</span>
                                    <span className="meta-value">{song.artist_name}</span>
                                </div>
                                <div className="meta-item">
                                    <svg
                                        width="20"
                                        height="20"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="2"
                                    >
                                        <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                                        <line x1="16" y1="2" x2="16" y2="6"></line>
                                        <line x1="8" y1="2" x2="8" y2="6"></line>
                                        <line x1="3" y1="10" x2="21" y2="10"></line>
                                    </svg>
                                    <span className="meta-label">公開日:</span>
                                    <span className="meta-value">{formattedDate}</span>
                                </div>
                            </div>

                            <a
                                href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(
                                    `🎵 Now Playing: ${song.song_title} / ${song.vtuber_name}\n`
                                )}&url=${encodeURIComponent(`https://oshiga-utatteta.vercel.app/cover/${song.id}`)}&hashtags=推しが歌ってた,Vtuber`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="share-btn-detail"
                            >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                                </svg>
                                Xでシェア
                            </a>
                        </div>
                    </div>

                    <div className="players-section">
                        <div className="player-card">
                            <h2 className="player-title">
                                <svg
                                    width="24"
                                    height="24"
                                    viewBox="0 0 24 24"
                                    fill="currentColor"
                                >
                                    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
                                </svg>
                                YouTubeで視聴
                            </h2>
                            <YouTubePlayer videoId={song.youtube_video_id} />
                        </div>

                        {song.spotify_track_id ? (
                            <div className="player-card">
                                <h2 className="player-title">
                                    <svg
                                        width="24"
                                        height="24"
                                        viewBox="0 0 24 24"
                                        fill="currentColor"
                                    >
                                        <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" />
                                    </svg>
                                    Spotifyで聴く（原曲）
                                </h2>
                                <SpotifyPlayer trackId={song.spotify_track_id} />
                            </div>
                        ) : (
                            <div className="player-card no-spotify">
                                <h2 className="player-title">
                                    <svg
                                        width="24"
                                        height="24"
                                        viewBox="0 0 24 24"
                                        fill="currentColor"
                                    >
                                        <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" />
                                    </svg>
                                    Spotify情報なし
                                </h2>
                                <div className="no-spotify-message">
                                    <p>この楽曲のSpotify情報が見つかりませんでした。</p>
                                    <p className="hint">原曲を検索してみてください</p>
                                    <a
                                        href={`https://open.spotify.com/search/${encodeURIComponent(song.song_title + ' ' + song.artist_name)}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="btn btn-primary"
                                    >
                                        Spotifyで検索
                                    </a>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
