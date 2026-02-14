import { apiClient } from './client'
import type { BetData, SheetType } from '../types/analytics'

export interface AnalyticsSummary {
  total: number
  won: number
  lost: number
  pending: number
  winRate: number
}

export interface AnalyticsBetsResponse {
  success: boolean
  count: number
  data: BetData[]
}

export interface AnalyticsSummaryResponse {
  success: boolean
  summary: AnalyticsSummary
  byBetType: Record<string, { total: number; won: number; lost: number }>
  byLeague: Record<string, { total: number; won: number; lost: number }>
}

/**
 * Pobierz dane zakładów z Google Sheets
 */
export const getAnalyticsBets = async (
  sheet: SheetType,
  filters?: {
    verified?: boolean
    betType?: string
    league?: string
  }
): Promise<AnalyticsBetsResponse> => {
  const params = new URLSearchParams()
  params.append('sheet', sheet)
  
  if (filters?.verified !== undefined) {
    params.append('verified', filters.verified.toString())
  }
  if (filters?.betType) {
    params.append('betType', filters.betType)
  }
  if (filters?.league) {
    params.append('league', filters.league)
  }

  return apiClient.get<AnalyticsBetsResponse>(`/api/analytics/bets?${params.toString()}`)
}

/**
 * Pobierz podsumowanie statystyk z Google Sheets
 */
export const getAnalyticsSummary = async (sheet: SheetType): Promise<AnalyticsSummaryResponse> => {
  return apiClient.get<AnalyticsSummaryResponse>(`/api/analytics/summary?sheet=${sheet}`)
}

/**
 * Pobierz mecze z arkusza Bet Builder
 */
export const getBetBuilderMatches = async (): Promise<AnalyticsBetsResponse> => {
  return apiClient.get<AnalyticsBetsResponse>('/api/analytics/bet-builder')
}
