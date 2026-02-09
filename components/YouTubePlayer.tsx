import './YouTubePlayer.css';

interface YouTubePlayerProps {
    videoId: string;
}

export default function YouTubePlayer({ videoId }: YouTubePlayerProps) {
    return (
        <div className="youtube-player-container">
            <iframe
                src={`https://www.youtube.com/embed/${videoId}`}
                title="YouTube video player"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="youtube-iframe"
            />
        </div>
    );
}
