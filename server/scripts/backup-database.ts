/**
 * Database Backup Script
 * Creates SQL dump of the database and commits to GitHub
 */

import { exec } from 'child_process'
import { promisify } from 'util'
import * as path from 'path'
import * as fs from 'fs'
import * as dotenv from 'dotenv'

dotenv.config()

const execAsync = promisify(exec)

interface BackupOptions {
	pushToGit?: boolean
	skipIfNoChanges?: boolean
}

export class DatabaseBackup {
	private backupDir: string
	private backupFile: string
	private pgDumpPath: string
	private readonly MAX_BACKUPS = 10

	constructor() {
		this.backupDir = path.join(process.cwd(), 'backups')
		this.backupFile = '' // Will be determined in createBackup
		this.pgDumpPath = 'C:\\Program Files\\PostgreSQL\\18\\bin\\pg_dump.exe'

		// Create backups directory if it doesn't exist
		if (!fs.existsSync(this.backupDir)) {
			fs.mkdirSync(this.backupDir, { recursive: true })
			console.log(`📁 Created backups directory: ${this.backupDir}`)
		}
	}

	/**
	 * Find the oldest backup file to overwrite
	 */
	private getOldestBackupFile(): string {
		const backupFiles: Array<{ path: string; mtime: Date; number: number }> = []

		// Check all backup slots (1-10)
		for (let i = 1; i <= this.MAX_BACKUPS; i++) {
			const filePath = path.join(this.backupDir, `database-backup-${i}.sql`)
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
		return path.join(this.backupDir, 'database-backup-1.sql')
	}

	/**
	 * List all backups sorted by date
	 */
	private listBackups(): void {
		const backupFiles: Array<{ number: number; mtime: Date; size: number }> = []

		for (let i = 1; i <= this.MAX_BACKUPS; i++) {
			const filePath = path.join(this.backupDir, `database-backup-${i}.sql`)
			if (fs.existsSync(filePath)) {
				const stats = fs.statSync(filePath)
				backupFiles.push({ number: i, mtime: stats.mtime, size: stats.size })
			}
		}

		if (backupFiles.length > 0) {
			console.log('\n📋 Existing backups:')
			backupFiles.sort((a, b) => b.mtime.getTime() - a.mtime.getTime())
			backupFiles.forEach(f => {
				const sizeMB = (f.size / 1024 / 1024).toFixed(2)
				const date = f.mtime.toISOString().replace('T', ' ').substring(0, 19)
				console.log(`  backup-${f.number}: ${date} (${sizeMB} MB)`)
			})
		}
	}

	/**
	 * Create database backup
	 */
	async createBackup(options: BackupOptions = {}): Promise<void> {
		const { pushToGit = true, skipIfNoChanges = true } = options

		try {
			// List existing backups
			this.listBackups()

			// Determine which backup file to use
			this.backupFile = this.getOldestBackupFile()
			const backupNumber = path.basename(this.backupFile).match(/\d+/)?.[0] || '?'

			console.log(`\n💾 Creating database backup #${backupNumber}...`)
			console.log(`  📄 File: ${path.basename(this.backupFile)}`)

			// Extract connection details from DATABASE_URL
			const dbUrl = process.env.DATABASE_URL!
			const match = dbUrl.match(/postgresql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/(.+)/)

			if (!match) {
				throw new Error('Invalid DATABASE_URL format')
			}

			const [, user, password, host, port, database] = match

			// Set password environment variable for pg_dump
			const env = { ...process.env, PGPASSWORD: password }

			// Create backup using pg_dump
			const dumpCommand = `"${this.pgDumpPath}" -h ${host} -p ${port} -U ${user} -d ${database} --clean --if-exists --no-owner --no-privileges`

			console.log(`  🔄 Running pg_dump...`)
			const { stdout } = await execAsync(dumpCommand, { env, maxBuffer: 50 * 1024 * 1024 })

			// Write to file
			fs.writeFileSync(this.backupFile, stdout, 'utf8')

			// Get file size
			const stats = fs.statSync(this.backupFile)
			const fileSizeMB = (stats.size / 1024 / 1024).toFixed(2)

			console.log(`  ✅ Backup created: backup-${backupNumber}`)
			console.log(`  📊 Size: ${fileSizeMB} MB`)

			// Count tables and records
			const tableCount = (stdout.match(/CREATE TABLE/g) || []).length
			const insertCount = (stdout.match(/INSERT INTO/g) || []).length

			console.log(`  📋 Tables: ${tableCount}`)
			console.log(`  📝 Insert statements: ${insertCount}`)

			if (pushToGit) {
				await this.pushToGitHub(skipIfNoChanges, backupNumber)
			}

			console.log('✅ Backup completed successfully!\n')
		} catch (error: any) {
			console.error('❌ Backup failed:', error.message)
			throw error
		}
	}

	/**
	 * Push backup to GitHub
	 */
	private async pushToGitHub(skipIfNoChanges: boolean, backupNumber: string): Promise<void> {
		try {
			console.log('\n📤 Pushing backup to GitHub...')

			// Check if there are changes
			const { stdout: statusOutput } = await execAsync('git status --porcelain')

			const backupFileName = `database-backup-${backupNumber}.sql`
			if (!statusOutput.includes(backupFileName)) {
				if (skipIfNoChanges) {
					console.log('  ℹ️  No changes in backup file, skipping push')
					return
				}
			}

			// Add backup file
			await execAsync(`git add backups/${backupFileName}`)
			console.log(`  ✅ Added ${backupFileName} to git`)

			// Get current date for commit message
			const now = new Date()
			const dateStr = now.toISOString().split('T')[0]
			const timeStr = now.toTimeString().split(' ')[0]

			// Commit
			const commitMessage = `chore: database backup #${backupNumber} ${dateStr} ${timeStr}`
			await execAsync(`git commit -m "${commitMessage}"`)
			console.log(`  ✅ Committed: ${commitMessage}`)

			// Push to current branch
			const { stdout: branchOutput } = await execAsync('git branch --show-current')
			const currentBranch = branchOutput.trim()

			await execAsync(`git push origin ${currentBranch}`)
			console.log(`  ✅ Pushed to origin/${currentBranch}`)

			console.log('✅ Successfully pushed backup to GitHub!\n')
		} catch (error: any) {
			// If git operations fail, don't throw - backup was still created
			console.warn('⚠️  Failed to push to GitHub:', error.message)
			console.log('💡 Tip: You can manually push later with: git push\n')
		}
	}

	/**
	 * Get backup file path
	 */
	getBackupPath(): string {
		return this.backupFile
	}
}

// CLI usage
if (require.main === module) {
	const backup = new DatabaseBackup()
	backup
		.createBackup({
			pushToGit: process.argv.includes('--push'),
			skipIfNoChanges: !process.argv.includes('--force'),
		})
		.catch(error => {
			console.error('Fatal error:', error)
			process.exit(1)
		})
}
