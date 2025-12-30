/**
 * KROK 25: Backup utility for bets and coupons tables
 */

import { exec } from 'child_process'
import { promisify } from 'util'
import * as path from 'path'
import * as fs from 'fs'

const execAsync = promisify(exec)

interface BackupResult {
	success: boolean
	betsBackup?: string
	couponsBackup?: string
	error?: string
}

export class TablesBackup {
	private backupDir: string
	private pgDumpPath: string
	private readonly MAX_BACKUPS = 10

	constructor() {
		this.backupDir = path.join(process.cwd(), 'backups')
		this.pgDumpPath = 'C:\\Program Files\\PostgreSQL\\18\\bin\\pg_dump.exe'

		// Create backups directory if it doesn't exist
		if (!fs.existsSync(this.backupDir)) {
			fs.mkdirSync(this.backupDir, { recursive: true })
		}
	}

	/**
	 * Find the oldest backup file to overwrite
	 */
	private getOldestBackupFile(prefix: string): string {
		const backupFiles: Array<{ path: string; mtime: Date; number: number }> = []

		// Check all backup slots (1-10)
		for (let i = 1; i <= this.MAX_BACKUPS; i++) {
			const filePath = path.join(this.backupDir, `${prefix}-backup-${i}.sql`)
			if (fs.existsSync(filePath)) {
				const stats = fs.statSync(filePath)
				backupFiles.push({ path: filePath, mtime: stats.mtime, number: i })
			} else {
				// If slot is empty, use it
				return filePath
			}
		}

		// All slots full - find oldest
		if (backupFiles.length > 0) {
			backupFiles.sort((a, b) => a.mtime.getTime() - b.mtime.getTime())
			return backupFiles[0].path
		}

		// Default to backup-1 if something went wrong
		return path.join(this.backupDir, `${prefix}-backup-1.sql`)
	}

	/**
	 * Create backup for a specific table
	 */
	private async createTableBackup(tableName: string): Promise<string> {
		const backupFile = this.getOldestBackupFile(tableName)

		console.log(`[Backup] Creating backup for ${tableName} table...`)
		console.log(`[Backup] Output file: ${backupFile}`)

		// Get database connection details from environment
		const dbUrl = process.env.DATABASE_URL
		if (!dbUrl) {
			throw new Error('DATABASE_URL not found in environment')
		}

		// Parse DATABASE_URL
		const url = new URL(dbUrl)
		const dbUser = url.username
		const dbPassword = url.password
		const dbHost = url.hostname
		const dbPort = url.port || '5432'
		const dbName = url.pathname.slice(1)

		// Build pg_dump command for specific table
		const pgDumpCommand = `"${this.pgDumpPath}" -h ${dbHost} -p ${dbPort} -U ${dbUser} -d ${dbName} -t ${tableName} --data-only --inserts -f "${backupFile}"`

		// Set password via environment variable
		const env = { ...process.env, PGPASSWORD: dbPassword }

		try {
			await execAsync(pgDumpCommand, { env })
			console.log(`[Backup] ✅ ${tableName} backup created: ${backupFile}`)
			return backupFile
		} catch (error: any) {
			console.error(`[Backup] ❌ Failed to backup ${tableName}:`, error.message)
			throw error
		}
	}

	/**
	 * Create backups for both bets and coupons tables
	 */
	async backupTables(): Promise<BackupResult> {
		try {
			console.log('[Backup] Starting backup for bets and coupons tables...')

			const betsBackup = await this.createTableBackup('bets')
			const couponsBackup = await this.createTableBackup('coupons')

			console.log('[Backup] ✅ All backups completed successfully')

			return {
				success: true,
				betsBackup,
				couponsBackup,
			}
		} catch (error: any) {
			console.error('[Backup] ❌ Backup failed:', error.message)
			return {
				success: false,
				error: error.message,
			}
		}
	}
}
