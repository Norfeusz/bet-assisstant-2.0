// Typy dla modułu analityki

export type SheetType = 'typy' | 'kupony'

export interface BetData {
  id: number
  homeTeam: string
  awayTeam: string
  betType: string
  betOption: string
  szanse: string | null
  odds: number | null
  // Statistics
  stat5HOverall: string | null
  stat5AOverall: string | null
  stat5HHa: string | null
  stat5AHa: string | null
  stat10HOverall: string | null
  stat10AOverall: string | null
  stat10HHa: string | null
  stat10AHa: string | null
  stat15HOverall: string | null
  stat15AOverall: string | null
  stat15HHa: string | null
  stat15AHa: string | null
  // Result verification
  entered: string | null // TAK/NIE
  resultHome: number | null
  resultAway: number | null
  standingHome: number | null
  standingAway: number | null
  // Context
  country: string | null
  league: string | null
  matchDate: Date | null
  matchId: number | null
}

export interface AnalyticsFilters {
  // Drużyny
  homeTeam?: string      // Mecze gdzie drużyna była gospodarzem
  awayTeam?: string      // Mecze gdzie drużyna była gościem
  teamGeneral?: string   // Mecze drużyny (H lub A) - używane w UI 1
  firstTeamGeneral?: string   // Pierwsza drużyna (H lub A) - dla UI 2
  secondTeamGeneral?: string  // Druga drużyna (H lub A) - dla UI 2
  
  // Zakład i Typ
  betType?: string
  betOption?: string
  
  // Szanse (przedziały)
  chancesRange5?: string  // 60-64%, 65-69%
  chancesRange10?: string // 60-69%, 70-79%
  
  // Kursy (przedziały)
  oddsRange005?: string   // 1.40-1.44, 1.45-1.49
  oddsRange01?: string    // 1.40-1.49, 1.50-1.59
  
  // Różnica i średnia miejsc
  standingsDiff?: string  // |#1-#2| co 2: 1, 2/3, 4/5
  standingsAvg?: string   // (#1+#2)/2 co 2: 1.5-2.5, 3.5-4.5
  
  // Kraj i Liga
  country?: string
  league?: string
  
  // Szanse drużyny (przedziały)
  teamChancesRange5?: string  // 60-64%, 65-69%
  teamChancesRange10?: string // 60-69%, 70-79%
}

export interface AnalyticsResult {
  percentage: number
  wonCount: number
  totalCount: number
  displayText: string // np. "60% (6/10)"
}

export interface BetBuilderMatch {
  id: number
  homeTeam: string
  awayTeam: string
  filters: AnalyticsFilters
}
