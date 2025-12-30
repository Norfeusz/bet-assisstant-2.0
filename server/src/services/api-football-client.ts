/**
 * API Football Client
 * https://www.api-football.com/documentation-v3
 */

import axios from 'axios'
import { RateLimiter } from '../utils/rate-limiter.js'
import {
	ApiFootballResponse,
	League,
	FixtureResponse,
	FixtureStatisticsResponse,
	OddsResponse,
	StandingsResponse,
	LeaguesParams,
	FixturesParams,
	StatisticsParams,
	OddsParams,
	StandingsParams,
	RateLimitInfo,
} from '../types/api-football.types.js'

export class ApiFootballClient {
	private client: any
	private rateLimiter: RateLimiter
	private apiKey: string

	constructor(apiKey: string, baseURL?: string) {
		this.apiKey = apiKey

		this.client = axios.create({
			baseURL: baseURL || process.env.API_FOOTBALL_BASE_URL || 'https://v3.football.api-sports.io',
			headers: {
				'x-rapidapi-key': apiKey,
				'x-rapidapi-host': process.env.API_FOOTBALL_HOST || 'v3.football.api-sports.io',
			},
			timeout: 30000, // 30 seconds
		})

		// Initialize rate limiter with values from env or defaults
		const dailyLimit = parseInt(process.env.RATE_LIMIT_REQUESTS_PER_DAY || '100')
		const hourlyLimit = parseInt(process.env.RATE_LIMIT_REQUESTS_PER_HOUR || '10')
		this.rateLimiter = new RateLimiter(dailyLimit, hourlyLimit)
	}

	/**
	 * Make a rate-limited API request
	 */
	private async makeRequest<T>(endpoint: string, params?: Record<string, any>): Promise<ApiFootballResponse<T>> {
		// Check rate limit
		if (!this.rateLimiter.canMakeRequest()) {
			const stats = this.rateLimiter.getStats()
			throw new Error(
				`Rate limit exceeded. Daily: ${stats.dailyRequests}/${stats.dailyLimit}, ` +
					`Hourly: ${stats.hourlyRequests}/${stats.hourlyLimit}`
			)
		}

		try {
			// Make request
			const response = await this.client.get(endpoint, {
				params,
			})

			// Record request
			this.rateLimiter.recordRequest()

			// Check API response
			if (response.data.errors && Object.keys(response.data.errors).length > 0) {
				throw new Error(`API Error: ${JSON.stringify(response.data.errors)}`)
			}

			return response.data
		} catch (error: any) {
			if (error.response) {
				throw new Error(`API request failed: ${error.response.status} - ${JSON.stringify(error.response.data)}`)
			} else if (error.request) {
				throw new Error('API request failed: No response received')
			}
			throw error
		}
	}
	/**
	 * Get leagues and competitions
	 */
	async getLeagues(params?: LeaguesParams): Promise<ApiFootballResponse<League>> {
		return this.makeRequest<League>('/leagues', params)
	}

	/**
	 * Get fixtures (matches)
	 */
	async getFixtures(params: FixturesParams): Promise<ApiFootballResponse<FixtureResponse>> {
		return this.makeRequest<FixtureResponse>('/fixtures', params)
	}

	/**
	 * Get fixture statistics
	 */
	async getFixtureStatistics(params: StatisticsParams): Promise<ApiFootballResponse<FixtureStatisticsResponse>> {
		return this.makeRequest<FixtureStatisticsResponse>('/fixtures/statistics', params)
	}

	/**
	 * Get betting odds
	 */
	async getOdds(params: OddsParams): Promise<ApiFootballResponse<OddsResponse>> {
		return this.makeRequest<OddsResponse>('/odds', params)
	}

	/**
	 * Get league standings
	 */
	async getStandings(params: StandingsParams): Promise<ApiFootballResponse<StandingsResponse>> {
		return this.makeRequest<StandingsResponse>('/standings', params)
	}

	/**
	 * Get rate limiter statistics
	 */
	getRateLimitStats() {
		return this.rateLimiter.getStats()
	}

	/**
	 * Get rate limit info from last response
	 */
	getRateLimitInfo(): RateLimitInfo | null {
		// This would be populated from response headers if available
		// API Football returns rate limit info in headers
		return null
	}

	/**
	 * Reset rate limiter (for testing)
	 */
	resetRateLimit(): void {
		this.rateLimiter.reset()
	}

	/**
	 * Helper: Get all available leagues for a season
	 */
	async getAllLeagues(season: number): Promise<League[]> {
		const response = await this.getLeagues({ season })
		return response.response
	}

	/**
	 * Helper: Get fixtures for a league and season
	 */
	async getLeagueFixtures(
		league: number,
		season: number,
		options?: { from?: string; to?: string; last?: number }
	): Promise<FixtureResponse[]> {
		const params: FixturesParams = {
			league,
			season,
			...options,
		}
		const response = await this.getFixtures(params)
		return response.response
	}

	/**
	 * Helper: Get complete match data (fixture + statistics + odds)
	 */
	async getCompleteMatchData(fixtureId: number): Promise<{
		fixture: FixtureResponse
		statistics: FixtureStatisticsResponse[]
		odds: OddsResponse[]
	}> {
		// Get fixture details
		const fixtureResponse = await this.getFixtures({
			id: fixtureId,
		})

		if (fixtureResponse.response.length === 0) {
			throw new Error(`Fixture ${fixtureId} not found`)
		}

		const fixture = fixtureResponse.response[0]

		// Get statistics
		let statistics: FixtureStatisticsResponse[] = []
		try {
			const statsResponse = await this.getFixtureStatistics({
				fixture: fixtureId,
			})
			statistics = statsResponse.response
		} catch (error) {
			console.warn(`Could not fetch statistics for fixture ${fixtureId}:`, error)
		}

		// Get odds
		let odds: OddsResponse[] = []
		try {
			const oddsResponse = await this.getOdds({
				fixture: fixtureId,
			})
			odds = oddsResponse.response
		} catch (error) {
			console.warn(`Could not fetch odds for fixture ${fixtureId}:`, error)
		}

		return { fixture, statistics, odds }
	}
}
