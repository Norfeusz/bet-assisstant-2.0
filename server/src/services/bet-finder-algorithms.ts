/**
 * Bet Finder Algorithms
 * Algorytmy wyszukiwania zakładów dla różnych typów analiz
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export interface SearchParams {
  dateFrom: string // YYYY-MM-DD
  dateTo: string // YYYY-MM-DD
  topCount: number // TOP N wyników
  matchCount: number // Liczba meczów do analizy historii
}

export interface TeamStats {
  played: number
  wins: number
  draws: number
  losses: number
  goalsScored: number
  goalsConceded: number
  winRate: number
  lossRate: number
  drawRate: number
  avgGoalsScored: number
  avgGoalsConceded: number
}

export interface SearchResult {
  matchId: number
  homeTeam: string
  awayTeam: string
  matchDate: string
  league: string
  country: string
  score: number // Ranking score
  homeStats: TeamStats
  awayStats: TeamStats
  homeOdds?: number
  drawOdds?: number
  awayOdds?: number
  recommendation: string
}

/**
 * Pobiera nadchodzące mecze w zadanym zakresie dat
 */
async function getUpcomingMatches(dateFrom: string, dateTo: string) {
  const matches = await prisma.$queryRaw<Array<{
    id: number
    home_team: string
    away_team: string
    match_date: Date
    league: string
    country: string
    home_odds: any
    draw_odds: any
    away_odds: any
  }>>`
    SELECT id, home_team, away_team, match_date, league, country,
           home_odds, draw_odds, away_odds
    FROM matches
    WHERE match_date >= ${dateFrom}::date
      AND match_date <= ${dateTo}::date
      AND is_finished = 'no'
    ORDER BY match_date
  `

  return matches.map(m => ({
    ...m,
    match_date: m.match_date.toISOString().split('T')[0],
    home_odds: m.home_odds ? Number(m.home_odds) : undefined,
    draw_odds: m.draw_odds ? Number(m.draw_odds) : undefined,
    away_odds: m.away_odds ? Number(m.away_odds) : undefined,
  }))
}

/**
 * Pobiera historię meczów drużyny (ostatnie N meczów)
 */
async function getTeamHistory(teamName: string, matchCount: number, beforeDate: string) {
  const matches = await prisma.$queryRaw<Array<{
    id: number
    home_team: string
    away_team: string
    home_goals: number | null
    away_goals: number | null
    match_date: Date
  }>>`
    SELECT id, home_team, away_team, home_goals, away_goals, match_date
    FROM matches
    WHERE (home_team = ${teamName} OR away_team = ${teamName})
      AND match_date < ${beforeDate}::date
      AND is_finished = 'yes'
      AND home_goals IS NOT NULL
      AND away_goals IS NOT NULL
    ORDER BY match_date DESC
    LIMIT ${matchCount}
  `

  return matches
}

/**
 * Oblicza statystyki drużyny na podstawie historii meczów
 */
function calculateTeamStats(matches: any[], teamName: string): TeamStats {
  if (matches.length === 0) {
    return {
      played: 0,
      wins: 0,
      draws: 0,
      losses: 0,
      goalsScored: 0,
      goalsConceded: 0,
      winRate: 0,
      lossRate: 0,
      drawRate: 0,
      avgGoalsScored: 0,
      avgGoalsConceded: 0,
    }
  }

  let wins = 0
  let draws = 0
  let losses = 0
  let goalsScored = 0
  let goalsConceded = 0

  matches.forEach(match => {
    const isHome = match.home_team === teamName
    const teamGoals = isHome ? match.home_goals : match.away_goals
    const opponentGoals = isHome ? match.away_goals : match.home_goals

    goalsScored += teamGoals
    goalsConceded += opponentGoals

    if (teamGoals > opponentGoals) {
      wins++
    } else if (teamGoals === opponentGoals) {
      draws++
    } else {
      losses++
    }
  })

  const played = matches.length

  return {
    played,
    wins,
    draws,
    losses,
    goalsScored,
    goalsConceded,
    winRate: (wins / played) * 100,
    lossRate: (losses / played) * 100,
    drawRate: (draws / played) * 100,
    avgGoalsScored: goalsScored / played,
    avgGoalsConceded: goalsConceded / played,
  }
}

/**
 * ALGORYTM: Winner vs Loser
 * Wyszukuje mecze gdzie jedna drużyna często wygrywa, a druga często przegrywa
 * Automatycznie wybiera: gospodarz (1) lub gość (2)
 */
export async function searchWinnerVsLoser(params: SearchParams): Promise<SearchResult[]> {
  console.log('🔍 [Winner vs Loser] Starting search with params:', params)

  // 1. Pobierz nadchodzące mecze
  const upcomingMatches = await getUpcomingMatches(params.dateFrom, params.dateTo)
  console.log(`📅 Found ${upcomingMatches.length} upcoming matches`)

  // 2. Dla każdego meczu oblicz score
  const results: SearchResult[] = []

  for (const match of upcomingMatches) {
    try {
      // 3. Pobierz historię gospodarza
      const homeHistory = await getTeamHistory(
        match.home_team,
        params.matchCount,
        match.match_date
      )

      // 4. Pobierz historię gościa
      const awayHistory = await getTeamHistory(
        match.away_team,
        params.matchCount,
        match.match_date
      )

      // Sprawdź czy mamy wystarczająco danych
      if (homeHistory.length < 3 || awayHistory.length < 3) {
        continue // Pomijamy mecze z małą ilością danych
      }

      // 5. Oblicz statystyki
      const homeStats = calculateTeamStats(homeHistory, match.home_team)
      const awayStats = calculateTeamStats(awayHistory, match.away_team)

      // 6. Oblicz score dla OBU scenariuszy:
      // Scenariusz A: Gospodarz wygrywa + Gość przegrywa
      const scoreHomeAdvantage = homeStats.winRate + awayStats.lossRate
      
      // Scenariusz B: Gość wygrywa + Gospodarz przegrywa
      const scoreAwayAdvantage = awayStats.winRate + homeStats.lossRate
      
      // Wybierz scenariusz z wyższym score
      const score = Math.max(scoreHomeAdvantage, scoreAwayAdvantage)
      const isHomeAdvantage = scoreHomeAdvantage > scoreAwayAdvantage

      // 7. Rekomendacja
      let recommendation = ''
      if (isHomeAdvantage) {
        if (homeStats.winRate >= 60 && awayStats.lossRate >= 60) {
          recommendation = `Mocna przewaga gospodarzy (${homeStats.winRate.toFixed(0)}% wygrane vs ${awayStats.lossRate.toFixed(0)}% porażki gościa) → Zakład: 1`
        } else if (homeStats.winRate >= 50 && awayStats.lossRate >= 50) {
          recommendation = `Średnia przewaga gospodarzy (${homeStats.winRate.toFixed(0)}% wygrane vs ${awayStats.lossRate.toFixed(0)}% porażki gościa) → Zakład: 1`
        } else {
          recommendation = `Słaba przewaga gospodarzy - ostrożnie (${homeStats.winRate.toFixed(0)}% wygrane vs ${awayStats.lossRate.toFixed(0)}% porażki gościa) → Zakład: 1`
        }
      } else {
        if (awayStats.winRate >= 60 && homeStats.lossRate >= 60) {
          recommendation = `Mocna przewaga gości (${awayStats.winRate.toFixed(0)}% wygrane vs ${homeStats.lossRate.toFixed(0)}% porażki gospodarza) → Zakład: 2`
        } else if (awayStats.winRate >= 50 && homeStats.lossRate >= 50) {
          recommendation = `Średnia przewaga gości (${awayStats.winRate.toFixed(0)}% wygrane vs ${homeStats.lossRate.toFixed(0)}% porażki gospodarza) → Zakład: 2`
        } else {
          recommendation = `Słaba przewaga gości - ostrożnie (${awayStats.winRate.toFixed(0)}% wygrane vs ${homeStats.lossRate.toFixed(0)}% porażki gospodarza) → Zakład: 2`
        }
      }

      results.push({
        matchId: match.id,
        homeTeam: match.home_team,
        awayTeam: match.away_team,
        matchDate: match.match_date,
        league: match.league,
        country: match.country,
        score,
        homeStats,
        awayStats,
        homeOdds: match.home_odds,
        drawOdds: match.draw_odds,
        awayOdds: match.away_odds,
        recommendation,
      })
    } catch (error) {
      console.error(`Error processing match ${match.home_team} vs ${match.away_team}:`, error)
      continue
    }
  }

  // 8. Sortuj po score (malejąco) i zwróć TOP N
  const sorted = results.sort((a, b) => b.score - a.score)
  const topResults = sorted.slice(0, params.topCount)

  console.log(`✅ [Winner vs Loser] Found ${topResults.length} results`)
  return topResults
}

/**
 * Główna funkcja wyszukiwania - router dla różnych typów
 */
export async function searchByType(
  searchType: string,
  params: SearchParams
): Promise<SearchResult[]> {
  switch (searchType) {
    case 'winner-vs-loser':
      return searchWinnerVsLoser(params)

    // TODO: Dodać więcej algorytmów
    case 'most-goals':
    case 'least-goals':
    case 'goal-advantage':
    case 'handicap-15':
    case 'most-bts':
    case 'no-bts':
    case 'most-corners':
    case 'least-corners':
    case 'corner-advantage':
    case 'corner-handicap':
    case 'home-advantage':
    case 'away-advantage':
    case 'home-goals':
    case 'away-goals':
      throw new Error(`Algorithm "${searchType}" not implemented yet`)

    default:
      throw new Error(`Unknown search type: ${searchType}`)
  }
}
