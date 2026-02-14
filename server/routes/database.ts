/**
 * Database Browser Routes
 * RESTful API for database browsing and querying
 */

import express from 'express'
import { DatabaseBrowserService } from '../src/services/database-browser.js'

const router = express.Router()
const dbService = new DatabaseBrowserService()

/**
 * GET /api/database/list
 * List all databases on server
 */
router.get('/database/list', async (req, res) => {
	try {
		const databases = await dbService.listDatabases()
		const defaultDb = dbService.getDefaultDatabase()
		
		res.json({
			databases,
			defaultDatabase: defaultDb,
		})
	} catch (error: any) {
		console.error('Error listing databases:', error)
		res.status(500).json({ error: error.message })
	}
})

/**
 * GET /api/database/:db/tables
 * List all tables in database
 */
router.get('/database/:db/tables', async (req, res) => {
	try {
		const { db } = req.params
		const tables = await dbService.listTables(db)
		
		res.json({ tables })
	} catch (error: any) {
		console.error(`Error listing tables in ${req.params.db}:`, error)
		res.status(500).json({ error: error.message })
	}
})

/**
 * GET /api/database/:db/tables/:table/schema
 * Get table schema (columns, types, constraints)
 */
router.get('/database/:db/tables/:table/schema', async (req, res) => {
	try {
		const { db, table } = req.params
		const { schema = 'public' } = req.query
		
		const tableSchema = await dbService.getTableSchema(db, table, schema as string)
		
		res.json(tableSchema)
	} catch (error: any) {
		console.error(`Error getting schema for ${req.params.table}:`, error)
		res.status(500).json({ error: error.message })
	}
})

/**
 * POST /api/database/:db/tables/:table/query
 * Query table data with filters, sorting, pagination
 */
router.post('/database/:db/tables/:table/query', async (req, res) => {
	try {
		const { db, table } = req.params
		const {
			schemaName = 'public',
			page = 1,
			pageSize = 100,
			sortColumns = [],
			filters = [],
			search,
			searchColumns = [],
		} = req.body

		console.log(`🔍 Query request for ${db}.${table}:`, {
			page,
			pageSize,
			sortColumns: JSON.stringify(sortColumns),
			sortColumnsCount: sortColumns.length,
			filtersCount: filters.length,
			search,
			searchColumnsCount: searchColumns.length,
		})

		const result = await dbService.queryTableData(db, table, {
			schemaName,
			page,
			pageSize,
			sortColumns,
			filters,
			search,
			searchColumns,
		})

		res.json(result)
	} catch (error: any) {
		console.error(`Error querying ${req.params.table}:`, error)
		res.status(500).json({ error: error.message })
	}
})

/**
 * POST /api/database/:db/tables/:table/insert
 * Insert new record into table
 */
router.post('/database/:db/tables/:table/insert', async (req, res) => {
	try {
		const { db, table } = req.params
		const { schemaName = 'public', data } = req.body

		if (!data || Object.keys(data).length === 0) {
			return res.status(400).json({ error: 'No data provided' })
		}

		const result = await dbService.insertRecord(db, table, schemaName, data)
		
		res.json({ success: true, record: result })
	} catch (error: any) {
		console.error(`Error inserting into ${req.params.table}:`, error)
		res.status(500).json({ error: error.message })
	}
})

/**
 * PUT /api/database/:db/tables/:table/update
 * Update record in table
 */
router.put('/database/:db/tables/:table/update', async (req, res) => {
	try {
		const { db, table } = req.params
		const { schemaName = 'public', primaryKey, data } = req.body

		if (!primaryKey || !primaryKey.column || primaryKey.value === undefined) {
			return res.status(400).json({ error: 'Invalid primary key' })
		}

		if (!data || Object.keys(data).length === 0) {
			return res.status(400).json({ error: 'No data provided' })
		}

		const result = await dbService.updateRecord(db, table, schemaName, primaryKey, data)
		
		res.json({ success: true, record: result })
	} catch (error: any) {
		console.error(`Error updating ${req.params.table}:`, error)
		res.status(500).json({ error: error.message })
	}
})

/**
 * DELETE /api/database/:db/tables/:table/delete
 * Delete records from table
 */
router.delete('/database/:db/tables/:table/delete', async (req, res) => {
	try {
		const { db, table } = req.params
		const { schemaName = 'public', primaryKey } = req.body

		if (!primaryKey || !primaryKey.column || !primaryKey.values || !Array.isArray(primaryKey.values)) {
			return res.status(400).json({ error: 'Invalid primary key specification' })
		}

		if (primaryKey.values.length === 0) {
			return res.status(400).json({ error: 'No records to delete' })
		}

		const deletedCount = await dbService.deleteRecords(db, table, schemaName, primaryKey)
		
		res.json({ success: true, deletedCount })
	} catch (error: any) {
		console.error(`Error deleting from ${req.params.table}:`, error)
		res.status(500).json({ error: error.message })
	}
})

export default router
