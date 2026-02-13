import { useEffect, useState } from "react";

declare global {
    interface Window {
        onSpotifyWebPlaybackSDKReady: () => void;
        Spotify: any;
    }
}

export function useSpotifyPlayer(token: string | undefined) {
    const [player, setPlayer] = useState<any>(undefined);
    const [isPaused, setPaused] = useState(false);
    const [isActive, setActive] = useState(false);
    const [currentTrack, setTrack] = useState<any>(null);
    const [deviceId, setDeviceId] = useState<string | null>(null);

    useEffect(() => {
        if (!token) return;

        const script = document.createElement("script");
        script.src = "https://sdk.scdn.co/spotify-player.js";
        script.async = true;

        document.body.appendChild(script);

        window.onSpotifyWebPlaybackSDKReady = () => {
            const player = new window.Spotify.Player({
                name: '推しが歌ってた Player',
                getOAuthToken: (cb: (token: string) => void) => { cb(token); },
                volume: 0.5
            });

            setPlayer(player);

            player.addListener('ready', ({ device_id }: { device_id: string }) => {
                console.log('Ready with Device ID', device_id);
                setDeviceId(device_id);
            });

            player.addListener('not_ready', ({ device_id }: { device_id: string }) => {
                console.log('Device ID has gone offline', device_id);
            });

            player.addListener('player_state_changed', (state: any) => {
                if (!state) {
                    return;
                }

                setTrack(state.track_window.current_track);
                setPaused(state.paused);

                player.getCurrentState().then((state: any) => {
                    (!state) ? setActive(false) : setActive(true);
                });
            });

            player.connect();
        };

        return () => {
            // Cleanup if needed
        };
    }, [token]);

    return { player, isPaused, isActive, currentTrack, deviceId };
}
