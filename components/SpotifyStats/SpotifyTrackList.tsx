import "./SpotifyTrackList.css";

type TrackType = {
  id: string;
  name: string;
  artist_name: string;
  album_image_url: string | null;
  playCount: number;
};

interface SpotifyTrackListProps {
  tracks: TrackType[];
}

export function SpotifyTrackList({ tracks }: SpotifyTrackListProps) {
  if (!tracks || tracks.length === 0) {
    return (
      <div className="spotify-tracks-empty">
        <div className="spotify-tracks-empty-icon">🎧</div>
        <h3>この期間の再生履歴がありません</h3>
        <p>
          別の期間を選択するか、「データを同期」ボタンをクリックして
          <br />
          Spotifyから最新の再生履歴を取得してください。
        </p>
      </div>
    );
  }

  return (
    <ul className="spotify-track-list">
      {tracks.map((track, index) => (
        <li key={track.id || index} className="spotify-track-item">
          <a
            href={`spotify:track:${track.id}`}
            className="spotify-track-link"
            title={`Open ${track.name} in Spotify`}
          >
            <div className="spotify-track-rank">{index + 1}</div>

            <div className="spotify-track-cover">
              {track.album_image_url ? (
                <img
                  src={track.album_image_url}
                  alt={track.name || "Album Art"}
                  className="spotify-track-cover-img"
                />
              ) : (
                <div className="spotify-track-cover-placeholder">
                  <span>🎵</span>
                </div>
              )}
              <div className="spotify-track-play-overlay">
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M8 5v14l11-7z" />
                </svg>
              </div>
            </div>

            <div className="spotify-track-info">
              <div className="spotify-track-name">{track.name}</div>
              <div className="spotify-track-artist">{track.artist_name}</div>
              <div className="spotify-track-plays">
                <span className="spotify-track-plays-badge">
                  {track.playCount} plays
                </span>
              </div>
            </div>
          </a>
        </li>
      ))}
    </ul>
  );
}
