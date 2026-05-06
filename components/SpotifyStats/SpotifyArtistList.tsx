import "./SpotifyArtistList.css";

type ArtistType = {
  artist_name: string;
  playCount: number;
  totalDurationMs: number;
  totalDurationFormatted: string;
  trackCount: number;
  imageUrl: string | null;
};

interface SpotifyArtistListProps {
  artists: ArtistType[];
}

export function SpotifyArtistList({ artists }: SpotifyArtistListProps) {
  if (!artists || artists.length === 0) {
    return (
      <div className="spotify-tracks-empty">
        <div className="spotify-tracks-empty-icon">🎤</div>
        <h3>この期間のアーティストデータがありません</h3>
        <p>
          別の期間を選択するか、「データを同期」ボタンをクリックして
          <br />
          Spotifyから最新の再生履歴を取得してください。
        </p>
      </div>
    );
  }

  return (
    <ul className="spotify-artist-list">
      {artists.map((artist, index) => (
        <li key={artist.artist_name} className="spotify-artist-item">
          <div className="spotify-artist-rank">{index + 1}</div>

          <div className="spotify-artist-cover">
            {artist.imageUrl ? (
              <img
                src={artist.imageUrl}
                alt={artist.artist_name}
                className="spotify-artist-cover-img"
              />
            ) : (
              <div className="spotify-artist-cover-placeholder">
                <span>🎤</span>
              </div>
            )}
          </div>

          <div className="spotify-artist-info">
            <div className="spotify-artist-name">{artist.artist_name}</div>
            <div className="spotify-artist-meta">
              {artist.trackCount}曲 · {artist.totalDurationFormatted}
            </div>
          </div>

          <div className="spotify-artist-stats">
            <span className="spotify-artist-plays-badge">
              {artist.playCount} plays
            </span>
          </div>
        </li>
      ))}
    </ul>
  );
}
