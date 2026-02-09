'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { CoverSong } from '@/types';
import './page.css';

export default function PlaylistPage() {
    const [songs, setSongs] = useState<CoverSong[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isLoading, setIsLoading] = useState(true);
    const [player, setPlayer] = useState<any>(null);

    // YouTube IFrame APIの読み込み
    useEffect(() => {
        // YouTube IFrame APIスクリプトを追加
        const tag = document.createElement('script');
        tag.src = 'https://www.youtube.com/iframe_api';
        const firstScriptTag = document.getElementsByTagName('script')[0];
        firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);

        // グローバルコールバック関数を設定
        (window as any).onYouTubeIframeAPIReady = () => {
            console.log('YouTube IFrame API Ready');
        };
    }, []);

    // カバー曲を取得
    useEffect(() => {
        async function fetchSongs() {
            setIsLoading(true);
            const { data, error } = await supabase
                .from('cover_songs')
                .select('*')
                .order('published_at', { ascending: false });

            if (error) {
                console.error('データ取得エラー:', error);
            } else {
                setSongs(data || []);
            }
            setIsLoading(false);
        }

        fetchSongs();
    }, []);

    // プレイヤーの初期化
    useEffect(() => {
        if (!songs.length) return;

        const initPlayer = () => {
            // 既存のプレイヤーを破棄
            if (player) {
                player.destroy();
            }

            const newPlayer = new (window as any).YT.Player('youtube-player', {
                height: '100%',
                width: '100%',
                videoId: songs[currentIndex].youtube_video_id,
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

        // YouTube IFrame APIが読み込まれているか確認
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
    }, [songs]);

    // 次の曲を再生
    const playNext = () => {
        const nextIndex = (currentIndex + 1) % songs.length;
        setCurrentIndex(nextIndex);
        if (player && player.loadVideoById) {
            player.loadVideoById(songs[nextIndex].youtube_video_id);
        }
    };

    // 前の曲を再生
    const playPrevious = () => {
        const prevIndex = (currentIndex - 1 + songs.length) % songs.length;
        setCurrentIndex(prevIndex);
        if (player && player.loadVideoById) {
            player.loadVideoById(songs[prevIndex].youtube_video_id);
        }
    };

    // 特定の曲を再生
    const playSong = (index: number) => {
        setCurrentIndex(index);
        if (player && player.loadVideoById) {
            player.loadVideoById(songs[index].youtube_video_id);
        }
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

    if (songs.length === 0) {
        return (
            <main className="playlist-page">
                <div className="container">
                    <div className="empty-state">
                        <p>カバー曲がまだ登録されていません</p>
                    </div>
                </div>
            </main>
        );
    }

    const currentSong = songs[currentIndex];

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
                                disabled={songs.length <= 1}
                            >
                                ◀ 前へ
                            </button>
                            <button
                                className="btn btn-secondary control-btn"
                                onClick={playNext}
                                disabled={songs.length <= 1}
                            >
                                次へ ▶
                            </button>
                        </div>
                    </div>

                    {/* プレイリスト */}
                    <div className="playlist-section">
                        <h2 className="playlist-section-title">
                            プレイリスト ({songs.length}件)
                        </h2>

                        <div className="playlist-items">
                            {songs.map((song, index) => {
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
                                        <div className="playlist-item-content">
                                            <div className="playlist-item-title">{song.song_title}</div>
                                            <div className="playlist-item-meta">
                                                <span className="playlist-item-vtuber">{song.vtuber_name}</span>
                                                <span className="playlist-item-separator">•</span>
                                                <span className="playlist-item-date">{formattedDate}</span>
                                            </div>
                                        </div>
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
