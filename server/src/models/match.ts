/**
 * Match model types and utilities
 */

import { matches, match_result_enum } from '@prisma/client'

export type Match = matches
export type MatchResult = match_result_enum

export interface CreateMatchData {
	match_date: Date
	country: string
	league: string
	home_team: string
	away_team: string
	result?: MatchResult
	home_goals?: number
	away_goals?: number
	home_shots?: number
	home_shots_on_target?: number
	away_shots?: number
	away_shots_on_target?: number
	home_corners?: number
	away_corners?: number
	home_offsides?: number
	away_offsides?: number
	home_y_cards?: number
	away_y_cards?: number
	home_r_cards?: number
	away_r_cards?: number
	home_possession?: number
	away_possession?: number
	home_fouls?: number
	away_fouls?: number
	home_p_last_5?: number
	away_p_last_5?: number
	home_p_last_10?: number
	away_p_last_10?: number
	home_odds?: number
	draw_odds?: number
	away_odds?: number
}

export interface MatchInfo {
	id: number
	date: Date
	country: string
	league: string
	home_team: string
	away_team: string
	result?: string
	score?: string
}

export interface MatchStatistics {
	goals: { home: number | null; away: number | null }
	shots: { home: number | null; away: number | null }
	shots_on_target: { home: number | null; away: number | null }
	corners: { home: number | null; away: number | null }
	offsides: { home: number | null; away: number | null }
	cards: {
		yellow: { home: number | null; away: number | null }
		red: { home: number | null; away: number | null }
	}
	possession: { home: number | null; away: number | null }
	fouls: { home: number | null; away: number | null }
}

export interface MatchOdds {
	home: number | null
	draw: number | null
	away: number | null
}

/**
 * Format match for display
 */
export function formatMatch(match: Match): MatchInfo {
	return {
		id: match.id,
		date: match.match_date,
		country: match.country,
		league: match.league,
		home_team: match.home_team,
		away_team: match.away_team,
		result: match.result || undefined,
		score:
			match.home_goals !== null && match.away_goals !== null ? `${match.home_goals}-${match.away_goals}` : undefined,
	}
}

/**
 * Get match statistics
 */
export function getMatchStatistics(match: Match): MatchStatistics {
	return {
		goals: { home: match.home_goals, away: match.away_goals },
		shots: { home: match.home_shots, away: match.away_shots },
		shots_on_target: { home: match.home_shots_on_target, away: match.away_shots_on_target },
		corners: { home: match.home_corners, away: match.away_corners },
		offsides: { home: match.home_offsides, away: match.away_offsides },
		cards: {
			yellow: { home: match.home_y_cards, away: match.away_y_cards },
			red: { home: match.home_r_cards, away: match.away_r_cards },
		},
		possession: {
			home: match.home_possession ? Number(match.home_possession) : null,
			away: match.away_possession ? Number(match.away_possession) : null,
		},
		fouls: { home: match.home_fouls, away: match.away_fouls },
	}
}

/**
 * Get match odds
 */
export function getMatchOdds(match: Match): MatchOdds {
	return {
		home: match.home_odds ? Number(match.home_odds) : null,
		draw: match.draw_odds ? Number(match.draw_odds) : null,
		away: match.away_odds ? Number(match.away_odds) : null,
	}
}
