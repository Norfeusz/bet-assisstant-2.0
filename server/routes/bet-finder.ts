/**
 * Bet Finder Routes
 * API endpoints dla wyszukiwania zakładów
 */

import express from 'express'
import {
  createSearchJob,
  getAllSearchJobs,
  getSearchJob,
  deleteSearchJob,
  clearCompletedJobs,
} from '../src/services/bet-finder-service.js'
import type { SearchParams } from '../src/services/bet-finder-algorithms.js'

const router = express.Router()

/**
 * POST /api/bet-finder/search
 * Tworzy nowe wyszukiwania dla wielu typów zakładów
 */
router.post('/bet-finder/search', async (req, res) => {
  try {
    const { betTypes, topCount, matchCount, dateFrom, dateTo } = req.body

    // Walidacja
    if (!betTypes || !Array.isArray(betTypes) || betTypes.length === 0) {
      return res.status(400).json({ error: 'betTypes is required and must be a non-empty array' })
    }

    if (!topCount || !matchCount || !dateFrom || !dateTo) {
      return res.status(400).json({ error: 'Missing required parameters' })
    }

    // Walidacja dat
    const from = new Date(dateFrom)
    const to = new Date(dateTo)
    if (isNaN(from.getTime()) || isNaN(to.getTime())) {
      return res.status(400).json({ error: 'Invalid date format. Use YYYY-MM-DD' })
    }

    if (from > to) {
      return res.status(400).json({ error: 'dateFrom must be before or equal to dateTo' })
    }

    console.log('🚀 [POST /api/bet-finder/search] Creating jobs:', {
      betTypes,
      topCount,
      matchCount,
      dateFrom,
      dateTo,
    })

    // Parametry wyszukiwania
    const params: SearchParams = {
      dateFrom,
      dateTo,
      topCount,
      matchCount,
    }

    // Utwórz zadanie dla każdego typu
    const jobs = betTypes.map((betType: string) => {
      return createSearchJob(betType, params)
    })

    res.json({
      success: true,
      message: `Created ${jobs.length} search job(s)`,
      jobs: jobs.map(j => ({
        id: j.id,
        searchType: j.searchType,
        status: j.status,
      })),
    })
  } catch (error: any) {
    console.error('Error creating search jobs:', error)
    res.status(500).json({ error: error.message })
  }
})

/**
 * GET /api/bet-finder/queue
 * Pobiera wszystkie zadania z kolejki
 */
router.get('/bet-finder/queue', (req, res) => {
  try {
    const jobs = getAllSearchJobs()
    res.json(jobs)
  } catch (error: any) {
    console.error('Error getting queue:', error)
    res.status(500).json({ error: error.message })
  }
})

/**
 * GET /api/bet-finder/queue/:id
 * Pobiera szczegóły pojedynczego zadania
 */
router.get('/bet-finder/queue/:id', (req, res) => {
  try {
    const jobId = parseInt(req.params.id)
    if (isNaN(jobId)) {
      return res.status(400).json({ error: 'Invalid job ID' })
    }

    const job = getSearchJob(jobId)
    if (!job) {
      return res.status(404).json({ error: 'Job not found' })
    }

    res.json(job)
  } catch (error: any) {
    console.error('Error getting job:', error)
    res.status(500).json({ error: error.message })
  }
})

/**
 * DELETE /api/bet-finder/queue/:id
 * Usuwa zadanie z kolejki
 */
router.delete('/bet-finder/queue/:id', (req, res) => {
  try {
    const jobId = parseInt(req.params.id)
    if (isNaN(jobId)) {
      return res.status(400).json({ error: 'Invalid job ID' })
    }

    const deleted = deleteSearchJob(jobId)
    if (!deleted) {
      return res.status(404).json({ error: 'Job not found' })
    }

    res.json({ success: true, message: `Job #${jobId} deleted` })
  } catch (error: any) {
    console.error('Error deleting job:', error)
    res.status(500).json({ error: error.message })
  }
})

/**
 * POST /api/bet-finder/queue/clear
 * Czyści ukończone zadania
 */
router.post('/bet-finder/queue/clear', (req, res) => {
  try {
    const removed = clearCompletedJobs()
    res.json({ success: true, message: `Cleared ${removed} completed job(s)` })
  } catch (error: any) {
    console.error('Error clearing jobs:', error)
    res.status(500).json({ error: error.message })
  }
})

export default router
