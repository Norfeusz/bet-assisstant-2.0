/**
 * Sprawdź czy 7 "skipowanych" meczów rzeczywiście jest w bazie Render
 */
import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

const skippedMatches = [
	{ home: 'Juventud Torremolinos', away: 'Teruel', league: 'Primera División RFEF - Group 2' },
	{ home: 'FC Cartagena', away: 'Sevilla Atletico', league: 'Primera División RFEF - Group 2' },
	{ home: 'AD Ceuta FC', away: 'Cordoba', league: 'Segunda División' },
	{ home: 'Castellón II', away: 'Barcelona B', league: 'Segunda División RFEF - Group 3' },
	{ home: 'Águilas', away: 'Recreativo Huelva', league: 'Segunda División RFEF - Group 4' },
	{ home: 'Xerez Deportivo', away: 'Real Jaén', league: 'Segunda División RFEF - Group 4' },
	{ home: 'FC Winterthur', away: 'FC Thun', league: 'Super League' }
]

async function checkMatches() {
	console.log('\n🔍 Sprawdzanie 7 skipowanych meczów w bazie Render...\n')

	for (const match of skippedMatches) {
		console.log(`\n📌 ${match.home} vs ${match.away} (${match.league})`)
		
		// Szukaj po nazwach drużyn (case-insensitive)
		const found = await prisma.matches.findMany({
			where: {
				home_team: { contains: match.home, mode: 'insensitive' },
				away_team: { contains: match.away, mode: 'insensitive' }
			},
			select: {
				id: true,
				fixture_id: true,
				match_date: true,
				league: true,
				country: true,
				standing_home: true,
				standing_away: true,
				home_odds: true,
				draw_odds: true,
				away_odds: true,
				is_finished: true
			}
		})

		if (found.length === 0) {
			console.log('   ❌ NIE ZNALEZIONO w bazie')
		} else {
			found.forEach(m => {
				console.log(`   ✅ ZNALEZIONO w bazie:`)
				console.log(`      ID: ${m.id}, fixture_id: ${m.fixture_id}`)
				console.log(`      Data: ${m.match_date?.toISOString().split('T')[0]}`)
				console.log(`      Liga: ${m.league} (${m.country})`)
				console.log(`      Standings: home=${m.standing_home}, away=${m.standing_away}`)
				console.log(`      Odds: home=${m.home_odds}, draw=${m.draw_odds}, away=${m.away_odds}`)
				console.log(`      Finished: ${m.is_finished}`)
			})
		}
	}

	await prisma.$disconnect()
}

checkMatches()
