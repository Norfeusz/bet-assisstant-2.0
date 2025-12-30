/**
 * Populate leagues table with API IDs
 * Fetches all leagues from matches table and gets their API IDs
 */

import { PrismaClient } from '@prisma/client'
import { ApiFootballClient } from '../src/services/api-football-client'
import * as dotenv from 'dotenv'

dotenv.config()

const prisma = new PrismaClient()
const apiClient = new ApiFootballClient(process.env.API_FOOTBALL_KEY!)

// Additional leagues to add (from user's image)
const ADDITIONAL_LEAGUES = [
	{ country: 'Chile', name: 'Segunda División' },
	{ country: 'Cyprus', name: '2. Division' },
	{ country: 'Jordan', name: 'League' },
	{ country: 'Malta', name: 'Premier League' },
	{ country: 'Mauritania', name: 'Premier League' },
	{ country: 'Nigeria', name: 'NPFL' },
	{ country: 'Oman', name: 'Professional League' },
	{ country: 'Portugal', name: 'Liga 3' },
	{ country: 'Slovakia', name: 'Prva Liga' },
	{ country: 'Thailand', name: 'Thai League 2' },
	{ country: 'United-Arab-Emirates', name: 'Division 1' },
	{ country: 'Uruguay', name: 'Segunda División' },
]

async function getLeagueIdFromFixture(league: string, country: string): Promise<number | null> {
	try {
		// Get one fixture_id for this league
		const matches = await prisma.$queryRaw<Array<{ fixture_id: number }>>`
			SELECT fixture_id
			FROM matches
			WHERE league = ${league}
			AND country = ${country}
			AND fixture_id IS NOT NULL
			LIMIT 1
		`

		if (matches.length === 0 || !matches[0].fixture_id) {
			console.log(`  ⚠️  No fixture_id found for ${country} - ${league}`)
			return null
		}

		// Fetch fixture details from API
		const fixtureResponse = await apiClient.getFixtures({ id: matches[0].fixture_id })

		if (!fixtureResponse.response || fixtureResponse.response.length === 0) {
			console.log(`  ⚠️  No API response for fixture ${matches[0].fixture_id}`)
			return null
		}

		const leagueId = fixtureResponse.response[0].league.id
		console.log(`  ✅ ${country} - ${league}: API ID = ${leagueId}`)

		// Rate limit: wait between requests
		await new Promise(resolve => setTimeout(resolve, 100))

		return leagueId
	} catch (error: any) {
		console.error(`  ❌ Error getting API ID for ${country} - ${league}:`, error.message)
		return null
	}
}

async function getLeagueIdFromAPI(league: string, country: string): Promise<number | null> {
	try {
		const currentYear = new Date().getFullYear()
		
		// Try to find league by name and country through API
		const leagues = await apiClient.getLeagues({ season: currentYear })
		
		const found = leagues.response.find(l => 
			l.league.name === league && 
			(l.country.name === country || l.country.code === country)
		)

		if (found) {
			console.log(`  ✅ ${country} - ${league}: API ID = ${found.league.id}`)
			await new Promise(resolve => setTimeout(resolve, 100))
			return found.league.id
		}

		console.log(`  ⚠️  League not found in API: ${country} - ${league}`)
		return null
	} catch (error: any) {
		console.error(`  ❌ Error searching API for ${country} - ${league}:`, error.message)
		return null
	}
}

async function populateLeaguesTable() {
	console.log('\n=== Populating Leagues Table ===\n')

	// Step 1: Get all leagues from matches table
	console.log('📊 Fetching leagues from matches table...\n')
	const leaguesFromDB = await prisma.$queryRaw<Array<{ league: string; country: string }>>`
		SELECT DISTINCT league, country
		FROM matches
		ORDER BY country, league
	`

	console.log(`Found ${leaguesFromDB.length} leagues in database\n`)

	// Step 2: Process each league from DB
	let processed = 0
	let success = 0
	let failed = 0

	for (const league of leaguesFromDB) {
		processed++
		console.log(`[${processed}/${leaguesFromDB.length}] Processing: ${league.country} - ${league.league}`)

		const apiId = await getLeagueIdFromFixture(league.league, league.country)

		if (apiId) {
			try {
				await prisma.$executeRaw`
					INSERT INTO leagues (id, name, country, is_choosen)
					VALUES (${apiId}, ${league.league}, ${league.country}, 'no')
					ON CONFLICT (name, country) DO UPDATE
					SET id = ${apiId}
				`
				success++
			} catch (error: any) {
				console.error(`  ❌ Database error: ${error.message}`)
				failed++
			}
		} else {
			failed++
		}
	}

	// Step 3: Add additional leagues from user's list
	console.log(`\n📊 Adding ${ADDITIONAL_LEAGUES.length} additional leagues...\n`)

	for (const league of ADDITIONAL_LEAGUES) {
		processed++
		console.log(`[Additional] Processing: ${league.country} - ${league.name}`)

		const apiId = await getLeagueIdFromAPI(league.name, league.country)

		if (apiId) {
			try {
				await prisma.$executeRaw`
					INSERT INTO leagues (id, name, country, is_choosen)
					VALUES (${apiId}, ${league.name}, ${league.country}, 'no')
					ON CONFLICT (name, country) DO NOTHING
				`
				success++
			} catch (error: any) {
				console.error(`  ❌ Database error: ${error.message}`)
				failed++
			}
		} else {
			failed++
		}
	}

	console.log(`\n=== Summary ===`)
	console.log(`✅ Successfully added: ${success}`)
	console.log(`❌ Failed: ${failed}`)
	console.log(`📊 Total processed: ${processed}`)

	await prisma.$disconnect()
}

// Run
populateLeaguesTable().catch(error => {
	console.error('Fatal error:', error)
	process.exit(1)
})
