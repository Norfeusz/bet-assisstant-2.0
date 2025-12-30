/**
 * Database connection module using Prisma Client
 */

import { PrismaClient } from '@prisma/client'
import dotenv from 'dotenv'

// Load environment variables
dotenv.config()

// Create Prisma client instance
export const prisma = new PrismaClient({
	log: ['query', 'info', 'warn', 'error'],
})

/**
 * Test database connection
 */
export async function testConnection(): Promise<boolean> {
	try {
		await prisma.$connect()
		console.log('✅ Database connection: OK')

		// Test query
		const result = await prisma.$queryRaw`SELECT 1 as test`
		console.log('✅ Test query successful:', result)

		return true
	} catch (error) {
		console.error('❌ Database connection failed:', error)
		return false
	}
}

/**
 * Graceful shutdown
 */
export async function disconnectDb(): Promise<void> {
	await prisma.$disconnect()
	console.log('🔌 Database disconnected')
}

// Handle graceful shutdown
process.on('beforeExit', async () => {
	await disconnectDb()
})
