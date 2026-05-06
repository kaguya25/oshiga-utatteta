import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import {
  getListeningSummary,
  getPlaybackTrends,
  getTopTracksByRange,
  getTopArtistsByRange,
  getListeningHeatmap,
  TimeRange,
} from "@/lib/spotify/stats";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const range = (searchParams.get("range") as TimeRange) || "month";

  try {
    const [summary, topTracks, topArtists, trends, heatmap] =
      await Promise.all([
        getListeningSummary(session.user.id, range),
        getTopTracksByRange(session.user.id, range, 50),
        getTopArtistsByRange(session.user.id, range, 20),
        getPlaybackTrends(session.user.id, range),
        getListeningHeatmap(session.user.id, range),
      ]);

    return NextResponse.json({
      summary,
      topTracks,
      topArtists,
      trends,
      heatmap,
    });
  } catch (error) {
    console.error("Error fetching stats:", error);
    return NextResponse.json(
      { error: "Failed to fetch stats" },
      { status: 500 }
    );
  }
}
