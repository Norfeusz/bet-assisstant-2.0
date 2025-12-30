/**
 * Simple script to update results for unfinished matches
 * Uses fixture_id to fetch updates from API
 */

import { PrismaClient } from '@prisma/client'
import { ApiFootballClient } from '../src/services/api-football-client'
import * as dotenv from 'dotenv'

dotenv.config()

const prisma = new PrismaClient()
const apiClient = new ApiFootballClient(process.env.API_FOOTBALL_KEY!)

async function updateResults(dateFrom?: string, dateTo?: string) {
	console.log('\n=== Updating Match Results ===\n')

	// Get unfinished matches with fixture_id
	const matches = await prisma.$queryRaw<Array<{
		id: number
		fixture_id: number
		match_date: Date
		home_team: string
		away_team: string
		league: string
		country: string
	}>>`
		SELECT id, fixture_id, match_date, home_team, away_team, league, country
		FROM matches
		WHERE is_finished = 'no' 
		AND fixture_id IS NOT NULL
		${dateFrom ? `AND match_date >= ${dateFrom}::date` : ''}
		${dateTo ? `AND match_date <= ${dateTo}::date` : ''}
		ORDER BY match_date ASC
		LIMIT 1000
	`

	console.log(`Found ${matches.length} unfinished matches to check\n`)

	let updated = 0
	let stillPending = 0
	let failed = 0

	for (const match of matches) {
		try {
			// Fetch fixture details from API
			const fixtureResponse = await apiClient.getFixtureDetails(match.fixture_id)
			
			if (!fixtureResponse.response || fixtureResponse.response.length === 0) {
				console.log(`⚠️  No data for fixture ${match.fixture_id}`)
				failed++
				continue
			}

			const fixture = fixtureResponse.response[0]
			const status = fixture.fixture.status.short

			// Check if match is finished
			if (['FT', 'AET', 'PEN'].includes(status)) {
				const homeGoals = fixture.goals.home
				const awayGoals = fixture.goals.away

				// Update match in database
				await prisma.$executeRaw`
					UPDATE matches
					SET 
						home_goals = ${homeGoals},
						away_goals = ${awayGoals},
						is_finished = 'yes',
						result = ${homeGoals > awayGoals ? 'h-win' : homeGoals < awayGoals ? 'a-win' : 'draw'}
					WHERE id = ${match.id}
				`

				console.log(`✅ Updated: ${match.home_team} ${homeGoals}-${awayGoals} ${match.away_team} (${match.league})`)
				updated++
			} else {
				console.log(`⏳ Still pending: ${match.home_team} vs ${match.away_team} (status: ${status})`)
				stillPending++
			}

			// Rate limit: wait between requests
			await new Promise(resolve => setTimeout(resolve, 100))

		} catch (error: any) {
			console.error(`❌ Error updating match ${match.id}:`, error.message)
			failed++
		}
	}

	console.log(`\n=== Summary ===`)
	console.log(`✅ Updated: ${updated}`)
	console.log(`⏳ Still pending: ${stillPending}`)
	console.log(`❌ Failed: ${failed}`)

	await prisma.$disconnect()
}

// Run with optional date range
const args = process.argv.slice(2)
const dateFrom = args[0]
const dateTo = args[1]

updateResults(dateFrom, dateTo)
	.catch(error => {
		console.error('Fatal error:', error)
		process.exit(1)
	})
