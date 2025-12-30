import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

async function updateCsvIds() {
  console.log('=== Updating Lista rozgrywek.csv with IDs ===\n');

  // Read current CSV
  const csvPath = path.join(__dirname, '..', 'public', 'Lista rozgrywek.csv');
  const csvContent = fs.readFileSync(csvPath, 'utf-8');
  const lines = csvContent.split('\n');
  
  // Get all leagues from database
  const leagues = await prisma.$queryRaw<Array<{ id: number; name: string; country: string }>>`
    SELECT id, name, country FROM leagues
  `;
  
  console.log(`📊 Found ${leagues.length} leagues in database`);
  
  // Create lookup map: "Country__League" -> ID
  const leagueMap = new Map<string, number>();
  leagues.forEach(league => {
    const key = `${league.country}__${league.name}`;
    leagueMap.set(key, league.id);
  });
  
  // Process CSV lines
  const updatedLines: string[] = [];
  let matched = 0;
  let notMatched = 0;
  
  for (let i = 0; i < lines.length; i++) {
    if (i === 0) {
      // Header line
      updatedLines.push(lines[i]);
      continue;
    }
    
    const line = lines[i].trim();
    if (!line) {
      updatedLines.push(line);
      continue;
    }
    
    // Parse CSV line (handle commas in quoted strings)
    const parts = line.split(',');
    if (parts.length < 3) {
      updatedLines.push(line);
      continue;
    }
    
    const country = parts[1]?.trim();
    const leagueName = parts[2]?.trim();
    
    if (!country || !leagueName) {
      updatedLines.push(line);
      continue;
    }
    
    // Find matching ID
    const key = `${country}__${leagueName}`;
    const id = leagueMap.get(key);
    
    if (id) {
      // Replace empty first column with ID
      parts[0] = id.toString();
      updatedLines.push(parts.join(','));
      matched++;
      console.log(`✅ ${country} - ${leagueName}: ID = ${id}`);
    } else {
      // Keep line as is
      updatedLines.push(line);
      notMatched++;
      console.log(`❌ ${country} - ${leagueName}: No matching ID found`);
    }
  }
  
  // Write updated CSV
  fs.writeFileSync(csvPath, updatedLines.join('\n'), 'utf-8');
  
  console.log(`\n📝 Summary:`);
  console.log(`✅ Matched: ${matched}`);
  console.log(`❌ Not matched: ${notMatched}`);
  console.log(`💾 Updated file: ${csvPath}`);
  
  await prisma.$disconnect();
}

updateCsvIds().catch(console.error);
