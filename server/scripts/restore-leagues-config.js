import { PrismaClient } from '@prisma/client'
import fs from 'fs'

const prisma = new PrismaClient()

async function restoreConfigFromDatabase() {
	// Get all unique leagues from database
	const leagues = await prisma.$queryRaw`
		SELECT DISTINCT 
			l.id,
			l.name,
			l.country
		FROM leagues l
		ORDER BY l.country, l.name
	`

	console.log(`Found ${leagues.length} leagues in database`)

	if (leagues.length === 0) {
		console.error('No leagues found in database!')
		process.exit(1)
	}

	// Add default values for missing fields
	const enrichedLeagues = leagues.map(league => ({
		id: league.id,
		name: league.name,
		country: league.country,
		type: 'League',
		priority: 3,
		enabled: true
	}))

	// Write to config file
	const configPath = 'data/leagues.json'
	fs.writeFileSync(configPath, JSON.stringify(enrichedLeagues, null, 2))

	console.log(`✅ Restored ${enrichedLeagues.length} leagues to ${configPath}`)

	await prisma.$disconnect()
}

restoreConfigFromDatabase().catch(console.error)
