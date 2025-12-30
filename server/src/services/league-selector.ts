/**
 * League Selector - helps choose leagues to monitor
 */

import { ApiFootballClient } from './api-football-client.js'
import { League, LeagueResponse } from '../types/api-football.types.js'
import * as fs from 'fs'
import * as path from 'path'

export interface LeagueConfig {
	id: number
	name: string
	country: string
	type?: string
	priority?: number // 1-5, where 1 is highest
	enabled?: boolean
}

export class LeagueSelector {
	private apiClient: ApiFootballClient
	private configFile: string
	private leagues: LeagueConfig[]

	constructor(apiClient: ApiFootballClient) {
		this.apiClient = apiClient
		this.configFile = path.join(process.cwd(), 'data', 'leagues.json')
		this.leagues = this.loadConfig()
	}

	/**
	 * Load league configuration from file
	 */
	private loadConfig(): LeagueConfig[] {
		try {
			const dataDir = path.dirname(this.configFile)
			if (!fs.existsSync(dataDir)) {
				fs.mkdirSync(dataDir, { recursive: true })
			}

			if (fs.existsSync(this.configFile)) {
				const fileData = fs.readFileSync(this.configFile, 'utf-8')
				return JSON.parse(fileData)
			}

			return []
		} catch (error) {
			console.error('Error loading leagues config:', error)
			return []
		}
	}

	/**
	 * Save league configuration to file
	 */
	private saveConfig(): void {
		try {
			const dataDir = path.dirname(this.configFile)
			if (!fs.existsSync(dataDir)) {
				fs.mkdirSync(dataDir, { recursive: true })
			}

			fs.writeFileSync(this.configFile, JSON.stringify(this.leagues, null, 2), 'utf-8')
		} catch (error) {
			console.error('Error saving leagues config:', error)
		}
	}

	/**
	 * Fetch available leagues from API for current season
	 * PRO plan: all seasons available
	 */
	async fetchAvailableLeagues(): Promise<LeagueResponse[]> {
		// Get current season year
		const currentYear = new Date().getFullYear()
		const response = await this.apiClient.getLeagues({
			season: currentYear,
			current: true, // Only active leagues
		})
		return response.response as any // API returns LeagueResponse, not League
	}

	/**
	 * Get recommended leagues (less popular, good for betting value)
	 */
	getRecommendedLeagues(): string[] {
		return [
			// Europe - Second Tier
			'Championship', // England 2nd
			'2. Bundesliga', // Germany 2nd
			'Ligue 2', // France 2nd
			'Serie B', // Italy 2nd
			'Segunda División', // Spain 2nd

			// Scandinavia
			'Eliteserien', // Norway
			'Allsvenskan', // Sweden
			'Superligaen', // Denmark
			'Veikkausliiga', // Finland

			// Eastern Europe
			'Ekstraklasa', // Poland
			'Czech Liga', // Czech Republic
			'Slovak Liga', // Slovakia
			'Romanian Liga', // Romania
			'Bulgarian League', // Bulgaria

			// Balkans
			'Super League', // Greece
			'Super Lig', // Turkey
			'Serbian SuperLiga', // Serbia
			'Croatian League', // Croatia

			// Western Europe Lower Tiers
			'Eredivisie', // Netherlands
			'Belgian Pro League', // Belgium
			'Austrian Bundesliga', // Austria
			'Swiss Super League', // Switzerland
			'Scottish Premiership', // Scotland

			// South America
			'Brasileirão Série A', // Brazil
			'Argentine Primera', // Argentina
			'Chilean Primera', // Chile
			'Colombian Primera A', // Colombia

			// Asia
			'J1 League', // Japan
			'K League 1', // South Korea

			// Others
			'MLS', // USA
			'A-League', // Australia

			// Cups worth monitoring
			'FA Cup', // England
			'Copa del Rey', // Spain
			'Coppa Italia', // Italy
			'DFB Pokal', // Germany
		]
	}

	/**
	 * Add league to configuration
	 */
	addLeague(league: LeagueConfig): void {
		const existingIndex = this.leagues.findIndex(l => l.id === league.id)

		if (existingIndex >= 0) {
			// Update existing
			this.leagues[existingIndex] = league
		} else {
			// Add new
			this.leagues.push(league)
		}

		this.saveConfig()
	}

	/**
	 * Remove league from configuration
	 */
	removeLeague(leagueId: number): void {
		this.leagues = this.leagues.filter(l => l.id !== leagueId)
		this.saveConfig()
	}

	/**
	 * Enable/disable league
	 */
	toggleLeague(leagueId: number, enabled: boolean): void {
		const league = this.leagues.find(l => l.id === leagueId)
		if (league) {
			league.enabled = enabled
			this.saveConfig()
		}
	}

	/**
	 * Get enabled leagues
	 */
	getEnabledLeagues(): LeagueConfig[] {
		return this.leagues.filter(l => l.enabled)
	}

	/**
	 * Get all configured leagues
	 */
	getAllLeagues(): LeagueConfig[] {
		return this.leagues
	}

	/**
	 * Get leagues by priority
	 */
	getLeaguesByPriority(priority: number): LeagueConfig[] {
		return this.leagues.filter(l => l.priority === priority)
	}

	/**
	 * Set league priority
	 */
	setLeaguePriority(leagueId: number, priority: number): void {
		const league = this.leagues.find(l => l.id === leagueId)
		if (league) {
			league.priority = Math.max(1, Math.min(5, priority)) // Clamp 1-5
			this.saveConfig()
		}
	}

	/**
	 * Initialize with recommended leagues for current season
	 * PRO plan: all seasons available
	 */
	async initializeRecommended(): Promise<void> {
		const currentYear = new Date().getFullYear()
		console.log(`Fetching available leagues from API for ${currentYear} season...`)
		console.log('✅ PRO plan - all seasons available')
		const availableLeagues = await this.fetchAvailableLeagues()

		console.log(`Found ${availableLeagues.length} active leagues for ${currentYear}`)

		const recommended = this.getRecommendedLeagues()
		let addedCount = 0

		for (const leagueResponse of availableLeagues) {
			const leagueName = leagueResponse.league.name

			// Check if league name matches any recommended
			const isRecommended = recommended.some(
				rec =>
					leagueName.toLowerCase().includes(rec.toLowerCase()) || rec.toLowerCase().includes(leagueName.toLowerCase())
			)

			if (isRecommended) {
				const config: LeagueConfig = {
					id: leagueResponse.league.id,
					name: leagueResponse.league.name,
					country: leagueResponse.country.name,
					type: leagueResponse.league.type,
					priority: 3, // Default middle priority
					enabled: true,
				}

				this.addLeague(config)
				addedCount++
				console.log(`Added: ${config.name} (${config.country})`)
			}
		}

		console.log(`\nInitialized with ${addedCount} leagues`)
		console.log(`Enabled leagues: ${this.getEnabledLeagues().length}`)
	}

	/**
	 * Display leagues summary
	 */
	displaySummary(): void {
		const enabled = this.getEnabledLeagues()
		const byCountry = enabled.reduce((acc, league) => {
			if (!acc[league.country]) {
				acc[league.country] = []
			}
			acc[league.country].push(league)
			return acc
		}, {} as Record<string, LeagueConfig[]>)

		console.log('\n=== CONFIGURED LEAGUES ===\n')
		console.log(`Total: ${this.leagues.length}`)
		console.log(`Enabled: ${enabled.length}`)
		console.log(`Disabled: ${this.leagues.length - enabled.length}\n`)

		console.log('By Country:')
		Object.keys(byCountry)
			.sort()
			.forEach(country => {
				console.log(`  ${country}: ${byCountry[country].length} leagues`)
			})

		console.log('\nBy Priority:')
		for (let p = 1; p <= 5; p++) {
			const count = this.getLeaguesByPriority(p).filter(l => l.enabled).length
			console.log(`  Priority ${p}: ${count} leagues`)
		}
	}
}
