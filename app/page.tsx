'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { CoverSong } from '@/types';
import CoverSongCard from '@/components/CoverSongCard';
import SearchBar from '@/components/SearchBar';
import { useSession } from 'next-auth/react';
import { SpotifyTrackList } from '@/components/SpotifyStats/SpotifyTrackList';
import './page.css';

export default function Home() {
  const [songs, setSongs] = useState<CoverSong[]>([]);
  const [filteredSongs, setFilteredSongs] = useState<CoverSong[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [recentTracks, setRecentTracks] = useState<any[]>([]);
  const [mounted, setMounted] = useState(false);
  const { data: session } = useSession();

  useEffect(() => {
    setMounted(true);
  }, []);

  // Fetch cover songs from Supabase and recent tracks
  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data, error } = await supabase
          .from('cover_songs')
          .select('*')
          .order('published_at', { ascending: false });

        if (error) {
          console.error('Error fetching songs:', error);
        } else {
          setSongs(data || []);
          setFilteredSongs(data || []);
        }

        // Fetch recent tracks if logged in
        if (session) {
          const res = await fetch('/api/spotify/stats?range=day');
          if (res.ok) {
            const stats = await res.json();
            setRecentTracks(stats.topTracks?.slice(0, 4) || []);
          }
        }
      } catch (error) {
        console.error('Unexpected error:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [session]);

  // Filter songs based on search query
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredSongs(songs);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = songs.filter((song) => {
      return (
        song.song_title.toLowerCase().includes(query) ||
        song.vtuber_name.toLowerCase().includes(query) ||
        song.artist_name.toLowerCase().includes(query)
      );
    });

    setFilteredSongs(filtered);
  }, [searchQuery, songs]);

  const handleSearch = (query: string) => {
    setSearchQuery(query);
  };

  if (loading) {
    return (
      <div className="page-container">
        <div className="loading-container">
          <div className="spinner"></div>
          <p>読み込み中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <section className="hero-section">
        <div className="container">
          <h1 className="hero-title fade-in">
            推しが歌ってた楽曲を探そう
          </h1>
          <p className="hero-subtitle fade-in">
            推しがカバーしたあなたのお気に入りの曲を見つけて、<br />
            YouTubeとSpotifyで聴き比べよう
          </p>
          <div className="hero-search fade-in">
            <SearchBar onSearch={handleSearch} />
          </div>
        </div>
      </section>

      {mounted && session && recentTracks.length > 0 && (
        <section className="recent-history-section">
          <div className="container">
            <div className="section-header">
              <h2 className="section-title">最近聴いた曲</h2>
              <Link href="/spotify" className="view-more">すべて見る →</Link>
            </div>
            <div className="recent-tracks-grid">
              {recentTracks.map((track) => (
                <div key={track.id} className="mini-track-card">
                  {track.album_image_url ? (
                    <img src={track.album_image_url} alt={track.name} className="mini-track-img" />
                  ) : (
                    <div className="mini-track-placeholder">🎵</div>
                  )}
                  <div className="mini-track-info">
                    <p className="mini-track-name">{track.name}</p>
                    <p className="mini-track-artist">{track.artist_name}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      <section className="songs-section">
        <div className="container">
          {searchQuery && (
            <p className="search-results-text">
              「{searchQuery}」の検索結果: {filteredSongs.length}件
            </p>
          )}

          {filteredSongs.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">
                <svg
                  width="64"
                  height="64"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                >
                  <circle cx="11" cy="11" r="8"></circle>
                  <path d="m21 21-4.35-4.35"></path>
                </svg>
              </div>
              <h3>カバー曲が見つかりませんでした</h3>
              <p>別のキーワードで検索してみてください</p>
            </div>
          ) : (
            <div className="songs-grid grid grid-cols-4">
              {filteredSongs.map((song) => (
                <CoverSongCard key={song.id} song={song} />
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
