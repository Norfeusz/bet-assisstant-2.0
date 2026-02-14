import express from 'express'
import * as path from 'path'
import * as fs from 'fs'

const router = express.Router()

// Google Sheets configuration
const SPREADSHEET_ID = process.env.GOOGLE_SHEETS_ID || ''

async function getGoogleSheetsClient() {
	const { google } = await import('googleapis')
	const credentialsPath = path.join(process.cwd(), 'config', 'google-sheets-config.json')
	
	if (!fs.existsSync(credentialsPath)) {
		throw new Error('config/google-sheets-config.json not found')
	}
	
	const credentials = JSON.parse(fs.readFileSync(credentialsPath, 'utf-8'))
	
	const auth = new google.auth.GoogleAuth({
		credentials,
		scopes: ['https://www.googleapis.com/auth/spreadsheets'],
	})
	
	const authClient = await auth.getClient() as any
	return google.sheets({ version: 'v4', auth: authClient })
}

interface BetAnalytics {
	id: number
	homeTeam: string
	awayTeam: string
	betType: string
	betOption: string
	szanse: string | null
	odds: number | null
	// Statistics
	stat5HOverall: string | null
	stat5AOverall: string | null
	stat5HHa: string | null
	stat5AHa: string | null
	stat10HOverall: string | null
	stat10AOverall: string | null
	stat10HHa: string | null
	stat10AHa: string | null
	stat15HOverall: string | null
	stat15AOverall: string | null
	stat15HHa: string | null
	stat15AHa: string | null
	// Result verification
	entered: string | null // TAK/NIE
	resultHome: number | null
	resultAway: number | null
	standingHome: number | null
	standingAway: number | null
	// Context
	country: string | null
	league: string | null
	matchDate: Date | null
	matchId: number | null
}

/**
 * Get all bets with analytics data from Google Sheets
 * Query params:
 *   - sheet: 'typy' | 'kupony' (default: 'typy')
 *   - verified, betType, league: filters
 */
router.get('/analytics/bets', async (req, res) => {
	try {
		if (!SPREADSHEET_ID) {
			return res.status(500).json({ error: 'GOOGLE_SHEETS_ID not configured in .env' })
		}

		const sheets = await getGoogleSheetsClient()
		
		// Wybór arkusza na podstawie parametru
		const { sheet = 'typy' } = req.query
		const sheetName = sheet === 'kupony' ? 'Kupony' : 'Typy'
		
		// Pobierz dane z wybranego arkusza (kolumny A-AG)
		const response = await sheets.spreadsheets.values.get({
			spreadsheetId: SPREADSHEET_ID,
			range: `${sheetName}!A:AG`,
		})

		const rows = response.data.values || []
		
		if (rows.length <= 1) {
			return res.json({ success: true, count: 0, data: [] })
		}

		// Pomiń nagłówek (pierwszy wiersz)
		const dataRows = rows.slice(1)
		
		// Mapowanie kolumn według dokumentacji:
		// A-Gospodarze, B-Goście, C-Zakład, D-Typ, E-Szanse, F-Kurs, G-Moc beta
		// H-S: Statystyki (5/10/15 H/A)
		// T-Kupon, U-Wszedł, V-Wynik H, W-Wynik A, X-#1, Y-#2
		// Z-Komentarz, AA-Kraj, AB-Liga, AC-Data, AD-ID Meczu
		
		const analytics: BetAnalytics[] = dataRows.map((row, index) => ({
			id: index + 1,
			homeTeam: row[0] || '',
			awayTeam: row[1] || '',
			betType: row[2] || '',
			betOption: row[3] || '',
			szanse: row[4] || null,
			odds: row[5] ? parseFloat(row[5].replace(',', '.')) : null,
			stat5HOverall: row[7] || null,   // H
			stat5AOverall: row[8] || null,   // I
			stat5HHa: row[9] || null,        // J
			stat5AHa: row[10] || null,       // K
			stat10HOverall: row[11] || null, // L
			stat10AOverall: row[12] || null, // M
			stat10HHa: row[13] || null,      // N
			stat10AHa: row[14] || null,      // O
			stat15HOverall: row[15] || null, // P
			stat15AOverall: row[16] || null, // Q
			stat15HHa: row[17] || null,      // R
			stat15AHa: row[18] || null,      // S
			entered: row[20] || null,        // U - Wszedł
			resultHome: row[21] ? parseInt(row[21]) : null,  // V
			resultAway: row[22] ? parseInt(row[22]) : null,  // W
			standingHome: row[23] ? parseInt(row[23]) : null, // X
			standingAway: row[24] ? parseInt(row[24]) : null, // Y
			country: row[26] || null,        // AA
			league: row[27] || null,         // AB
			matchDate: row[28] ? new Date(row[28]) : null, // AC
			matchId: row[29] ? parseInt(row[29]) : null    // AD
		}))

		// Filtry
		const { verified, betType, league } = req.query
		let filtered = analytics

		if (verified === 'true') {
			filtered = filtered.filter(b => 
				b.entered && (b.entered.toLowerCase() === 'tak' || b.entered.toLowerCase() === 'nie')
			)
		} else if (verified === 'false') {
			filtered = filtered.filter(b => !b.entered || b.entered === '')
		}

		if (betType) {
			filtered = filtered.filter(b => b.betType === betType)
		}

		if (league) {
			filtered = filtered.filter(b => b.league === league)
		}

		res.json({
			success: true,
			count: filtered.length,
			data: filtered
		})
	} catch (error: any) {
		console.error('[Analytics] Error fetching bets from Sheets:', error)
		res.status(500).json({ error: error.message })
	}
})

/**
 * Get statistical summary from Google Sheets
 * Query params:
 *   - sheet: 'typy' | 'kupony' (default: 'typy')
 */
router.get('/analytics/summary', async (req, res) => {
	try {
		if (!SPREADSHEET_ID) {
			return res.status(500).json({ error: 'GOOGLE_SHEETS_ID not configured in .env' })
		}

		const sheets = await getGoogleSheetsClient()
		
		// Wybór arkusza na podstawie parametru
		const { sheet = 'typy' } = req.query
		const sheetName = sheet === 'kupony' ? 'Kupony' : 'Typy'
		
		const response = await sheets.spreadsheets.values.get({
			spreadsheetId: SPREADSHEET_ID,
			range: `${sheetName}!A:AG`,
		})

		const rows = response.data.values || []
		
		if (rows.length <= 1) {
			return res.json({
				success: true,
				summary: { total: 0, won: 0, lost: 0, pending: 0, winRate: 0 },
				byBetType: {},
				byLeague: {}
			})
		}

		const dataRows = rows.slice(1)
		const bets = dataRows.map(row => ({
			betType: row[2] || 'Unknown',
			league: row[27] || 'Unknown',
			entered: row[20] || null
		}))

		const total = bets.filter(b => b.entered && (b.entered.toLowerCase() === 'tak' || b.entered.toLowerCase() === 'nie')).length
		const won = bets.filter(b => b.entered?.toLowerCase() === 'tak').length
		const lost = bets.filter(b => b.entered?.toLowerCase() === 'nie').length
		const pending = bets.filter(b => !b.entered || b.entered === '').length
		const winRate = total > 0 ? (won / total * 100) : 0

		// Group by bet type
		const byBetType: Record<string, { total: number, won: number, lost: number }> = {}
		bets.forEach(bet => {
			if (!bet.entered || (bet.entered.toLowerCase() !== 'tak' && bet.entered.toLowerCase() !== 'nie')) {
				return
			}
			const type = bet.betType
			if (!byBetType[type]) {
				byBetType[type] = { total: 0, won: 0, lost: 0 }
			}
			byBetType[type].total++
			if (bet.entered.toLowerCase() === 'tak') byBetType[type].won++
			if (bet.entered.toLowerCase() === 'nie') byBetType[type].lost++
		})

		// Group by league
		const byLeague: Record<string, { total: number, won: number, lost: number }> = {}
		bets.forEach(bet => {
			if (!bet.entered || (bet.entered.toLowerCase() !== 'tak' && bet.entered.toLowerCase() !== 'nie')) {
				return
			}
			const league = bet.league
			if (!byLeague[league]) {
				byLeague[league] = { total: 0, won: 0, lost: 0 }
			}
			byLeague[league].total++
			if (bet.entered.toLowerCase() === 'tak') byLeague[league].won++
			if (bet.entered.toLowerCase() === 'nie') byLeague[league].lost++
		})

		res.json({
			success: true,
			summary: {
				total,
				won,
				lost,
				pending,
				winRate: parseFloat(winRate.toFixed(2))
			},
			byBetType,
			byLeague
		})
	} catch (error: any) {
		console.error('[Analytics] Error generating summary from Sheets:', error)
		res.status(500).json({ error: error.message })
	}
})

/**
 * Get matches from Bet Builder sheet
 * Returns list of matches with their bet data for selection
 */
router.get('/analytics/bet-builder', async (req, res) => {
	try {
		if (!SPREADSHEET_ID) {
			return res.status(500).json({ error: 'GOOGLE_SHEETS_ID not configured in .env' })
		}

		const sheets = await getGoogleSheetsClient()
		
		// Pobierz dane z arkusza "Bet Builder"
		const response = await sheets.spreadsheets.values.get({
			spreadsheetId: SPREADSHEET_ID,
			range: 'Bet Builder!A:AG',
		})

		const rows = response.data.values || []
		
		if (rows.length <= 1) {
			return res.json({ success: true, count: 0, data: [] })
		}

		// Pomiń nagłówek
		const dataRows = rows.slice(1)
		
		// Mapowanie kolumn (taka sama struktura jak Typy/Kupony)
		const matches: BetAnalytics[] = dataRows.map((row, index) => ({
			id: index + 1,
			homeTeam: row[0] || '',
			awayTeam: row[1] || '',
			betType: row[2] || '',
			betOption: row[3] || '',
			szanse: row[4] || null,
			odds: row[5] ? parseFloat(row[5].replace(',', '.')) : null,
			stat5HOverall: row[7] || null,
			stat5AOverall: row[8] || null,
			stat5HHa: row[9] || null,
			stat5AHa: row[10] || null,
			stat10HOverall: row[11] || null,
			stat10AOverall: row[12] || null,
			stat10HHa: row[13] || null,
			stat10AHa: row[14] || null,
			stat15HOverall: row[15] || null,
			stat15AOverall: row[16] || null,
			stat15HHa: row[17] || null,
			stat15AHa: row[18] || null,
			entered: row[20] || null,
			resultHome: row[21] ? parseInt(row[21]) : null,
			resultAway: row[22] ? parseInt(row[22]) : null,
			standingHome: row[23] ? parseInt(row[23]) : null,
			standingAway: row[24] ? parseInt(row[24]) : null,
			country: row[26] || null,
			league: row[27] || null,
			matchDate: row[28] ? new Date(row[28]) : null,
			matchId: row[29] ? parseInt(row[29]) : null
		}))

		res.json({
			success: true,
			count: matches.length,
			data: matches
		})
	} catch (error: any) {
		console.error('[Analytics] Error fetching Bet Builder from Sheets:', error)
		res.status(500).json({ error: error.message })
	}
})

/**
 * Calculate correlations between variables and success rate from Google Sheets
 */
router.get('/analytics/correlations', async (req, res) => {
	try {
		if (!SPREADSHEET_ID) {
			return res.status(500).json({ error: 'GOOGLE_SHEETS_ID not configured in .env' })
		}

		const sheets = await getGoogleSheetsClient()
		const response = await sheets.spreadsheets.values.get({
			spreadsheetId: SPREADSHEET_ID,
			range: 'Typy!A:AG',
		})

		const rows = response.data.values || []
		
		if (rows.length <= 1) {
			return res.json({
				success: true,
				message: 'No data found',
				correlations: {}
			})
		}

		const dataRows = rows.slice(1)
		const bets = dataRows.filter(row => {
			const entered = row[20]?.toLowerCase()
			return entered === 'tak' || entered === 'nie'
		})

		if (bets.length === 0) {
			return res.json({
				success: true,
				message: 'No verified bets found',
				correlations: {}
			})
		}

		// Helper: parse percentage string (e.g., "75%" -> 0.75)
		const parsePercent = (val: string | null): number | null => {
			if (!val) return null
			const match = val.match(/(\d+(?:\.\d+)?)/)
			return match ? parseFloat(match[1]) / 100 : null
		}

		// Helper: calculate correlation
		const calculateCorrelation = (x: number[], y: number[]): number => {
			const n = x.length
			if (n === 0) return 0

			const meanX = x.reduce((a, b) => a + b, 0) / n
			const meanY = y.reduce((a, b) => a + b, 0) / n

			let numerator = 0
			let denomX = 0
			let denomY = 0

			for (let i = 0; i < n; i++) {
				const dx = x[i] - meanX
				const dy = y[i] - meanY
				numerator += dx * dy
				denomX += dx * dx
				denomY += dy * dy
			}

			const denom = Math.sqrt(denomX * denomY)
			return denom === 0 ? 0 : numerator / denom
		}

		// Prepare data for correlation analysis
		const data: {
			success: number[]
			stat5HOverall: number[]
			stat5AOverall: number[]
			stat5HHa: number[]
			stat5AHa: number[]
			stat10HOverall: number[]
			stat10AOverall: number[]
			stat10HHa: number[]
			stat10AHa: number[]
			stat15HOverall: number[]
			stat15AOverall: number[]
			odds: number[]
			standingDiff: number[]
			avgStanding: number[]
		} = {
			success: [],
			stat5HOverall: [],
			stat5AOverall: [],
			stat5HHa: [],
			stat5AHa: [],
			stat10HOverall: [],
			stat10AOverall: [],
			stat10HHa: [],
			stat10AHa: [],
			stat15HOverall: [],
			stat15AOverall: [],
			odds: [],
			standingDiff: [],
			avgStanding: []
		}

		bets.forEach(row => {
			const isSuccess = row[20]?.toLowerCase() === 'tak' ? 1 : 0
			
			const s5ho = parsePercent(row[7])   // H
			const s5ao = parsePercent(row[8])   // I
			const s5hh = parsePercent(row[9])   // J
			const s5ah = parsePercent(row[10])  // K
			const s10ho = parsePercent(row[11]) // L
			const s10ao = parsePercent(row[12]) // M
			const s10hh = parsePercent(row[13]) // N
			const s10ah = parsePercent(row[14]) // O
			const s15ho = parsePercent(row[15]) // P
			const s15ao = parsePercent(row[16]) // Q
			// Pomijamy R (15 H % H/A) i S (15 A % H/A)
			
			// Sprawdź ile statystyk jest dostępnych (musi być co najmniej 6 z 10)
			const stats = [s5ho, s5ao, s5hh, s5ah, s10ho, s10ao, s10hh, s10ah, s15ho, s15ao]
			const availableStats = stats.filter(s => s !== null).length
			
			if (availableStats >= 6) {
				data.success.push(isSuccess)
				if (s5ho !== null) data.stat5HOverall.push(s5ho)
				if (s5ao !== null) data.stat5AOverall.push(s5ao)
				if (s5hh !== null) data.stat5HHa.push(s5hh)
				if (s5ah !== null) data.stat5AHa.push(s5ah)
				if (s10ho !== null) data.stat10HOverall.push(s10ho)
				if (s10ao !== null) data.stat10AOverall.push(s10ao)
				if (s10hh !== null) data.stat10HHa.push(s10hh)
				if (s10ah !== null) data.stat10AHa.push(s10ah)
				if (s15ho !== null) data.stat15HOverall.push(s15ho)
				if (s15ao !== null) data.stat15AOverall.push(s15ao)
				
				// Odds - kolumna F
				const odds = row[5] ? parseFloat(row[5].replace(',', '.')) : null
				if (odds) {
					data.odds.push(odds)
				}
				
				// Standing difference and average - kolumny X, Y
				const standingHome = row[23] ? parseInt(row[23]) : null
				const standingAway = row[24] ? parseInt(row[24]) : null
				if (standingHome && standingAway) {
					data.standingDiff.push(Math.abs(standingHome - standingAway))
					data.avgStanding.push((standingHome + standingAway) / 2)
				}
			}
		})

		// Calculate correlations
		const correlations = {
			stat5HOverall: data.stat5HOverall.length > 0 ? calculateCorrelation(data.stat5HOverall, data.success.slice(0, data.stat5HOverall.length)) : 0,
			stat5AOverall: data.stat5AOverall.length > 0 ? calculateCorrelation(data.stat5AOverall, data.success.slice(0, data.stat5AOverall.length)) : 0,
			stat5HHa: data.stat5HHa.length > 0 ? calculateCorrelation(data.stat5HHa, data.success.slice(0, data.stat5HHa.length)) : 0,
			stat5AHa: data.stat5AHa.length > 0 ? calculateCorrelation(data.stat5AHa, data.success.slice(0, data.stat5AHa.length)) : 0,
			stat10HOverall: data.stat10HOverall.length > 0 ? calculateCorrelation(data.stat10HOverall, data.success.slice(0, data.stat10HOverall.length)) : 0,
			stat10AOverall: data.stat10AOverall.length > 0 ? calculateCorrelation(data.stat10AOverall, data.success.slice(0, data.stat10AOverall.length)) : 0,
			stat10HHa: data.stat10HHa.length > 0 ? calculateCorrelation(data.stat10HHa, data.success.slice(0, data.stat10HHa.length)) : 0,
			stat10AHa: data.stat10AHa.length > 0 ? calculateCorrelation(data.stat10AHa, data.success.slice(0, data.stat10AHa.length)) : 0,
			stat15HOverall: data.stat15HOverall.length > 0 ? calculateCorrelation(data.stat15HOverall, data.success.slice(0, data.stat15HOverall.length)) : 0,
			stat15AOverall: data.stat15AOverall.length > 0 ? calculateCorrelation(data.stat15AOverall, data.success.slice(0, data.stat15AOverall.length)) : 0,
			odds: data.odds.length > 0 ? calculateCorrelation(data.odds, data.success.slice(0, data.odds.length)) : 0,
			standingDiff: data.standingDiff.length > 0 ? calculateCorrelation(data.standingDiff, data.success.slice(0, data.standingDiff.length)) : 0,
			avgStanding: data.avgStanding.length > 0 ? calculateCorrelation(data.avgStanding, data.success.slice(0, data.avgStanding.length)) : 0
		}

		// Calculate means and sample sizes
		const calculateMean = (arr: number[]) => arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : 0

		const stats = {
			stat5HOverall: { mean: calculateMean(data.stat5HOverall), count: data.stat5HOverall.length },
			stat5AOverall: { mean: calculateMean(data.stat5AOverall), count: data.stat5AOverall.length },
			stat5HHa: { mean: calculateMean(data.stat5HHa), count: data.stat5HHa.length },
			stat5AHa: { mean: calculateMean(data.stat5AHa), count: data.stat5AHa.length },
			stat10HOverall: { mean: calculateMean(data.stat10HOverall), count: data.stat10HOverall.length },
			stat10AOverall: { mean: calculateMean(data.stat10AOverall), count: data.stat10AOverall.length },
			stat10HHa: { mean: calculateMean(data.stat10HHa), count: data.stat10HHa.length },
			stat10AHa: { mean: calculateMean(data.stat10AHa), count: data.stat10AHa.length },
			stat15HOverall: { mean: calculateMean(data.stat15HOverall), count: data.stat15HOverall.length },
			stat15AOverall: { mean: calculateMean(data.stat15AOverall), count: data.stat15AOverall.length },
			odds: { mean: calculateMean(data.odds), count: data.odds.length },
			standingDiff: { mean: calculateMean(data.standingDiff), count: data.standingDiff.length },
			avgStanding: { mean: calculateMean(data.avgStanding), count: data.avgStanding.length }
		}

		// Sort by absolute correlation value
		const sortedCorrelations = Object.entries(correlations)
			.map(([key, value]) => ({ 
				variable: key, 
				correlation: value,
				absCorrelation: Math.abs(value),
				mean: stats[key as keyof typeof stats].mean,
				count: stats[key as keyof typeof stats].count
			}))
			.sort((a, b) => b.absCorrelation - a.absCorrelation)

		res.json({
			success: true,
			sampleSize: data.success.length,
			correlations: sortedCorrelations
		})
	} catch (error: any) {
		console.error('[Analytics] Error calculating correlations:', error)
		res.status(500).json({ error: error.message })
	}
})

/**
 * Export bets data to CSV from Google Sheets
 */
router.get('/analytics/export-csv', async (req, res) => {
	try {
		if (!SPREADSHEET_ID) {
			return res.status(500).json({ error: 'GOOGLE_SHEETS_ID not configured in .env' })
		}

		const sheets = await getGoogleSheetsClient()
		const response = await sheets.spreadsheets.values.get({
			spreadsheetId: SPREADSHEET_ID,
			range: 'Typy!A:AG',
		})

		const rows = response.data.values || []
		
		if (rows.length <= 1) {
			return res.status(404).json({ error: 'No data found' })
		}

		const dataRows = rows.slice(1)
		const bets = dataRows.filter(row => {
			const entered = row[20]?.toLowerCase()
			return entered === 'tak' || entered === 'nie'
		})

		// CSV headers
		const headers = [
			'ID', 'Data', 'Gospodarze', 'Goście', 'Liga', 'Zakład', 'Typ', 'Kurs',
			'5H%(o)', '5A%(o)', '5H%(H/A)', '5A%(H/A)',
			'10H%(o)', '10A%(o)', '10H%(H/A)', '10A%(H/A)',
			'15H%(o)', '15A%(o)', '15H%(H/A)', '15A%(H/A)',
			'Wszedł', 'Pozycja H', 'Pozycja A', 'Różnica pozycji', 'Średnia pozycja',
			'Dzień tygodnia'
		]

		const csvRows = bets.map((row, index) => {
			const date = row[28] ? new Date(row[28]) : null
			const dayOfWeek = date ? date.toLocaleDateString('pl-PL', { weekday: 'long' }) : ''
			const standingHome = row[23] ? parseInt(row[23]) : null
			const standingAway = row[24] ? parseInt(row[24]) : null
			const standingDiff = standingHome && standingAway 
				? Math.abs(standingHome - standingAway) 
				: ''
			const avgStanding = standingHome && standingAway 
				? ((standingHome + standingAway) / 2).toFixed(1)
				: ''

			return [
				index + 1,
				date ? date.toISOString().split('T')[0] : row[28] || '',
				row[0] || '',  // Gospodarze
				row[1] || '',  // Goście
				row[27] || '', // Liga
				row[2] || '',  // Zakład
				row[3] || '',  // Typ
				row[5] || '',  // Kurs
				row[7] || '',  // 5H%(o)
				row[8] || '',  // 5A%(o)
				row[9] || '',  // 5H%(H/A)
				row[10] || '', // 5A%(H/A)
				row[11] || '', // 10H%(o)
				row[12] || '', // 10A%(o)
				row[13] || '', // 10H%(H/A)
				row[14] || '', // 10A%(H/A)
				row[15] || '', // 15H%(o)
				row[16] || '', // 15A%(o)
				row[17] || '', // 15H%(H/A)
				row[18] || '', // 15A%(H/A)
				row[20] || '', // Wszedł
				standingHome || '',
				standingAway || '',
				standingDiff,
				avgStanding,
				dayOfWeek
			].map(v => {
				// Escape CSV values
				const str = String(v)
				if (str.includes(',') || str.includes('"') || str.includes('\n')) {
					return `"${str.replace(/"/g, '""')}"`
				}
				return str
			})
		})

		const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n')

		res.setHeader('Content-Type', 'text/csv; charset=utf-8')
		res.setHeader('Content-Disposition', 'attachment; filename=bets-analytics.csv')
		res.send('\uFEFF' + csv) // BOM for Excel UTF-8 support
	} catch (error: any) {
		console.error('[Analytics] Error exporting CSV:', error)
		res.status(500).json({ error: error.message })
	}
})

/**
 * Get detailed statistics by various groupings from Google Sheets
 */
router.get('/analytics/detailed-stats', async (req, res) => {
	try {
		if (!SPREADSHEET_ID) {
			return res.status(500).json({ error: 'GOOGLE_SHEETS_ID not configured in .env' })
		}

		const { groupBy } = req.query // betType, league, dayOfWeek, oddsRange

		const sheets = await getGoogleSheetsClient()
		const response = await sheets.spreadsheets.values.get({
			spreadsheetId: SPREADSHEET_ID,
			range: 'Typy!A:AG',
		})

		const rows = response.data.values || []
		
		if (rows.length <= 1) {
			return res.json({ success: true, stats: [] })
		}

		const dataRows = rows.slice(1)
		const bets = dataRows.filter(row => {
			const entered = row[20]?.toLowerCase()
			return entered === 'tak' || entered === 'nie'
		}).map(row => ({
			betType: row[2] || 'Unknown',
			betOption: row[3] || 'Unknown',
			country: row[26] || '',
			league: row[27] || 'Unknown',
			matchDate: row[28] || null,
			odds: row[5] ? parseFloat(row[5].replace(',', '.')) : null,
			entered: row[20]?.toLowerCase()
		}))

		const stats: Record<string, { 
			total: number
			won: number
			lost: number
			winRate: number
			avgOdds: number | null
		}> = {}

		bets.forEach(bet => {
			let key = ''
			
			if (groupBy === 'betType') {
				key = bet.betType
			} else if (groupBy === 'betTypeAndOption') {
				key = `${bet.betType} - ${bet.betOption}`
			} else if (groupBy === 'league') {
				key = bet.country ? `${bet.league} (${bet.country})` : bet.league
			} else if (groupBy === 'dayOfWeek') {
				const date = bet.matchDate ? new Date(bet.matchDate) : null
				key = date ? date.toLocaleDateString('pl-PL', { weekday: 'long' }) : 'Unknown'
			} else if (groupBy === 'oddsRange') {
				if (bet.odds) {
					const odds = bet.odds
					if (odds < 1.5) key = '< 1.5'
					else if (odds < 2) key = '1.5 - 2.0'
					else if (odds < 2.5) key = '2.0 - 2.5'
					else if (odds < 3) key = '2.5 - 3.0'
					else key = '≥ 3.0'
				} else {
					key = 'Unknown'
				}
			} else {
				key = 'All'
			}

			if (!stats[key]) {
				stats[key] = { 
					total: 0, 
					won: 0, 
					lost: 0, 
					winRate: 0,
					avgOdds: null 
				}
			}

			stats[key].total++
			if (bet.entered === 'tak') stats[key].won++
			if (bet.entered === 'nie') stats[key].lost++
		})

		// Calculate win rates and average odds
		Object.keys(stats).forEach(key => {
			stats[key].winRate = stats[key].total > 0 
				? (stats[key].won / stats[key].total * 100) 
				: 0

			// Calculate average odds for this group
			const groupBets = bets.filter(bet => {
				if (groupBy === 'betType') return bet.betType === key
				if (groupBy === 'betTypeAndOption') return `${bet.betType} - ${bet.betOption}` === key
				if (groupBy === 'league') {
					const leagueKey = bet.country ? `${bet.league} (${bet.country})` : bet.league
					return leagueKey === key
				}
				if (groupBy === 'dayOfWeek') {
					const date = bet.matchDate ? new Date(bet.matchDate) : null
					return date ? date.toLocaleDateString('pl-PL', { weekday: 'long' }) === key : key === 'Unknown'
				}
				if (groupBy === 'oddsRange') {
					if (!bet.odds) return key === 'Unknown'
					const odds = bet.odds
					if (key === '< 1.5') return odds < 1.5
					if (key === '1.5 - 2.0') return odds >= 1.5 && odds < 2
					if (key === '2.0 - 2.5') return odds >= 2 && odds < 2.5
					if (key === '2.5 - 3.0') return odds >= 2.5 && odds < 3
					if (key === '≥ 3.0') return odds >= 3
				}
				return true
			})

			const oddsValues = groupBets
				.filter(b => b.odds !== null)
				.map(b => b.odds!)
			
			stats[key].avgOdds = oddsValues.length > 0
				? oddsValues.reduce((a, b) => a + b, 0) / oddsValues.length
				: null
		})

		// Sort by win rate descending
		const sorted = Object.entries(stats)
			.map(([key, value]) => ({ key, ...value }))
			.sort((a, b) => b.winRate - a.winRate)

		res.json({
			success: true,
			groupBy: groupBy || 'all',
			stats: sorted
		})
	} catch (error: any) {
		console.error('[Analytics] Error generating detailed stats:', error)
		res.status(500).json({ error: error.message })
	}
})

/**
 * Get correlations stratified by a dimension
 */
router.get('/analytics/correlations-stratified', async (req, res) => {
	try {
		if (!SPREADSHEET_ID) {
			return res.status(500).json({ error: 'GOOGLE_SHEETS_ID not configured in .env' })
		}

		const { stratifyBy } = req.query

		const sheets = await getGoogleSheetsClient()
		const response = await sheets.spreadsheets.values.get({
			spreadsheetId: SPREADSHEET_ID,
			range: 'Typy!A:AG',
		})

		const rows = response.data.values || []
		
		if (rows.length <= 1) {
			return res.json({
				success: true,
				message: 'No data found',
				variables: [],
				groups: [],
				correlations: {}
			})
		}

		const dataRows = rows.slice(1)
		const bets = dataRows.filter(row => {
			const entered = row[20]?.toLowerCase()
			return entered === 'tak' || entered === 'nie'
		})

		// Helper: parse percentage string
		const parsePercent = (val: string | null): number | null => {
			if (!val) return null
			const match = val.match(/(\d+(?:\.\d+)?)/)
			return match ? parseFloat(match[1]) / 100 : null
		}

		// Helper: calculate correlation
		const calculateCorrelation = (x: number[], y: number[]): number => {
			const n = x.length
			if (n === 0) return 0

			const meanX = x.reduce((a, b) => a + b, 0) / n
			const meanY = y.reduce((a, b) => a + b, 0) / n

			let numerator = 0
			let denomX = 0
			let denomY = 0

			for (let i = 0; i < n; i++) {
				const dx = x[i] - meanX
				const dy = y[i] - meanY
				numerator += dx * dy
				denomX += dx * dx
				denomY += dy * dy
			}

			const denom = Math.sqrt(denomX * denomY)
			return denom === 0 ? 0 : numerator / denom
		}

		// Get grouping key
		const getGroupKey = (row: any[]): string => {
			if (stratifyBy === 'betType') {
				return row[2] || 'Unknown'
			} else if (stratifyBy === 'league') {
				const country = row[26] || ''
				const league = row[27] || 'Unknown'
				return country ? `${league} (${country})` : league
			} else if (stratifyBy === 'dayOfWeek') {
				const date = row[28] ? new Date(row[28]) : null
				return date ? date.toLocaleDateString('pl-PL', { weekday: 'long' }) : 'Unknown'
			} else if (stratifyBy === 'oddsRange') {
				const odds = row[5] ? parseFloat(row[5].replace(',', '.')) : null
				if (odds) {
					if (odds < 1.5) return '< 1.5'
					else if (odds < 2) return '1.5 - 2.0'
					else if (odds < 2.5) return '2.0 - 2.5'
					else if (odds < 3) return '2.5 - 3.0'
					else return '≥ 3.0'
				}
				return 'Unknown'
			}
			return 'All'
		}

		// Group bets by stratification dimension
		const groups: Record<string, any[]> = {}
		bets.forEach(row => {
			const groupKey = getGroupKey(row)
			if (!groups[groupKey]) {
				groups[groupKey] = []
			}
			groups[groupKey].push(row)
		})

		// Variables to analyze
		const variables = [
			'stat5HOverall', 'stat5AOverall', 'stat5HHa', 'stat5AHa',
			'stat10HOverall', 'stat10AOverall', 'stat10HHa', 'stat10AHa',
			'stat15HOverall', 'stat15AOverall',
			'odds', 'standingDiff', 'avgStanding'
		]

		// Calculate correlations for each group
		const correlations: Record<string, Record<string, { correlation: number, count: number }>> = {}

		variables.forEach(variable => {
			correlations[variable] = {}
		})

		Object.keys(groups).forEach(groupKey => {
			const groupBets = groups[groupKey]

			// Collect data for this group
			const data: Record<string, number[]> = {
				success: [],
				stat5HOverall: [], stat5AOverall: [], stat5HHa: [], stat5AHa: [],
				stat10HOverall: [], stat10AOverall: [], stat10HHa: [], stat10AHa: [],
				stat15HOverall: [], stat15AOverall: [],
				odds: [], standingDiff: [], avgStanding: []
			}

			groupBets.forEach(row => {
				const isSuccess = row[20]?.toLowerCase() === 'tak' ? 1 : 0
				
				const s5ho = parsePercent(row[7])
				const s5ao = parsePercent(row[8])
				const s5hh = parsePercent(row[9])
				const s5ah = parsePercent(row[10])
				const s10ho = parsePercent(row[11])
				const s10ao = parsePercent(row[12])
				const s10hh = parsePercent(row[13])
				const s10ah = parsePercent(row[14])
				const s15ho = parsePercent(row[15])
				const s15ao = parsePercent(row[16])
				
				const stats = [s5ho, s5ao, s5hh, s5ah, s10ho, s10ao, s10hh, s10ah, s15ho, s15ao]
				const availableStats = stats.filter(s => s !== null).length
				
				if (availableStats >= 6) {
					data.success.push(isSuccess)
					if (s5ho !== null) data.stat5HOverall.push(s5ho)
					if (s5ao !== null) data.stat5AOverall.push(s5ao)
					if (s5hh !== null) data.stat5HHa.push(s5hh)
					if (s5ah !== null) data.stat5AHa.push(s5ah)
					if (s10ho !== null) data.stat10HOverall.push(s10ho)
					if (s10ao !== null) data.stat10AOverall.push(s10ao)
					if (s10hh !== null) data.stat10HHa.push(s10hh)
					if (s10ah !== null) data.stat10AHa.push(s10ah)
					if (s15ho !== null) data.stat15HOverall.push(s15ho)
					if (s15ao !== null) data.stat15AOverall.push(s15ao)
					
					const odds = row[5] ? parseFloat(row[5].replace(',', '.')) : null
					if (odds) data.odds.push(odds)
					
					const standingHome = row[23] ? parseInt(row[23]) : null
					const standingAway = row[24] ? parseInt(row[24]) : null
					if (standingHome && standingAway) {
						data.standingDiff.push(Math.abs(standingHome - standingAway))
						data.avgStanding.push((standingHome + standingAway) / 2)
					}
				}
			})

			// Calculate correlations for each variable in this group
			variables.forEach(variable => {
				const varData = data[variable as keyof typeof data]
				if (Array.isArray(varData) && varData.length >= 10) {
					const correlation = calculateCorrelation(varData, data.success.slice(0, varData.length))
					correlations[variable][groupKey] = {
						correlation,
						count: varData.length
					}
				}
			})
		})

		res.json({
			success: true,
			variables,
			groups: Object.keys(groups).sort(),
			correlations
		})
	} catch (error: any) {
		console.error('[Analytics] Error calculating stratified correlations:', error)
		res.status(500).json({ error: error.message })
	}
})

/**
 * Get cross-tabulation matrix (win rate by two dimensions)
 */
router.get('/analytics/matrix', async (req, res) => {
	try {
		if (!SPREADSHEET_ID) {
			return res.status(500).json({ error: 'GOOGLE_SHEETS_ID not configured in .env' })
		}

		const { dimY, dimX } = req.query

		const sheets = await getGoogleSheetsClient()
		const response = await sheets.spreadsheets.values.get({
			spreadsheetId: SPREADSHEET_ID,
			range: 'Typy!A:AG',
		})

		const rows = response.data.values || []
		
		if (rows.length <= 1) {
			return res.json({ success: true, rows: [], columns: [], matrix: {} })
		}

		const dataRows = rows.slice(1)
		const bets = dataRows.filter(row => {
			const entered = row[20]?.toLowerCase()
			return entered === 'tak' || entered === 'nie'
		}).map(row => ({
			betType: row[2] || 'Unknown',
			betOption: row[3] || 'Unknown',
			country: row[26] || '',
			league: row[27] || 'Unknown',
			matchDate: row[28] || null,
			odds: row[5] ? parseFloat(row[5].replace(',', '.')) : null,
			entered: row[20]?.toLowerCase()
		}))

		// Helper function to get key for dimension
		const getKey = (bet: any, dimension: string): string => {
			if (dimension === 'betType') {
				return bet.betType
			} else if (dimension === 'betTypeAndOption') {
				return `${bet.betType} - ${bet.betOption}`
			} else if (dimension === 'league') {
				return bet.country ? `${bet.league} (${bet.country})` : bet.league
			} else if (dimension === 'dayOfWeek') {
				const date = bet.matchDate ? new Date(bet.matchDate) : null
				return date ? date.toLocaleDateString('pl-PL', { weekday: 'long' }) : 'Unknown'
			} else if (dimension === 'oddsRange') {
				if (bet.odds) {
					const odds = bet.odds
					if (odds < 1.5) return '< 1.5'
					else if (odds < 2) return '1.5 - 2.0'
					else if (odds < 2.5) return '2.0 - 2.5'
					else if (odds < 3) return '2.5 - 3.0'
					else return '≥ 3.0'
				}
				return 'Unknown'
			}
			return 'Unknown'
		}

		// Build matrix
		const matrix: Record<string, Record<string, { total: number, won: number, lost: number, winRate: number }>> = {}
		const rowKeys = new Set<string>()
		const colKeys = new Set<string>()

		// Debug logging
		console.log(`[Matrix] Total bets: ${bets.length}`)
		console.log(`[Matrix] dimY=${dimY}, dimX=${dimX}`)
		
		// Sample betTypes
		const uniqueBetTypes = [...new Set(bets.map(b => b.betType))].sort()
		console.log(`[Matrix] Unique betTypes (${uniqueBetTypes.length}):`, uniqueBetTypes)
		
		// Sample odds ranges
		const oddsRanges = [...new Set(bets.map(b => getKey(b, 'oddsRange')))].sort()
		console.log(`[Matrix] Unique oddsRanges (${oddsRanges.length}):`, oddsRanges)
		
		// Check specific combinations
		const debugBets = bets.filter(b => b.odds && b.odds >= 2.5 && b.betType === '2')
		console.log(`[Matrix Debug] Bets with betType='2' and odds >= 2.5: ${debugBets.length}`)
		if (debugBets.length > 0) {
			console.log('[Matrix Debug] Samples:', debugBets.slice(0, 5).map(b => ({
				betType: b.betType,
				odds: b.odds,
				oddsRange: getKey(b, 'oddsRange'),
				entered: b.entered
			})))
		}

		bets.forEach(bet => {
			const rowKey = getKey(bet, dimY as string)
			const colKey = getKey(bet, dimX as string)

			rowKeys.add(rowKey)
			colKeys.add(colKey)

			if (!matrix[rowKey]) {
				matrix[rowKey] = {}
			}
			if (!matrix[rowKey][colKey]) {
				matrix[rowKey][colKey] = { total: 0, won: 0, lost: 0, winRate: 0 }
			}

			matrix[rowKey][colKey].total++
			if (bet.entered === 'tak') matrix[rowKey][colKey].won++
			if (bet.entered === 'nie') matrix[rowKey][colKey].lost++
		})

		// Calculate win rates
		Object.keys(matrix).forEach(row => {
			Object.keys(matrix[row]).forEach(col => {
				const cell = matrix[row][col]
				cell.winRate = cell.total > 0 ? (cell.won / cell.total * 100) : 0
			})
		})

		res.json({
			success: true,
			rows: Array.from(rowKeys).sort(),
			columns: Array.from(colKeys).sort(),
			matrix
		})
	} catch (error: any) {
		console.error('[Analytics] Error generating matrix:', error)
		res.status(500).json({ error: error.message })
	}
})

/**
 * Debug endpoint - get sample bets data
 */
router.get('/analytics/debug-bets', async (req, res) => {
	try {
		if (!SPREADSHEET_ID) {
			return res.status(500).json({ error: 'GOOGLE_SHEETS_ID not configured in .env' })
		}

		const sheets = await getGoogleSheetsClient()
		const response = await sheets.spreadsheets.values.get({
			spreadsheetId: SPREADSHEET_ID,
			range: 'Typy!A:AG',
		})

		const rows = response.data.values || []
		const dataRows = rows.slice(1)
		
		const bets = dataRows
			.filter(row => {
				const entered = row[20]?.toLowerCase()
				return entered === 'tak' || entered === 'nie'
			})
			.map(row => ({
				betType: row[2] || 'Unknown',
				betOption: row[3] || 'Unknown',
				odds: row[5] ? parseFloat(row[5].replace(',', '.')) : null,
				entered: row[20]?.toLowerCase()
			}))

		// Get unique betTypes
		const uniqueBetTypes = [...new Set(bets.map(b => b.betType))].sort()
		
		// Get bets with high odds
		const highOddsBets = bets.filter(b => b.odds && b.odds >= 2.5)
		
		// Group high odds bets by betType
		const byBetType: Record<string, number> = {}
		highOddsBets.forEach(b => {
			byBetType[b.betType] = (byBetType[b.betType] || 0) + 1
		})

		res.json({
			success: true,
			totalBets: bets.length,
			uniqueBetTypes,
			highOddsBetsCount: highOddsBets.length,
			highOddsByBetType: byBetType,
			sampleHighOddsBets: highOddsBets.slice(0, 10)
		})
	} catch (error: any) {
		console.error('[Analytics] Debug error:', error)
		res.status(500).json({ error: error.message })
	}
})

/**
 * Calculate weighted probability based on correlations
 */
router.post('/analytics/calculate-weighted', async (req, res) => {
	try {
		const { stats, betType, league } = req.body

		// Default correlation weights (from global analysis)
		const defaultWeights = {
			stat5HOverall: 0.031,
			stat5AOverall: 0.060,
			stat5HHa: 0.032,
			stat5AHa: 0.005,
			stat10HOverall: 0.060,
			stat10AOverall: 0.019,
			stat10HHa: 0.030,
			stat10AHa: 0.011,
			stat15HOverall: 0.012,
			stat15AOverall: 0.105
		}

		// Parse statistics (convert from percentage strings to decimals)
		const parsePercent = (val: string | null | undefined): number | null => {
			if (!val) return null
			const match = val.toString().match(/(\d+(?:\.\d+)?)/)
			return match ? parseFloat(match[1]) / 100 : null
		}

		const statValues = {
			stat5HOverall: parsePercent(stats.stat5HOverall),
			stat5AOverall: parsePercent(stats.stat5AOverall),
			stat5HHa: parsePercent(stats.stat5HHa),
			stat5AHa: parsePercent(stats.stat5AHa),
			stat10HOverall: parsePercent(stats.stat10HOverall),
			stat10AOverall: parsePercent(stats.stat10AOverall),
			stat10HHa: parsePercent(stats.stat10HHa),
			stat10AHa: parsePercent(stats.stat10AHa),
			stat15HOverall: parsePercent(stats.stat15HOverall),
			stat15AOverall: parsePercent(stats.stat15AOverall)
		}

		// Calculate weighted average
		let weightedSum = 0
		let totalWeight = 0

		Object.keys(defaultWeights).forEach(key => {
			const value = statValues[key as keyof typeof statValues]
			const weight = defaultWeights[key as keyof typeof defaultWeights]
			
			if (value !== null) {
				weightedSum += value * weight
				totalWeight += weight
			}
		})

		const weightedProbability = totalWeight > 0 ? (weightedSum / totalWeight) * 100 : null

		res.json({
			success: true,
			weightedProbability: weightedProbability ? parseFloat(weightedProbability.toFixed(1)) : null,
			usedStats: Object.keys(statValues).filter(k => statValues[k as keyof typeof statValues] !== null).length,
			totalWeight
		})
	} catch (error: any) {
		console.error('[Analytics] Error calculating weighted probability:', error)
		res.status(500).json({ error: error.message })
	}
})

export default router
