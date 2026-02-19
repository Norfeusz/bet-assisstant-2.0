import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const jobs = await prisma.import_jobs.findMany({
  where: { id: { gte: 257, lte: 279 } },
  orderBy: { id: 'asc' },
  take: 3
});

jobs.forEach(job => {
  console.log(`\n=== Job #${job.id} ===`);
  console.log(`Status: ${job.status}`);
  console.log(`Type: ${job.job_type}`);
  console.log(`Imported: ${job.imported_matches}`);
  console.log(`Failed: ${job.failed_matches}`);
  console.log(`Date range: ${job.date_from?.toISOString().split('T')[0]} - ${job.date_to?.toISOString().split('T')[0]}`);
  console.log(`Leagues: ${job.league_ids}`);
  console.log(`Progress:`, JSON.stringify(job.progress, null, 2));
  console.log(`Created: ${job.created_at}`);
  console.log(`Completed: ${job.completed_at}`);
});

await prisma.$disconnect();
