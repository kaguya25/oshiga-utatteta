'use client';

import { useEffect, useState } from 'react';
import { useSpotifyPlayer } from '@/hooks/useSpotifyPlayer';
import { useSession } from 'next-auth/react';
import './SpotifyWebPlayer.css';

interface SpotifyWebPlayerProps {
    trackId: string;
}

export default function SpotifyWebPlayer({ trackId }: SpotifyWebPlayerProps) {
    const { data: session } = useSession();
    const token = session?.accessToken;
    const { player, isPaused, isActive, currentTrack, deviceId } = useSpotifyPlayer(token);
    const [volume, setVolume] = useState(0.5);

    useEffect(() => {
        if (player && trackId && deviceId) {
            // 自動再生はブラウザポリシーでブロックされる可能性があるが、SDK経由なら試みる価値あり
            // ただし、ユーザーのアクションなしに再生するのは推奨されない
            // ここではデバイス転送だけ行うか、ユーザーが再生ボタンを押すのを待つ
        }
    }, [player, trackId, deviceId]);

    const handlePlay = () => {
        if (!player) return;

        if (!isActive) {
            // デバイスをアクティブにして再生
            fetch(`https://api.spotify.com/v1/me/player/play?device_id=${deviceId}`, {
                method: 'PUT',
                body: JSON.stringify({ uris: [`spotify:track:${trackId}`] }),
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
            });
        } else {
            // 既にアクティブなら再生/一時停止切り替え
            // ただし、トラックが異なる場合はそのトラックを再生
            // TODO: 現在のトラックと比較
            if (currentTrack?.uri === `spotify:track:${trackId}`) {
                player.togglePlay();
            } else {
                fetch(`https://api.spotify.com/v1/me/player/play?device_id=${deviceId}`, {
                    method: 'PUT',
                    body: JSON.stringify({ uris: [`spotify:track:${trackId}`] }),
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                });
            }
        }
    };

    const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newVolume = parseFloat(e.target.value);
        setVolume(newVolume);
        player?.setVolume(newVolume);
    };

    if (!token) return null;

    return (
        <div className="spotify-player-container web-player">
            <div className="player-controls">
                <div className="track-info">
                    {/* 再生中の情報を表示してもいいが、今回はシンプルに操作のみ */}
                </div>

                <div className="control-buttons">
                    <button
                        className="btn-play"
                        onClick={handlePlay}
                        disabled={!player}
                    >
                        {isPaused ? '▶ Play' : '⏸ Pause'}
                    </button>

                    <div className="volume-control">
                        <label>Vol</label>
                        <input
                            type="range"
                            min="0"
                            max="1"
                            step="0.01"
                            value={volume}
                            onChange={handleVolumeChange}
                        />
                    </div>
                </div>

                <div className="status-text">
                    <small>{isActive ? 'Active on this device' : 'Click Play to start'}</small>
                </div>
            </div>
        </div>
    );
}
