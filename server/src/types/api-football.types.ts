/**
 * API Football Types
 * Documentation: https://www.api-football.com/documentation-v3
 */

// ===== BASE RESPONSE TYPES =====

export interface ApiFootballResponse<T> {
	get: string
	parameters: Record<string, any>
	errors: any[]
	results: number
	paging: {
		current: number
		total: number
	}
	response: T[]
}

// ===== LEAGUE TYPES =====

export interface League {
	id: number
	name: string
	type: string // "League" | "Cup"
	logo: string
	country: string
	country_code: string | null
	season: number
	round: string | null
}

export interface LeagueResponse {
	league: {
		id: number
		name: string
		type: string
		logo: string
	}
	country: {
		name: string
		code: string | null
		flag: string | null
	}
	seasons: Season[]
}

export interface Season {
	year: number
	start: string // ISO date
	end: string // ISO date
	current: boolean
	coverage: {
		fixtures: {
			events: boolean
			lineups: boolean
			statistics_fixtures: boolean
			statistics_players: boolean
		}
		standings: boolean
		players: boolean
		top_scorers: boolean
		top_assists: boolean
		top_cards: boolean
		injuries: boolean
		predictions: boolean
		odds: boolean
	}
}

// ===== FIXTURE (MATCH) TYPES =====

export interface FixtureResponse {
	fixture: Fixture
	league: League
	teams: {
		home: Team
		away: Team
	}
	goals: {
		home: number | null
		away: number | null
	}
	score: Score
	statistics?: FixtureStatisticsResponse[]
}

export interface Fixture {
	id: number
	referee: string | null
	timezone: string
	date: string // ISO datetime
	timestamp: number
	periods: {
		first: number | null
		second: number | null
	}
	venue: {
		id: number | null
		name: string | null
		city: string | null
	}
	status: {
		long: string // "Match Finished", "Not Started", etc.
		short: string // "FT", "NS", etc.
		elapsed: number | null
	}
}

export interface Team {
	id: number
	name: string
	logo: string
	winner: boolean | null
}

export interface Score {
	halftime: {
		home: number | null
		away: number | null
	}
	fulltime: {
		home: number | null
		away: number | null
	}
	extratime: {
		home: number | null
		away: number | null
	}
	penalty: {
		home: number | null
		away: number | null
	}
	xg?: {
		home: number | null
		away: number | null
	}
}

// ===== STATISTICS TYPES =====

export interface FixtureStatisticsResponse {
	team: Team
	statistics: Statistic[]
}

export interface Statistic {
	type: StatisticType
	value: number | string | null
}

export type StatisticType =
	| 'Shots on Goal'
	| 'Shots off Goal'
	| 'Total Shots'
	| 'Blocked Shots'
	| 'Shots insidebox'
	| 'Shots outsidebox'
	| 'Fouls'
	| 'Corner Kicks'
	| 'Offsides'
	| 'Ball Possession'
	| 'Yellow Cards'
	| 'Red Cards'
	| 'Goalkeeper Saves'
	| 'Total passes'
	| 'Passes accurate'
	| 'Passes %'
	| 'expected_goals'

// ===== ODDS TYPES =====

export interface OddsResponse {
	league: League
	fixture: Fixture
	update: string // ISO datetime
	bookmakers: Bookmaker[]
}

export interface Bookmaker {
	id: number
	name: string
	bets: Bet[]
}

export interface Bet {
	id: number
	name: string // "Match Winner", "Goals Over/Under", etc.
	values: BetValue[]
}

export interface BetValue {
	value: string // "Home", "Draw", "Away", "Over 2.5", etc.
	odd: string // Decimal odds as string
}

// ===== STANDINGS TYPES =====

export interface StandingsResponse {
	league: {
		id: number
		name: string
		country: string
		logo: string
		flag: string | null
		season: number
		standings: Standing[][]
	}
}

export interface Standing {
	rank: number
	team: Team
	points: number
	goalsDiff: number
	group: string
	form: string // "WWDLL" format (last 5 matches)
	status: string | null
	description: string | null
	all: MatchStats
	home: MatchStats
	away: MatchStats
	update: string
}

export interface MatchStats {
	played: number
	win: number
	draw: number
	lose: number
	goals: {
		for: number
		against: number
	}
}

// ===== REQUEST PARAMETERS =====

export interface LeaguesParams {
	id?: number
	name?: string
	country?: string
	code?: string
	season?: number
	team?: number
	type?: 'league' | 'cup'
	current?: boolean
	search?: string
}

export interface FixturesParams {
	id?: number
	ids?: string // comma-separated fixture IDs
	live?: string // "all" or league IDs
	date?: string // YYYY-MM-DD
	league?: number
	season?: number
	team?: number
	last?: number // last N matches
	next?: number // next N matches
	from?: string // YYYY-MM-DD
	to?: string // YYYY-MM-DD
	round?: string
	status?: string // "NS", "FT", etc.
	timezone?: string
}

export interface StatisticsParams {
	fixture: number // Required
	team?: number
	type?: string
}

export interface OddsParams {
	fixture?: number
	league?: number
	season?: number
	date?: string // YYYY-MM-DD
	timezone?: string
	bookmaker?: number
	bet?: number
}

export interface StandingsParams {
	league: number // Required
	season: number // Required
	team?: number
}

// ===== RATE LIMIT INFO =====

export interface RateLimitInfo {
	limit: number
	remaining: number
	reset: number // Unix timestamp
}
