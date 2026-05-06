"use client";

import { useEffect, useState } from "react";
import "./SpotifySummaryCards.css";

type SummaryData = {
  totalPlays: number;
  totalDurationMs: number;
  totalDurationFormatted: string;
  uniqueTracks: number;
  uniqueArtists: number;
};

interface SpotifySummaryCardsProps {
  summary: SummaryData | null;
}

function AnimatedNumber({ target, suffix = "" }: { target: number; suffix?: string }) {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    if (target === 0) {
      setCurrent(0);
      return;
    }

    const duration = 800;
    const steps = 30;
    const increment = target / steps;
    let step = 0;

    const timer = setInterval(() => {
      step++;
      if (step >= steps) {
        setCurrent(target);
        clearInterval(timer);
      } else {
        setCurrent(Math.floor(increment * step));
      }
    }, duration / steps);

    return () => clearInterval(timer);
  }, [target]);

  return (
    <span>
      {current.toLocaleString()}
      {suffix}
    </span>
  );
}

export function SpotifySummaryCards({ summary }: SpotifySummaryCardsProps) {
  if (!summary) return null;

  const cards = [
    {
      icon: "🎵",
      label: "総再生回数",
      value: summary.totalPlays,
      suffix: " 回",
      color: "#1DB954",
    },
    {
      icon: "⏱️",
      label: "総視聴時間",
      value: null,
      formatted: summary.totalDurationFormatted,
      color: "#1ed760",
    },
    {
      icon: "🎤",
      label: "アーティスト数",
      value: summary.uniqueArtists,
      suffix: " 組",
      color: "#b3b3b3",
    },
    {
      icon: "📀",
      label: "ユニーク曲数",
      value: summary.uniqueTracks,
      suffix: " 曲",
      color: "#535353",
    },
  ];

  return (
    <div className="summary-cards-grid">
      {cards.map((card) => (
        <div key={card.label} className="summary-card">
          <div className="summary-card-icon">{card.icon}</div>
          <div className="summary-card-value" style={{ color: card.color }}>
            {card.formatted ? (
              card.formatted
            ) : (
              <AnimatedNumber target={card.value!} suffix={card.suffix} />
            )}
          </div>
          <div className="summary-card-label">{card.label}</div>
        </div>
      ))}
    </div>
  );
}
