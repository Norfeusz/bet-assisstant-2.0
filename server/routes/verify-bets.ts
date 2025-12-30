import express from 'express'
import { PrismaClient } from '@prisma/client'
import * as path from 'path'
import * as fs from 'fs'

const router = express.Router()
const prisma = new PrismaClient()

// Bet type mapping from Polish to internal names
const betTypeMap: Record<string, string> = {
	'gole mecz – over': 'goals_over',
	'gole mecz – under': 'goals_under',
	'gole mecz - over': 'goals_over',
	'gole mecz - under': 'goals_under',
	'Handi 1': 'handi_1',
	'Handi 2': 'handi_2',
	'BTS': 'bts',
	'Bez BTS': 'bts_no',
	'rożne mecz – over': 'corners_match_over',
	'rożne mecz – under': 'corners_match_under',
	'rożne mecz - over': 'corners_match_over',
	'rożne mecz - under': 'corners_match_under',
	'rożne 1 – over': 'corners_1_over',
	'rożne 2 – over': 'corners_2_over',
	'rożne 1 – under': 'corners_1_under',
	'rożne 2 – under': 'corners_2_under',
	'rożne 2 - over': 'corners_2_over',
	'Rożne 1 – over': 'corners_1_over',
	'Rożne 2 – over': 'corners_2_over',
	'Rożne 1 – under': 'corners_1_under',
	'Rożne 2 – under': 'corners_2_under',
	'Rożne 2 – handi': 'corners_2_handi',
	'Rożne 1 – handi': 'corners_1_handi',
	'spalone mecz – over': 'offsides_over',
	'spalone mecz – under': 'offsides_under',
	'spalone mecz - over': 'offsides_over',
	'spalone mecz - under': 'offsides_under',
	'spalone 1 – over': 'offsides_1_over',
	'spalone 2 – over': 'offsides_2_over',
	'spalone 1 – under': 'offsides_1_under',
	'spalone 2 – under': 'offsides_2_under',
	'spalone 1 – handi': 'offsides_1_handi',
	'spalone 2 – handi': 'offsides_2_handi',
	'żółte kartki mecz – over': 'yellow_cards_match_over',
	'żółte kartki mecz – under': 'yellow_cards_match_under',
	'żółte kartki mecz - over': 'yellow_cards_match_over',
	'żółte kartki mecz - under': 'yellow_cards_match_under',
	'żółte kartki 1 – over': 'yellow_cards_1_over',
	'żółte kartki 2 – over': 'yellow_cards_2_over',
	'żółte kartki 1 – under': 'yellow_cards_1_under',
	'żółte kartki 2 – under': 'yellow_cards_2_under',
}

// Google Sheets configuration
const SPREADSHEET_ID = process.env.GOOGLE_SHEETS_ID || ''

async function getGoogleSheetsClient() {
	const { google } = await import('googleapis')
	const credentialsPath = path.join(process.cwd(), 'config', 'google-sheets-config.json')
	
	if (!fs.existsSync(credentialsPath)) {
		throw new Error('config/google-sheets-config.json not found. Please create it based on config/google-sheets-config.json.example')
	}
	
	const credentials = JSON.parse(fs.readFileSync(credentialsPath, 'utf-8'))
	
	const auth = new google.auth.GoogleAuth({
		credentials,
		scopes: ['https://www.googleapis.com/auth/spreadsheets'],
	})
	
	const authClient = await auth.getClient()
	return google.sheets({ version: 'v4', auth: authClient })
}

interface BetVerificationResult {
	matchId: number
	homeGoals: number | null
	awayGoals: number | null
	homeCorners: number | null
	awayCorners: number | null
	homeOffsides: number | null
	awayOffsides: number | null
	isFinished: boolean
	verified: boolean
	result?: 'tak' | 'nie'
}

/**
 * Verify bet condition based on bet type and actual match results
 */
function verifyBetCondition(
	betType: string,
	betOption: string,
	homeGoals: number | null,
	awayGoals: number | null,
	homeCorners: number | null,
	awayCorners: number | null,
	homeOffsides: number | null,
	awayOffsides: number | null,
	homeYellowCards: number | null,
	awayYellowCards: number | null
): 'tak' | 'nie' | null {
	// If match data is missing, cannot verify
	if (homeGoals === null || awayGoals === null) {
		return null
	}

	// Convert Polish decimal format (comma) to JavaScript format (dot)
	const threshold = parseFloat(betOption.replace(',', '.'))

	switch (betType) {
		// Win bets
		case '1':
			return homeGoals > awayGoals ? 'tak' : 'nie'
		case '2':
			return homeGoals < awayGoals ? 'tak' : 'nie'

		// Both teams to score
		case 'bts':
			if (betOption.toLowerCase() === 'tak') {
				return homeGoals > 0 && awayGoals > 0 ? 'tak' : 'nie'
			} else {
				return homeGoals === 0 || awayGoals === 0 ? 'tak' : 'nie'
			}

		// Handicap 1
		case 'handi_1':
			return homeGoals + threshold > awayGoals ? 'tak' : 'nie'

		// Handicap 2
		case 'handi_2':
			return homeGoals < awayGoals + threshold ? 'tak' : 'nie'

		// Goals over/under
		case 'goals_over':
			return homeGoals + awayGoals > threshold ? 'tak' : 'nie'
		case 'goals_under':
			return homeGoals + awayGoals < threshold ? 'tak' : 'nie'

		// Corners - team 1
		case 'corners_1_over':
			if (homeCorners === null) return null
			return homeCorners > threshold ? 'tak' : 'nie'
		case 'corners_1_under':
			if (homeCorners === null) return null
			return homeCorners < threshold ? 'tak' : 'nie'

		// Corners - team 2
		case 'corners_2_over':
			if (awayCorners === null) return null
			return awayCorners > threshold ? 'tak' : 'nie'
		case 'corners_2_under':
			if (awayCorners === null) return null
			return awayCorners < threshold ? 'tak' : 'nie'

		// Corners - handicap
		case 'corners_1_handi':
			if (homeCorners === null || awayCorners === null) return null
			return homeCorners + threshold > awayCorners ? 'tak' : 'nie'
		case 'corners_2_handi':
			if (homeCorners === null || awayCorners === null) return null
			return homeCorners < awayCorners + threshold ? 'tak' : 'nie'

		// Corners - match total
		case 'corners_match_over':
		case 'corners_over':
			if (homeCorners === null || awayCorners === null) return null
			return homeCorners + awayCorners > threshold ? 'tak' : 'nie'
		case 'corners_match_under':
		case 'corners_under':
			if (homeCorners === null || awayCorners === null) return null
			return homeCorners + awayCorners < threshold ? 'tak' : 'nie'

		// Offsides - match
		case 'offsides_over':
			if (homeOffsides === null || awayOffsides === null) return null
			return homeOffsides + awayOffsides > threshold ? 'tak' : 'nie'
		case 'offsides_under':
			if (homeOffsides === null || awayOffsides === null) return null
			return homeOffsides + awayOffsides < threshold ? 'tak' : 'nie'

		// Offsides - team 1
		case 'offsides_1_over':
			if (homeOffsides === null) return null
			return homeOffsides > threshold ? 'tak' : 'nie'
		case 'offsides_1_under':
			if (homeOffsides === null) return null
			return homeOffsides < threshold ? 'tak' : 'nie'

		// Offsides - team 2
		case 'offsides_2_over':
			if (awayOffsides === null) return null
			return awayOffsides > threshold ? 'tak' : 'nie'
		case 'offsides_2_under':
			if (awayOffsides === null) return null
			return awayOffsides < threshold ? 'tak' : 'nie'

		// Offsides - handicap
		case 'offsides_1_handi':
			if (homeOffsides === null || awayOffsides === null) return null
			return homeOffsides + threshold > awayOffsides ? 'tak' : 'nie'
		case 'offsides_2_handi':
			if (homeOffsides === null || awayOffsides === null) return null
			return homeOffsides < awayOffsides + threshold ? 'tak' : 'nie'

		// Yellow cards - match (sum of yellow + red cards)
		case 'yellow_cards_match_over':
			if (homeYellowCards === null || awayYellowCards === null) return null
			return homeYellowCards + awayYellowCards > threshold ? 'tak' : 'nie'
		case 'yellow_cards_match_under':
			if (homeYellowCards === null || awayYellowCards === null) return null
			return homeYellowCards + awayYellowCards < threshold ? 'tak' : 'nie'

		// Yellow cards - team 1
		case 'yellow_cards_1_over':
			if (homeYellowCards === null) return null
			return homeYellowCards > threshold ? 'tak' : 'nie'
		case 'yellow_cards_1_under':
			if (homeYellowCards === null) return null
			return homeYellowCards < threshold ? 'tak' : 'nie'

		// Yellow cards - team 2
		case 'yellow_cards_2_over':
			if (awayYellowCards === null) return null
			return awayYellowCards > threshold ? 'tak' : 'nie'
		case 'yellow_cards_2_under':
			if (awayYellowCards === null) return null
			return awayYellowCards < threshold ? 'tak' : 'nie'

		default:
			console.warn(`Unknown bet type: ${betType}`)
			return null
	}
}

/**
 * GET /api/verify-bets
 * Verify bets in both "Typy" and "Kupony" sheets
 */
router.post('/verify-bets', async (req, res) => {
	console.log('='.repeat(80))
	console.log('🔍 [VERIFY-BETS] Endpoint called!')
	console.log('='.repeat(80))
	try {
		console.log('🔍 Starting bet verification...')

		// Get Google Sheets client
		const sheets = await getGoogleSheetsClient()

		// Process both sheets
		const sheetsToProcess = ['Typy', 'Kupony']
		let totalVerified = 0
		let totalUpdated = 0

		for (const sheetName of sheetsToProcess) {
			console.log(`\n📊 Processing sheet: ${sheetName}`)

			// Get all rows from sheet (columns A to AE - up to match_id)
			const range = `${sheetName}!A2:AE`
			const response = await sheets.spreadsheets.values.get({
				spreadsheetId: SPREADSHEET_ID,
				range,
			})

			const rows = response.data.values || []
			console.log(`Found ${rows.length} rows in ${sheetName}`)
			
			if (rows.length > 0) {
				console.log(`Sample first row columns: U=${rows[0][20]}, V=${rows[0][21]}, W=${rows[0][22]}, AD=${rows[0][29]}`)
			}

			const updates: any[] = []

			for (let i = 0; i < rows.length; i++) {
				const row = rows[i]
				const rowIndex = i + 2 // +2 because sheet starts at row 2 (row 1 is header)

				// Column U (index 20) = Wszedł?, Column V (index 21) = Wynik H, Column W (index 22) = Wynik A
				const entered = row[20] // Column U - Wszedł?
				const resultH = row[21] // Column V - Wynik H
				const resultA = row[22] // Column W - Wynik A
				const matchId = row[29] // Column AD - ID Meczu (index 29)

				// Skip if no match ID
				if (!matchId) {
					continue
				}

				// Skip if already has results (both columns filled with non-empty values)
				const hasResultH = resultH && String(resultH).trim() !== '' && String(resultH).trim() !== '-'
				const hasResultA = resultA && String(resultA).trim() !== '' && String(resultA).trim() !== '-'
				
				if (hasResultH && hasResultA) {
					continue
				}

				console.log(`🔍 Checking match ID: ${matchId}, Row: ${rowIndex}`)

				// Get match data from database by id (not fixture_id)
				const match = await prisma.matches.findUnique({
					where: {
						id: parseInt(matchId, 10),
					},
					select: {
						home_team: true,
						away_team: true,
						home_goals: true,
						away_goals: true,
						home_corners: true,
						away_corners: true,
						home_offsides: true,
						away_offsides: true,
						home_y_cards: true,
						away_y_cards: true,
						home_r_cards: true,
						away_r_cards: true,
						is_finished: true,
					},
				})

				if (!match) {
					console.log(`❌ Match ${matchId} not found in database`)
					continue
				}

				console.log(`✅ Found match: ${match.home_team} vs ${match.away_team}, finished: ${match.is_finished}`)

				// Skip if match not finished
				if (match.is_finished !== 'yes') {
					console.log(`⏳ Match ${matchId} not finished yet`)
					continue
				}

				totalVerified++

				// Get bet type and option from row
				const betType = row[2] // Column C - zakład
				const betOption = row[3] // Column D - typ

				// Normalize bet type (map Polish names to internal names)
				const normalizedBetType = betTypeMap[betType] || betType.toLowerCase()
				console.log(`Original bet type: ${betType}, normalized: ${normalizedBetType}`)

				// Calculate total yellow cards (yellow + red)
				const homeYellowCards = (match.home_y_cards || 0) + (match.home_r_cards || 0)
				const awayYellowCards = (match.away_y_cards || 0) + (match.away_r_cards || 0)

				// Verify bet condition
				const result = verifyBetCondition(
					normalizedBetType,
					betOption,
					match.home_goals,
					match.away_goals,
					match.home_corners,
					match.away_corners,
					match.home_offsides,
					match.away_offsides,
					homeYellowCards,
					awayYellowCards
				)

				if (result === null) {
					console.log(`⚠️ Cannot verify match ${matchId} - missing data`)
					continue
				}

				// Prepare update data based on bet type
				let homeResult: string | number = '-'
				let awayResult: string | number = '-'

				// Determine what to show in Wynik H and Wynik A columns (use normalized bet type)
				if (normalizedBetType === '1' || normalizedBetType === '2' || normalizedBetType === 'bts' || normalizedBetType.includes('goals') || normalizedBetType.includes('handi')) {
					homeResult = match.home_goals ?? '-'
					awayResult = match.away_goals ?? '-'
				} else if (normalizedBetType.includes('corners_1')) {
					homeResult = match.home_corners ?? '-'
					awayResult = '-'
				} else if (normalizedBetType.includes('corners_2')) {
					homeResult = '-'
					awayResult = match.away_corners ?? '-'
				} else if (normalizedBetType.includes('corners')) {
					homeResult = match.home_corners ?? '-'
					awayResult = match.away_corners ?? '-'
				} else if (normalizedBetType.includes('offsides_1')) {
					homeResult = match.home_offsides ?? '-'
					awayResult = '-'
				} else if (normalizedBetType.includes('offsides_2')) {
					homeResult = '-'
					awayResult = match.away_offsides ?? '-'
				} else if (normalizedBetType.includes('offsides')) {
					homeResult = match.home_offsides ?? '-'
					awayResult = match.away_offsides ?? '-'
				} else if (normalizedBetType.includes('yellow_cards_1')) {
					homeResult = homeYellowCards
					awayResult = '-'
				} else if (normalizedBetType.includes('yellow_cards_2')) {
					homeResult = '-'
					awayResult = awayYellowCards
				} else if (normalizedBetType.includes('yellow_cards')) {
					homeResult = homeYellowCards
					awayResult = awayYellowCards
				}

				// Add update for this row
				updates.push({
					range: `${sheetName}!U${rowIndex}:W${rowIndex}`,
					values: [[result, homeResult, awayResult]],
				})

				totalUpdated++
				console.log(`✅ Match ${matchId}: ${result} (${homeResult} - ${awayResult})`)
			}

			// Batch update all rows in this sheet
			if (updates.length > 0) {
				await sheets.spreadsheets.values.batchUpdate({
					spreadsheetId: SPREADSHEET_ID,
					requestBody: {
						valueInputOption: 'RAW',
						data: updates,
					},
				})
				console.log(`✅ Updated ${updates.length} rows in ${sheetName}`)
			} else {
				console.log(`ℹ️ No updates needed for ${sheetName}`)
			}
		}

		res.json({
			success: true,
			message: `Verified ${totalVerified} matches, updated ${totalUpdated} bets`,
			totalVerified,
			totalUpdated,
		})
	} catch (error) {
		console.error('❌ Error verifying bets:', error)
		res.status(500).json({
			success: false,
			error: error instanceof Error ? error.message : 'Unknown error',
		})
	}
})

export default router
