import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkLeagues() {
  console.log('\n=== Leagues in Database ===\n');
  
  // Count by country
  const countsByCountry = await prisma.$queryRaw<Array<{ country: string; count: bigint }>>`
    SELECT country, COUNT(*) as count 
    FROM leagues 
    GROUP BY country 
    ORDER BY count DESC 
    LIMIT 20
  `;
  
  console.log('📊 Top 20 countries by league count:');
  countsByCountry.forEach(({ country, count }) => {
    console.log(`  ${country}: ${count}`);
  });
  
  // Check chosen leagues
  const chosenLeagues = await prisma.$queryRaw<Array<{ id: number; name: string; country: string }>>`
    SELECT id, name, country 
    FROM leagues 
    WHERE is_choosen = 'yes'
  `;
  
  console.log(`\n✅ Chosen leagues (is_choosen='yes'): ${chosenLeagues.length}`);
  if (chosenLeagues.length > 0) {
    chosenLeagues.forEach(l => {
      console.log(`  - ${l.country} - ${l.name} (ID: ${l.id})`);
    });
  }
  
  // Total count
  const totalResult = await prisma.$queryRaw<Array<{ count: bigint }>>`SELECT COUNT(*) as count FROM leagues`;
  const total = Number(totalResult[0].count);
  console.log(`\n📈 Total leagues in database: ${total}`);
  
  await prisma.$disconnect();
}

checkLeagues().catch(console.error);
