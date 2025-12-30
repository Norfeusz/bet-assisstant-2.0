import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function checkBets() {
  console.log('\n📊 Sprawdzanie danych w tabeli bets...\n')
  
  // Wszystkie rekordy
  const total = await prisma.bets.count()
  console.log(`Wszystkie typy: ${total}`)
  
  // Zweryfikowane (entered nie jest NULL ani pusty)
  const verified = await prisma.bets.count({
    where: {
      entered: { in: ['tak', 'TAK', 'nie', 'NIE'] }
    }
  })
  console.log(`Zweryfikowane: ${verified}`)
  
  // Trafione
  const won = await prisma.bets.count({
    where: {
      entered: { in: ['tak', 'TAK'] }
    }
  })
  console.log(`Trafione: ${won}`)
  
  // Nietrafione
  const lost = await prisma.bets.count({
    where: {
      entered: { in: ['nie', 'NIE'] }
    }
  })
  console.log(`Nietrafione: ${lost}`)
  
  // Oczekujące
  const pending = total - verified
  console.log(`Oczekujące: ${pending}`)
  
  // Przykładowe dane
  console.log('\n📋 Przykładowe rekordy:\n')
  const samples = await prisma.bets.findMany({
    take: 5,
    select: {
      id: true,
      home_team: true,
      away_team: true,
      bet_type: true,
      entered: true,
      match_date: true
    }
  })
  
  console.table(samples)
  
  // Sprawdź wartości w kolumnie entered
  console.log('\n🔍 Unikalne wartości w kolumnie "entered":\n')
  const uniqueEntered = await prisma.$queryRaw`
    SELECT entered, COUNT(*) as count 
    FROM bets 
    GROUP BY entered 
    ORDER BY count DESC
  `
  console.table(uniqueEntered)
  
  await prisma.$disconnect()
}

checkBets()
