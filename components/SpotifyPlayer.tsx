import './SpotifyPlayer.css';
import { useSession } from 'next-auth/react';
import SpotifyWebPlayer from './SpotifyWebPlayer';

interface SpotifyPlayerProps {
    trackId: string;
}

export default function SpotifyPlayer({ trackId }: SpotifyPlayerProps) {
    const { data: session } = useSession();

    if (session) {
        return <SpotifyWebPlayer trackId={trackId} />;
    }

    return (
        <div className="spotify-player-container">
            <iframe
                src={`https://open.spotify.com/embed/track/${trackId}?utm_source=generator&theme=0`}
                width="100%"
                height="352"
                allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                loading="lazy"
                className="spotify-iframe"
            />
        </div>
    );
}
