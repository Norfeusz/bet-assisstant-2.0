import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

// Pobierz wszystkie niezakończone mecze z 6.02.2026 i grupuj po ligach
const unfinishedByLeague = await prisma.$queryRaw`
  SELECT 
    m.league,
    m.country,
    COUNT(*) as unfinished_count,
    STRING_AGG(m.home_team || ' vs ' || m.away_team, '; ') as matches
  FROM matches m
  WHERE m.match_date = '2026-02-06'::date
    AND m.is_finished = 'no'
  GROUP BY m.league, m.country
  ORDER BY unfinished_count DESC
`;

console.log(`\n=== Niezakończone mecze z 6.02.2026 po ligach ===`);
console.log(`Liczba lig: ${unfinishedByLeague.length}\n`);

unfinishedByLeague.forEach(row => {
  console.log(`${row.league} (${row.country}): ${row.unfinished_count} meczów`);
});

// Sprawdź które ligi były w zadaniu 277
const job = await prisma.import_jobs.findUnique({
  where: { id: 277 }
});

const completedLeagueIds = job.progress?.completed_leagues || [];
console.log(`\n=== Ligi w zadaniu 277 ===`);
console.log(`Liczba przetworzonych: ${completedLeagueIds.length}`);
console.log(`IDs: ${completedLeagueIds.sort((a, b) => a - b).join(', ')}`);

// Mapuj nazwy lig na IDs
const leagues = await prisma.leagues.findMany({
  where: {
    id: {
      in: completedLeagueIds
    }
  },
  select: {
    id: true,
    name: true,
    country: true
  }
});

console.log(`\n=== Przetworzone ligi (pierwsze 10) ===`);
leagues.slice(0, 10).forEach(l => {
  console.log(`[${l.id}] ${l.name} (${l.country})`);
});

// Sprawdź czy Girabola (Angola) była w zadaniu
const girabolaLeague = await prisma.leagues.findFirst({
  where: {
    name: 'Girabola',
    country: 'Angola'
  }
});

if (girabolaLeague) {
  const wasProcessed = completedLeagueIds.includes(girabolaLeague.id);
  console.log(`\n=== Girabola (Angola) ===`);
  console.log(`ID: ${girabolaLeague.id}`);
  console.log(`Była w zadaniu 277: ${wasProcessed ? 'TAK' : 'NIE'}`);
}

await prisma.$disconnect();
