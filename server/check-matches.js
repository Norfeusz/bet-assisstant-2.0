import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

// Job 257: Liga 172 (pierwsza completed league)
const matches = await prisma.matches.findMany({
  where: {
    league_id: 172,
    match_date: {
      gte: new Date('2025-10-24'),
      lte: new Date('2025-11-01')
    }
  },
  take: 5,
  select: {
    match_id: true,
    match_date: true,
    home_team: true,
    away_team: true,
    is_finished: true,
    home_score: true,
    away_score: true
  }
});

console.log(`\n=== Liga 172, daty 2025-10-24 do 2025-11-01 ===`);
console.log(`Znalezionych meczów: ${matches.length}`);
matches.forEach(m => {
  console.log(`${m.match_date?.toISOString().split('T')[0]}: ${m.home_team} vs ${m.away_team} | Finished: ${m.is_finished} | ${m.home_score ?? '?'}-${m.away_score ?? '?'}`);
});

await prisma.$disconnect();
