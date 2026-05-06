"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { SpotifySummaryCards } from "./SpotifySummaryCards";
import { SpotifyTrackList } from "./SpotifyTrackList";
import { SpotifyArtistList } from "./SpotifyArtistList";
import { SpotifyTrendChart } from "./SpotifyTrendChart";
import { SpotifyHeatmap } from "./SpotifyHeatmap";
import "./SpotifyStatsContainer.css";

type TimeRange = "day" | "week" | "month" | "year" | "all";
type TabId = "tracks" | "artists" | "trends" | "heatmap";

type SummaryData = {
  totalPlays: number;
  totalDurationMs: number;
  totalDurationFormatted: string;
  uniqueTracks: number;
  uniqueArtists: number;
};

type TrackType = {
  id: string;
  name: string;
  artist_name: string;
  album_image_url: string | null;
  playCount: number;
  totalDurationMs: number;
};

type ArtistType = {
  artist_name: string;
  playCount: number;
  totalDurationMs: number;
  totalDurationFormatted: string;
  trackCount: number;
  imageUrl: string | null;
};

type TrendData = {
  time: string;
  plays: number;
  durationMin: number;
};

type StatsData = {
  summary: SummaryData;
  topTracks: TrackType[];
  topArtists: ArtistType[];
  trends: TrendData[];
  heatmap: number[][];
};

const RANGE_OPTIONS: { value: TimeRange; label: string }[] = [
  { value: "day", label: "24時間" },
  { value: "week", label: "1週間" },
  { value: "month", label: "1ヶ月" },
  { value: "year", label: "1年" },
  { value: "all", label: "全期間" },
];

const TAB_OPTIONS: { id: TabId; label: string; icon: string }[] = [
  { id: "tracks", label: "Top Tracks", icon: "🎵" },
  { id: "artists", label: "Top Artists", icon: "🎤" },
  { id: "trends", label: "Trends", icon: "📈" },
  { id: "heatmap", label: "Heatmap", icon: "🗓️" },
];

export function SpotifyStatsContainer() {
  const { data: session } = useSession();
  const router = useRouter();
  const [range, setRange] = useState<TimeRange>("month");
  const [activeTab, setActiveTab] = useState<TabId>("tracks");
  const [data, setData] = useState<StatsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const fetchStats = async (selectedRange: TimeRange) => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/spotify/stats?range=${selectedRange}`);
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (error) {
      console.error("Failed to fetch stats", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      const res = await fetch("/api/spotify/sync", { method: "POST" });
      if (res.ok) {
        await fetchStats(range);
        router.refresh();
      } else {
        alert("同期に失敗しました。");
      }
    } catch (error) {
      console.error(error);
      alert("エラーが発生しました。");
    } finally {
      setIsSyncing(false);
    }
  };

  useEffect(() => {
    if (session) {
      fetchStats(range);
    }
  }, [range, session]);

  if (!mounted || !session) return null;

  return (
    <div className="spotify-stats-container">
      {/* Welcome header */}
      <div className="spotify-stats-welcome">
        <div>
          <h2 className="spotify-stats-welcome-title">
            Welcome back, {session.user?.name}
          </h2>
          <p className="spotify-stats-welcome-subtitle">
            あなたのリスニングデータを分析しました。
          </p>
        </div>
        <button
          onClick={handleSync}
          disabled={isSyncing}
          className="spotify-sync-btn"
        >
          {isSyncing ? "同期中..." : "🔄 データを同期"}
        </button>
      </div>

      {/* Summary cards */}
      {!isLoading && <SpotifySummaryCards summary={data?.summary || null} />}

      {/* Controls */}
      <div className="spotify-stats-controls">
        <h3 className="spotify-stats-title">Your Stats</h3>
        <div className="spotify-stats-controls-right">
          {/* Range selector */}
          <select
            value={range}
            onChange={(e) => setRange(e.target.value as TimeRange)}
            className="spotify-range-select"
          >
            {RANGE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>

          {/* Tab switcher */}
          <div className="spotify-tab-switcher">
            {TAB_OPTIONS.map((tab) => (
              <button
                key={tab.id}
                className={`spotify-tab-btn ${activeTab === tab.id ? "active" : ""}`}
                onClick={() => setActiveTab(tab.id)}
                title={tab.label}
              >
                <span className="spotify-tab-icon">{tab.icon}</span>
                <span className="spotify-tab-label">{tab.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="spotify-stats-content">
        {isLoading ? (
          <div className="spotify-stats-loading">
            <div className="spinner"></div>
            <p>データを読み込み中...</p>
          </div>
        ) : (
          <>
            {activeTab === "tracks" && (
              <SpotifyTrackList tracks={data?.topTracks || []} />
            )}
            {activeTab === "artists" && (
              <SpotifyArtistList artists={data?.topArtists || []} />
            )}
            {activeTab === "trends" && (
              <div className="spotify-trend-wrapper">
                <h4 className="spotify-trend-title">Playback Activity</h4>
                <SpotifyTrendChart data={data?.trends || []} />
              </div>
            )}
            {activeTab === "heatmap" && (
              <SpotifyHeatmap data={data?.heatmap || null} />
            )}
          </>
        )}
      </div>
    </div>
  );
}
