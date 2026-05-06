"use client";

import { useSession } from "next-auth/react";
import SpotifyAuthButton from "@/components/SpotifyStats/SpotifyAuthButton";
import { SpotifyStatsContainer } from "@/components/SpotifyStats/SpotifyStatsContainer";
import "./page.css";

export default function SpotifyPage() {
  const { data: session, status } = useSession();

  if (status === "loading") {
    return (
      <div className="spotify-page">
        <div className="spotify-page-loading">
          <div className="spinner"></div>
          <p>読み込み中...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="spotify-page">
        <div className="spotify-hero">
          <div className="container">
            <div className="spotify-hero-logo">
              <svg viewBox="0 0 24 24" fill="black" className="spotify-hero-icon">
                <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" />
              </svg>
            </div>
            <h1 className="spotify-hero-title">Spotify Stats</h1>
            <p className="spotify-hero-subtitle">
              あなたの音楽を、データで振り返る。
            </p>

            <div className="spotify-features">
              <div className="spotify-feature-card">
                <span className="spotify-feature-icon">📊</span>
                <h3>再生ランキング</h3>
                <p>直近30日のトップ曲を自動集計</p>
              </div>
              <div className="spotify-feature-card">
                <span className="spotify-feature-icon">🔄</span>
                <h3>自動同期</h3>
                <p>再生履歴をバックグラウンドで取得</p>
              </div>
              <div className="spotify-feature-card">
                <span className="spotify-feature-icon">🎵</span>
                <h3>リスニング分析</h3>
                <p>あなたの音楽傾向を可視化</p>
              </div>
            </div>

            <div className="spotify-cta">
              <SpotifyAuthButton />
              <p className="spotify-cta-note">
                Spotifyアカウントで安全にログイン
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="spotify-page">
      <div className="container">
        <div className="spotify-dashboard">
          <SpotifyStatsContainer />
        </div>
      </div>
    </div>
  );
}
