import Link from 'next/link';
import { CoverSong } from '@/types';
import './CoverSongCard.css';

interface CoverSongCardProps {
    song: CoverSong;
}

export default function CoverSongCard({ song }: CoverSongCardProps) {
    const formattedDate = new Date(song.published_at).toLocaleDateString('ja-JP', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });

    return (
        <Link href={`/cover/${song.id}`} className="cover-card-link">
            <article className="cover-card">
                <div className="cover-card-thumbnail">
                    <img
                        src={song.thumbnail_url}
                        alt={`${song.vtuber_name} - ${song.song_title}`}
                        className="cover-card-image"
                    />
                    {song.spotify_track_id && (
                        <div className="spotify-badge">
                            <svg
                                width="16"
                                height="16"
                                viewBox="0 0 24 24"
                                fill="currentColor"
                            >
                                <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" />
                            </svg>
                        </div>
                    )}
                </div>

                <div className="cover-card-content">
                    <h3 className="cover-card-title">{song.song_title}</h3>

                    <div className="cover-card-info">
                        <p className="cover-card-vtuber">
                            <svg
                                width="16"
                                height="16"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                            >
                                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                                <circle cx="12" cy="7" r="4"></circle>
                            </svg>
                            {song.vtuber_name}
                        </p>

                        <p className="cover-card-artist">
                            <svg
                                width="16"
                                height="16"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                            >
                                <path d="M9 18V5l12-2v13"></path>
                                <circle cx="6" cy="18" r="3"></circle>
                                <circle cx="18" cy="16" r="3"></circle>
                            </svg>
                            {song.artist_name}
                        </p>
                    </div>

                    <p className="cover-card-date">{formattedDate}</p>
                </div>
            </article>
        </Link>
    );
}
