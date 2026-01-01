/**
 * Bet Finder Service
 * Zarządza kolejką wyszukiwań i procesowaniem zadań
 */

import { searchByType, SearchParams, SearchResult } from './bet-finder-algorithms.js'

export interface SearchJob {
  id: number
  searchType: string
  status: 'pending' | 'running' | 'completed' | 'failed'
  params: SearchParams
  results?: SearchResult[]
  progress?: number
  error?: string
  createdAt: string
  startedAt?: string
  completedAt?: string
}

// In-memory storage dla kolejki (w przyszłości można przenieść do bazy)
let searchQueue: SearchJob[] = []
let nextJobId = 1

/**
 * Tworzy nowe zadanie wyszukiwania
 */
export function createSearchJob(
  searchType: string,
  params: SearchParams
): SearchJob {
  const job: SearchJob = {
    id: nextJobId++,
    searchType,
    status: 'pending',
    params,
    progress: 0,
    createdAt: new Date().toISOString(),
  }

  searchQueue.push(job)
  console.log(`📝 Created search job #${job.id} for "${searchType}"`)

  // Automatycznie uruchom job
  processJob(job.id).catch(error => {
    console.error(`Error processing job #${job.id}:`, error)
  })

  return job
}

/**
 * Przetwarza zadanie wyszukiwania
 */
async function processJob(jobId: number): Promise<void> {
  const job = searchQueue.find(j => j.id === jobId)
  if (!job) {
    throw new Error(`Job #${jobId} not found`)
  }

  try {
    // Update status
    job.status = 'running'
    job.startedAt = new Date().toISOString()
    job.progress = 10
    console.log(`▶️ Processing job #${jobId}: ${job.searchType}`)

    // Execute search algorithm
    job.progress = 50
    const results = await searchByType(job.searchType, job.params)

    // Complete job
    job.status = 'completed'
    job.results = results
    job.progress = 100
    job.completedAt = new Date().toISOString()
    console.log(`✅ Completed job #${jobId}: ${results.length} results found`)
  } catch (error: any) {
    // Mark as failed
    job.status = 'failed'
    job.error = error.message
    job.completedAt = new Date().toISOString()
    console.error(`❌ Failed job #${jobId}:`, error.message)
  }
}

/**
 * Pobiera wszystkie zadania z kolejki
 */
export function getAllSearchJobs(): SearchJob[] {
  return searchQueue
}

/**
 * Pobiera pojedyncze zadanie
 */
export function getSearchJob(jobId: number): SearchJob | undefined {
  return searchQueue.find(j => j.id === jobId)
}

/**
 * Usuwa zadanie z kolejki
 */
export function deleteSearchJob(jobId: number): boolean {
  const index = searchQueue.findIndex(j => j.id === jobId)
  if (index !== -1) {
    searchQueue.splice(index, 1)
    console.log(`🗑️ Deleted job #${jobId}`)
    return true
  }
  return false
}

/**
 * Czyści ukończone zadania
 */
export function clearCompletedJobs(): number {
  const before = searchQueue.length
  searchQueue = searchQueue.filter(j => j.status !== 'completed')
  const removed = before - searchQueue.length
  console.log(`🧹 Cleared ${removed} completed jobs`)
  return removed
}
