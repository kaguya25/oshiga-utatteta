import { prisma } from "@/lib/prisma";

export type TimeRange = "day" | "week" | "month" | "year" | "all" | `${number}`;

function getStartDate(range: TimeRange): Date {
  const now = new Date();
  switch (range) {
    case "day":
      now.setDate(now.getDate() - 1);
      return now;
    case "week":
      now.setDate(now.getDate() - 7);
      return now;
    case "month":
      now.setMonth(now.getMonth() - 1);
      return now;
    case "year":
      now.setFullYear(now.getFullYear() - 1);
      return now;
    case "all":
      return new Date(0);
    default: {
      const year = parseInt(range, 10);
      if (!isNaN(year)) {
        return new Date(year, 0, 1);
      }
      return new Date(0);
    }
  }
}

/** サマリー統計: 総再生数・総視聴時間・ユニークアーティスト数・ユニーク曲数 */
export async function getListeningSummary(
  userId: string,
  range: TimeRange = "month"
) {
  const startDate = getStartDate(range);

  const [countResult, durationResult, uniqueTracks, uniqueArtists] =
    await Promise.all([
      prisma.playHistory.count({
        where: { user_id: userId, played_at: { gte: startDate } },
      }),
      prisma.playHistory.aggregate({
        where: { user_id: userId, played_at: { gte: startDate } },
        _sum: { duration_ms: true },
      }),
      prisma.playHistory.findMany({
        where: { user_id: userId, played_at: { gte: startDate } },
        distinct: ["track_id"],
        select: { track_id: true },
      }),
      prisma.$queryRaw<{ count: bigint }[]>`
        SELECT COUNT(DISTINCT t.artist_name) as count
        FROM play_history ph
        JOIN tracks t ON ph.track_id = t.id
        WHERE ph.user_id = ${userId}::uuid
        AND ph.played_at >= ${startDate}
      `,
    ]);

  const totalDurationMs = durationResult._sum.duration_ms || 0;

  return {
    totalPlays: countResult,
    totalDurationMs,
    totalDurationFormatted: formatDuration(totalDurationMs),
    uniqueTracks: uniqueTracks.length,
    uniqueArtists: Number(uniqueArtists[0]?.count ?? 0),
  };
}

function formatDuration(ms: number): string {
  const totalMinutes = Math.floor(ms / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours >= 24) {
    const days = Math.floor(hours / 24);
    const remainingHours = hours % 24;
    return `${days}日 ${remainingHours}時間 ${minutes}分`;
  }
  if (hours > 0) {
    return `${hours}時間 ${minutes}分`;
  }
  return `${minutes}分`;
}

/** 期間指定でユーザーの再生回数ランキングTop N (曲ごと) を取得 */
export async function getTopTracksByRange(
  userId: string,
  range: TimeRange = "month",
  limit: number = 10
) {
  const startDate = getStartDate(range);

  const groupedTracks = await prisma.playHistory.groupBy({
    by: ["track_id"],
    where: {
      user_id: userId,
      played_at: { gte: startDate },
    },
    _count: { id: true },
    _sum: { duration_ms: true },
    orderBy: { _count: { id: "desc" } },
    take: limit,
  });

  const topTracksWithDetails = await Promise.all(
    groupedTracks.map(async (group) => {
      const track = await prisma.track.findUnique({
        where: { id: group.track_id },
      });
      return {
        ...track,
        playCount: group._count.id,
        totalDurationMs: group._sum.duration_ms || 0,
      };
    })
  );

  return topTracksWithDetails;
}

/** アーティスト別の再生回数・視聴時間ランキング */
export async function getTopArtistsByRange(
  userId: string,
  range: TimeRange = "month",
  limit: number = 10
) {
  const startDate = getStartDate(range);

  const artists = await prisma.$queryRaw<
    {
      artist_name: string;
      play_count: bigint;
      total_duration_ms: bigint;
      track_count: bigint;
      top_track_image: string | null;
    }[]
  >`
    SELECT
      t.artist_name,
      COUNT(ph.id) as play_count,
      COALESCE(SUM(ph.duration_ms), 0) as total_duration_ms,
      COUNT(DISTINCT t.id) as track_count,
      (
        SELECT t2.album_image_url
        FROM tracks t2
        JOIN play_history ph2 ON t2.id = ph2.track_id
        WHERE t2.artist_name = t.artist_name
          AND ph2.user_id = ${userId}::uuid
          AND ph2.played_at >= ${startDate}
        GROUP BY t2.id, t2.album_image_url
        ORDER BY COUNT(ph2.id) DESC
        LIMIT 1
      ) as top_track_image
    FROM play_history ph
    JOIN tracks t ON ph.track_id = t.id
    WHERE ph.user_id = ${userId}::uuid
      AND ph.played_at >= ${startDate}
    GROUP BY t.artist_name
    ORDER BY play_count DESC
    LIMIT ${limit}
  `;

  return artists.map((a) => ({
    artist_name: a.artist_name,
    playCount: Number(a.play_count),
    totalDurationMs: Number(a.total_duration_ms),
    totalDurationFormatted: formatDuration(Number(a.total_duration_ms)),
    trackCount: Number(a.track_count),
    imageUrl: a.top_track_image,
  }));
}

/**
 * グラフ描画用：期間指定で再生回数＋視聴時間の推移データを取得
 * - day: 1時間ごと、week/month: 1日ごと、year: 1ヶ月ごと
 */
export async function getPlaybackTrends(
  userId: string,
  range: TimeRange = "month"
) {
  const startDate = getStartDate(range);

  const history = await prisma.playHistory.findMany({
    where: {
      user_id: userId,
      played_at: { gte: startDate },
    },
    select: {
      played_at: true,
      duration_ms: true,
    },
    orderBy: { played_at: "asc" },
  });

  const trendsMap = new Map<string, { plays: number; durationMs: number }>();

  history.forEach((play) => {
    const d = new Date(play.played_at);
    let key = "";

    switch (range) {
      case "day":
        key = `${(d.getMonth() + 1).toString().padStart(2, "0")}/${d
          .getDate()
          .toString()
          .padStart(2, "0")} ${d.getHours().toString().padStart(2, "0")}:00`;
        break;
      case "year":
        key = `${d.getFullYear()}/${(d.getMonth() + 1)
          .toString()
          .padStart(2, "0")}`;
        break;
      default:
        key = `${(d.getMonth() + 1).toString().padStart(2, "0")}/${d
          .getDate()
          .toString()
          .padStart(2, "0")}`;
        break;
    }

    const current = trendsMap.get(key) || { plays: 0, durationMs: 0 };
    current.plays += 1;
    current.durationMs += play.duration_ms;
    trendsMap.set(key, current);
  });

  return Array.from(trendsMap.entries()).map(([time, data]) => ({
    time,
    plays: data.plays,
    durationMin: Math.round(data.durationMs / 60000),
  }));
}

/** 曜日×時間帯のヒートマップデータ（7行×24列） */
export async function getListeningHeatmap(
  userId: string,
  range: TimeRange = "month"
) {
  const startDate = getStartDate(range);

  const history = await prisma.playHistory.findMany({
    where: {
      user_id: userId,
      played_at: { gte: startDate },
    },
    select: {
      played_at: true,
    },
  });

  // 7 days × 24 hours grid, initialized to 0
  const grid: number[][] = Array.from({ length: 7 }, () =>
    Array(24).fill(0)
  );

  history.forEach((play) => {
    const d = new Date(play.played_at);
    const dayOfWeek = d.getDay(); // 0=Sun, 6=Sat
    const hour = d.getHours();
    grid[dayOfWeek][hour] += 1;
  });

  return grid;
}
