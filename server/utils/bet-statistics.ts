import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

interface MatchStats {
	homePercentage: number | string
	awayPercentage: number | string
	homeMatches: number
	awayMatches: number
}

/**
 * Calculate statistics for bet type
 */
export async function calculateBetStatistics(
	homeTeam: string,
	awayTeam: string,
	betType: string,
	betOption: string,
	assumption: 'overall' | 'ha', // overall = ogółem, ha = home/away
	league?: string, // filter by league
	limit: number = 10 // number of matches to analyze (5, 10, or 15)
): Promise<MatchStats> {
	// Map Polish bet type names to English internal names
	const betTypeMap: Record<string, string> = {
		'gole mecz – over': 'goals_over',
		'gole mecz – under': 'goals_under',
		'gole mecz - over': 'goals_over',
		'gole mecz - under': 'goals_under',
		'Handi 1': 'handi1',
		'Handi 2': 'handi2',
		'BTS': 'bts',
		'Bez BTS': 'bts',
		'rożne mecz – over': 'corners_match_over',
		'rożne mecz – under': 'corners_match_under',
		'rożne mecz - over': 'corners_match_over',
		'rożne mecz - under': 'corners_match_under',
		'gole jedna drużyna – over': 'team_goals_over',
		'gole jedna drużyna – under': 'team_goals_under',
		'gole jedna drużyna - over': 'team_goals_over',
		'gole jedna drużyna - under': 'team_goals_under',
		'Rożne 1 – over': 'team1_corners_over',
		'rożne 2 - over': 'team2_corners_over',
		'Rożne 1 – under': 'team1_corners_under',
		'Rożne 2 – under': 'team2_corners_under',
		'Rożne 1 – handi': 'team1_corners_handi',
		'Rożne 2 – handi': 'team2_corners_handi',
		'spalone mecz – over': 'offsides_match_over',
		'spalone mecz – under': 'offsides_match_under',
		'spalone mecz - over': 'offsides_match_over',
		'spalone mecz - under': 'offsides_match_under',
		'spalone 1 – over': 'team1_offsides_over',
		'spalone 2 – over': 'team2_offsides_over',
		'spalone 1 – under': 'team1_offsides_under',
		'spalone 2 – under': 'team2_offsides_under',
		'spalone 1 – handi': 'team1_offsides_handi',
		'spalone 2 – handi': 'team2_offsides_handi',
		'żółte kartki mecz – over': 'yellow_cards_match_over',
		'żółte kartki mecz – under': 'yellow_cards_match_under',
		'żółte kartki mecz - over': 'yellow_cards_match_over',
		'żółte kartki mecz - under': 'yellow_cards_match_under',
		'żółte kartki 1 – over': 'team1_yellow_cards_over',
		'żółte kartki 2 – over': 'team2_yellow_cards_over',
		'żółte kartki 1 – under': 'team1_yellow_cards_under',
		'żółte kartki 2 – under': 'team2_yellow_cards_under',
	}
	
	const normalizedBetType = betTypeMap[betType] || betType
	
	console.log(`[calculateBetStatistics] homeTeam: ${homeTeam}, awayTeam: ${awayTeam}, betType: ${betType} (normalized: ${normalizedBetType}), betOption: ${betOption}, assumption: ${assumption}, limit: ${limit}`)

	try {
		// Determine minimum required matches based on limit
		let minLimit: number
		if (limit === 5) {
			minLimit = 4 // KROK 6: minimum 4 mecze dla zakresu 5
		} else if (limit === 10) {
			minLimit = 7
		} else if (limit === 15) {
			minLimit = 12
		} else {
			minLimit = limit // default to same as limit
		}

		// Determine which matches to fetch based on bet type and assumption
		let homeMatchesFilter: 'home' | 'away' | 'all' = assumption === 'ha' ? 'home' : 'all'
		let awayMatchesFilter: 'home' | 'away' | 'all' = assumption === 'ha' ? 'away' : 'all'

		// Get last N matches for home team
		const homeMatches = await getTeamMatches(homeTeam, homeMatchesFilter, limit, league)
		// Get last N matches for away team
		const awayMatches = await getTeamMatches(awayTeam, awayMatchesFilter, limit, league)

		console.log(`[calculateBetStatistics] homeMatches: ${homeMatches.length}, awayMatches: ${awayMatches.length}, minLimit: ${minLimit}`)

		// Calculate percentage based on bet type
		const homeStats = calculatePercentage(homeMatches, normalizedBetType, betOption, homeTeam, true, minLimit)
		const awayStats = calculatePercentage(awayMatches, normalizedBetType, betOption, awayTeam, false, minLimit)

		console.log(`[calculateBetStatistics] homePercentage: ${homeStats.percentage}, awayPercentage: ${awayStats.percentage}`)

		return {
			homePercentage: homeStats.percentage,
			awayPercentage: awayStats.percentage,
			homeMatches: homeMatches.length,
			awayMatches: awayMatches.length,
		}
	} catch (error) {
		console.error('Error calculating bet statistics:', error)
		throw error
	}
}

/**
 * Get team matches from database
 */
async function getTeamMatches(team: string, side: 'home' | 'away' | 'all', limit: number, league?: string) {
	const where: any = {
		is_finished: 'yes', // Only finished matches
	}

	// Filter by league if provided
	if (league) {
		where.league = league
	}

	if (side === 'home') {
		where.home_team = team
	} else if (side === 'away') {
		where.away_team = team
	} else {
		// all - both home and away
		where.OR = [{ home_team: team }, { away_team: team }]
	}

	const matches = await prisma.matches.findMany({
		where,
		orderBy: { match_date: 'desc' },
		take: limit,
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
		},
	})

	return matches
}

/**
 * Calculate percentage of matches meeting bet criteria
 */
function calculatePercentage(
	matches: any[],
	betType: string,
	betOption: string,
	teamName: string,
	isHomeTeamInUpcomingMatch: boolean, // true if this team will be home in the upcoming match
	minLimit: number // minimum required matches for analysis
): { percentage: number | string; count: number } {
	// Check if we have enough matches
	if (matches.length < minLimit) {
		return { percentage: 'za mało danych', count: 0 }
	}

	// Check if this bet type requires corner or offside data
	const requiresCornerData = betType.startsWith('corners_') || betType.includes('_corners_')
	const requiresOffsideData = betType.startsWith('offsides_') || betType.includes('_offsides_')
	const requiresYellowCardsData = betType.startsWith('yellow_cards_') || betType.includes('_yellow_cards_')

	let matchingCount = 0
	let matchesWithData = 0 // Count matches that have required data

	for (const match of matches) {
		// Determine if the team was home or away in this match
		const isTeamHome = match.home_team === teamName
		const teamGoals = isTeamHome ? match.home_goals : match.away_goals
		const opponentGoals = isTeamHome ? match.away_goals : match.home_goals
		const teamCorners = isTeamHome ? match.home_corners : match.away_corners
		const opponentCorners = isTeamHome ? match.away_corners : match.home_corners
		const teamOffsides = isTeamHome ? match.home_offsides : match.away_offsides
		const opponentOffsides = isTeamHome ? match.away_offsides : match.home_offsides
	// Cards = Yellow + Red cards combined
	const teamYellowCards = isTeamHome 
		? (match.home_y_cards || 0) + (match.home_r_cards || 0)
		: (match.away_y_cards || 0) + (match.away_r_cards || 0)
	const opponentYellowCards = isTeamHome 
		? (match.away_y_cards || 0) + (match.away_r_cards || 0)
		: (match.home_y_cards || 0) + (match.home_r_cards || 0)

	// Check if match has required data
	let hasRequiredData = true
	if (requiresCornerData) {
		hasRequiredData = match.home_corners != null && match.away_corners != null
	} else if (requiresOffsideData) {
		hasRequiredData = match.home_offsides != null && match.away_offsides != null
	} else if (requiresYellowCardsData) {
		hasRequiredData = match.home_y_cards != null && match.away_y_cards != null && match.home_r_cards != null && match.away_r_cards != null
	}

	if (!hasRequiredData) {
		continue // Skip matches without required data
	}

	matchesWithData++
	const totalGoals = (teamGoals || 0) + (opponentGoals || 0)
	const totalCorners = (teamCorners || 0) + (opponentCorners || 0)
	const totalOffsides = (teamOffsides || 0) + (opponentOffsides || 0)
	const totalYellowCards = (teamYellowCards || 0) + (opponentYellowCards || 0)
	
	// For team-based corner bets, we need actual home/away values from the match
	const homeCorners = match.home_corners || 0
	const awayCorners = match.away_corners || 0

	// Debug logging for offsides
	if (requiresOffsideData) {
		console.log(`[DEBUG] Match: ${match.home_team} vs ${match.away_team} | teamOffsides: ${teamOffsides}, opponentOffsides: ${opponentOffsides}, totalOffsides: ${totalOffsides}`)
	}

	let meetsCondition = false
		switch (betType) {
			case '1': // Home win bet
				if (isHomeTeamInUpcomingMatch) {
					// For home team: count WINS
					meetsCondition = teamGoals > opponentGoals
				} else {
					// For away team: count LOSSES
					meetsCondition = teamGoals < opponentGoals
				}
				break

			case '2': // Away win bet
				if (isHomeTeamInUpcomingMatch) {
					// For home team: count LOSSES
					meetsCondition = teamGoals < opponentGoals
				} else {
					// For away team: count WINS
					meetsCondition = teamGoals > opponentGoals
				}
				break

			case 'bts': // Both teams score
				if (betOption === 'tak') {
					meetsCondition = teamGoals > 0 && opponentGoals > 0
				} else {
					meetsCondition = teamGoals === 0 || opponentGoals === 0
				}
				break

			case 'handi1': // Handicap home
			case 'handi2': // Handicap away
				const handicapValue = Math.abs(parseFloat(betOption))
				const goalDiff = teamGoals - opponentGoals
				meetsCondition = goalDiff > handicapValue
				break

			case 'goals_over': // Goals over
				const goalsOverValue = parseFloat(betOption)
				meetsCondition = totalGoals > goalsOverValue
				break

			case 'goals_under': // Goals under
				const goalsUnderValue = parseFloat(betOption)
				meetsCondition = totalGoals < goalsUnderValue
				break
		case 'team_goals_over': // Team goals over (one team's goals)
			const teamGoalsOverValue = parseFloat(betOption)
			meetsCondition = (teamGoals || 0) > teamGoalsOverValue
			break

		case 'team_goals_under': // Team goals under (one team's goals)
			const teamGoalsUnderValue = parseFloat(betOption)
			meetsCondition = (teamGoals || 0) < teamGoalsUnderValue
			break
		case 'corners_1_over': // Corners 1 over (HOME team corners)
			const corners1OverValue = parseFloat(betOption)
			if (isHomeTeamInUpcomingMatch) {
				// For home team: check team's corners
				meetsCondition = (teamCorners || 0) > corners1OverValue
			} else {
				// For away team: check opponent's corners (corners "conceded")
				meetsCondition = (opponentCorners || 0) > corners1OverValue
			}
			break

		case 'corners_1_under': // Corners 1 under (HOME team corners)
			const corners1UnderValue = parseFloat(betOption)
			if (isHomeTeamInUpcomingMatch) {
				// For home team: check team's corners
				meetsCondition = (teamCorners || 0) < corners1UnderValue
			} else {
				// For away team: check opponent's corners (corners "conceded")
				meetsCondition = (opponentCorners || 0) < corners1UnderValue
			}
			break

		case 'corners_2_over': // Corners 2 over (AWAY team corners)
			const corners2OverValue = parseFloat(betOption)
			if (isHomeTeamInUpcomingMatch) {
				// For home team: check opponent's corners (corners "conceded")
				meetsCondition = (opponentCorners || 0) > corners2OverValue
			} else {
				// For away team: check team's corners
				meetsCondition = (teamCorners || 0) > corners2OverValue
			}
			break

		case 'corners_2_under': // Corners 2 under (AWAY team corners)
			const corners2UnderValue = parseFloat(betOption)
			if (isHomeTeamInUpcomingMatch) {
				// For home team: check opponent's corners (corners "conceded")
				meetsCondition = (opponentCorners || 0) < corners2UnderValue
			} else {
				// For away team: check team's corners
				meetsCondition = (teamCorners || 0) < corners2UnderValue
			}
			break

		case 'corners_match_over': // Corners match over (total in match)
				const cornersMatchOverValue = parseFloat(betOption)
				meetsCondition = totalCorners > cornersMatchOverValue
				break

			case 'corners_match_under': // Corners match under (total in match)
				const cornersMatchUnderValue = parseFloat(betOption)
				meetsCondition = totalCorners < cornersMatchUnderValue
				break

			case 'team1_corners_over': // Team 1 corners over (home team in upcoming match)
				const team1CornersOverValue = parseFloat(betOption)
				if (isHomeTeamInUpcomingMatch) {
					// Home team in upcoming match - check team's corners
					meetsCondition = (teamCorners || 0) > team1CornersOverValue
				} else {
					// Away team in upcoming match - check opponent's (home team's) corners
					meetsCondition = (opponentCorners || 0) > team1CornersOverValue
				}
				break

			case 'team2_corners_over': // Team 2 corners over (away team in upcoming match)
				const team2CornersOverValue = parseFloat(betOption)
				if (isHomeTeamInUpcomingMatch) {
					// Home team in upcoming match - check opponent's (away team's) corners
					meetsCondition = (opponentCorners || 0) > team2CornersOverValue
				} else {
					// Away team in upcoming match - check team's corners
					meetsCondition = (teamCorners || 0) > team2CornersOverValue
				}
				break

			case 'team1_corners_under': // Team 1 corners under (home team in upcoming match)
				const team1CornersUnderValue = parseFloat(betOption)
				if (isHomeTeamInUpcomingMatch) {
					// Home team in upcoming match - check team's corners
					meetsCondition = (teamCorners || 0) < team1CornersUnderValue
				} else {
					// Away team in upcoming match - check opponent's (home team's) corners
					meetsCondition = (opponentCorners || 0) < team1CornersUnderValue
				}
				break

			case 'team2_corners_under': // Team 2 corners under (away team in upcoming match)
				const team2CornersUnderValue = parseFloat(betOption)
				if (isHomeTeamInUpcomingMatch) {
					// Home team in upcoming match - check opponent's (away team's) corners
					meetsCondition = (opponentCorners || 0) < team2CornersUnderValue
				} else {
					// Away team in upcoming match - check team's corners
					meetsCondition = (teamCorners || 0) < team2CornersUnderValue
				}
				break

			case 'team1_corners_handi': // Team 1 corners handicap
				const team1CornersHandiValue = parseFloat(betOption)
				if (isHomeTeamInUpcomingMatch) {
					// Home team in upcoming match - check team's corners with handicap
					meetsCondition = (teamCorners || 0) + team1CornersHandiValue > (opponentCorners || 0)
				} else {
					// Away team in upcoming match - check opponent's corners with handicap
					meetsCondition = (opponentCorners || 0) + team1CornersHandiValue > (teamCorners || 0)
				}
				break

			case 'team2_corners_handi': // Team 2 corners handicap
				const team2CornersHandiValue = parseFloat(betOption)
				if (isHomeTeamInUpcomingMatch) {
					// Home team in upcoming match - check opponent's corners with handicap
					meetsCondition = (opponentCorners || 0) + team2CornersHandiValue > (teamCorners || 0)
				} else {
					// Away team in upcoming match - check team's corners with handicap
					meetsCondition = (teamCorners || 0) + team2CornersHandiValue > (opponentCorners || 0)
				}
				break

			case 'offsides_match_over': // Match offsides over (both teams total)
				const offsidesMatchOverValue = parseFloat(betOption)
				meetsCondition = totalOffsides > offsidesMatchOverValue
				console.log(`[DEBUG offsides_match_over] totalOffsides: ${totalOffsides}, threshold: ${offsidesMatchOverValue}, meets: ${meetsCondition}`)
				break

			case 'offsides_match_under': // Match offsides under (both teams total)
				const offsidesMatchUnderValue = parseFloat(betOption)
				meetsCondition = totalOffsides < offsidesMatchUnderValue
				break

			case 'team1_offsides_over': // Team 1 offsides over (home team in upcoming match)
				const team1OffsidesOverValue = parseFloat(betOption)
				const teamOffsides = isTeamHome ? match.home_offsides : match.away_offsides
				if (isHomeTeamInUpcomingMatch) {
					// Home team in upcoming match - check team's offsides
					meetsCondition = (teamOffsides || 0) > team1OffsidesOverValue
				} else {
					// Away team in upcoming match - check opponent's (home team's) offsides
					const opponentOffsides = isTeamHome ? match.away_offsides : match.home_offsides
					meetsCondition = (opponentOffsides || 0) > team1OffsidesOverValue
				}
				break

			case 'team2_offsides_over': // Team 2 offsides over (away team in upcoming match)
				const team2OffsidesOverValue = parseFloat(betOption)
				const teamOffsides2 = isTeamHome ? match.home_offsides : match.away_offsides
				if (isHomeTeamInUpcomingMatch) {
					// Home team in upcoming match - check opponent's (away team's) offsides
					const opponentOffsides2 = isTeamHome ? match.away_offsides : match.home_offsides
					meetsCondition = (opponentOffsides2 || 0) > team2OffsidesOverValue
				} else {
					// Away team in upcoming match - check team's offsides
					meetsCondition = (teamOffsides2 || 0) > team2OffsidesOverValue
				}
				break

			case 'team1_offsides_under': // Team 1 offsides under (home team in upcoming match)
				const team1OffsidesUnderValue = parseFloat(betOption)
				const teamOffsidesUnder1 = isTeamHome ? match.home_offsides : match.away_offsides
				if (isHomeTeamInUpcomingMatch) {
					// Home team in upcoming match - check team's offsides
					meetsCondition = (teamOffsidesUnder1 || 0) < team1OffsidesUnderValue
				} else {
					// Away team in upcoming match - check opponent's (home team's) offsides
					const opponentOffsidesUnder1 = isTeamHome ? match.away_offsides : match.home_offsides
					meetsCondition = (opponentOffsidesUnder1 || 0) < team1OffsidesUnderValue
				}
				break

			case 'team2_offsides_under': // Team 2 offsides under (away team in upcoming match)
				const team2OffsidesUnderValue = parseFloat(betOption)
				const teamOffsidesUnder2 = isTeamHome ? match.home_offsides : match.away_offsides
				if (isHomeTeamInUpcomingMatch) {
					// Home team in upcoming match - check opponent's (away team's) offsides
					const opponentOffsidesUnder2 = isTeamHome ? match.away_offsides : match.home_offsides
					meetsCondition = (opponentOffsidesUnder2 || 0) < team2OffsidesUnderValue
				} else {
					// Away team in upcoming match - check team's offsides
					meetsCondition = (teamOffsidesUnder2 || 0) < team2OffsidesUnderValue
				}
				break

			case 'team1_offsides_handi': // Team 1 offsides handicap
				const team1OffsidesHandiValue = parseFloat(betOption)
				const teamOffsidesHandi1 = isTeamHome ? match.home_offsides : match.away_offsides
				const opponentOffsidesHandi1 = isTeamHome ? match.away_offsides : match.home_offsides
				if (isHomeTeamInUpcomingMatch) {
					// Home team in upcoming match - check team's offsides with handicap
					meetsCondition = (teamOffsidesHandi1 || 0) + team1OffsidesHandiValue > (opponentOffsidesHandi1 || 0)
				} else {
					// Away team in upcoming match - check opponent's offsides with handicap
					meetsCondition = (opponentOffsidesHandi1 || 0) + team1OffsidesHandiValue > (teamOffsidesHandi1 || 0)
				}
				break

			case 'team2_offsides_handi': // Team 2 offsides handicap
				const team2OffsidesHandiValue = parseFloat(betOption)
				const teamOffsidesHandi2 = isTeamHome ? match.home_offsides : match.away_offsides
				const opponentOffsidesHandi2 = isTeamHome ? match.away_offsides : match.home_offsides
				if (isHomeTeamInUpcomingMatch) {
					// Home team in upcoming match - check opponent's offsides with handicap
					meetsCondition = (opponentOffsidesHandi2 || 0) + team2OffsidesHandiValue > (teamOffsidesHandi2 || 0)
				} else {
					// Away team in upcoming match - check team's offsides with handicap
					meetsCondition = (teamOffsidesHandi2 || 0) + team2OffsidesHandiValue > (opponentOffsidesHandi2 || 0)
				}
				break

			case 'offsides_over': // Offsides over (legacy)
				const offsidesOverValue = parseFloat(betOption)
				meetsCondition = totalOffsides > offsidesOverValue
				console.log(`[DEBUG offsides_over] totalOffsides: ${totalOffsides}, threshold: ${offsidesOverValue}, meets: ${meetsCondition}`)
				break

			case 'offsides_under': // Offsides under
				const offsidesUnderValue = parseFloat(betOption)
				meetsCondition = totalOffsides < offsidesUnderValue
				break

			case 'yellow_cards_match_over': // Match yellow cards over (both teams total)
				const yellowCardsMatchOverValue = parseFloat(betOption)
				meetsCondition = totalYellowCards > yellowCardsMatchOverValue
				break

			case 'yellow_cards_match_under': // Match yellow cards under (both teams total)
				const yellowCardsMatchUnderValue = parseFloat(betOption)
				meetsCondition = totalYellowCards < yellowCardsMatchUnderValue
				break

			case 'team1_yellow_cards_over': // Team 1 yellow cards over (home team in upcoming match)
				const team1YellowCardsOverValue = parseFloat(betOption)
				if (isHomeTeamInUpcomingMatch) {
					// Home team in upcoming match - check team's yellow cards (dostaje sam)
					meetsCondition = (teamYellowCards || 0) > team1YellowCardsOverValue
				} else {
					// Away team in upcoming match - check opponent's yellow cards (przeciwnik dostaje)
					meetsCondition = (opponentYellowCards || 0) > team1YellowCardsOverValue
				}
				break

			case 'team2_yellow_cards_over': // Team 2 yellow cards over (away team in upcoming match)
				const team2YellowCardsOverValue = parseFloat(betOption)
				if (isHomeTeamInUpcomingMatch) {
					// Home team in upcoming match - check opponent's yellow cards (przeciwnik dostaje)
					meetsCondition = (opponentYellowCards || 0) > team2YellowCardsOverValue
				} else {
					// Away team in upcoming match - check team's yellow cards (dostaje sam)
					meetsCondition = (teamYellowCards || 0) > team2YellowCardsOverValue
				}
				break

			case 'team1_yellow_cards_under': // Team 1 yellow cards under (home team in upcoming match)
				const team1YellowCardsUnderValue = parseFloat(betOption)
				if (isHomeTeamInUpcomingMatch) {
					// Home team in upcoming match - check team's yellow cards
					meetsCondition = (teamYellowCards || 0) < team1YellowCardsUnderValue
				} else {
					// Away team in upcoming match - check opponent's yellow cards
					meetsCondition = (opponentYellowCards || 0) < team1YellowCardsUnderValue
				}
				break

			case 'team2_yellow_cards_under': // Team 2 yellow cards under (away team in upcoming match)
				const team2YellowCardsUnderValue = parseFloat(betOption)
				if (isHomeTeamInUpcomingMatch) {
					// Home team in upcoming match - check opponent's yellow cards
					meetsCondition = (opponentYellowCards || 0) < team2YellowCardsUnderValue
				} else {
					// Away team in upcoming match - check team's yellow cards
					meetsCondition = (teamYellowCards || 0) < team2YellowCardsUnderValue
				}
				break
		}

		if (meetsCondition) {
			matchingCount++
		}
	}

	console.log(`[BET STATS] Team: ${teamName}, BetType: ${betType}, IsHome: ${isHomeTeamInUpcomingMatch}, MatchesWithData: ${matchesWithData}, MatchingCount: ${matchingCount}, TotalMatches: ${matches.length}, MinLimit: ${minLimit}`)

	// Check if we have enough matches with data for corners/offsides/yellow cards
	if ((requiresCornerData || requiresOffsideData || requiresYellowCardsData) && matchesWithData < minLimit) {
		return { percentage: 'za mało danych', count: matchingCount }
	}

	// Check if we have any matches to calculate from
	if (matchesWithData === 0) {
		return { percentage: 'za mało danych', count: 0 }
	}

	// Calculate percentage
	const denominator = (requiresCornerData || requiresOffsideData || requiresYellowCardsData) ? matchesWithData : matches.length
	const percentage = Math.round((matchingCount / denominator) * 100)

	return { percentage, count: matchingCount }
}

/**
 * Calculate Team Chance statistics for match total bets
 * For match total bets (goals, corners, offsides), we check if each team's
 * average contribution meets HALF of the threshold
 */
export async function calculateTeamChanceStatistics(
	homeTeam: string,
	awayTeam: string,
	betType: string, // e.g., 'gole mecz – over', 'rożne mecz – over'
	betOption: string, // e.g., '2,5', '3,5'
	league?: string
): Promise<{
	home5Overall: number | string
	away5Overall: number | string
	home5Ha: number | string
	away5Ha: number | string
	home10Overall: number | string
	away10Overall: number | string
	home10Ha: number | string
	away10Ha: number | string
}> {
	// Parse threshold value
	const threshold = parseFloat(betOption.replace(',', '.'))
	const halfThreshold = threshold / 2
	
	// Determine stat type based on bet type
	let statType: 'goals' | 'corners' | 'offsides' | 'yellow_cards'
	if (betType.includes('gole')) {
		statType = 'goals'
	} else if (betType.includes('rożne')) {
		statType = 'corners'
	} else if (betType.includes('spalone')) {
		statType = 'offsides'
	} else if (betType.includes('żółte kartki')) {
		statType = 'yellow_cards'
	} else {
		return {
			home5Overall: 'za mało danych',
			away5Overall: 'za mało danych',
			home5Ha: 'za mało danych',
			away5Ha: 'za mało danych',
			home10Overall: 'za mało danych',
			away10Overall: 'za mało danych',
			home10Ha: 'za mało danych',
			away10Ha: 'za mało danych',
		}
	}
	
	// Determine if it's over or under
	const isOver = betType.includes('over')
	
	// Calculate for both teams separately
	const home5Overall = await calculateTeamHalfThresholdPercentage(homeTeam, statType, halfThreshold, isOver, 'all', 5, league)
	const home5Ha = await calculateTeamHalfThresholdPercentage(homeTeam, statType, halfThreshold, isOver, 'home', 5, league)
	const home10Overall = await calculateTeamHalfThresholdPercentage(homeTeam, statType, halfThreshold, isOver, 'all', 10, league)
	const home10Ha = await calculateTeamHalfThresholdPercentage(homeTeam, statType, halfThreshold, isOver, 'home', 10, league)
	
	const away5Overall = await calculateTeamHalfThresholdPercentage(awayTeam, statType, halfThreshold, isOver, 'all', 5, league)
	const away5Ha = await calculateTeamHalfThresholdPercentage(awayTeam, statType, halfThreshold, isOver, 'away', 5, league)
	const away10Overall = await calculateTeamHalfThresholdPercentage(awayTeam, statType, halfThreshold, isOver, 'all', 10, league)
	const away10Ha = await calculateTeamHalfThresholdPercentage(awayTeam, statType, halfThreshold, isOver, 'away', 10, league)
	
	return {
		home5Overall,
		away5Overall,
		home5Ha,
		away5Ha,
		home10Overall,
		away10Overall,
		home10Ha,
		away10Ha
	}
}

async function calculateTeamHalfThresholdPercentage(
	teamName: string,
	statType: 'goals' | 'corners' | 'offsides' | 'yellow_cards',
	halfThreshold: number,
	isOver: boolean,
	matchType: 'home' | 'away' | 'all',
	limit: number,
	league?: string
): Promise<number | string> {
	const matches = await getTeamMatches(teamName, matchType, limit, league)
	
	// Minimum required matches
	const minLimit = limit === 5 ? 4 : (limit === 10 ? 7 : 12)
	
	if (matches.length < minLimit) {
		return 'za mało danych'
	}
	
	let validMatches = 0
	let matchingCount = 0
	
	for (const match of matches) {
		const isHome = match.home_team === teamName
		
		// Get team's stat value
		let teamValue: number | null = null
		if (statType === 'goals') {
			teamValue = isHome ? match.home_goals : match.away_goals
		} else if (statType === 'corners') {
			if (match.home_corners == null || match.away_corners == null) continue
			teamValue = isHome ? match.home_corners : match.away_corners
		} else if (statType === 'offsides') {
			if (match.home_offsides == null || match.away_offsides == null) continue
			teamValue = isHome ? match.home_offsides : match.away_offsides
		} else if (statType === 'yellow_cards') {
			if (match.home_y_cards == null || match.away_y_cards == null) continue
			teamValue = isHome ? match.home_y_cards : match.away_y_cards
		}
		
		if (teamValue === null) continue
		
		validMatches++
		
		// Check if meets condition
		const meetsCondition = isOver ? teamValue > halfThreshold : teamValue < halfThreshold
		if (meetsCondition) {
			matchingCount++
		}
	}
	
	if (validMatches < minLimit) {
		return 'za mało danych'
	}
	
	const percentage = Math.round((matchingCount / validMatches) * 100)
	return percentage
}

function calculateTeamAverage(values: (number | string)[]): number | string {
	const numericValues = values.filter(v => typeof v === 'number') as number[]
	
	if (numericValues.length === 0) {
		return 'za mało danych'
	}
	
	const sum = numericValues.reduce((acc, val) => acc + val, 0)
	const average = sum / numericValues.length
	return Math.round(average)
}
