import { useState, useEffect } from 'react'
import styles from './DatabasePage.module.css'

interface DatabaseInfo {
	name: string
	size?: string
	tables?: number
}

interface TableInfo {
	name: string
	schema: string
	rows?: number
	size?: string
}

interface ColumnInfo {
	name: string
	type: string
	nullable: boolean
	default: string | null
	isPrimaryKey: boolean
	isForeignKey: boolean
	foreignKeyTable?: string
	foreignKeyColumn?: string
}

interface TableSchema {
	columns: ColumnInfo[]
	primaryKeys: string[]
	foreignKeys: Array<{
		column: string
		referencedTable: string
		referencedColumn: string
	}>
}

interface Filter {
	column: string
	operator: '=' | '!=' | '>' | '<' | '>=' | '<=' | 'LIKE' | 'ILIKE' | 'IS NULL' | 'IS NOT NULL' | 'BETWEEN'
	value?: any
	value2?: any
}

interface QueryResult {
	rows: any[]
	totalCount: number
	page: number
	pageSize: number
	totalPages: number
}

function DatabasePage() {
	// State
	const [databases, setDatabases] = useState<DatabaseInfo[]>([])
	const [selectedDatabase, setSelectedDatabase] = useState<string>('')
	const [defaultDatabase, setDefaultDatabase] = useState<string>('')
	const [tables, setTables] = useState<TableInfo[]>([])
	const [selectedTable, setSelectedTable] = useState<string>('')
	const [selectedSchema, setSelectedSchema] = useState<string>('public')
	const [tableSchema, setTableSchema] = useState<TableSchema | null>(null)
	const [queryResult, setQueryResult] = useState<QueryResult | null>(null)
	const [loading, setLoading] = useState<boolean>(false)
	const [error, setError] = useState<string | null>(null)

	// Filters and search
	const [filters, setFilters] = useState<Filter[]>([])
	const [debouncedFilters, setDebouncedFilters] = useState<Filter[]>([])
	const [searchTerm, setSearchTerm] = useState<string>('')
	const [debouncedSearchTerm, setDebouncedSearchTerm] = useState<string>('')
	const [sortColumns, setSortColumns] = useState<Array<{column: string, direction: 'ASC' | 'DESC'}>>([])
	const [sortColumnsKey, setSortColumnsKey] = useState<string>('')
	const [currentPage, setCurrentPage] = useState<number>(1)
	const [pageSize, setPageSize] = useState<number>(100)

	// CRUD operations state
	const [selectedRows, setSelectedRows] = useState<Set<any>>(new Set())
	const [showInsertModal, setShowInsertModal] = useState<boolean>(false)
	const [showUpdateModal, setShowUpdateModal] = useState<boolean>(false)
	const [showDeleteModal, setShowDeleteModal] = useState<boolean>(false)
	const [editingRow, setEditingRow] = useState<any>(null)
	const [crudLoading, setCrudLoading] = useState<boolean>(false)

	// Load databases on mount
	useEffect(() => {
		loadDatabases()
	}, [])

	// Debounce search term (1000ms delay)
	useEffect(() => {
		const timer = setTimeout(() => {
			setDebouncedSearchTerm(searchTerm)
		}, 1000)

		return () => clearTimeout(timer)
	}, [searchTerm])

	// Debounce filters (1000ms delay)
	useEffect(() => {
		const timer = setTimeout(() => {
			setDebouncedFilters(filters)
		}, 1000)

		return () => clearTimeout(timer)
	}, [filters])

	// Compute sort columns key for dependencies
	useEffect(() => {
		const key = sortColumns.map(s => `${s.column}:${s.direction}`).join(',')
		setSortColumnsKey(key)
	}, [sortColumns])

	// Load tables when database changes
	useEffect(() => {
		if (selectedDatabase) {
			loadTables()
			setSelectedTable('')
			setTableSchema(null)
			setQueryResult(null)
			setFilters([])
			setDebouncedFilters([])
			setSearchTerm('')
			setDebouncedSearchTerm('')
			setSortColumns([])
			setCurrentPage(1)
		}
	}, [selectedDatabase])

	// Load schema when table changes
	useEffect(() => {
		if (selectedDatabase && selectedTable) {
			loadTableSchema()
		} else {
			setTableSchema(null)
			setQueryResult(null)
		}
	}, [selectedTable, selectedDatabase])

	// Load data when schema is loaded (with default sorting)
	useEffect(() => {
		if (tableSchema && selectedDatabase && selectedTable) {
			// Set default sort column on first load
			if (sortColumns.length === 0) {
				const defaultColumn = getDefaultSortColumn(tableSchema)
				setSortColumns([{ column: defaultColumn, direction: 'DESC' }])
			}
		}
	}, [tableSchema])

	// Reload data when any query parameter changes
	useEffect(() => {
		if (selectedDatabase && selectedTable && tableSchema && sortColumns.length > 0) {
			loadTableData()
		}
	}, [sortColumnsKey, debouncedFilters, debouncedSearchTerm, currentPage, pageSize])

	// API calls
	const loadDatabases = async () => {
		setLoading(true)
		setError(null)
		try {
			const response = await fetch('/api/database/list')
			if (!response.ok) throw new Error('Failed to load databases')
			const data = await response.json()
			setDatabases(data.databases)
			setDefaultDatabase(data.defaultDatabase)
			setSelectedDatabase(data.defaultDatabase)
		} catch (err: any) {
			setError(err.message)
			console.error('Error loading databases:', err)
		} finally {
			setLoading(false)
		}
	}

	const loadTables = async () => {
		if (!selectedDatabase) return
		setLoading(true)
		setError(null)
		try {
			const response = await fetch(`/api/database/${selectedDatabase}/tables`)
			if (!response.ok) throw new Error('Failed to load tables')
			const data = await response.json()
			setTables(data.tables)
		} catch (err: any) {
			setError(err.message)
			console.error('Error loading tables:', err)
		} finally {
			setLoading(false)
		}
	}

	const loadTableSchema = async () => {
		if (!selectedDatabase || !selectedTable) return
		setLoading(true)
		setError(null)
		try {
			const response = await fetch(
				`/api/database/${selectedDatabase}/tables/${selectedTable}/schema?schema=${selectedSchema}`
			)
			if (!response.ok) throw new Error('Failed to load schema')
			const data = await response.json()
			setTableSchema(data)
		} catch (err: any) {
			setError(err.message)
			console.error('Error loading schema:', err)
		} finally {
			setLoading(false)
		}
	}

	const loadTableData = async () => {
		if (!selectedDatabase || !selectedTable || !tableSchema) return
		// Don't load if no sort columns set yet
		if (sortColumns.length === 0) return
		
		// Save currently focused element to restore after loading
		const activeElement = document.activeElement as HTMLElement
		
		setLoading(true)
		setError(null)
		try {
			const searchColumns = tableSchema.columns
				.filter(col => col.type.includes('text') || col.type.includes('character varying'))
				.map(col => col.name)

			const response = await fetch(
				`/api/database/${selectedDatabase}/tables/${selectedTable}/query`,
				{
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						schemaName: selectedSchema,
						page: currentPage,
						pageSize,
						sortColumns,
						filters: debouncedFilters,
						search: debouncedSearchTerm || undefined,
						searchColumns,
					}),
				}
			)
			if (!response.ok) throw new Error('Failed to load data')
			const data = await response.json()
			setQueryResult(data)
		} catch (err: any) {
			setError(err.message)
			console.error('Error loading data:', err)
		} finally {
			setLoading(false)
			
			// Restore focus to the input that was active before loading
			if (activeElement && typeof activeElement.focus === 'function') {
				setTimeout(() => activeElement.focus(), 0)
			}
		}
	}

	// Handlers
	const handleDatabaseChange = (dbName: string) => {
		setSelectedDatabase(dbName)
	}

	const handleTableChange = (tableName: string) => {
		setSelectedTable(tableName)
		setCurrentPage(1)
		setFilters([])
		setDebouncedFilters([])
		setSearchTerm('')
		setDebouncedSearchTerm('')
		setSortColumns([]) // Reset sort, will be set by useEffect
	}

	// Helper: Get best column for default sorting
	const getDefaultSortColumn = (schema: TableSchema): string => {
		// Priority 1: Columns with date/time in name
		const dateColumns = schema.columns.filter(
			col =>
				col.name.toLowerCase().includes('date') ||
				col.name.toLowerCase().includes('created') ||
				col.name.toLowerCase().includes('updated') ||
				col.name.toLowerCase().includes('time') ||
				col.type.includes('timestamp') ||
				col.type.includes('date')
		)
		if (dateColumns.length > 0) {
			// Prefer 'created_at' or 'created' over others
			const created = dateColumns.find(
				col => col.name.toLowerCase().includes('created')
			)
			if (created) return created.name
			return dateColumns[0].name
		}

		// Priority 2: Primary key
		if (schema.primaryKeys.length > 0) {
			return schema.primaryKeys[0]
		}

		// Priority 3: First column
		return schema.columns[0]?.name || 'id'
	}

	const handleSort = (columnName: string, event?: React.MouseEvent) => {
		const isShiftClick = event?.shiftKey || false
		
		if (isShiftClick) {
			// Multi-column sort (Excel Shift+Click behavior)
			const existingIndex = sortColumns.findIndex(sc => sc.column === columnName)
			
			if (existingIndex !== -1) {
				// Column already in sort - toggle its direction
				const newSortColumns = [...sortColumns]
				newSortColumns[existingIndex].direction = 
					newSortColumns[existingIndex].direction === 'ASC' ? 'DESC' : 'ASC'
				setSortColumns(newSortColumns)
			} else {
				// Add column to multi-sort
				setSortColumns([...sortColumns, { column: columnName, direction: 'ASC' }])
			}
		} else {
			// Single column sort (normal click)
			const isSingleColumnSort = sortColumns.length === 1 && sortColumns[0].column === columnName
			
			if (isSingleColumnSort) {
				// Toggle direction for single column
				setSortColumns([{
					column: columnName,
					direction: sortColumns[0].direction === 'ASC' ? 'DESC' : 'ASC'
				}])
			} else {
				// Reset to single column sort
				setSortColumns([{ column: columnName, direction: 'ASC' }])
			}
		}
		
		setCurrentPage(1)
	}

	const handleAddFilter = () => {
		if (!tableSchema || tableSchema.columns.length === 0) return
		const firstColumn = tableSchema.columns[0]
		setFilters([
			...filters,
			{
				column: firstColumn.name,
				operator: '=',
				value: '',
			},
		])
	}

	const handleRemoveFilter = (index: number) => {
		setFilters(filters.filter((_, i) => i !== index))
		setCurrentPage(1)
	}

	const handleFilterChange = (index: number, field: keyof Filter, value: any) => {
		const newFilters = [...filters]
		newFilters[index] = { ...newFilters[index], [field]: value }
		setFilters(newFilters)
	}

	const handleApplyFilters = () => {
		setCurrentPage(1)
		loadTableData()
	}

	const handleResetFilters = () => {
		setFilters([])
		setDebouncedFilters([])
		setSearchTerm('')
		setDebouncedSearchTerm('')
		// Reset to default sort
		if (tableSchema) {
			const defaultColumn = getDefaultSortColumn(tableSchema)
			setSortColumns([{ column: defaultColumn, direction: 'DESC' }])
		}
		setCurrentPage(1)
	}

	const handleSearch = (value: string) => {
		setSearchTerm(value)
		setCurrentPage(1)
		// Debouncing happens in useEffect, no immediate load
	}

	const handlePageChange = (newPage: number) => {
		setCurrentPage(newPage)
	}

	const handlePageSizeChange = (newSize: number) => {
		setPageSize(newSize)
		setCurrentPage(1)
	}

	// CRUD Handlers
	const getPrimaryKeyValue = (row: any): any => {
		if (!tableSchema || tableSchema.primaryKeys.length === 0) return null
		const pkColumn = tableSchema.primaryKeys[0]
		return row[pkColumn]
	}

	const handleToggleRow = (row: any) => {
		const pkValue = getPrimaryKeyValue(row)
		if (pkValue === null) return

		const newSelected = new Set(selectedRows)
		if (newSelected.has(pkValue)) {
			newSelected.delete(pkValue)
		} else {
			newSelected.add(pkValue)
		}
		setSelectedRows(newSelected)
	}

	const handleToggleAllRows = () => {
		if (!queryResult || !tableSchema) return
		
		if (selectedRows.size === queryResult.rows.length) {
			// Deselect all
			setSelectedRows(new Set())
		} else {
			// Select all
			const allPks = queryResult.rows
				.map(row => getPrimaryKeyValue(row))
				.filter(pk => pk !== null)
			setSelectedRows(new Set(allPks))
		}
	}

	const handleOpenInsertModal = () => {
		setShowInsertModal(true)
	}

	const handleOpenUpdateModal = (row: any) => {
		setEditingRow(row)
		setShowUpdateModal(true)
	}

	const handleOpenDeleteModal = () => {
		if (selectedRows.size === 0) return
		setShowDeleteModal(true)
	}

	const handleFinishedCellClick = (row: any) => {
		// Only handle clicks on is_finished='no' in matches table
		if (selectedTable !== 'matches' || row.is_finished !== 'no') return
		
		const matchDate = row.match_date ? new Date(row.match_date).toISOString().split('T')[0] : ''
		const league = row.league || ''
		const country = row.country || ''
		
		if (!matchDate || !league || !country) {
			console.error('Missing required data for opening import page:', { matchDate, league, country })
			return
		}
		
		// Open Import page in new tab with pre-filled data
		const params = new URLSearchParams({
			date: matchDate,
			league: league,
			country: country
		})
		
		window.open(`/import?${params.toString()}`, '_blank')
	}

	const handleUpdateSelected = () => {
		// Only works for matches table
		if (selectedTable !== 'matches' || selectedRows.size === 0) {
			console.warn('Update selected only works for matches table')
			return
		}

		if (!queryResult || !tableSchema) {
			console.error('No query result or table schema')
			return
		}

		// Get full row objects for selected PKs
		const pkColumn = tableSchema.primaryKeys[0]
		if (!pkColumn) {
			console.error('No primary key found')
			return
		}

		const selectedMatches = queryResult.rows.filter(row => {
			const pkValue = row[pkColumn]
			return selectedRows.has(pkValue)
		})

		if (selectedMatches.length === 0) {
			console.error('No matching rows found')
			return
		}

		// Extract match dates as strings (convert UTC timestamps to local dates)
		const matchDateStrings = selectedMatches
			.map(row => row.match_date)
			.filter(date => date != null)
			.map(date => {
				// Parse to Date object (handles both strings and Date objects)
				const dateObj = typeof date === 'string' ? new Date(date) : date
				
				// Use LOCAL time methods (not UTC) to get the actual calendar date
				// This converts "2026-02-13T23:00:00.000Z" (UTC) → 14.02.2026 (Poland UTC+1)
				const year = dateObj.getFullYear()
				const month = String(dateObj.getMonth() + 1).padStart(2, '0')
				const day = String(dateObj.getDate()).padStart(2, '0')
				
				return `${year}-${month}-${day}`
			})

		if (matchDateStrings.length === 0) {
			alert('Selected matches have no valid dates')
			return
		}

		// Sort dates (lexicographic sort works for YYYY-MM-DD format)
		matchDateStrings.sort()
		const dateFrom = matchDateStrings[0]
		const dateTo = matchDateStrings[matchDateStrings.length - 1]

		// Collect unique leagues (league + country pairs)
		const leagueSet = new Map<string, { league: string; country: string }>()
		
		for (const match of selectedMatches) {
			const league = match.league
			const country = match.country
			
			if (!league || !country) continue
			
			const key = `${league}|${country}`
			if (!leagueSet.has(key)) {
				leagueSet.set(key, { league, country })
			}
		}

		if (leagueSet.size === 0) {
			alert('Selected matches have no valid league/country information')
			return
		}

		// Build leagues parameter: "Liga1|Kraj1,Liga2|Kraj2"
		const leaguesParam = Array.from(leagueSet.values())
			.map(({ league, country }) => `${league}|${country}`)
			.join(',')

		// Build URL with parameters
		const params = new URLSearchParams({
			dateFrom,
			dateTo,
			leagues: leaguesParam
		})

		const url = `/import?${params.toString()}`
		
		console.log('Opening Import page with params:', { dateFrom, dateTo, leagues: leaguesParam })
		
		// Open in new tab
		window.open(url, '_blank')
	}

	const handleInsertRecord = async (data: Record<string, any>) => {
		if (!selectedDatabase || !selectedTable || !tableSchema) return
		
		setCrudLoading(true)
		try {
			const response = await fetch(
				`/api/database/${selectedDatabase}/tables/${selectedTable}/insert`,
				{
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						schemaName: selectedSchema,
						data,
					}),
				}
			)
			
			if (!response.ok) {
				const errorData = await response.json()
				throw new Error(errorData.error || 'Failed to insert record')
			}
			
			setShowInsertModal(false)
			await loadTableData() // Reload data
		} catch (err: any) {
			alert(`Error inserting record: ${err.message}`)
			console.error('Insert error:', err)
		} finally {
			setCrudLoading(false)
		}
	}

	const handleUpdateRecord = async (data: Record<string, any>) => {
		if (!selectedDatabase || !selectedTable || !tableSchema || !editingRow) return
		
		const pkColumn = tableSchema.primaryKeys[0]
		if (!pkColumn) {
			alert('Cannot update: table has no primary key')
			return
		}

		const pkValue = editingRow[pkColumn]
		
		setCrudLoading(true)
		try {
			const response = await fetch(
				`/api/database/${selectedDatabase}/tables/${selectedTable}/update`,
				{
					method: 'PUT',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						schemaName: selectedSchema,
						primaryKey: { column: pkColumn, value: pkValue },
						data,
					}),
				}
			)
			
			if (!response.ok) {
				const errorData = await response.json()
				throw new Error(errorData.error || 'Failed to update record')
			}
			
			setShowUpdateModal(false)
			setEditingRow(null)
			await loadTableData() // Reload data
		} catch (err: any) {
			alert(`Error updating record: ${err.message}`)
			console.error('Update error:', err)
		} finally {
			setCrudLoading(false)
		}
	}

	const handleDeleteRecords = async () => {
		if (!selectedDatabase || !selectedTable || !tableSchema || selectedRows.size === 0) return
		
		const pkColumn = tableSchema.primaryKeys[0]
		if (!pkColumn) {
			alert('Cannot delete: table has no primary key')
			return
		}

		const pkValues = Array.from(selectedRows)
		
		setCrudLoading(true)
		try {
			const response = await fetch(
				`/api/database/${selectedDatabase}/tables/${selectedTable}/delete`,
				{
					method: 'DELETE',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						schemaName: selectedSchema,
						primaryKey: { column: pkColumn, values: pkValues },
					}),
				}
			)
			
			if (!response.ok) {
				const errorData = await response.json()
				throw new Error(errorData.error || 'Failed to delete records')
			}
			
			const result = await response.json()
			alert(`Successfully deleted ${result.deletedCount} record(s)`)
			
			setShowDeleteModal(false)
			setSelectedRows(new Set())
			await loadTableData() // Reload data
		} catch (err: any) {
			alert(`Error deleting records: ${err.message}`)
			console.error('Delete error:', err)
		} finally {
			setCrudLoading(false)
		}
	}

	// Render helpers
	// Helper: Get CSS class for cell based on column and value
	const getCellClassName = (column: ColumnInfo, value: any): string => {
		let className = styles.tableCell
		
		if (column.isPrimaryKey) className += ` ${styles.primaryKeyCell}`
		if (column.isForeignKey) className += ` ${styles.foreignKeyCell}`
		
		// Special styling for is_finished column
		if (column.name === 'is_finished') {
			if (value === 'yes' || value === true) {
				className += ` ${styles.finishedYes}`
			} else if (value === 'no' || value === false) {
				className += ` ${styles.finishedNo}`
			}
		}
		
		return className
	}

	// Helper: Reorder columns to put is_finished at position 4 (index 3)
	const reorderColumns = (columns: ColumnInfo[]): ColumnInfo[] => {
		if (selectedTable !== 'matches') return columns
		
		const isFinishedIndex = columns.findIndex(col => col.name === 'is_finished')
		if (isFinishedIndex === -1 || isFinishedIndex === 3) return columns // Already at position 4 or doesn't exist
		
		const reordered = [...columns]
		const [isFinishedCol] = reordered.splice(isFinishedIndex, 1)
		reordered.splice(3, 0, isFinishedCol) // Insert at index 3 (position 4)
		
		return reordered
	}

	const renderCellValue = (column: ColumnInfo, value: any): string => {
		if (value === null || value === undefined) {
			return '∅'
		}

		// Boolean
		if (column.type === 'boolean') {
			return value ? '✓' : '✗'
		}

		// Date/Timestamp
		if (column.type.includes('timestamp') || column.type.includes('date')) {
			try {
				const date = new Date(value)
				if (column.type.includes('timestamp')) {
					return date.toLocaleString('pl-PL')
				} else {
					return date.toLocaleDateString('pl-PL')
				}
			} catch {
				return String(value)
			}
		}

		// JSON
		if (column.type === 'jsonb' || column.type === 'json') {
			try {
				return JSON.stringify(value, null, 2)
			} catch {
				return String(value)
			}
		}

		// Numbers - format with separators
		if (column.type.includes('int') || column.type.includes('numeric') || column.type.includes('decimal')) {
			if (typeof value === 'number') {
				return value.toLocaleString('pl-PL')
			}
		}

		// Default - truncate long text
		const str = String(value)
		return str.length > 100 ? str.substring(0, 100) + '...' : str
	}

	const getColumnTypeIcon = (column: ColumnInfo): string => {
		if (column.isPrimaryKey) return '🔑'
		if (column.isForeignKey) return '🔗'
		if (column.type === 'boolean') return '☑'
		if (column.type.includes('int') || column.type.includes('numeric')) return '#'
		if (column.type.includes('date') || column.type.includes('timestamp')) return '📅'
		if (column.type === 'jsonb' || column.type === 'json') return '{}'
		return '📝'
	}

	const getOperatorsForColumn = (column: ColumnInfo): Array<{ value: string; label: string }> => {
		const operators: Array<{ value: string; label: string }> = [
			{ value: '=', label: '=' },
			{ value: '!=', label: '≠' },
			{ value: 'IS NULL', label: 'IS NULL' },
			{ value: 'IS NOT NULL', label: 'IS NOT NULL' },
		]

		if (column.type.includes('text') || column.type.includes('character')) {
			operators.push({ value: 'LIKE', label: 'CONTAINS' }, { value: 'ILIKE', label: 'CONTAINS (case-insensitive)' })
		}

		if (
			column.type.includes('int') ||
			column.type.includes('numeric') ||
			column.type.includes('decimal') ||
			column.type.includes('date') ||
			column.type.includes('timestamp')
		) {
			operators.push(
				{ value: '>', label: '>' },
				{ value: '<', label: '<' },
				{ value: '>=', label: '≥' },
				{ value: '<=', label: '≤' },
				{ value: 'BETWEEN', label: 'BETWEEN' }
			)
		}

		return operators
	}

	// Render
	return (
		<div className={styles.container}>
			<h2 className={styles.title}>🗄️ Database Browser</h2>

			{error && (
				<div className={styles.error}>
					❌ {error}
					<button onClick={() => setError(null)} className={styles.closeError}>
						×
					</button>
				</div>
			)}

			{/* Database Selector */}
			<div className={styles.section}>
				<div className={styles.selectorGroup}>
					<label className={styles.label}>Database:</label>
					<select
						className={styles.select}
						value={selectedDatabase}
						onChange={e => handleDatabaseChange(e.target.value)}
						disabled={loading}
					>
						{databases.map(db => (
							<option key={db.name} value={db.name}>
								{db.name} {db.name === defaultDatabase ? '(default)' : ''} - {db.size}
							</option>
						))}
					</select>
				</div>
			</div>

			{/* Table Selector */}
			{selectedDatabase && (
				<div className={styles.section}>
					<div className={styles.selectorGroup}>
						<label className={styles.label}>Table:</label>
						<select
							className={styles.select}
							value={selectedTable}
							onChange={e => handleTableChange(e.target.value)}
							disabled={loading}
						>
							<option value="">-- Select a table --</option>
							{tables.map(table => (
								<option key={`${table.schema}.${table.name}`} value={table.name}>
									{table.schema}.{table.name} ({table.rows?.toLocaleString()} rows, {table.size})
								</option>
							))}
						</select>
					</div>
				</div>
			)}

			{/* Filters and Search */}
			{selectedTable && tableSchema && (
				<div className={styles.section}>
					<div className={styles.filtersHeader}>
						<h3 className={styles.subtitle}>🔍 Filters & Search</h3>
						<div className={styles.filterActions}>
							<button onClick={handleAddFilter} className={styles.btnAdd} disabled={loading}>
								➕ Add Filter
							</button>
							<button onClick={handleResetFilters} className={styles.btnReset} disabled={loading}>
								🔄 Reset
							</button>
						</div>
					</div>

					{/* Global Search */}
					<div className={styles.searchBox}>
						<input
							type="text"
							placeholder="🔍 Search in all text columns..."
							value={searchTerm}
							onChange={e => handleSearch(e.target.value)}
							className={styles.searchInput}
							disabled={loading}
						/>
					</div>

					{/* Filter List */}
					{filters.length > 0 && (
						<div className={styles.filtersList}>
							{filters.map((filter, index) => (
								<div key={index} className={styles.filterRow}>
									<select
										className={styles.filterSelect}
										value={filter.column}
										onChange={e => handleFilterChange(index, 'column', e.target.value)}
										disabled={loading}
									>
										{tableSchema.columns.map(col => (
											<option key={col.name} value={col.name}>
												{getColumnTypeIcon(col)} {col.name} ({col.type})
											</option>
										))}
									</select>

									<select
										className={styles.filterSelect}
										value={filter.operator}
										onChange={e => handleFilterChange(index, 'operator', e.target.value)}
										disabled={loading}
									>
										{getOperatorsForColumn(
											tableSchema.columns.find(c => c.name === filter.column)!
										).map(op => (
											<option key={op.value} value={op.value}>
												{op.label}
											</option>
										))}
									</select>

									{filter.operator !== 'IS NULL' && filter.operator !== 'IS NOT NULL' && (
										<>
											<input
												type="text"
												placeholder="Value"
												value={filter.value || ''}
												onChange={e => handleFilterChange(index, 'value', e.target.value)}
												className={styles.filterInput}
												disabled={loading}
											/>
											{filter.operator === 'BETWEEN' && (
												<input
													type="text"
													placeholder="Value 2"
													value={filter.value2 || ''}
													onChange={e => handleFilterChange(index, 'value2', e.target.value)}
													className={styles.filterInput}
													disabled={loading}
												/>
											)}
										</>
									)}

									<button
										onClick={() => handleRemoveFilter(index)}
										className={styles.btnRemoveFilter}
										disabled={loading}
									>
										×
									</button>
								</div>
							))}
						</div>
					)}
				</div>
			)}

			{/* Data Table */}
			{selectedTable && tableSchema && queryResult && (
				<div className={styles.section}>
					<div className={styles.tableHeader}>
						<h3 className={styles.subtitle}>
							📊 Data ({queryResult.totalCount.toLocaleString()} records)
						</h3>
						<div className={styles.pageSizeSelector}>
							<label>Rows per page:</label>
							<select
								value={pageSize}
								onChange={e => handlePageSizeChange(Number(e.target.value))}
								className={styles.pageSizeSelect}
								disabled={loading}
							>
								<option value={100}>100</option>
								<option value={500}>500</option>
							</select>
						</div>
					</div>

					{/* CRUD Actions */}
					<div className={styles.crudActions}>
						<button
							className={styles.btnInsert}
							onClick={handleOpenInsertModal}
							disabled={loading || !tableSchema}
							title="Insert new record"
						>
							➕ Insert New Record
						</button>
						<button
							className={styles.btnWarning}
							onClick={handleUpdateSelected}
							disabled={loading || selectedRows.size === 0 || selectedTable !== 'matches'}
							title={selectedTable !== 'matches' 
								? 'This feature only works for the matches table' 
								: `Update results for ${selectedRows.size} selected match(es)`}
						>
							🔄 Update Selected ({selectedRows.size})
						</button>
						<button
							className={styles.btnDelete}
							onClick={handleOpenDeleteModal}
							disabled={loading || selectedRows.size === 0}
							title={`Delete ${selectedRows.size} selected record(s)`}
						>
							🗑️ Delete Selected ({selectedRows.size})
						</button>
					</div>

					<div className={styles.tableWrapper}>
						<table className={styles.dataTable}>
							<thead>
								<tr>
									{/* Checkbox column */}
									<th className={styles.checkboxColumn}>
										<input
											type="checkbox"
											checked={queryResult.rows.length > 0 && selectedRows.size === queryResult.rows.length}
											onChange={handleToggleAllRows}
											disabled={loading || queryResult.rows.length === 0}
											title="Select/Deselect all rows"
										/>
									</th>
								{reorderColumns(tableSchema.columns).map(column => {
										const sortIndex = sortColumns.findIndex(sc => sc.column === column.name)
										const isSorted = sortIndex !== -1
										const sortDirection = isSorted ? sortColumns[sortIndex].direction : null
										
										return (
											<th
												key={column.name}
											onClick={(e) => handleSort(column.name, e)}
												className={`${styles.columnHeader} ${
													column.isPrimaryKey ? styles.primaryKey : ''
												} ${isSorted ? styles.sorted : ''}`}
												title={`${column.type}${column.nullable ? '' : ' NOT NULL'}${
													column.default ? ` DEFAULT ${column.default}` : ''
												}${
													column.isForeignKey
														? ` → ${column.foreignKeyTable}.${column.foreignKeyColumn}`
														: ''
												}\n\nClick: sort by this column | Shift+Click: add to multi-column sort`}
											>
												<div className={styles.headerContent}>
													<span className={styles.headerIcon}>{getColumnTypeIcon(column)}</span>
													<span className={styles.headerText}>{column.name}</span>
													{isSorted && (
														<span className={styles.sortIcon}>
															{sortDirection === 'ASC' ? '↑' : '↓'}
															{sortColumns.length > 1 && (
																<span className={styles.sortNumber}>{sortIndex + 1}</span>
															)}
														</span>
													)}
												</div>
											</th>
										)
									})}										{/* Actions column */}
										<th className={styles.actionsColumn}>Actions</th>								</tr>
							</thead>
							<tbody>
								{queryResult.rows.length === 0 ? (
									<tr>
											<td colSpan={tableSchema.columns.length + 2} className={styles.emptyState}>
											No records found
										</td>
									</tr>
								) : (
										queryResult.rows.map((row, rowIndex) => {
											const pkValue = getPrimaryKeyValue(row)
											const isSelected = selectedRows.has(pkValue)
											return (
											<tr key={rowIndex} className={isSelected ? styles.selectedRow : ''}>
												{/* Checkbox cell */}
												<td className={styles.checkboxCell}>
													<input
														type="checkbox"
														checked={isSelected}
														onChange={() => handleToggleRow(row)}
														disabled={loading || pkValue === null}
													/>
												</td>
												{reorderColumns(tableSchema.columns).map(column => {
													const cellValue = row[column.name]
													const isClickableFinished = selectedTable === 'matches' && 
														column.name === 'is_finished' && 
														cellValue === 'no'
													
													return (
														<td
															key={column.name}
															className={getCellClassName(column, cellValue)}
															onClick={isClickableFinished ? () => handleFinishedCellClick(row) : undefined}
															style={isClickableFinished ? { cursor: 'pointer' } : undefined}
															title={isClickableFinished ? 'Click to update this match result' : undefined}
														>
															{renderCellValue(column, cellValue)}
														</td>
													)
												})}
												{/* Actions cell */}
												<td className={styles.actionsCell}>
													<button
														className={styles.btnEdit}
														onClick={() => handleOpenUpdateModal(row)}
														disabled={loading}
														title="Edit record"
													>
														📝
													</button>
													<button
														className={styles.btnDeleteSingle}
														onClick={() => {
															setSelectedRows(new Set([pkValue]))
															setShowDeleteModal(true)
														}}
														disabled={loading || pkValue === null}
														title="Delete record"
													>
														🗑️
													</button>
												</td>
											</tr>
											)
										})
								)}
							</tbody>
						</table>
					</div>

					{/* Pagination */}
					{queryResult.totalPages > 1 && (
						<div className={styles.pagination}>
							<button
								onClick={() => handlePageChange(currentPage - 1)}
								disabled={currentPage === 1 || loading}
								className={styles.btnPage}
							>
								← Previous
							</button>
							<span className={styles.pageInfo}>
								Page {currentPage} of {queryResult.totalPages}
							</span>
							<button
								onClick={() => handlePageChange(currentPage + 1)}
								disabled={currentPage === queryResult.totalPages || loading}
								className={styles.btnPage}
							>
								Next →
							</button>
						</div>
					)}
				</div>
			)}

			{/* Loading Overlay */}
			{loading && (
				<div className={styles.loadingOverlay}>
					<div className={styles.spinner}>⏳</div>
				</div>
			)}

			{/* Empty State */}
			{!selectedTable && !loading && (
				<div className={styles.emptyState}>
					<div className={styles.emptyIcon}>🗄️</div>
					<p>Select a database and table to browse data</p>
				</div>
			)}

			{/* INSERT Modal */}
			{showInsertModal && tableSchema && (
				<RecordModal
					mode="insert"
					tableSchema={tableSchema}
					onSave={handleInsertRecord}
					onCancel={() => setShowInsertModal(false)}
					loading={crudLoading}
				/>
			)}

			{/* UPDATE Modal */}
			{showUpdateModal && tableSchema && editingRow && (
				<RecordModal
					mode="update"
					tableSchema={tableSchema}
					initialData={editingRow}
					onSave={handleUpdateRecord}
					onCancel={() => {
						setShowUpdateModal(false)
						setEditingRow(null)
					}}
					loading={crudLoading}
				/>
			)}

			{/* DELETE Confirmation Modal */}
			{showDeleteModal && (
				<div className={styles.modalOverlay} onClick={() => setShowDeleteModal(false)}>
					<div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
						<div className={styles.modalHeader}>
							<h3>⚠️ Confirm Delete</h3>
						</div>
						<div className={styles.modalBody}>
							<p>
								Are you sure you want to delete <strong>{selectedRows.size}</strong> record(s)?
							</p>
							<p className={styles.warningText}>This action cannot be undone.</p>
						</div>
						<div className={styles.modalFooter}>
							<button
								className={styles.btnCancel}
								onClick={() => setShowDeleteModal(false)}
								disabled={crudLoading}
							>
								Cancel
							</button>
							<button
								className={styles.btnConfirmDelete}
								onClick={handleDeleteRecords}
								disabled={crudLoading}
							>
								{crudLoading ? 'Deleting...' : 'Delete'}
							</button>
						</div>
					</div>
				</div>
			)}
		</div>
	)
}

// RecordModal Component (INSERT/UPDATE)
interface RecordModalProps {
	mode: 'insert' | 'update'
	tableSchema: TableSchema
	initialData?: any
	onSave: (data: Record<string, any>) => void
	onCancel: () => void
	loading: boolean
}

function RecordModal({ mode, tableSchema, initialData, onSave, onCancel, loading }: RecordModalProps) {
	const [formData, setFormData] = useState<Record<string, any>>(() => {
		if (mode === 'update' && initialData) {
			return { ...initialData }
		}
		// Initialize with defaults for INSERT
		const defaults: Record<string, any> = {}
		tableSchema.columns.forEach(col => {
			if (col.default) {
				defaults[col.name] = col.default
			} else if (col.nullable) {
				defaults[col.name] = null
			} else {
				defaults[col.name] = ''
			}
		})
		return defaults
	})

	const handleChange = (columnName: string, value: any) => {
		setFormData(prev => ({ ...prev, [columnName]: value }))
	}

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault()
		
		// Filter out primary key for UPDATE mode (read-only)
		const dataToSave = { ...formData }
		if (mode === 'update') {
			tableSchema.primaryKeys.forEach(pk => {
				delete dataToSave[pk]
			})
		}
		
		onSave(dataToSave)
	}

	const getInputType = (column: ColumnInfo): string => {
		if (column.type.includes('int') || column.type.includes('numeric') || column.type.includes('float') || column.type.includes('double')) {
			return 'number'
		}
		if (column.type.includes('date') && !column.type.includes('timestamp')) {
			return 'date'
		}
		if (column.type.includes('timestamp') || column.type.includes('time')) {
			return 'datetime-local'
		}
		if (column.type.includes('bool')) {
			return 'checkbox'
		}
		if (column.type.includes('json')) {
			return 'textarea'
		}
		return 'text'
	}

	return (
		<div className={styles.modalOverlay} onClick={onCancel}>
			<div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
				<div className={styles.modalHeader}>
					<h3>{mode === 'insert' ? '➕ Insert New Record' : '✏️ Update Record'}</h3>
				</div>
				<form onSubmit={handleSubmit}>
					<div className={styles.modalBody}>
						{tableSchema.columns.map(column => {
							const inputType = getInputType(column)
							const isReadOnly = mode === 'update' && column.isPrimaryKey
							const value = formData[column.name] ?? ''

							return (
								<div key={column.name} className={styles.formField}>
									<label className={styles.formLabel}>
										{column.name}
										{!column.nullable && !isReadOnly && <span className={styles.required}>*</span>}
										<span className={styles.fieldType}>({column.type})</span>
									</label>
									{inputType === 'checkbox' ? (
										<input
											type="checkbox"
											checked={!!value}
											onChange={(e) => handleChange(column.name, e.target.checked)}
											disabled={loading || isReadOnly}
											className={styles.formCheckbox}
										/>
									) : inputType === 'textarea' ? (
										<textarea
											value={typeof value === 'object' ? JSON.stringify(value, null, 2) : value}
											onChange={(e) => handleChange(column.name, e.target.value)}
											disabled={loading || isReadOnly}
											required={!column.nullable && !isReadOnly}
											className={styles.formTextarea}
											rows={4}
										/>
									) : (
										<input
											type={inputType}
											value={value}
											onChange={(e) => handleChange(column.name, e.target.value)}
											disabled={loading || isReadOnly}
											required={!column.nullable && !isReadOnly}
											className={styles.formInput}
										/>
									)}
									{column.isForeignKey && (
										<span className={styles.fkHint}>
											→ {column.foreignKeyTable}.{column.foreignKeyColumn}
										</span>
									)}
								</div>
							)
						})}
					</div>
					<div className={styles.modalFooter}>
						<button
							type="button"
							className={styles.btnCancel}
							onClick={onCancel}
							disabled={loading}
						>
							Cancel
						</button>
						<button
							type="submit"
							className={styles.btnSave}
							disabled={loading}
						>
							{loading ? 'Saving...' : mode === 'insert' ? 'Insert' : 'Update'}
						</button>
					</div>
				</form>
			</div>
		</div>
	)
}

export default DatabasePage
