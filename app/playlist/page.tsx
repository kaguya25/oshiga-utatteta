'use client';

import { useEffect, useState } from 'react';
import { usePlaylistStore } from '@/lib/store';
import Link from 'next/link';
import './page.css';

export default function PlaylistPage() {
    const { playlist, removeSong } = usePlaylistStore();
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isLoading, setIsLoading] = useState(true);
    const [player, setPlayer] = useState<any>(null);

    // Hydration mismatch回避
    useEffect(() => {
        setIsLoading(false);
    }, []);

    // YouTube IFrame APIの読み込み
    useEffect(() => {
        const tag = document.createElement('script');
        tag.src = 'https://www.youtube.com/iframe_api';
        const firstScriptTag = document.getElementsByTagName('script')[0];
        firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);

        (window as any).onYouTubeIframeAPIReady = () => {
            console.log('YouTube IFrame API Ready');
        };
    }, []);

    // プレイヤーの初期化
    useEffect(() => {
        if (!playlist.length || isLoading) return;

        const initPlayer = () => {
            if (player) {
                player.destroy();
            }

            // 現在の曲が存在するか確認（playlist変更時にindexが範囲外になる可能性）
            if (!playlist[currentIndex]) {
                setCurrentIndex(0);
                return;
            }

            const newPlayer = new (window as any).YT.Player('youtube-player', {
                height: '100%',
                width: '100%',
                videoId: playlist[currentIndex].youtube_video_id,
                playerVars: {
                    autoplay: 1,
                    rel: 0,
                },
                events: {
                    onReady: (event: any) => {
                        console.log('Player ready');
                        setPlayer(event.target);
                    },
                    onStateChange: (event: any) => {
                        if (event.data === (window as any).YT.PlayerState.ENDED) {
                            playNext();
                        }
                    },
                },
            });
        };

        if ((window as any).YT && (window as any).YT.Player) {
            initPlayer();
        } else {
            (window as any).onYouTubeIframeAPIReady = initPlayer;
        }

        return () => {
            if (player && player.destroy) {
                player.destroy();
            }
        };
    }, [playlist, currentIndex, isLoading]); // player依存を外して無限ループ防止

    // 次の曲を再生
    const playNext = () => {
        if (playlist.length === 0) return;
        const nextIndex = (currentIndex + 1) % playlist.length;
        setCurrentIndex(nextIndex);
        // useEffectが再実行されてプレイヤーが更新される
    };

    // 前の曲を再生
    const playPrevious = () => {
        if (playlist.length === 0) return;
        const prevIndex = (currentIndex - 1 + playlist.length) % playlist.length;
        setCurrentIndex(prevIndex);
    };

    // 特定の曲を再生
    const playSong = (index: number) => {
        setCurrentIndex(index);
    };

    if (isLoading) {
        return (
            <main className="playlist-page">
                <div className="container">
                    <div className="loading">
                        <div className="spinner"></div>
                        <p>プレイリストを読み込み中...</p>
                    </div>
                </div>
            </main>
        );
    }

    if (playlist.length === 0) {
        return (
            <main className="playlist-page">
                <div className="container">
                    <div className="empty-state">
                        <div className="empty-icon">
                            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                <path d="M9 18V5l12-2v13" />
                                <circle cx="6" cy="18" r="3" />
                                <circle cx="18" cy="16" r="3" />
                            </svg>
                        </div>
                        <h3>プレイリストは空です</h3>
                        <p>お気に入りのカバー曲を追加して、自分だけのリストを作りましょう！</p>
                        <Link href="/" className="btn btn-primary mt-4">
                            曲を探しに行く
                        </Link>
                    </div>
                </div>
            </main>
        );
    }

    const currentSong = playlist[currentIndex];

    // 万が一 currentSong が undefined の場合 (削除直後など)
    if (!currentSong) {
        return null;
    }

    return (
        <main className="playlist-page">
            <div className="container">
                <h1 className="playlist-title">プレイリスト</h1>

                <div className="playlist-layout">
                    {/* 現在再生中のエリア */}
                    <div className="player-section">
                        <div className="current-info">
                            <h2>現在再生中</h2>
                            <h3 className="current-song-title">{currentSong.song_title}</h3>
                            <p className="current-vtuber">{currentSong.vtuber_name}</p>
                        </div>

                        <div className="player-wrapper">
                            <div id="youtube-player"></div>
                        </div>

                        <div className="player-controls">
                            <button
                                className="btn btn-secondary control-btn"
                                onClick={playPrevious}
                                disabled={playlist.length <= 1}
                            >
                                ◀ 前へ
                            </button>
                            <button
                                className="btn btn-secondary control-btn"
                                onClick={playNext}
                                disabled={playlist.length <= 1}
                            >
                                次へ ▶
                            </button>
                        </div>

                        <div className="share-section mt-md">
                            <a
                                href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(
                                    `🎵 Now Playing: ${currentSong.song_title} / ${currentSong.vtuber_name}\n`
                                )}&url=${encodeURIComponent('https://oshiga-utatteta.vercel.app')}&hashtags=推しが歌ってた,Vtuber`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="btn btn-sm share-btn"
                                style={{
                                    backgroundColor: '#000',
                                    color: '#fff',
                                    border: '1px solid #333',
                                    gap: '8px',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    textDecoration: 'none'
                                }}
                            >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                                </svg>
                                Xでシェア
                            </a>
                        </div>
                    </div>

                    {/* プレイリスト */}
                    <div className="playlist-section">
                        <h2 className="playlist-section-title">
                            リスト ({playlist.length}件)
                        </h2>

                        <div className="playlist-items">
                            {playlist.map((song, index) => {
                                const isActive = index === currentIndex;
                                const formattedDate = new Date(song.published_at).toLocaleDateString('ja-JP', {
                                    year: 'numeric',
                                    month: 'short',
                                    day: 'numeric'
                                });

                                return (
                                    <div
                                        key={song.id}
                                        className={`playlist-item ${isActive ? 'active' : ''}`}
                                        onClick={() => playSong(index)}
                                    >
                                        <div className="playlist-item-number">
                                            {isActive ? '▶' : index + 1}
                                        </div>
                                        <div className="playlist-item-thumbnail">
                                            <img src={song.thumbnail_url} alt="" />
                                        </div>
                                        <div className="playlist-item-content">
                                            <div className="playlist-item-title">{song.song_title}</div>
                                            <div className="playlist-item-meta">
                                                <span className="playlist-item-vtuber">{song.vtuber_name}</span>
                                                <span className="playlist-item-artist"> / {song.artist_name}</span>
                                            </div>
                                        </div>
                                        <button
                                            className="playlist-item-remove"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                removeSong(song.id);
                                            }}
                                            title="削除"
                                        >
                                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                <line x1="18" y1="6" x2="6" y2="18"></line>
                                                <line x1="6" y1="6" x2="18" y2="18"></line>
                                            </svg>
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>
        </main>
    );
}
