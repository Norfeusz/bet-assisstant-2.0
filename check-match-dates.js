import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function checkDates() {
  const results = await prisma.$queryRaw`
    SELECT match_date, COUNT(*) as mecze 
    FROM matches 
    WHERE match_date >= '2026-02-24' 
    GROUP BY match_date 
    ORDER BY match_date 
    LIMIT 5
  `
  
  console.log('Mecze w bazie od 24.02.2026:')
  console.table(results)
  
  await prisma.$disconnect()
}

checkDates()
