import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

// Sprawdź czy istnieje tabela leagues
const league = await prisma.leagues.findUnique({
  where: { id: 172 }
});

console.log(`\n=== Liga ID 172 ===`);
console.log(JSON.stringify(league, null, 2));

// Sprawdź mecze z tą ligą (po nazwie)
if (league) {
  const matches = await prisma.matches.findMany({
    where: {
      league: league.name,
      country: league.country,
      match_date: {
        gte: new Date('2025-10-24'),
        lte: new Date('2025-11-01')
      }
    },
    take: 3,
    select: {
      id: true,
      match_date: true,
      home_team: true,
      away_team: true,
      is_finished: true,
      home_goals: true,
      away_goals: true
    }
  });
  
  console.log(`\n=== Mecze ${league.name} (${league.country}) w dacie 2025-10-24 do 2025-11-01 ===`);
  console.log(`Znalezionych meczów: ${matches.length}`);
  matches.forEach(m => {
    console.log(`${m.match_date?.toISOString().split('T')[0]}: ${m.home_team} vs ${m.away_team} | Finished: ${m.is_finished} | ${m.home_goals ?? '?'}-${m.away_goals ?? '?'}`);
  });
}

await prisma.$disconnect();
