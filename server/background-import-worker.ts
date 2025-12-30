import { PrismaClient } from '@prisma/client'
import { DataImporter } from './src/services/data-importer.js'
import { LeagueConfig } from './src/services/league-selector.js'
import { ApiFootballClient } from './src/services/api-football-client.js'
import { LeagueSelector } from './src/services/league-selector.js'
import * as fs from 'fs'
import * as path from 'path'
import nodemailer from 'nodemailer'
import dotenv from 'dotenv'
import { DatabaseBackup } from './scripts/backup-database.js'

dotenv.config()

const prisma = new PrismaClient()

interface ImportJob {
	id: number
	leagues: number[]
	date_from: Date
	date_to: Date
	job_type: 'new_matches' | 'update_results'
	status: string
	progress: JobProgress
	total_matches: number
	imported_matches: number
	failed_matches: number
	rate_limit_remaining: number
	rate_limit_reset_at: Date | null
	error_message?: string | null
	started_at?: Date
}

interface JobProgress {
	current_league?: number
	current_date?: string
	completed_leagues?: number[]
}

class BackgroundImportWorker {
	private logDir: string
	private emailTransporter: nodemailer.Transporter | null = null
	private processingJobId: number | null = null // Lock to prevent concurrent processing

	constructor() {
		this.logDir = path.join(process.cwd(), 'logs')

		// Create logs directory if it doesn't exist
		if (!fs.existsSync(this.logDir)) {
			fs.mkdirSync(this.logDir, { recursive: true })
		}

		// Setup email transporter
		this.setupEmailTransporter()
	}

	private setupEmailTransporter() {
		const emailConfig = {
			host: process.env.SMTP_HOST || 'smtp.gmail.com',
			port: parseInt(process.env.SMTP_PORT || '587'),
			secure: false,
			auth: {
				user: process.env.SMTP_USER,
				pass: process.env.SMTP_PASS,
			},
		}

		if (emailConfig.auth.user && emailConfig.auth.pass) {
			this.emailTransporter = nodemailer.createTransport(emailConfig)
		} else {
			console.warn('⚠️  Email credentials not configured, notifications disabled')
		}
	}

	private log(jobId: number, message: string) {
		const timestamp = new Date().toISOString()
		const logMessage = `[${timestamp}] [Job ${jobId}] ${message}\n`

		// Log to console
		console.log(logMessage.trim())

		// Log to file
		const logFile = path.join(this.logDir, `import-${new Date().toISOString().split('T')[0]}.log`)
		fs.appendFileSync(logFile, logMessage)
	}

	private async sendEmail(subject: string, body: string) {
		if (!this.emailTransporter) return

		try {
			await this.emailTransporter.sendMail({
				from: process.env.SMTP_USER,
				to: 'norf.cobain@gmail.com',
				subject: `Bet Assistant: ${subject}`,
				text: body,
				html: body.replace(/\n/g, '<br>'),
			})
			console.log('📧 Email notification sent')
		} catch (error) {
			console.error('❌ Failed to send email:', error)
		}
	}

	private async promoteNextQueuedJob(): Promise<void> {
		// When a job completes/fails, promote the next in_queue job to pending
		await prisma.$executeRaw`
			UPDATE import_jobs
			SET status = 'pending'::job_status_enum,
			    updated_at = NOW()
			WHERE id = (
				SELECT id
				FROM import_jobs
				WHERE status = 'in_queue'
				ORDER BY created_at ASC
				LIMIT 1
			)
		`
		console.log('✅ Promoted next job from queue to pending')
	}

	private async updateJobStatus(jobId: number, status: string, updates: Partial<ImportJob> = {}): Promise<void> {
		await prisma.$executeRawUnsafe(
			`
			UPDATE import_jobs 
			SET status = $1::job_status_enum, 
				imported_matches = COALESCE($2, imported_matches),
				failed_matches = COALESCE($3, failed_matches),
				rate_limit_remaining = COALESCE($4, rate_limit_remaining),
				rate_limit_reset_at = COALESCE($5, rate_limit_reset_at),
				progress = COALESCE($6::jsonb, progress),
				error_message = COALESCE($7, error_message),
				completed_at = CASE WHEN $1::text IN ('completed', 'failed') THEN NOW() ELSE completed_at END,
				updated_at = NOW()
			WHERE id = $8
		`,
			status,
			updates.imported_matches ?? null,
			updates.failed_matches ?? null,
			updates.rate_limit_remaining ?? null,
			updates.rate_limit_reset_at ?? null,
			updates.progress ? JSON.stringify(updates.progress) : null,
			updates.error_message ?? null,
			jobId
		)
	}

	private async loadLeagueConfigs(): Promise<LeagueConfig[]> {
		// Fetch leagues from the API endpoint
		try {
			const response = await fetch('http://localhost:3000/api/config')
			const data = (await response.json()) as { leagues: LeagueConfig[] }
			return data.leagues
		} catch (error) {
			console.error('Error loading league configs from API:', error)
			throw new Error('Failed to load league configurations')
		}
	}

private async processJob(job: ImportJob): Promise<void> {
	const isResume = job.progress?.completed_leagues && job.progress.completed_leagues.length > 0
	
	this.log(job.id, `${isResume ? 'Resuming' : 'Starting'} job: ${job.leagues.length} leagues, ${job.date_from} to ${job.date_to}`)

	// Only update started_at if this is a new job
	if (!isResume && !job.started_at) {
		await this.updateJobStatus(job.id, 'running', {
			...job,
			started_at: new Date(),
			progress: {
				completed_leagues: [],
				current_league: undefined,
				current_date: undefined,
			},
		} as any)
	} else {
		// Just ensure status is running for resume
		await this.updateJobStatus(job.id, 'running', job as any)
	}		const allLeagues = await this.loadLeagueConfigs()

		// Debug logging
		this.log(job.id, `Loaded ${allLeagues.length} leagues from config`)
		this.log(job.id, `Job requests leagues: ${job.leagues.join(', ')}`)

		// Convert job.leagues to numbers for comparison (they come as strings from JSON)
		const requestedLeagueIds = job.leagues.map(id => (typeof id === 'string' ? parseInt(id, 10) : id))
		const selectedLeagues = allLeagues.filter(l => requestedLeagueIds.includes(l.id))

		if (selectedLeagues.length === 0) {
			throw new Error(`No matching leagues found for IDs: ${job.leagues.join(', ')}`)
		}

		this.log(job.id, `Matched leagues: ${selectedLeagues.map(l => `${l.name} (${l.country})`).join(', ')}`)

		// Create API client for this job
		const apiClient = new ApiFootballClient(process.env.API_FOOTBALL_KEY!)
		const leagueSelector = new LeagueSelector(apiClient)
		const importer = new DataImporter(apiClient, leagueSelector)

		try {
			// Resume from progress if exists
			const completedLeagues = job.progress?.completed_leagues || []
			const remainingLeagues = selectedLeagues.filter(l => !completedLeagues.includes(l.id))

			this.log(
				job.id,
				`Total leagues: ${selectedLeagues.length}, Completed: ${completedLeagues.length}, Remaining: ${remainingLeagues.length}`
			)

			if (completedLeagues.length > 0) {
				this.log(
					job.id,
					`📝 Resuming from league ${remainingLeagues[0]?.name || 'none'} (skipped ${
						completedLeagues.length
					} completed leagues)`
				)
			}

			// Track cumulative stats
			let cumulativeImported = job.imported_matches || 0
			let cumulativeFailed = job.failed_matches || 0

			for (const league of remainingLeagues) {
				this.log(job.id, `Processing league: ${league.name} (${league.country})`)

				// Update progress
				await this.updateJobStatus(job.id, 'running', {
					...job,
					progress: {
						current_league: league.id,
						current_date: job.date_from.toISOString().split('T')[0],
						completed_leagues: completedLeagues,
					},
				} as any)

			// Import matches for this league - create temp config with single league
			const tempConfigPath = path.join(process.cwd(), 'logs', `temp-config-${job.id}-${league.id}.json`)
			const mainConfigPath = path.join(process.cwd(), 'data', 'leagues.json')

			// Write temp config for single league with all required fields
			const tempLeagueConfig = {
				id: league.id,
				name: league.name,
				country: league.country,
				type: league.type || 'League',
				priority: league.priority || 3,
				enabled: true // CRITICAL: Must be enabled!
			}
			fs.writeFileSync(tempConfigPath, JSON.stringify([tempLeagueConfig], null, 2))

			try {
				// Backup existing config if it exists
				let hadExistingConfig = false
				let backupConfigPath = ''

					if (fs.existsSync(mainConfigPath)) {
						hadExistingConfig = true
						backupConfigPath = path.join(process.cwd(), 'logs', `backup-config-${job.id}.json`)
						fs.copyFileSync(mainConfigPath, backupConfigPath)
					}

					// Use temp config
					fs.copyFileSync(tempConfigPath, mainConfigPath)

					// Create fresh importer with single league
					const tempLeagueSelector = new LeagueSelector(apiClient)
					const tempImporter = new DataImporter(apiClient, tempLeagueSelector)

				// Use appropriate import method based on job type
				if (job.job_type === 'update_results') {
					await tempImporter.updateResults(
						job.date_from.toISOString().split('T')[0],
						job.date_to.toISOString().split('T')[0],
						false // don't resume
					)
				} else {
					// Default: import new matches
					await tempImporter.importDateRange(
						job.date_from.toISOString().split('T')[0],
						job.date_to.toISOString().split('T')[0],
						false, // don't resume
						false // no auto-retry (we handle it ourselves)
					)
				}

					// Restore original config if it existed
					if (hadExistingConfig && backupConfigPath && fs.existsSync(backupConfigPath)) {
						fs.copyFileSync(backupConfigPath, mainConfigPath)
						fs.unlinkSync(backupConfigPath)
					} else if (!hadExistingConfig && fs.existsSync(mainConfigPath)) {
						// Remove temp config file if we created it
						fs.unlinkSync(mainConfigPath)
					}

					// Cleanup temp file
					if (fs.existsSync(tempConfigPath)) {
						fs.unlinkSync(tempConfigPath)
					}

					// Check rate limit
					const rateLimitInfo = tempImporter.getRateLimitInfo()
					const progress = tempImporter.getProgress()					// Log league details
					const leagueProgress = progress.leagues[league.id]
					if (leagueProgress) {
						const total = leagueProgress.imported + leagueProgress.failed
						this.log(
							job.id,
							`✅ ${league.name}: ${leagueProgress.imported}/${total} imported${
								leagueProgress.failed > 0 ? `, ${leagueProgress.failed} failed` : ''
							}`
						)
					}

					// Log failed matches if any
					if (progress.failedMatches > 0) {
						this.log(job.id, `⚠️  Total failures so far: ${cumulativeFailed + progress.failedMatches}`)
					}

					// Update cumulative stats
					cumulativeImported += progress.importedMatches
					cumulativeFailed += progress.failedMatches

				this.log(
					job.id,
					`📊 Progress: ${cumulativeImported} total imported, ${rateLimitInfo.remaining} API requests remaining`
				)

				// Get matches imported in THIS iteration (not cumulative)
				const leagueImported = tempImporter.getProgress().leagues[league.id]?.imported || 0
				const leagueFailed = tempImporter.getProgress().leagues[league.id]?.failed || 0

				// If league didn't import anything and has no failures, it's complete (all matches already in DB)
				if (leagueImported === 0 && leagueFailed === 0) {
					this.log(job.id, `✅ League ${league.name} already fully imported (0/0 new matches)`)
					completedLeagues.push(league.id)

					// Update progress even if no new matches
					await this.updateJobStatus(job.id, 'running', {
						...job,
						imported_matches: cumulativeImported,
						failed_matches: cumulativeFailed,
						rate_limit_remaining: rateLimitInfo.remaining,
						progress: {
							...job.progress,
							completed_leagues: completedLeagues,
							current_league: undefined,
						},
					} as any)

					this.log(job.id, `✅ Completed league: ${league.name} (${completedLeagues.length}/${selectedLeagues.length})`)
					continue // Skip to next league
				}

				// Check if rate limited BEFORE marking league as completed
				if (rateLimitInfo.remaining <= 10) {
					// Keep small buffer
					this.log(job.id, '⏸️  Rate limit reached during league import, pausing job for 15 minutes')
					this.log(job.id, `⚠️  League ${league.name} will be retried after rate limit reset`)
					await this.updateJobStatus(job.id, 'rate_limited', {
						...job,
						imported_matches: cumulativeImported,
						failed_matches: cumulativeFailed,
						rate_limit_reset_at: new Date(Date.now() + 15 * 60 * 1000), // 15 minutes
						progress: {
							...job.progress,
							completed_leagues: completedLeagues,
							current_league: league.id, // Keep current league so it will be retried
						},
					} as any)
					return // Exit and let scheduler resume later
				}					// Only mark league as completed if we have enough API requests
					// This ensures leagues hit by rate limit will be retried
					completedLeagues.push(league.id)

					// Update job with league completion and cumulative stats
					await this.updateJobStatus(job.id, 'running', {
						...job,
						imported_matches: cumulativeImported,
						failed_matches: cumulativeFailed,
						rate_limit_remaining: rateLimitInfo.remaining,
						progress: {
							...job.progress,
							completed_leagues: completedLeagues,
							current_league: undefined,
						},
					} as any)

				this.log(job.id, `✅ Completed league: ${league.name} (${completedLeagues.length}/${selectedLeagues.length})`)

				} catch (error: any) {
				this.log(job.id, `❌ Error processing league ${league.name}: ${error.message}`)

				// Cleanup all temp files on error
				const originalConfigPath = path.join(process.cwd(), 'league-config.json')
				const backupConfigPath = path.join(process.cwd(), 'logs', `backup-config-${job.id}.json`)

				// Only restore backup if it exists
				if (fs.existsSync(backupConfigPath)) {
					try {
						fs.copyFileSync(backupConfigPath, originalConfigPath)
						fs.unlinkSync(backupConfigPath)
					} catch (restoreError: any) {
						this.log(job.id, `⚠️  Warning: Could not restore config backup: ${restoreError.message}`)
					}
				}
				
				// Remove temp config if it exists
				if (fs.existsSync(tempConfigPath)) {
					try {
						fs.unlinkSync(tempConfigPath)
					} catch (cleanupError: any) {
						this.log(job.id, `⚠️  Warning: Could not remove temp config: ${cleanupError.message}`)
					}
				}

				// Check if this is a rate limit error
				if (error.message?.includes('Rate limit') || error.message?.includes('rate limit') || error.message?.includes('429')) {
					this.log(job.id, '⏸️  Rate limit reached during league import, pausing job for 15 minutes')
					this.log(job.id, `⚠️  League ${league.name} will be retried after rate limit reset`)
					await this.updateJobStatus(job.id, 'rate_limited', {
						...job,
						imported_matches: cumulativeImported,
						failed_matches: cumulativeFailed,
						rate_limit_reset_at: new Date(Date.now() + 15 * 60 * 1000), // 15 minutes
						progress: {
							...job.progress,
							completed_leagues: completedLeagues,
							current_league: league.id, // Keep current league so it will be retried
						},
					} as any)
					return // Exit and let scheduler resume later
				}

				// For other errors, continue with next league
				this.log(job.id, `⚠️  Skipping league ${league.name} due to error, continuing with next league`)
			}
		}

		// Job completed
			await this.updateJobStatus(job.id, 'completed', {
				imported_matches: cumulativeImported,
				failed_matches: cumulativeFailed,
			} as any)

		this.log(job.id, `✅ Job completed successfully`)

		// Promote next job in queue
		await this.promoteNextQueuedJob()

		// Create database backup and push to GitHub
		this.log(job.id, '💾 Creating database backup...')
			try {
				const backup = new DatabaseBackup()
				await backup.createBackup({
					pushToGit: true,
					skipIfNoChanges: true,
				})
				this.log(job.id, '✅ Database backup created and pushed to GitHub')
			} catch (error: any) {
				this.log(job.id, `⚠️  Backup failed (non-critical): ${error.message}`)
			}

			// Send completion email
			await this.sendEmail(
				'Import Job Completed',
				`Job #${job.id} has completed successfully.\n\n` +
					`Leagues processed: ${selectedLeagues.map(l => l.name).join(', ')}\n` +
					`Imported: ${cumulativeImported} matches\n` +
					`Failed: ${cumulativeFailed} matches\n` +
					`Date range: ${job.date_from.toISOString().split('T')[0]} to ${job.date_to.toISOString().split('T')[0]}`
			)
	} catch (error: any) {
		this.log(job.id, `❌ Job failed: ${error.message}`)
		await this.updateJobStatus(job.id, 'failed', {
			...job,
			error_message: error.message,
		} as any)

		// Promote next job in queue even on failure
		await this.promoteNextQueuedJob()			// Send error email
			await this.sendEmail(
				'Import Job Failed',
				`Job #${job.id} has failed.\n\n` + `Error: ${error.message}\n\n` + `Stack trace:\n${error.stack}`
			)
		}
	}

	async start() {
		console.log('🚀 Background Import Worker started')
		console.log(`📁 Logs directory: ${this.logDir}`)
		console.log('⏰ Checking for jobs every 5 minutes...\n')

		// Check immediately on start
		await this.checkAndProcessJobs()

	// Check for pending/rate_limited jobs every 5 minutes
	setInterval(async () => {
		await this.checkAndProcessJobs()
	}, 300000) // Check every 5 minutes		// Keep process alive
		process.on('SIGINT', async () => {
			console.log('\n⏹️  Shutting down worker...')
			await prisma.$disconnect()
			process.exit(0)
		})
	}

	private async checkAndProcessJobs() {
		try {
			// Don't check for new jobs if we're already processing one
			if (this.processingJobId !== null) {
				console.log(`⏳ Still processing job #${this.processingJobId}, skipping check`)
				return
			}

			console.log('🔍 Checking for pending jobs...')

		// Find jobs that need processing
		// Priority: 1. rate_limited jobs ready to resume, 2. pending jobs (ONLY if no active/paused job exists)
		const jobs = await prisma.$queryRaw<ImportJob[]>`
			SELECT * FROM import_jobs
			WHERE (
				-- Rate limited jobs that are ready to resume
				(status = 'rate_limited' AND rate_limit_reset_at < NOW())
				OR 
				-- Pending jobs ONLY if there are NO running or rate_limited jobs at all
				(
					status = 'pending' 
					AND NOT EXISTS (
						SELECT 1 FROM import_jobs 
						WHERE status IN ('running', 'rate_limited')
					)
				)
			)
			ORDER BY 
				CASE 
					WHEN status = 'rate_limited' THEN 1
					WHEN status = 'pending' THEN 2
				END,
				created_at ASC
			LIMIT 1
		`

		if (jobs.length > 0) {
			const job = jobs[0]

				// Parse progress if it's a string
				if (typeof job.progress === 'string') {
					job.progress = JSON.parse(job.progress)
				}

			console.log(`✅ Found job #${job.id} to process`)

			// Set lock
			this.processingJobId = job.id

			// If resuming from rate_limited, reset status
			if (job.status === 'rate_limited') {
				const completedCount = job.progress?.completed_leagues?.length || 0
				console.log(`🔄 Resuming rate-limited job #${job.id} (${completedCount} leagues already completed)`)
				await this.updateJobStatus(job.id, 'running', {
					...job,
					rate_limit_reset_at: null,
				} as any)
			}

			try {
				await this.processJob(job)
			} finally {
				// Release lock when done (completed, failed, or rate-limited)
				this.processingJobId = null
				
				// Immediately check for next job (don't wait for the 5-minute interval)
				console.log('🔍 Job finished, checking for next job in queue...')
				setImmediate(() => this.checkAndProcessJobs())
			}
			} else {
				console.log('💤 No jobs to process')
			}
		} catch (error) {
			console.error('❌ Worker error:', error)
			// Release lock on error
			this.processingJobId = null
		}
	}
}

// Start worker
const worker = new BackgroundImportWorker()
worker.start()
