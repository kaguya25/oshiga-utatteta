import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const tracksCount = await prisma.track.count();
  const historyCount = await prisma.playHistory.count();
  
  console.log('--- Spotify Sync Status ---');
  console.log(`Saved Tracks: ${tracksCount}`);
  console.log(`Saved Play Histories: ${historyCount}`);

  // Fetch the latest history
  const latestHistory = await prisma.playHistory.findFirst({
    orderBy: { played_at: 'desc' },
    include: { track: true }
  });

  if (latestHistory) {
      console.log(`Latest play: [${latestHistory.played_at.toLocaleString()}] ${latestHistory.track.name} by ${latestHistory.track.artistName}`);
  } else {
      console.log('No play history found.');
  }

  await prisma.$disconnect();
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
