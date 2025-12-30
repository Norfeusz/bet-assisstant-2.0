// League types
export interface League {
  id: number
  name: string
  country: string
  logo?: string
  type: string
  enabled: boolean
}

export interface Country {
  name: string
  code: string
  flag?: string
  leagueCount: number
}

// Match types
export interface Match {
  id: number
  match_date: string
  home_team: string
  away_team: string
  home_goals: number | null
  away_goals: number | null
  league_name: string
  country: string
  status: string
  standing_home?: number
  standing_away?: number
}

// Bet Finder types
export interface BetFinderResult {
  homeTeam: string
  awayTeam: string
  league: string
  matchDate: string
  homeStats: TeamStats
  awayStats: TeamStats
  score?: number
}

export interface TeamStats {
  totalGoals?: number
  avgGoals?: number
  matchCount?: number
  wins?: number
  losses?: number
  draws?: number
  bts?: number
  corners?: number
  // ... więcej statystyk według potrzeb
}

// Background Job types
export interface BackgroundJob {
  id: number
  job_type: 'new_matches' | 'update_results'
  status: 'in_queue' | 'pending' | 'running' | 'paused' | 'completed' | 'failed' | 'rate_limited'
  leagues: number[]
  date_from: string
  date_to: string
  created_at: string
  progress?: {
    completed_leagues: number[]
    current_league?: number
  }
  error_message?: string
  rate_limit_reset_at?: string
}

// API Response types
export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
}
