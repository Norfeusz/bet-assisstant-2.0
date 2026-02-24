import express from 'express'
import { PrismaClient } from '@prisma/client'
import { DataImporter } from '../src/services/data-importer.js'
import { ApiFootballClient } from '../src/services/api-football-client.js'
import { LeagueSelector } from '../src/services/league-selector.js'
import dotenv from 'dotenv'

dotenv.config()

const router = express.Router()
const prisma = new PrismaClient()

// ====================================
// MIDDLEWARE: Autoryzacja webhook
// ====================================
const webhookAuth = (req: express.Request, res: express.Response, next: express.NextFunction) => {
	const apiKey = req.headers['x-n8n-api-key'] || req.headers['authorization']?.replace('Bearer ', '')
	const validKey = process.env.N8N_WEBHOOK_KEY

	if (!validKey) {
		console.error('❌ N8N_WEBHOOK_KEY not configured in .env')
		return res.status(500).json({ 
			success: false, 
			error: 'Webhook not configured on server' 
		})
	}

	if (!apiKey || apiKey !== validKey) {
		console.warn('⚠️  Unauthorized webhook attempt from:', req.ip)
		return res.status(401).json({ 
			success: false, 
			error: 'Unauthorized - Invalid API key' 
		})
	}

	next()
}

// ====================================
// WEBHOOK: Import nowych meczów (ASYNC z job queue)
// ====================================
interface ImportWebhookRequest {
	leagueIds?: number[]        // Opcjonalne - jeśli nie podano, bierze wszystkie enabled
	dateFrom?: string           // Format: YYYY-MM-DD
	dateTo?: string             // Format: YYYY-MM-DD
	daysAhead?: number          // Alternatywa: ile dni do przodu (np. 7)
	notifyEmail?: string        // Email do powiadomień
	async?: boolean             // Jeśli true, tworzy job i zwraca jobId (default: true)
}

router.post('/import-matches', webhookAuth, async (req, res) => {
	const startTime = Date.now()
	let importerInstance: DataImporter | null = null
	
	try {
		const { 
			leagueIds, 
			dateFrom, 
			dateTo, 
			daysAhead = 7,
			notifyEmail,
			async = true
		} = req.body as ImportWebhookRequest

		console.log('📥 n8n webhook triggered: import-matches', {
			leagueIds: leagueIds?.length || 'all enabled',
			dateFrom: dateFrom || 'today',
			dateTo: dateTo || `+${daysAhead} days`,
			notifyEmail: notifyEmail || 'none',
			async
		})

		// Oblicz daty jeśli nie podano
		// daysAhead=1 -> tylko JUTRO (nie dziś+jutro)
		const today = new Date()
		const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000)
		const startDate = dateFrom || tomorrow.toISOString().split('T')[0]
		const endDate = dateTo || new Date(today.getTime() + daysAhead * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

		// Pobierz ligi
		let leaguesToImport: Array<{ id: number; name: string; country: string }>

		if (leagueIds && leagueIds.length > 0) {
			// Konkretne ligi
			leaguesToImport = await prisma.$queryRaw<Array<{ id: number; name: string; country: string }>>`
				SELECT id, name, country
				FROM leagues
				WHERE id = ANY(${leagueIds}::int[])
			`
		} else {
			// Wszystkie enabled ligi z config
			const fs = await import('fs')
			const path = await import('path')
			const configPath = path.join(process.cwd(), 'data', 'leagues.json')
			const configData = fs.readFileSync(configPath, 'utf-8')
			const allLeagues = JSON.parse(configData)
			const enabledLeagues = allLeagues.filter((l: any) => l.enabled)
			
			leaguesToImport = enabledLeagues.map((l: any) => ({
				id: l.id,
				name: l.name,
				country: l.country
			}))
		}

		if (leaguesToImport.length === 0) {
			return res.status(400).json({
				success: false,
				error: 'No leagues to import',
				details: 'Either provide leagueIds or enable leagues in config'
			})
		}

		const leagueIdsToImport = leaguesToImport.map(l => l.id)

		// TRYB ASYNCHRONICZNY: Tworzy job w bazie, Background Worker go przetworzy
		if (async) {
			console.log(`📊 Creating async import job: ${leagueIdsToImport.length} leagues from ${startDate} to ${endDate}`)

			const job = await prisma.import_jobs.create({
				data: {
					leagues: leagueIdsToImport,
				date_from: new Date(startDate),
				date_to: new Date(endDate),
					total_matches: 0,
					imported_matches: 0,
					failed_matches: 0,
					rate_limit_remaining: 0,
					created_at: new Date()
				}
			})

			console.log(`✅ Job created with ID: ${job.id}`)

			return res.json({
				success: true,
				async: true,
				jobId: job.id,
				message: 'Import job created successfully. Background worker will process it.',
				checkStatusUrl: `/api/import-jobs/${job.id}`,
				job: {
					id: job.id,
					status: job.status,
					leagues: leagueIdsToImport.length,
					dateRange: { from: startDate, to: endDate }
				}
			})
		}

		// TRYB SYNCHRONICZNY (async=false): Import bezpośredni BEZ auto-retry
		console.log(`📊 Starting synchronous import: ${leagueIdsToImport.length} leagues from ${startDate} to ${endDate}`)

		const apiClient = new ApiFootballClient(process.env.API_FOOTBALL_KEY!)
		const leagueSelector = new LeagueSelector(apiClient)
		importerInstance = new DataImporter(apiClient, leagueSelector)

		// Import ZONDER auto-retry (żeby nie czekać 15 min w HTTP request)
		await importerInstance.importDateRange(startDate, endDate, false, false, leagueIdsToImport) // autoRetry: FALSE
		
		// Pobierz statystyki
		const progress = importerInstance.getProgress()
		const rateLimitInfo = importerInstance.getRateLimitInfo()
		const duration = ((Date.now() - startTime) / 1000).toFixed(2)

		const result = {
			success: true,
			async: false,
			stats: {
				totalMatches: progress.importedMatches + progress.failedMatches + progress.skippedMatches,
				imported: progress.importedMatches,
				failed: progress.failedMatches,
				skipped: progress.skippedMatches,
				leagues: Object.keys(progress.leagues).length,
				leagueDetails: progress.leagues
			},
			rateLimit: {
				remaining: rateLimitInfo.remaining,
				limit: rateLimitInfo.limit,
				resetAt: rateLimitInfo.resetTime
			},
			timing: {
				durationSeconds: parseFloat(duration),
				dateRange: { from: startDate, to: endDate }
			}
		}

		console.log(`✅ Import completed in ${duration}s:`, result.stats)

		// Opcjonalne powiadomienie email (jeśli skonfigurowane)
		if (notifyEmail && process.env.SMTP_USER) {
			// TODO: Implementacja wysyłki email przez nodemailer
			console.log(`📧 Email notification scheduled to: ${notifyEmail}`)
		}

		res.json(result)

	} catch (error: any) {
		const duration = ((Date.now() - startTime) / 1000).toFixed(2)
		
		console.error('❌ Import webhook error:', error)

		// Jeśli mamy instancję importera, pobierz partial stats
		let partialStats = null
		if (importerInstance) {
			const progress = importerInstance.getProgress()
			partialStats = {
				imported: progress.importedMatches,
				failed: progress.failedMatches,
				skipped: progress.skippedMatches
			}
		}

		res.status(500).json({
			success: false,
			error: error.message,
			partialStats,
			timing: {
				durationSeconds: parseFloat(duration),
				failedAt: new Date().toISOString()
			}
		})
	}
})

// ====================================
// WEBHOOK: Aktualizacja wyników
// ====================================
interface UpdateResultsWebhookRequest {
	dateFrom?: string           
	dateTo?: string             
	daysBack?: number           // Ile dni wstecz (np. 2)
	leagueIds?: number[]        
	notifyEmail?: string        
}

router.post('/update-results', webhookAuth, async (req, res) => {
	const startTime = Date.now()
	let importerInstance: DataImporter | null = null
	
	try {
		const { 
			dateFrom, 
			dateTo, 
			daysBack = 2,
			leagueIds,
			notifyEmail 
		} = req.body as UpdateResultsWebhookRequest

		console.log('🔄 n8n webhook triggered: update-results', {
			dateFrom: dateFrom || `-${daysBack} days`,
			dateTo: dateTo || 'today',
			leagueIds: leagueIds?.length || 'auto-detect from matches',
			notifyEmail: notifyEmail || 'none'
		})

		// Oblicz daty
		const today = new Date()
		const endDate = dateTo || today.toISOString().split('T')[0]
		const startDate = dateFrom || new Date(today.getTime() - daysBack * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

		// Pobierz ligi z meczami w tym zakresie
		let leaguesToUpdate: Array<{ id: number; name: string; country: string }>

		if (leagueIds && leagueIds.length > 0) {
			leaguesToUpdate = await prisma.$queryRaw<Array<{ id: number; name: string; country: string }>>`
				SELECT DISTINCT l.id, l.name, l.country
				FROM leagues l
				INNER JOIN matches m ON m.league = l.name AND m.country = l.country
				WHERE m.match_date >= ${startDate}::date
				  AND m.match_date <= ${endDate}::date
				  AND l.id = ANY(${leagueIds}::int[])
			`
		} else {
			// Auto-detect: wszystkie ligi z meczami w tym zakresie
			leaguesToUpdate = await prisma.$queryRaw<Array<{ id: number; name: string; country: string }>>`
				SELECT DISTINCT l.id, l.name, l.country
				FROM leagues l
				INNER JOIN matches m ON m.league = l.name AND m.country = l.country
				WHERE m.match_date >= ${startDate}::date
				  AND m.match_date <= ${endDate}::date
			`
		}

		if (leaguesToUpdate.length === 0) {
			return res.json({
				success: true,
				stats: {
					totalMatches: 0,
					updated: 0,
					message: 'No matches found in date range'
				},
				dateRange: { from: startDate, to: endDate }
			})
		}

		console.log(`🔄 Updating results for ${leaguesToUpdate.length} leagues from ${startDate} to ${endDate}`)

		// Inicjalizuj importer
		const apiClient = new ApiFootballClient(process.env.API_FOOTBALL_KEY!)
		const leagueSelector = new LeagueSelector(apiClient)
		importerInstance = new DataImporter(apiClient, leagueSelector)

		// Aktualizuj wyniki
		await importerInstance.updateResults(startDate, endDate, false)

		// Pobierz statystyki
		const progress = importerInstance.getProgress()
		const rateLimitInfo = importerInstance.getRateLimitInfo()
		const duration = ((Date.now() - startTime) / 1000).toFixed(2)

		const result = {
			success: true,
			stats: {
				totalMatches: progress.importedMatches + progress.failedMatches,
				updated: progress.importedMatches,
				failed: progress.failedMatches,
				leagues: Object.keys(progress.leagues).length,
				leagueDetails: progress.leagues
			},
			rateLimit: {
				remaining: rateLimitInfo.remaining,
				limit: rateLimitInfo.limit,
				resetAt: rateLimitInfo.resetTime
			},
			timing: {
				durationSeconds: parseFloat(duration),
				dateRange: { from: startDate, to: endDate }
			}
		}

		console.log(`✅ Results updated in ${duration}s:`, result.stats)

		res.json(result)

	} catch (error: any) {
		const duration = ((Date.now() - startTime) / 1000).toFixed(2)
		
		console.error('❌ Update results webhook error:', error)

		let partialStats = null
		if (importerInstance) {
			const progress = importerInstance.getProgress()
			partialStats = {
				updated: progress.importedMatches,
				failed: progress.failedMatches
			}
		}

		res.status(500).json({
			success: false,
			error: error.message,
			partialStats,
			timing: {
				durationSeconds: parseFloat(duration),
				failedAt: new Date().toISOString()
			}
		})
	}
})

// ====================================
// WEBHOOK: Health check
// ====================================
router.get('/health', webhookAuth, async (req, res) => {
	try {
		// Sprawdź połączenie z bazą
		await prisma.$queryRaw`SELECT 1`

		// Sprawdź API Football key
		const hasApiKey = !!process.env.API_FOOTBALL_KEY

		res.json({
			success: true,
			status: 'healthy',
			timestamp: new Date().toISOString(),
			checks: {
				database: 'ok',
				apiFootballKey: hasApiKey ? 'configured' : 'missing'
			}
		})
	} catch (error: any) {
		res.status(500).json({
			success: false,
			status: 'unhealthy',
			error: error.message,
			timestamp: new Date().toISOString()
		})
	}
})

// ====================================
// WEBHOOK: Status systemu (dla monitoringu)
// ====================================
router.get('/status', webhookAuth, async (req, res) => {
	try {
		// Statystyki z bazy
		const [matchCount, leagueCount, recentImports] = await Promise.all([
			prisma.$queryRaw<Array<{ count: bigint }>>`
				SELECT COUNT(*) as count FROM matches
			`,
			prisma.$queryRaw<Array<{ count: bigint }>>`
				SELECT COUNT(*) as count FROM leagues WHERE enabled = true
			`,
			prisma.$queryRaw<Array<{ 
				id: number
				status: string
				created_at: Date
				completed_at: Date | null
			}>>`
				SELECT id, status, created_at, completed_at
				FROM import_jobs
				WHERE created_at >= NOW() - INTERVAL '24 hours'
				ORDER BY created_at DESC
				LIMIT 5
			`
		])

		res.json({
			success: true,
			stats: {
				totalMatches: Number(matchCount[0].count),
				enabledLeagues: Number(leagueCount[0].count),
				recentImports: recentImports.map(job => ({
					id: job.id,
					status: job.status,
					createdAt: job.created_at,
					completedAt: job.completed_at,
					duration: job.completed_at && job.created_at
						? ((new Date(job.completed_at).getTime() - new Date(job.created_at).getTime()) / 1000).toFixed(2) + 's'
						: null
				}))
			},
			timestamp: new Date().toISOString()
		})
	} catch (error: any) {
		res.status(500).json({
			success: false,
			error: error.message,
			timestamp: new Date().toISOString()
		})
	}
})

// ====================================
// WEBHOOK: Backup bazy danych
// ====================================
interface BackupWebhookRequest {
	pushToGit?: boolean         // Czy pushować do Git (domyślnie: false, n8n zarządza Git)
	skipIfNoChanges?: boolean   // Pomiń jeśli brak zmian
	notifyEmail?: string        
}

router.post('/backup-database', webhookAuth, async (req, res) => {
	const startTime = Date.now()
	
	try {
		const { 
			pushToGit = false,  // n8n sam zajmie się Gitem
			skipIfNoChanges = true,
			notifyEmail 
		} = req.body as BackupWebhookRequest

		console.log('💾 n8n webhook triggered: backup-database', {
			pushToGit,
			skipIfNoChanges,
			notifyEmail: notifyEmail || 'none'
		})

		// Import klasy backup
		const { DatabaseBackup } = await import('../scripts/backup-database.js')
		
		// Utwórz backup
		const backup = new DatabaseBackup()
		await backup.createBackup({ pushToGit, skipIfNoChanges })

		const duration = ((Date.now() - startTime) / 1000).toFixed(2)

		// Sprawdź rozmiar backupu
		const fs = await import('fs')
		const path = await import('path')
		const backupDir = path.join(process.cwd(), 'backups')
		
		// Znajdź najnowszy backup
		const backupFiles = fs.readdirSync(backupDir)
			.filter(f => f.startsWith('database-backup-'))
			.map(f => {
				const filePath = path.join(backupDir, f)
				const stats = fs.statSync(filePath)
				return { file: f, path: filePath, mtime: stats.mtime, size: stats.size }
			})
			.sort((a, b) => b.mtime.getTime() - a.mtime.getTime())

		const latestBackup = backupFiles[0]
		const backupSizeMB = latestBackup ? (latestBackup.size / 1024 / 1024).toFixed(2) : '?'

		const result = {
			success: true,
			backup: {
				file: latestBackup?.file || 'unknown',
				sizeMB: parseFloat(backupSizeMB),
				timestamp: latestBackup?.mtime || new Date(),
				path: latestBackup?.path || 'unknown'
			},
			timing: {
				durationSeconds: parseFloat(duration)
			},
			totalBackups: backupFiles.length
		}

		console.log(`✅ Database backup completed in ${duration}s: ${backupSizeMB} MB`)

		res.json(result)

	} catch (error: any) {
		const duration = ((Date.now() - startTime) / 1000).toFixed(2)
		
		console.error('❌ Backup webhook error:', error)

		res.status(500).json({
			success: false,
			error: error.message,
			timing: {
				durationSeconds: parseFloat(duration),
				failedAt: new Date().toISOString()
			}
		})
	}
})

// ====================================
// WEBHOOK: Sprawdź status pending jobs (dla manual wake worker)
// ====================================
router.get('/import-jobs/status', webhookAuth, async (req, res) => {
	try {
		// Pobierz joby według statusu
		const jobs = await prisma.$queryRaw<any[]>`
			SELECT 
				id, 
				status,
				job_type,
				jsonb_array_length(leagues) as league_count,
				date_from::text,
				date_to::text,
				imported_matches,
				total_matches,
				rate_limit_reset_at,
				created_at,
				started_at
			FROM import_jobs
			WHERE status IN ('in_queue', 'pending', 'running', 'rate_limited')
			ORDER BY 
				CASE 
					WHEN status = 'running' THEN 1
					WHEN status = 'rate_limited' THEN 2
					WHEN status = 'pending' THEN 3
					WHEN status = 'in_queue' THEN 4
				END,
				created_at ASC
		`

		// Grupuj według statusu
		const grouped = {
			running: jobs.filter(j => j.status === 'running'),
			rate_limited: jobs.filter(j => j.status === 'rate_limited'),
			pending: jobs.filter(j => j.status === 'pending' || j.status === 'in_queue')
		}

		// Uproszczona odpowiedź
		res.json({
			success: true,
			summary: {
				total: jobs.length,
				running: grouped.running.length,
				rate_limited: grouped.rate_limited.length,
				pending: grouped.pending.length
			},
			running: grouped.running.map(j => ({
				id: j.id,
				type: j.job_type,
				progress: j.total_matches > 0 
					? `${j.imported_matches}/${j.total_matches}` 
					: 'starting...',
				started: j.started_at
			})),
			rate_limited: grouped.rate_limited.map(j => ({
				id: j.id,
				type: j.job_type,
				reset_at: j.rate_limit_reset_at,
				progress: `${j.imported_matches}/${j.total_matches}`,
				waiting_minutes: j.rate_limit_reset_at 
					? Math.ceil((new Date(j.rate_limit_reset_at).getTime() - Date.now()) / 60000)
					: 0
			})),
			pending: grouped.pending.map(j => ({
				id: j.id,
				type: j.job_type,
				leagues: j.league_count,
				date_range: `${j.date_from} → ${j.date_to}`,
				created: j.created_at
			}))
		})

	} catch (error: any) {
		console.error('❌ Error fetching job status:', error)
		res.status(500).json({
			success: false,
			error: error.message
		})
	}
})

export default router
