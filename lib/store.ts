import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { CoverSong } from '@/types';

interface PlaylistState {
    playlist: CoverSong[];
    addSong: (song: CoverSong) => void;
    removeSong: (songId: string) => void;
    clearPlaylist: () => void;
    isInPlaylist: (songId: string) => boolean;
}

export const usePlaylistStore = create<PlaylistState>()(
    persist(
        (set, get) => ({
            playlist: [],
            addSong: (song) => {
                const { playlist } = get();
                // 重複チェック
                if (!playlist.some((s) => s.id === song.id)) {
                    set({ playlist: [...playlist, song] });
                }
            },
            removeSong: (songId) => {
                set({
                    playlist: get().playlist.filter((s) => s.id !== songId),
                });
            },
            clearPlaylist: () => set({ playlist: [] }),
            isInPlaylist: (songId) => {
                return get().playlist.some((s) => s.id === songId);
            },
        }),
        {
            name: 'playlist-storage',
            storage: createJSONStorage(() => localStorage),
        }
    )
);
