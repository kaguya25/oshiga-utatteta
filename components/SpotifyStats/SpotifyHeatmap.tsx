"use client";

import { useMemo, useState } from "react";
import "./SpotifyHeatmap.css";

const DAY_LABELS = ["日", "月", "火", "水", "木", "金", "土"];
const HOUR_LABELS = Array.from({ length: 24 }, (_, i) => `${i}`);

interface SpotifyHeatmapProps {
  /** 7×24 grid: grid[dayOfWeek][hour] = play count */
  data: number[][] | null;
}

export function SpotifyHeatmap({ data }: SpotifyHeatmapProps) {
  const [tooltip, setTooltip] = useState<{
    day: number;
    hour: number;
    count: number;
    x: number;
    y: number;
  } | null>(null);

  const maxValue = useMemo(() => {
    if (!data) return 0;
    let max = 0;
    for (const row of data) {
      for (const val of row) {
        if (val > max) max = val;
      }
    }
    return max;
  }, [data]);

  if (!data || maxValue === 0) {
    return (
      <div className="spotify-tracks-empty">
        <div className="spotify-tracks-empty-icon">📊</div>
        <h3>この期間のヒートマップデータがありません</h3>
        <p>再生履歴が蓄積されると、リスニングパターンが表示されます。</p>
      </div>
    );
  }

  function getIntensity(count: number): number {
    if (count === 0 || maxValue === 0) return 0;
    return Math.ceil((count / maxValue) * 4);
  }

  return (
    <div className="heatmap-container">
      <h4 className="heatmap-title">リスニングパターン</h4>
      <p className="heatmap-subtitle">曜日と時間帯ごとの再生回数</p>

      <div className="heatmap-wrapper">
        {/* Hour labels (top) */}
        <div className="heatmap-hour-labels">
          <div className="heatmap-day-label-spacer" />
          {HOUR_LABELS.map((label, i) => (
            <div key={i} className="heatmap-hour-label">
              {i % 3 === 0 ? label : ""}
            </div>
          ))}
        </div>

        {/* Grid rows */}
        {DAY_LABELS.map((dayLabel, dayIndex) => (
          <div key={dayIndex} className="heatmap-row">
            <div className="heatmap-day-label">{dayLabel}</div>
            {HOUR_LABELS.map((_, hourIndex) => {
              const count = data[dayIndex]?.[hourIndex] ?? 0;
              const intensity = getIntensity(count);
              return (
                <div
                  key={hourIndex}
                  className={`heatmap-cell intensity-${intensity}`}
                  onMouseEnter={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    setTooltip({
                      day: dayIndex,
                      hour: hourIndex,
                      count,
                      x: rect.left + rect.width / 2,
                      y: rect.top,
                    });
                  }}
                  onMouseLeave={() => setTooltip(null)}
                />
              );
            })}
          </div>
        ))}

        {/* Legend */}
        <div className="heatmap-legend">
          <span className="heatmap-legend-label">少</span>
          <div className="heatmap-cell intensity-0 heatmap-legend-cell" />
          <div className="heatmap-cell intensity-1 heatmap-legend-cell" />
          <div className="heatmap-cell intensity-2 heatmap-legend-cell" />
          <div className="heatmap-cell intensity-3 heatmap-legend-cell" />
          <div className="heatmap-cell intensity-4 heatmap-legend-cell" />
          <span className="heatmap-legend-label">多</span>
        </div>
      </div>

      {/* Tooltip */}
      {tooltip && (
        <div
          className="heatmap-tooltip"
          style={{
            left: tooltip.x,
            top: tooltip.y - 8,
          }}
        >
          {DAY_LABELS[tooltip.day]}曜 {tooltip.hour}:00〜{tooltip.hour}:59
          <br />
          <strong>{tooltip.count} 再生</strong>
        </div>
      )}
    </div>
  );
}
