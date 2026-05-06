import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { PrismaClient } from "@prisma/client";
import * as fs from "fs";
import * as path from "path";

const prisma = new PrismaClient();
const HISTORY_DIR = path.join(process.cwd(), "Spotify Extended Streaming History");

async function main() {
  console.log("Starting import process...");

  // Get the first user in DB
  const user = await prisma.user.findFirst();
  if (!user) {
    console.error("No user found in the database. Please log in first.");
    process.exit(1);
  }
  const userId = user.id;
  console.log(`Will import history for User ID: ${userId}`);

  // Fetch file list
  const files = fs.readdirSync(HISTORY_DIR).filter((f) => f.startsWith("Streaming_History_Audio_") && f.endsWith(".json"));
  console.log(`Found ${files.length} audio history files.`);

  let totalIgnored = 0;
  
  const tracksMap = new Map<string, { id: string; name: string; artist_name: string }>();
  const historyRecords: { user_id: string; track_id: string; played_at: Date; duration_ms: number }[] = [];

  for (const file of files) {
    console.log(`Reading ${file}...`);
    const filePath = path.join(HISTORY_DIR, file);
    const data = JSON.parse(fs.readFileSync(filePath, "utf-8"));

    for (const item of data) {
      // 音楽トラック以外（PodcastやLocalファイル等）は無視
      if (!item.spotify_track_uri || !item.master_metadata_track_name) {
        totalIgnored++;
        continue;
      }

      const trackId = item.spotify_track_uri.replace("spotify:track:", "");
      
      if (!tracksMap.has(trackId)) {
        tracksMap.set(trackId, {
          id: trackId,
          name: item.master_metadata_track_name,
          artist_name: item.master_metadata_album_artist_name || "Unknown Artist",
        });
      }

      historyRecords.push({
        user_id: userId,
        track_id: trackId,
        played_at: new Date(item.ts),
        duration_ms: item.ms_played,
      });
    }
  }

  console.log(`Parsing complete. Found ${tracksMap.size} unique tracks and ${historyRecords.length} history records.`);

  // Insert Tracks in chunks to prevent 'too many parameters' error in PostgreSQL
  const tracksArray = Array.from(tracksMap.values());
  const chunkSize = 2000;
  
  console.log("Upserting tracks...");
  for (let i = 0; i < tracksArray.length; i += chunkSize) {
    const chunk = tracksArray.slice(i, i + chunkSize);
    // Prisma does not support createMany with ignore duplicates perfectly across all DBs with returning, 
    // but we can use createMany with skipDuplicates.
    await prisma.track.createMany({
      data: chunk,
      skipDuplicates: true,
    });
    console.log(`  Inserted tracks ${i} to ${i + chunk.length}`);
  }

  console.log("Inserting play history...");
  for (let i = 0; i < historyRecords.length; i += chunkSize) {
    const chunk = historyRecords.slice(i, i + chunkSize);
    await prisma.playHistory.createMany({
      data: chunk,
      skipDuplicates: true,
    });
    console.log(`  Inserted histories ${i} to ${i + chunk.length} / ${historyRecords.length}`);
  }

  console.log("Import successfully completed!");
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error("Failed to import:", e);
  prisma.$disconnect();
  process.exit(1);
});
