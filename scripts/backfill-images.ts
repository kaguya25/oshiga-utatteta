import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { PrismaClient } from "@prisma/client";
import { getUserSpotifyToken } from "../lib/spotify";
import pLimit from "p-limit";

const prisma = new PrismaClient();
const limit = pLimit(5); // Concurrency limit

async function main() {
  console.log("Starting backfill for track metadata (Individual Fetch Mode)...");

  // Get user token
  let accessToken: string;
  try {
    accessToken = await getUserSpotifyToken();
  } catch (error) {
    console.error("Failed to get Spotify user token.");
    process.exit(1);
  }

  const tracks = await prisma.track.findMany({
    where: { 
      album_image_url: null,
      id: { not: "" }
    },
    take: 5000 // Process in chunks
  });

  console.log(`Found ${tracks.length} tracks missing metadata.`);

  const tasks = tracks.map((track) => 
    limit(async () => {
      try {
        const id = track.id;
        if (!id || id.length < 5) return;

        const res = await fetch(`https://api.spotify.com/v1/tracks/${id}`, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        });

        if (res.status === 429) {
          const retryAfter = parseInt(res.headers.get("Retry-After") || "5");
          console.log(`Rate limited. Waiting ${retryAfter} seconds...`);
          await new Promise((r) => setTimeout(r, retryAfter * 1000));
          return; // Skip and try again next run
        }

        if (res.status === 404) {
          console.log(`Track ${id} not found.`);
          return;
        }

        if (!res.ok) {
          console.error(`Error fetching track ${id}: ${res.status} ${res.statusText}`);
          return;
        }

        const st = await res.json();
        const imageUrl = st.album?.images?.[0]?.url;
        if (imageUrl) {
          await prisma.track.update({
            where: { id: st.id },
            data: { album_image_url: imageUrl },
          });
          console.log(`Updated ${st.id}: ${st.name}`);
        }
      } catch (error) {
        console.error(`Error processing track ${track.id}:`, error);
      }
    })
  );

  await Promise.all(tasks);
  console.log("Backfill completed!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
