/**
 * Backup leagues table
 * Creates rotating backups (10 files, oldest gets overwritten)
 */

import { PrismaClient } from '@prisma/client'
import * as fs from 'fs'
import * as path from 'path'

const prisma = new PrismaClient()
const BACKUP_DIR = path.join(process.cwd(), 'backups')
const MAX_BACKUPS = 10

async function backupLeaguesTable() {
	console.log('\n=== Backing up Leagues Table ===\n')

	try {
		// Ensure backup directory exists
		if (!fs.existsSync(BACKUP_DIR)) {
			fs.mkdirSync(BACKUP_DIR, { recursive: true })
		}

		// Get all leagues from table
		const leagues = await prisma.$queryRaw<Array<{
			id: number
			name: string
			country: string
			is_choosen: string
			created_at: Date
			updated_at: Date
		}>>`
			SELECT id, name, country, is_choosen, created_at, updated_at
			FROM leagues
			ORDER BY id
		`

		console.log(`📊 Found ${leagues.length} leagues to backup`)

		// Find existing backup files
		const files = fs.readdirSync(BACKUP_DIR)
			.filter(f => f.startsWith('leagues-backup-') && f.endsWith('.json'))
			.sort()

		// Determine next backup number
		let backupNumber = 1
		if (files.length > 0) {
			const lastFile = files[files.length - 1]
			const match = lastFile.match(/leagues-backup-(\d+)\.json/)
			if (match) {
				const lastNumber = parseInt(match[1])
				backupNumber = (lastNumber % MAX_BACKUPS) + 1
			}
		}

		// Create backup file
		const backupFileName = `leagues-backup-${backupNumber}.json`
		const backupPath = path.join(BACKUP_DIR, backupFileName)

		const backupData = {
			timestamp: new Date().toISOString(),
			total_leagues: leagues.length,
			leagues: leagues
		}

		fs.writeFileSync(backupPath, JSON.stringify(backupData, null, 2), 'utf-8')

		console.log(`✅ Backup created: ${backupFileName}`)
		console.log(`📁 Location: ${backupPath}`)
		console.log(`💾 Total backups: ${Math.min(files.length + 1, MAX_BACKUPS)}/${MAX_BACKUPS}`)

		await prisma.$disconnect()
	} catch (error: any) {
		console.error('❌ Backup failed:', error.message)
		process.exit(1)
	}
}

backupLeaguesTable()
