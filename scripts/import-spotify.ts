/**
 * Spotify Extended Streaming History の一括インポートスクリプト
 *
 * 使い方:
 *   npx ts-node --compiler-options '{"module":"commonjs"}' scripts/import-spotify.ts <json-file-path> [user-id]
 *
 * Spotify の「データをダウンロード」で取得した JSON ファイルを DB に一括投入する。
 * 既存の再生履歴と重複するレコードはスキップされる（ユニーク制約: user_id + track_id + played_at）。
 */

import { PrismaClient } from "@prisma/client";
import * as fs from "fs";

const prisma = new PrismaClient();

interface SpotifyStreamingEntry {
  ts: string;
  master_metadata_track_name: string | null;
  master_metadata_album_artist_name: string | null;
  spotify_track_uri: string | null;
  ms_played: number;
}

async function main() {
  const filePath = process.argv[2];
  const userId = process.argv[3];

  if (!filePath) {
    console.error("Usage: ts-node scripts/import-spotify.ts <json-file> [user-id]");
    console.error("  json-file: Spotify Extended Streaming History JSON file path");
    console.error("  user-id:   (optional) Target user ID. If omitted, uses first Spotify user.");
    process.exit(1);
  }

  if (!fs.existsSync(filePath)) {
    console.error(`File not found: ${filePath}`);
    process.exit(1);
  }

  let targetUserId = userId;

  if (!targetUserId) {
    const account = await prisma.account.findFirst({
      where: { provider: "spotify" },
      select: { userId: true },
    });
    if (!account) {
      console.error("No Spotify account found in database. Please log in first or specify a user-id.");
      process.exit(1);
    }
    targetUserId = account.userId;
    console.log(`Using user: ${targetUserId}`);
  }

  const raw = fs.readFileSync(filePath, "utf-8");
  const entries: SpotifyStreamingEntry[] = JSON.parse(raw);

  console.log(`Found ${entries.length} entries in ${filePath}`);

  let imported = 0;
  let skipped = 0;

  for (const entry of entries) {
    if (!entry.spotify_track_uri || !entry.master_metadata_track_name) {
      skipped++;
      continue;
    }

    const trackId = entry.spotify_track_uri.replace("spotify:track:", "");

    await prisma.track.upsert({
      where: { id: trackId },
      update: {},
      create: {
        id: trackId,
        name: entry.master_metadata_track_name,
        artist_name: entry.master_metadata_album_artist_name || "Unknown",
        album_image_url: null,
      },
    });

    try {
      await prisma.playHistory.create({
        data: {
          user_id: targetUserId,
          track_id: trackId,
          played_at: new Date(entry.ts),
          duration_ms: entry.ms_played,
        },
      });
      imported++;
    } catch (e: unknown) {
      const prismaError = e as { code?: string };
      if (prismaError.code === "P2002") {
        skipped++;
      } else {
        console.error(`Error importing entry at ${entry.ts}:`, e);
      }
    }

    if ((imported + skipped) % 500 === 0) {
      console.log(`Progress: ${imported} imported, ${skipped} skipped`);
    }
  }

  console.log(`\nDone! Imported: ${imported}, Skipped: ${skipped}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
