import * as fs from 'fs'
import * as path from 'path'

export interface LeaguePreset {
	name: string
	description?: string
	leagueIds: number[]
	createdAt: string
}

export class LeaguePresetManager {
	private presetsFile: string

	constructor(presetsFile: string = path.join(process.cwd(), 'data', 'league-presets.json')) {
		this.presetsFile = presetsFile
		this.ensurePresetsFile()
	}

	private ensurePresetsFile(): void {
		const dataDir = path.dirname(this.presetsFile)
		if (!fs.existsSync(dataDir)) {
			fs.mkdirSync(dataDir, { recursive: true })
		}
		if (!fs.existsSync(this.presetsFile)) {
			fs.writeFileSync(this.presetsFile, JSON.stringify([], null, 2), 'utf-8')
		}
	}

	/**
	 * Get all saved presets
	 */
	getAllPresets(): LeaguePreset[] {
		try {
			const data = fs.readFileSync(this.presetsFile, 'utf-8')
			return JSON.parse(data)
		} catch (error) {
			console.error('Error reading presets:', error)
			return []
		}
	}

	/**
	 * Save a new preset
	 */
	savePreset(name: string, leagueIds: number[], description?: string): LeaguePreset {
		const presets = this.getAllPresets()

		// Check if preset with this name exists
		const existingIndex = presets.findIndex(p => p.name === name)

		const preset: LeaguePreset = {
			name,
			description,
			leagueIds,
			createdAt: new Date().toISOString(),
		}

		if (existingIndex >= 0) {
			// Update existing
			presets[existingIndex] = preset
		} else {
			// Add new
			presets.push(preset)
		}

		try {
			fs.writeFileSync(this.presetsFile, JSON.stringify(presets, null, 2), 'utf-8')
			return preset
		} catch (error) {
			console.error('Error saving preset:', error)
			throw error
		}
	}

	/**
	 * Delete a preset by name
	 */
	deletePreset(name: string): boolean {
		const presets = this.getAllPresets()
		const filtered = presets.filter(p => p.name !== name)

		if (filtered.length === presets.length) {
			return false // Preset not found
		}

		try {
			fs.writeFileSync(this.presetsFile, JSON.stringify(filtered, null, 2), 'utf-8')
			return true
		} catch (error) {
			console.error('Error deleting preset:', error)
			return false
		}
	}

	/**
	 * Get a specific preset by name
	 */
	getPreset(name: string): LeaguePreset | null {
		const presets = this.getAllPresets()
		return presets.find(p => p.name === name) || null
	}
}
