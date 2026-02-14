import express from 'express'
import { PrismaClient } from '@prisma/client'
import * as fs from 'fs'
import * as path from 'path'

const router = express.Router()
const prisma = new PrismaClient()

interface CreateJobRequest {
	leagueIds: number[]
	dateFrom: string
	dateTo: string
	jobType?: 'new_matches' | 'update_results'
}

// Create new import job
router.post('/import-jobs', async (req, res) => {
	try {
		const { leagueIds, dateFrom, dateTo, jobType = 'new_matches' } = req.body as CreateJobRequest

		// Validation
		if (!leagueIds || !Array.isArray(leagueIds) || leagueIds.length === 0) {
			return res.status(400).json({ error: 'leagueIds is required and must be a non-empty array' })
		}

	if (!dateFrom || !dateTo) {
		return res.status(400).json({ error: 'dateFrom and dateTo are required' })
	}

	// For update_results jobs, filter leagues to only include those with matches in the date range
	let finalLeagueIds = leagueIds
	if (jobType === 'update_results') {
		// First, get league names for the requested IDs
		const leagueNames = await prisma.$queryRaw<Array<{ id: number, name: string, country: string }>>`
			SELECT id, name, country
			FROM leagues
			WHERE id = ANY(${leagueIds}::int[])
		`
		
		if (leagueNames.length === 0) {
			return res.status(400).json({ 
				error: 'No leagues found for provided IDs'
			})
		}
		
		// Then check which leagues have matches in the date range
		const leaguesWithMatches = await prisma.$queryRaw<Array<{ league: string, country: string }>>`
			SELECT DISTINCT league, country
			FROM matches
			WHERE match_date >= ${dateFrom}::date
			  AND match_date <= ${dateTo}::date
		`
		
		// Map back to league IDs
		const matchingLeagues = leagueNames.filter(league => 
			leaguesWithMatches.some(match => 
				match.league === league.name && match.country === league.country
			)
		)
		
		finalLeagueIds = matchingLeagues.map(league => league.id)
		
		if (finalLeagueIds.length === 0) {
			return res.status(400).json({ 
				error: 'No matches found in database for selected leagues and date range',
				details: `Searched ${leagueIds.length} leagues from ${dateFrom} to ${dateTo}`
			})
		}
		
		console.log(`📊 Filtered leagues for update_results: ${leagueIds.length} → ${finalLeagueIds.length}`)
		console.log(`   Date range: ${dateFrom} to ${dateTo}`)
	}

	// Check if there's already an active or queued job
	const existingJobs = await prisma.$queryRaw<Array<{ count: bigint }>>`
		SELECT COUNT(*) as count
		FROM import_jobs
		WHERE status IN ('pending', 'running', 'rate_limited', 'in_queue')
	`
	
	// New job gets 'pending' only if no other jobs are active/queued, otherwise 'in_queue'
	const initialStatus = existingJobs[0].count > 0 ? 'in_queue' : 'pending'

	// Create job with filtered league IDs
	const job: any = await prisma.$queryRawUnsafe(
		`
	INSERT INTO import_jobs (leagues, date_from, date_to, job_type, status, progress)
	VALUES ($1::jsonb, $2::date, $3::date, $4::job_type_enum, $5::job_status_enum, '{}'::jsonb)
	RETURNING id
`,
		JSON.stringify(finalLeagueIds),
		dateFrom,
		dateTo,
		jobType,
		initialStatus
	)

	res.json({
		success: true,
		jobId: job[0].id,
		message: jobType === 'update_results' && finalLeagueIds.length < leagueIds.length
			? `Job created for ${finalLeagueIds.length} leagues with matches (${leagueIds.length - finalLeagueIds.length} empty leagues skipped)`
			: 'Import job created successfully. Worker will process it shortly.',
		leaguesFiltered: jobType === 'update_results' ? {
			requested: leagueIds.length,
			withMatches: finalLeagueIds.length,
			skipped: leagueIds.length - finalLeagueIds.length
		} : undefined
	})
	} catch (error: any) {
		console.error('Error creating import job:', error)
		res.status(500).json({ error: error.message })
	}
})

// Get all jobs
router.get('/import-jobs', async (req, res) => {
	try {
		const showHidden = req.query.showHidden === 'true'

		const jobs: any = await prisma.$queryRawUnsafe(
			`
			SELECT * FROM import_jobs
			WHERE hidden = $1
			ORDER BY created_at DESC
			LIMIT 50
		`,
			showHidden
		)

		res.json(jobs)
	} catch (error: any) {
		console.error('Error fetching jobs:', error)
		res.status(500).json({ error: error.message })
	}
})

// Get import queue (in_queue, pending, running, rate_limited jobs ordered by priority)
router.get('/import-jobs/queue', async (req, res) => {
try {
	const jobs = await prisma.$queryRaw<any[]>`
		SELECT 
			id, 
			leagues, 
			date_from, 
			date_to, 
			status, 
			progress,
			total_matches,
			imported_matches,
			failed_matches,
			rate_limit_remaining,
			rate_limit_reset_at,
			created_at,
			started_at
		FROM import_jobs
		WHERE status IN ('in_queue', 'pending', 'running', 'rate_limited')
		AND hidden = false
		ORDER BY 
			CASE 
				WHEN status = 'running' THEN 1
				WHEN status = 'rate_limited' THEN 2
				WHEN status = 'pending' THEN 3
				WHEN status = 'in_queue' THEN 4
			END,
			created_at ASC
	`

	res.json(jobs)
} catch (error: any) {
	console.error('Error fetching import queue:', error)
	res.status(500).json({ error: error.message })
}
})

// Get single job
router.get('/import-jobs/:id', async (req, res) => {
	try {
		const jobId = parseInt(req.params.id)

		const jobs = await prisma.$queryRaw<
			Array<{
				id: number
				leagues: any
				date_from: Date
				date_to: Date
				status: string
				progress: any
				total_matches: number
				imported_matches: number
				failed_matches: number
				rate_limit_remaining: number
				rate_limit_reset_at: Date | null
				error_message: string | null
				started_at: Date | null
				completed_at: Date | null
				created_at: Date
			}>
		>`
			SELECT * FROM import_jobs
			WHERE id = ${jobId}
		`

		if (jobs.length === 0) {
			return res.status(404).json({ error: 'Job not found' })
		}

		res.json({ success: true, job: jobs[0] })
	} catch (error: any) {
		console.error('Error fetching job:', error)
		res.status(500).json({ error: error.message })
	}
})

// Cancel/pause job
router.post('/import-jobs/:id/pause', async (req, res) => {
	try {
		const jobId = parseInt(req.params.id)

		await prisma.$executeRawUnsafe(
			`
			UPDATE import_jobs
			SET status = 'paused', updated_at = NOW()
			WHERE id = $1 AND status IN ('pending', 'running', 'rate_limited')
		`,
			jobId
		)

		res.json({ success: true, message: 'Job paused' })
	} catch (error: any) {
		console.error('Error pausing job:', error)
		res.status(500).json({ error: error.message })
	}
})

// Resume job
router.post('/import-jobs/:id/resume', async (req, res) => {
	try {
		const jobId = parseInt(req.params.id)

		await prisma.$executeRawUnsafe(
			`
			UPDATE import_jobs
			SET status = 'pending', updated_at = NOW()
			WHERE id = $1 AND status = 'paused'
		`,
			jobId
		)

		res.json({ success: true, message: 'Job resumed' })
	} catch (error: any) {
		console.error('Error resuming job:', error)
		res.status(500).json({ error: error.message })
	}
})

// Get job logs
router.get('/import-jobs/:id/logs', async (req, res) => {
	try {
		const jobId = parseInt(req.params.id)

		// Find log file for this job
		const logsDir = path.join(process.cwd(), 'logs')

		// Check if logs directory exists
		if (!fs.existsSync(logsDir)) {
			return res.json({ success: true, logs: [] })
		}

		const logFiles = fs.readdirSync(logsDir).filter(f => f.startsWith('import-') && f.endsWith('.log'))

		// Read all log files and filter for this job
		let logs: string[] = []

		for (const file of logFiles) {
			const content = fs.readFileSync(path.join(logsDir, file), 'utf-8')
			const jobLogs = content
				.split('\n')
				.filter(line => line.includes(`[Job ${jobId}]`))
				.map(line => line.trim())
				.filter(line => line.length > 0)

			logs = logs.concat(jobLogs)
		}

		res.json({ success: true, logs: logs.slice(-100) }) // Last 100 lines
	} catch (error: any) {
		console.error('Error fetching logs:', error)
		res.status(500).json({ error: error.message })
	}
})

// Hide job (soft delete)
router.post('/import-jobs/:id/hide', async (req, res) => {
	try {
		const jobId = parseInt(req.params.id)

		await prisma.$executeRawUnsafe(
			`
			UPDATE import_jobs
			SET hidden = TRUE, updated_at = NOW()
			WHERE id = $1
		`,
			jobId
		)

		res.json({ success: true, message: 'Job hidden' })
	} catch (error: any) {
		console.error('Error hiding job:', error)
		res.status(500).json({ error: error.message })
	}
})

// Unhide job (restore)
router.post('/import-jobs/:id/unhide', async (req, res) => {
	try {
		const jobId = parseInt(req.params.id)

		await prisma.$executeRawUnsafe(
			`
			UPDATE import_jobs
			SET hidden = FALSE, updated_at = NOW()
			WHERE id = $1
		`,
			jobId
		)

		res.json({ success: true, message: 'Job restored' })
	} catch (error: any) {
		console.error('Error restoring job:', error)
		res.status(500).json({ error: error.message })
	}
})

// Retry rate limited job immediately
router.post('/import-jobs/:id/retry', async (req, res) => {
	try {
		const jobId = parseInt(req.params.id)

		// Check if job exists and is rate_limited
		const job: any = await prisma.$queryRawUnsafe(`SELECT status FROM import_jobs WHERE id = $1`, jobId)

		if (job.length === 0) {
			return res.status(404).json({ error: 'Job not found' })
		}
		if (job[0].status !== 'rate_limited') {
			return res.status(400).json({ error: 'Only rate_limited jobs can be retried' })
		}

		// Reset to pending and clear rate limit timer
		await prisma.$queryRawUnsafe(
			`UPDATE import_jobs 
			 SET status = $1::job_status_enum, 
			     rate_limit_reset_at = NULL,
			     updated_at = NOW()
			 WHERE id = $2`,
			'pending',
			jobId
		)

		res.json({ success: true, message: 'Job retry initiated. Worker will attempt import shortly.' })
	} catch (error: any) {
		console.error('Error retrying job:', error)
		res.status(500).json({ error: error.message })
	}
})

// Restart completed job (creates new job with same parameters)
router.post('/import-jobs/:id/restart', async (req, res) => {
	try {
		const jobId = parseInt(req.params.id)

		// Get original job
		const jobs: any = await prisma.$queryRawUnsafe(
			`SELECT leagues, date_from, date_to, job_type, status FROM import_jobs WHERE id = $1`,
			jobId
		)

		if (jobs.length === 0) {
			return res.status(404).json({ error: 'Job not found' })
		}

		const originalJob = jobs[0]

		// Only allow restarting completed or failed jobs
		if (originalJob.status !== 'completed' && originalJob.status !== 'failed') {
			return res.status(400).json({ error: 'Only completed or failed jobs can be restarted' })
		}

		// Check if there's already an active or queued job
		const existingJobs = await prisma.$queryRaw<Array<{ count: bigint }>>`
			SELECT COUNT(*) as count
			FROM import_jobs
			WHERE status IN ('pending', 'running', 'rate_limited', 'in_queue')
		`

		// New job gets 'pending' only if no other jobs are active/queued, otherwise 'in_queue'
		const initialStatus = existingJobs[0].count > 0 ? 'in_queue' : 'pending'

		// Create new job with same parameters
		const newJob: any = await prisma.$queryRawUnsafe(
			`
			INSERT INTO import_jobs (leagues, date_from, date_to, job_type, status, progress)
			VALUES ($1::jsonb, $2::date, $3::date, $4::job_type_enum, $5::job_status_enum, '{}'::jsonb)
			RETURNING id
		`,
			JSON.stringify(originalJob.leagues),
			originalJob.date_from,
			originalJob.date_to,
			originalJob.job_type,
			initialStatus
		)

		res.json({
			success: true,
			newJobId: newJob[0].id,
			message: `New job #${newJob[0].id} created from job #${jobId}. Worker will process it shortly.`,
		})
	} catch (error: any) {
		console.error('Error restarting job:', error)
		res.status(500).json({ error: error.message })
	}
})

// Delete job (hard delete)
router.delete('/import-jobs/:id', async (req, res) => {
	try {
		const jobId = parseInt(req.params.id)

	// Only allow deleting completed, failed, or paused jobs
	await prisma.$executeRawUnsafe(
		`
		DELETE FROM import_jobs
		WHERE id = $1 AND status NOT IN ('running', 'pending')
	`,
		jobId
	)

	res.json({ success: true, message: 'Job deleted' })
} catch (error: any) {
	console.error('Error deleting job:', error)
	res.status(500).json({ error: error.message })
}
})

export default router
