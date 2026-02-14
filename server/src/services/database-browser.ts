/**
 * Database Browser Service
 * Universal PostgreSQL database browser with multi-database support
 */

import { Pool } from 'pg'
import * as dotenv from 'dotenv'

dotenv.config()

export interface DatabaseInfo {
	name: string
	size?: string
	tables?: number
}

export interface TableInfo {
	name: string
	schema: string
	rows?: number
	size?: string
}

export interface ColumnInfo {
	name: string
	type: string
	nullable: boolean
	default: string | null
	isPrimaryKey: boolean
	isForeignKey: boolean
	foreignKeyTable?: string
	foreignKeyColumn?: string
}

export interface TableSchema {
	columns: ColumnInfo[]
	primaryKeys: string[]
	foreignKeys: Array<{
		column: string
		referencedTable: string
		referencedColumn: string
	}>
}

export interface QueryResult {
	rows: any[]
	totalCount: number
	page: number
	pageSize: number
	totalPages: number
}

export class DatabaseBrowserService {
	private connectionString: string
	private pool: Pool | null = null

	constructor() {
		// Base connection string from .env (without database name)
		const dbUrl = process.env.DATABASE_URL || ''
		
		// Extract base connection without database name
		// Format: postgresql://user:pass@host:port/dbname
		const match = dbUrl.match(/^(.*\/)([^\/]+)$/)
		if (match) {
			this.connectionString = match[1] // Everything except database name
		} else {
			this.connectionString = dbUrl
		}
	}

	/**
	 * Get connection pool for specific database
	 */
	private getPool(databaseName: string): Pool {
		const connectionString = `${this.connectionString}${databaseName}`
		
		return new Pool({
			connectionString,
			max: 10,
			idleTimeoutMillis: 30000,
			connectionTimeoutMillis: 2000,
		})
	}

	/**
	 * Execute query with error handling
	 */
	private async executeQuery<T = any>(
		databaseName: string,
		query: string,
		params: any[] = []
	): Promise<T[]> {
		const pool = this.getPool(databaseName)
		
		try {
			const result = await pool.query(query, params)
			return result.rows as T[]
		} catch (error: any) {
			console.error(`❌ Query error in ${databaseName}:`, error.message)
			throw error
		} finally {
			await pool.end()
		}
	}

	/**
	 * List all databases on server
	 */
	async listDatabases(): Promise<DatabaseInfo[]> {
		const query = `
			SELECT 
				datname as name,
				pg_size_pretty(pg_database_size(datname)) as size
			FROM pg_database
			WHERE datistemplate = false
			AND datname NOT IN ('postgres', 'template0', 'template1')
			ORDER BY datname
		`
		
		try {
			// Connect to 'postgres' database to list all databases
			const rows = await this.executeQuery<DatabaseInfo>('postgres', query)
			console.log(`📊 Found ${rows.length} databases`)
			return rows
		} catch (error: any) {
			console.error('Error listing databases:', error)
			throw new Error(`Failed to list databases: ${error.message}`)
		}
	}

	/**
	 * List all tables in database
	 */
	async listTables(databaseName: string): Promise<TableInfo[]> {
		const query = `
			SELECT 
				schemaname as schema,
				tablename as name,
				pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
			FROM pg_tables
			WHERE schemaname NOT IN ('pg_catalog', 'information_schema')
			ORDER BY schemaname, tablename
		`
		
		try {
			const rows = await this.executeQuery<TableInfo>(databaseName, query)
			
			// Get row counts for each table
			for (const table of rows) {
				const countQuery = `SELECT COUNT(*) as count FROM "${table.schema}"."${table.name}"`
				try {
					const countResult = await this.executeQuery<{ count: string }>(databaseName, countQuery)
					table.rows = parseInt(countResult[0]?.count || '0')
				} catch (error) {
					table.rows = 0
				}
			}
			
			console.log(`📊 Found ${rows.length} tables in ${databaseName}`)
			return rows
		} catch (error: any) {
			console.error(`Error listing tables in ${databaseName}:`, error)
			throw new Error(`Failed to list tables: ${error.message}`)
		}
	}

	/**
	 * Get table schema (columns, types, constraints)
	 */
	async getTableSchema(databaseName: string, tableName: string, schemaName: string = 'public'): Promise<TableSchema> {
		// Get columns info
		const columnsQuery = `
			SELECT 
				c.column_name as name,
				c.data_type as type,
				c.is_nullable = 'YES' as nullable,
				c.column_default as default,
				CASE WHEN pk.column_name IS NOT NULL THEN true ELSE false END as "isPrimaryKey",
				CASE WHEN fk.column_name IS NOT NULL THEN true ELSE false END as "isForeignKey",
				fk.foreign_table_name as "foreignKeyTable",
				fk.foreign_column_name as "foreignKeyColumn"
			FROM information_schema.columns c
			LEFT JOIN (
				SELECT ku.column_name
				FROM information_schema.table_constraints tc
				JOIN information_schema.key_column_usage ku
					ON tc.constraint_name = ku.constraint_name
					AND tc.table_schema = ku.table_schema
				WHERE tc.constraint_type = 'PRIMARY KEY'
					AND tc.table_schema = $1
					AND tc.table_name = $2
			) pk ON c.column_name = pk.column_name
			LEFT JOIN (
				SELECT
					kcu.column_name,
					ccu.table_name AS foreign_table_name,
					ccu.column_name AS foreign_column_name
				FROM information_schema.table_constraints AS tc
				JOIN information_schema.key_column_usage AS kcu
					ON tc.constraint_name = kcu.constraint_name
					AND tc.table_schema = kcu.table_schema
				JOIN information_schema.constraint_column_usage AS ccu
					ON ccu.constraint_name = tc.constraint_name
					AND ccu.table_schema = tc.table_schema
				WHERE tc.constraint_type = 'FOREIGN KEY'
					AND tc.table_schema = $1
					AND tc.table_name = $2
			) fk ON c.column_name = fk.column_name
			WHERE c.table_schema = $1
				AND c.table_name = $2
			ORDER BY c.ordinal_position
		`
		
		try {
			const columns = await this.executeQuery<ColumnInfo>(databaseName, columnsQuery, [schemaName, tableName])
			
			const primaryKeys = columns.filter(c => c.isPrimaryKey).map(c => c.name)
			const foreignKeys = columns
				.filter(c => c.isForeignKey)
				.map(c => ({
					column: c.name,
					referencedTable: c.foreignKeyTable!,
					referencedColumn: c.foreignKeyColumn!,
				}))
			
			console.log(`📊 Schema for ${schemaName}.${tableName}: ${columns.length} columns, ${primaryKeys.length} PKs, ${foreignKeys.length} FKs`)
			
			return {
				columns,
				primaryKeys,
				foreignKeys,
			}
		} catch (error: any) {
			console.error(`Error getting schema for ${schemaName}.${tableName}:`, error)
			throw new Error(`Failed to get table schema: ${error.message}`)
		}
	}

	/**
	 * Query table data with filters, sorting, and pagination
	 */
	async queryTableData(
		databaseName: string,
		tableName: string,
		options: {
			schemaName?: string
			page?: number
			pageSize?: number
			sortColumns?: Array<{
				column: string
				direction: 'ASC' | 'DESC'
			}>
			filters?: Array<{
				column: string
				operator: '=' | '!=' | '>' | '<' | '>=' | '<=' | 'LIKE' | 'ILIKE' | 'IS NULL' | 'IS NOT NULL' | 'BETWEEN'
				value?: any
				value2?: any // For BETWEEN
			}>
			search?: string
			searchColumns?: string[]
		}
	): Promise<QueryResult> {
		const schemaName = options.schemaName || 'public'
		const page = options.page || 1
		const pageSize = options.pageSize || 100
		const offset = (page - 1) * pageSize

		// Build WHERE clause
		const whereClauses: string[] = []
		const params: any[] = []
		let paramIndex = 1

		// Filters
		if (options.filters && options.filters.length > 0) {
			for (const filter of options.filters) {
				if (filter.operator === 'IS NULL') {
					whereClauses.push(`"${filter.column}" IS NULL`)
				} else if (filter.operator === 'IS NOT NULL') {
					whereClauses.push(`"${filter.column}" IS NOT NULL`)
				} else if (filter.operator === 'BETWEEN' && filter.value !== undefined && filter.value2 !== undefined) {
					whereClauses.push(`"${filter.column}" BETWEEN $${paramIndex} AND $${paramIndex + 1}`)
					params.push(filter.value, filter.value2)
					paramIndex += 2
				} else if (filter.value !== undefined) {
					whereClauses.push(`"${filter.column}" ${filter.operator} $${paramIndex}`)
					params.push(filter.operator === 'LIKE' || filter.operator === 'ILIKE' ? `%${filter.value}%` : filter.value)
					paramIndex++
				}
			}
		}

		// Global search
		if (options.search && options.searchColumns && options.searchColumns.length > 0) {
			const searchClauses = options.searchColumns.map(col => {
				const clause = `"${col}"::text ILIKE $${paramIndex}`
				return clause
			})
			whereClauses.push(`(${searchClauses.join(' OR ')})`)
			params.push(`%${options.search}%`)
			paramIndex++
		}

		const whereClause = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : ''

		// Build ORDER BY clause (multi-column sorting)
		let orderByClause = ''
		if (options.sortColumns && Array.isArray(options.sortColumns) && options.sortColumns.length > 0) {
			const validSortColumns = options.sortColumns.filter(sort => 
				sort && sort.column && sort.direction
			)
			if (validSortColumns.length > 0) {
				const orderByClauses = validSortColumns.map(sort => 
					`"${sort.column}" ${sort.direction}`
				)
				orderByClause = `ORDER BY ${orderByClauses.join(', ')}`
			}
		}

		// Queries
		const countQuery = `
			SELECT COUNT(*) as total
			FROM "${schemaName}"."${tableName}"
			${whereClause}
		`

		const dataQuery = `
			SELECT *
			FROM "${schemaName}"."${tableName}"
			${whereClause}
			${orderByClause}
			LIMIT ${pageSize}
			OFFSET ${offset}
		`

		console.log('🔍 Generated SQL Query:', dataQuery.replace(/\s+/g, ' ').trim())

		try {
			// Get total count
			const countResult = await this.executeQuery<{ total: string }>(databaseName, countQuery, params)
			const totalCount = parseInt(countResult[0]?.total || '0')

			// Get data
			const rows = await this.executeQuery(databaseName, dataQuery, params)

			const totalPages = Math.ceil(totalCount / pageSize)

			console.log(`📊 Query ${schemaName}.${tableName}: ${rows.length} rows (page ${page}/${totalPages}, total: ${totalCount})`)

			return {
				rows,
				totalCount,
				page,
				pageSize,
				totalPages,
			}
		} catch (error: any) {
			console.error(`Error querying ${schemaName}.${tableName}:`, error)
			throw new Error(`Failed to query table: ${error.message}`)
		}
	}

	/**
	 * Insert new record into table
	 */
	async insertRecord(
		databaseName: string,
		tableName: string,
		schemaName: string = 'public',
		data: Record<string, any>
	): Promise<any> {
		try {
			const columns = Object.keys(data)
			const values = Object.values(data)
			const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ')
			const columnsList = columns.map(col => `"${col}"`).join(', ')

			const query = `
				INSERT INTO "${schemaName}"."${tableName}" (${columnsList})
				VALUES (${placeholders})
				RETURNING *
			`

			console.log(`📝 Insert into ${schemaName}.${tableName}:`, columns)

			const result = await this.executeQuery(databaseName, query, values)
			return result[0]
		} catch (error: any) {
			console.error(`Error inserting into ${schemaName}.${tableName}:`, error)
			throw new Error(`Failed to insert record: ${error.message}`)
		}
	}

	/**
	 * Update record in table
	 */
	async updateRecord(
		databaseName: string,
		tableName: string,
		schemaName: string = 'public',
		primaryKey: { column: string; value: any },
		data: Record<string, any>
	): Promise<any> {
		try {
			const columns = Object.keys(data)
			const values = Object.values(data)
			
			const setClause = columns
				.map((col, i) => `"${col}" = $${i + 1}`)
				.join(', ')
			
			const whereValue = values.length + 1

			const query = `
				UPDATE "${schemaName}"."${tableName}"
				SET ${setClause}
				WHERE "${primaryKey.column}" = $${whereValue}
				RETURNING *
			`

			console.log(`✏️ Update ${schemaName}.${tableName} where ${primaryKey.column} = ${primaryKey.value}`)

			const result = await this.executeQuery(databaseName, query, [...values, primaryKey.value])
			return result[0]
		} catch (error: any) {
			console.error(`Error updating ${schemaName}.${tableName}:`, error)
			throw new Error(`Failed to update record: ${error.message}`)
		}
	}

	/**
	 * Delete records from table
	 */
	async deleteRecords(
		databaseName: string,
		tableName: string,
		schemaName: string = 'public',
		primaryKey: { column: string; values: any[] }
	): Promise<number> {
		try {
			const placeholders = primaryKey.values.map((_, i) => `$${i + 1}`).join(', ')

			const query = `
				DELETE FROM "${schemaName}"."${tableName}"
				WHERE "${primaryKey.column}" IN (${placeholders})
			`

			console.log(`🗑️ Delete from ${schemaName}.${tableName} where ${primaryKey.column} IN [${primaryKey.values.join(', ')}]`)

			const pool = this.getPool(databaseName)
			const result = await pool.query(query, primaryKey.values)
			
			await pool.end()
			
			return result.rowCount || 0
		} catch (error: any) {
			console.error(`Error deleting from ${schemaName}.${tableName}:`, error)
			throw new Error(`Failed to delete records: ${error.message}`)
		}
	}

	/**
	 * Get default database name from .env
	 */
	getDefaultDatabase(): string {
		const dbUrl = process.env.DATABASE_URL || ''
		const match = dbUrl.match(/\/([^\/]+)$/)
		return match ? match[1] : 'postgres'
	}
}
