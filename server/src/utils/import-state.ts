/**
 * Import State Manager - tracks import progress and allows resuming
 */

import * as fs from 'fs'
import * as path from 'path'

export interface ImportState {
	startDate: string
	endDate: string
	currentDate: string
	leagueIds: number[]
	currentLeagueIndex: number
	matchesImported: number
	startedAt: string
	lastUpdated: string
	status: 'in-progress' | 'completed' | 'paused' | 'error'
	error?: string
}

export class ImportStateManager {
	private stateFile: string

	constructor() {
		const dataDir = path.join(process.cwd(), 'data')
		if (!fs.existsSync(dataDir)) {
			fs.mkdirSync(dataDir, { recursive: true })
		}
		this.stateFile = path.join(dataDir, 'import-state.json')
	}

	/**
	 * Save current import state
	 */
	saveState(state: ImportState): void {
		state.lastUpdated = new Date().toISOString()
		fs.writeFileSync(this.stateFile, JSON.stringify(state, null, 2))
	}

	/**
	 * Load import state
	 */
	loadState(): ImportState | null {
		if (!fs.existsSync(this.stateFile)) {
			return null
		}

		try {
			const data = fs.readFileSync(this.stateFile, 'utf-8')
			return JSON.parse(data)
		} catch (error) {
			console.error('Error loading import state:', error)
			return null
		}
	}

	/**
	 * Check if there's an incomplete import
	 */
	hasIncompleteImport(): boolean {
		const state = this.loadState()
		return state !== null && (state.status === 'in-progress' || state.status === 'paused')
	}

	/**
	 * Get incomplete import details
	 */
	getIncompleteImport(): ImportState | null {
		const state = this.loadState()
		if (state && (state.status === 'in-progress' || state.status === 'paused')) {
			return state
		}
		return null
	}

	/**
	 * Clear import state
	 */
	clearState(): void {
		if (fs.existsSync(this.stateFile)) {
			fs.unlinkSync(this.stateFile)
		}
	}

	/**
	 * Mark import as completed
	 */
	markCompleted(): void {
		const state = this.loadState()
		if (state) {
			state.status = 'completed'
			state.lastUpdated = new Date().toISOString()
			this.saveState(state)
		}
	}

	/**
	 * Mark import as paused (e.g., due to rate limit)
	 */
	markPaused(error?: string): void {
		const state = this.loadState()
		if (state) {
			state.status = 'paused'
			state.error = error
			state.lastUpdated = new Date().toISOString()
			this.saveState(state)
		}
	}

	/**
	 * Get import progress percentage
	 */
	getProgress(): number {
		const state = this.loadState()
		if (!state) return 0

		const totalDays = this.getDaysBetween(state.startDate, state.endDate)
		const completedDays = this.getDaysBetween(state.startDate, state.currentDate)

		return Math.round((completedDays / totalDays) * 100)
	}

	private getDaysBetween(start: string, end: string): number {
		const startDate = new Date(start)
		const endDate = new Date(end)
		const diff = endDate.getTime() - startDate.getTime()
		return Math.ceil(diff / (1000 * 60 * 60 * 24))
	}
}
