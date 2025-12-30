/**
 * Rate Limiter for API Football
 * FREE Plan: 100 requests per day
 */

import * as fs from 'fs'
import * as path from 'path'

interface RateLimitData {
	requests: number
	date: string
	hourlyRequests: { [hour: string]: number }
}

export class RateLimiter {
	private maxRequestsPerDay: number
	private maxRequestsPerHour: number
	private dataFile: string
	private data: RateLimitData

	constructor(maxRequestsPerDay: number = 100, maxRequestsPerHour: number = 10) {
		this.maxRequestsPerDay = maxRequestsPerDay
		this.maxRequestsPerHour = maxRequestsPerHour
		this.dataFile = path.join(process.cwd(), 'data', 'rate-limit.json')
		this.data = this.loadData()
	}

	/**
	 * Load rate limit data from file
	 */
	private loadData(): RateLimitData {
		try {
			// Create data directory if it doesn't exist
			const dataDir = path.dirname(this.dataFile)
			if (!fs.existsSync(dataDir)) {
				fs.mkdirSync(dataDir, { recursive: true })
			}

			// Load existing data or create new
			if (fs.existsSync(this.dataFile)) {
				const fileData = fs.readFileSync(this.dataFile, 'utf-8')
				const data = JSON.parse(fileData)

				// Reset if it's a new day
				const today = new Date().toISOString().split('T')[0]
				if (data.date !== today) {
					return this.createNewData()
				}

				return data
			}

			return this.createNewData()
		} catch (error) {
			console.error('Error loading rate limit data:', error)
			return this.createNewData()
		}
	}

	/**
	 * Create new rate limit data structure
	 */
	private createNewData(): RateLimitData {
		return {
			requests: 0,
			date: new Date().toISOString().split('T')[0],
			hourlyRequests: {},
		}
	}

	/**
	 * Save rate limit data to file
	 */
	private saveData(): void {
		try {
			const dataDir = path.dirname(this.dataFile)
			if (!fs.existsSync(dataDir)) {
				fs.mkdirSync(dataDir, { recursive: true })
			}

			fs.writeFileSync(this.dataFile, JSON.stringify(this.data, null, 2), 'utf-8')
		} catch (error) {
			console.error('Error saving rate limit data:', error)
		}
	}

	/**
	 * Get current hour key
	 */
	private getCurrentHour(): string {
		const now = new Date()
		return `${now.getHours()}`
	}

	/**
	 * Check if request can be made
	 */
	canMakeRequest(): boolean {
		const today = new Date().toISOString().split('T')[0]

		// Reset if new day
		if (this.data.date !== today) {
			this.data = this.createNewData()
			this.saveData()
		}

		// Check daily limit
		if (this.data.requests >= this.maxRequestsPerDay) {
			return false
		}

		// Check hourly limit
		const currentHour = this.getCurrentHour()
		const hourlyCount = this.data.hourlyRequests[currentHour] || 0
		if (hourlyCount >= this.maxRequestsPerHour) {
			return false
		}

		return true
	}

	/**
	 * Record a request
	 */
	recordRequest(): void {
		const today = new Date().toISOString().split('T')[0]

		// Reset if new day
		if (this.data.date !== today) {
			this.data = this.createNewData()
		}

		// Increment counters
		this.data.requests++

		const currentHour = this.getCurrentHour()
		this.data.hourlyRequests[currentHour] = (this.data.hourlyRequests[currentHour] || 0) + 1

		this.saveData()
	}

	/**
	 * Get remaining requests for today
	 */
	getRemainingRequests(): number {
		const today = new Date().toISOString().split('T')[0]

		if (this.data.date !== today) {
			return this.maxRequestsPerDay
		}

		return Math.max(0, this.maxRequestsPerDay - this.data.requests)
	}

	/**
	 * Get remaining requests for current hour
	 */
	getRemainingHourlyRequests(): number {
		const currentHour = this.getCurrentHour()
		const hourlyCount = this.data.hourlyRequests[currentHour] || 0
		return Math.max(0, this.maxRequestsPerHour - hourlyCount)
	}

	/**
	 * Get rate limit statistics
	 */
	getStats(): {
		date: string
		dailyRequests: number
		dailyLimit: number
		dailyRemaining: number
		hourlyRequests: number
		hourlyLimit: number
		hourlyRemaining: number
	} {
		const currentHour = this.getCurrentHour()
		const hourlyCount = this.data.hourlyRequests[currentHour] || 0

		return {
			date: this.data.date,
			dailyRequests: this.data.requests,
			dailyLimit: this.maxRequestsPerDay,
			dailyRemaining: this.getRemainingRequests(),
			hourlyRequests: hourlyCount,
			hourlyLimit: this.maxRequestsPerHour,
			hourlyRemaining: this.getRemainingHourlyRequests(),
		}
	}

	/**
	 * Reset rate limit (for testing or manual reset)
	 */
	reset(): void {
		this.data = this.createNewData()
		this.saveData()
	}
}
