"use client";

import { useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";


type TrendData = {
  time: string;
  plays: number;
  durationMin: number;
};

interface TrendChartProps {
  data: TrendData[];
}

export function SpotifyTrendChart({ data }: TrendChartProps) {
  const [metric, setMetric] = useState<"plays" | "durationMin">("plays");

  if (!data || data.length === 0) {
    return (
      <div className="spotify-trend-empty">
        <p>データがありません</p>
      </div>
    );
  }

  const metricLabel = metric === "plays" ? "再生回数" : "視聴時間 (分)";
  const gradientId =
    metric === "plays" ? "colorPlays" : "colorDuration";
  const strokeColor = metric === "plays" ? "#1DB954" : "#1ed760";

  return (
    <div className="spotify-trend-chart-container">
      <div className="spotify-trend-metric-toggle">
        <button
          className={`spotify-trend-metric-btn ${metric === "plays" ? "active" : ""}`}
          onClick={() => setMetric("plays")}
        >
          再生回数
        </button>
        <button
          className={`spotify-trend-metric-btn ${metric === "durationMin" ? "active" : ""}`}
          onClick={() => setMetric("durationMin")}
        >
          視聴時間
        </button>
      </div>

      <div className="spotify-trend-chart">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={data}
            margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
          >
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={strokeColor} stopOpacity={0.8} />
                <stop
                  offset="95%"
                  stopColor={strokeColor}
                  stopOpacity={0}
                />
              </linearGradient>
            </defs>
            <CartesianGrid
              strokeDasharray="3 3"
              vertical={false}
              stroke="rgba(255,255,255,0.08)"
              opacity={0.4}
            />
            <XAxis
              dataKey="time"
              axisLine={false}
              tickLine={false}
              tick={{ fill: "#B3B3B3", fontSize: 12 }}
              dy={10}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fill: "#B3B3B3", fontSize: 12 }}
              tickFormatter={(v: number) =>
                metric === "durationMin" ? `${v}分` : `${v}回`
              }
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "#282828",
                boxShadow:
                  "0 4px 6px -1px rgb(0 0 0 / 0.3), 0 2px 4px -2px rgb(0 0 0 / 0.3)",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: "0.5rem",
                color: "#fff",
              }}
              labelStyle={{ color: "#B3B3B3", marginBottom: "4px" }}
              itemStyle={{ color: strokeColor }}
            />
            <Area
              type="monotone"
              dataKey={metric}
              stroke={strokeColor}
              strokeWidth={2}
              fillOpacity={1}
              fill={`url(#${gradientId})`}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
