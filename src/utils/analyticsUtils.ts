// Utility functions dla modułu analityki

import type { BetData, AnalyticsFilters, AnalyticsResult } from '../types/analytics'

/**
 * Generuje przedziały procentowe co 5%
 * np. "60-64%", "65-69%"
 */
export function generatePercentRanges5(): string[] {
  const ranges: string[] = []
  for (let i = 0; i <= 95; i += 5) {
    ranges.push(`${i}-${i + 4}%`)
  }
  return ranges
}

/**
 * Generuje przedziały procentowe co 10%
 * np. "60-69%", "70-79%"
 */
export function generatePercentRanges10(): string[] {
  const ranges: string[] = []
  for (let i = 0; i <= 90; i += 10) {
    ranges.push(`${i}-${i + 9}%`)
  }
  return ranges
}

/**
 * Generuje przedziały kursów co 0.05
 * np. "1.40-1.44", "1.45-1.49"
 */
export function generateOddsRanges005(): string[] {
  const ranges: string[] = []
  for (let i = 1.0; i <= 10.0; i += 0.05) {
    const end = i + 0.04
    ranges.push(`${i.toFixed(2)}-${end.toFixed(2)}`)
  }
  return ranges
}

/**
 * Generuje przedziały kursów co 0.1
 * np. "1.40-1.49", "1.50-1.59"
 */
export function generateOddsRanges01(): string[] {
  const ranges: string[] = []
  for (let i = 1.0; i <= 10.0; i += 0.1) {
    const end = i + 0.09
    ranges.push(`${i.toFixed(2)}-${end.toFixed(2)}`)
  }
  return ranges
}

/**
 * Generuje przedziały różnicy miejsc co 2
 * np. "1", "2-3", "4-5"
 */
export function generateStandingsDiffRanges(): string[] {
  const ranges: string[] = ['1']
  for (let i = 2; i <= 20; i += 2) {
    ranges.push(`${i}-${i + 1}`)
  }
  return ranges
}

/**
 * Generuje przedziały średniej miejsc co 2
 * np. "1.5-2.5", "3.5-4.5"
 */
export function generateStandingsAvgRanges(): string[] {
  const ranges: string[] = []
  for (let i = 1.5; i <= 20.5; i += 2) {
    ranges.push(`${i.toFixed(1)}-${(i + 1).toFixed(1)}`)
  }
  return ranges
}

/**
 * Wyciąga rzeczywiście występujące przedziały procentowe co 5%
 */
export function extractActualPercentRanges5(bets: BetData[]): string[] {
  const ranges = new Set<string>()
  const allRanges = generatePercentRanges5()
  
  bets.forEach(bet => {
    const percent = parsePercent(bet.szanse)
    if (percent !== null) {
      // Znajdź odpowiedni przedział
      const rangeIndex = Math.floor(percent / 5)
      const rangeStart = rangeIndex * 5
      const rangeEnd = rangeStart + 4
      const rangeStr = `${rangeStart}-${rangeEnd}%`
      if (allRanges.includes(rangeStr)) {
        ranges.add(rangeStr)
      }
    }
  })
  
  return Array.from(ranges).sort()
}

/**
 * Wyciąga rzeczywiście występujące przedziały procentowe co 10%
 */
export function extractActualPercentRanges10(bets: BetData[]): string[] {
  const ranges = new Set<string>()
  const allRanges = generatePercentRanges10()
  
  bets.forEach(bet => {
    const percent = parsePercent(bet.szanse)
    if (percent !== null) {
      const rangeIndex = Math.floor(percent / 10)
      const rangeStart = rangeIndex * 10
      const rangeEnd = rangeStart + 9
      const rangeStr = `${rangeStart}-${rangeEnd}%`
      if (allRanges.includes(rangeStr)) {
        ranges.add(rangeStr)
      }
    }
  })
  
  return Array.from(ranges).sort()
}

/**
 * Wyciąga rzeczywiście występujące przedziały kursów co 0.05
 */
export function extractActualOddsRanges005(bets: BetData[]): string[] {
  const ranges = new Set<string>()
  
  bets.forEach(bet => {
    if (bet.odds !== null) {
      const rangeIndex = Math.floor(bet.odds / 0.05)
      const rangeStart = rangeIndex * 0.05
      const rangeEnd = rangeStart + 0.04
      const rangeStr = `${rangeStart.toFixed(2)}-${rangeEnd.toFixed(2)}`
      ranges.add(rangeStr)
    }
  })
  
  return Array.from(ranges).sort((a, b) => {
    const aStart = parseFloat(a.split('-')[0])
    const bStart = parseFloat(b.split('-')[0])
    return aStart - bStart
  })
}

/**
 * Wyciąga rzeczywiście występujące przedziały kursów co 0.1
 */
export function extractActualOddsRanges01(bets: BetData[]): string[] {
  const ranges = new Set<string>()
  
  bets.forEach(bet => {
    if (bet.odds !== null) {
      const rangeIndex = Math.floor(bet.odds / 0.1)
      const rangeStart = rangeIndex * 0.1
      const rangeEnd = rangeStart + 0.09
      const rangeStr = `${rangeStart.toFixed(2)}-${rangeEnd.toFixed(2)}`
      ranges.add(rangeStr)
    }
  })
  
  return Array.from(ranges).sort((a, b) => {
    const aStart = parseFloat(a.split('-')[0])
    const bStart = parseFloat(b.split('-')[0])
    return aStart - bStart
  })
}

/**
 * Wyciąga rzeczywiście występujące przedziały różnicy miejsc
 */
export function extractActualStandingsDiffRanges(bets: BetData[]): string[] {
  const ranges = new Set<string>()
  
  bets.forEach(bet => {
    if (bet.standingHome !== null && bet.standingAway !== null) {
      const diff = Math.abs(bet.standingHome - bet.standingAway)
      
      if (diff === 1) {
        ranges.add('1')
      } else {
        const rangeIndex = Math.floor(diff / 2)
        const rangeStart = rangeIndex * 2
        const rangeEnd = rangeStart + 1
        if (rangeStart >= 2) {
          ranges.add(`${rangeStart}-${rangeEnd}`)
        }
      }
    }
  })
  
  return Array.from(ranges).sort((a, b) => {
    const aStart = a === '1' ? 1 : parseInt(a.split('-')[0])
    const bStart = b === '1' ? 1 : parseInt(b.split('-')[0])
    return aStart - bStart
  })
}

/**
 * Wyciąga rzeczywiście występujące przedziały średniej miejsc
 */
export function extractActualStandingsAvgRanges(bets: BetData[]): string[] {
  const ranges = new Set<string>()
  
  bets.forEach(bet => {
    if (bet.standingHome !== null && bet.standingAway !== null) {
      const avg = (bet.standingHome + bet.standingAway) / 2
      const rangeStart = Math.floor((avg - 0.5) / 2) * 2 + 1.5
      const rangeEnd = rangeStart + 1
      const rangeStr = `${rangeStart.toFixed(1)}-${rangeEnd.toFixed(1)}`
      ranges.add(rangeStr)
    }
  })
  
  return Array.from(ranges).sort((a, b) => {
    const aStart = parseFloat(a.split('-')[0])
    const bStart = parseFloat(b.split('-')[0])
    return aStart - bStart
  })
}

/**
 * Wyciąga unikalne wartości z kolumny
 */
export function extractUniqueValues(bets: BetData[], field: keyof BetData): string[] {
  const values = new Set<string>()
  bets.forEach(bet => {
    const value = bet[field]
    if (value && typeof value === 'string' && value.trim() !== '') {
      values.add(value.trim())
    }
  })
  return Array.from(values).sort()
}

/**
 * Parsuje wartość procentową ze stringa (np. "65%" -> 65)
 */
function parsePercent(value: string | null): number | null {
  if (!value) return null
  const match = value.match(/(\d+(?:\.\d+)?)%?/)
  return match ? parseFloat(match[1]) : null
}

/**
 * Sprawdza czy wartość mieści się w przedziale procentowym
 */
function isInPercentRange(value: string | null, range: string): boolean {
  const percent = parsePercent(value)
  if (percent === null) return false
  
  const match = range.match(/(\d+)-(\d+)%/)
  if (!match) return false
  
  const min = parseInt(match[1])
  const max = parseInt(match[2])
  return percent >= min && percent <= max
}

/**
 * Sprawdza czy kurs mieści się w przedziale
 */
function isInOddsRange(odds: number | null, range: string): boolean {
  if (odds === null) return false
  
  const match = range.match(/([\d.]+)-([\d.]+)/)
  if (!match) return false
  
  const min = parseFloat(match[1])
  const max = parseFloat(match[2])
  return odds >= min && odds <= max
}

/**
 * Sprawdza czy różnica miejsc mieści się w przedziale
 */
function isInStandingsDiffRange(home: number | null, away: number | null, range: string): boolean {
  if (home === null || away === null) return false
  
  const diff = Math.abs(home - away)
  
  if (range === '1') {
    return diff === 1
  }
  
  const match = range.match(/(\d+)-(\d+)/)
  if (!match) return false
  
  const min = parseInt(match[1])
  const max = parseInt(match[2])
  return diff >= min && diff <= max
}

/**
 * Sprawdza czy średnia miejsc mieści się w przedziale
 */
function isInStandingsAvgRange(home: number | null, away: number | null, range: string): boolean {
  if (home === null || away === null) return false
  
  const avg = (home + away) / 2
  
  const match = range.match(/([\d.]+)-([\d.]+)/)
  if (!match) return false
  
  const min = parseFloat(match[1])
  const max = parseFloat(match[2])
  return avg >= min && avg <= max
}

/**
 * Filtruje zakłady według wybranych filtrów
 */
export function filterBets(bets: BetData[], filters: AnalyticsFilters): BetData[] {
  return bets.filter(bet => {
    // Drużyna gospodarzy (tylko gdy jest gospodarzem)
    if (filters.homeTeam && bet.homeTeam !== filters.homeTeam) {
      return false
    }
    
    // Drużyna gości (tylko gdy jest gościem)
    if (filters.awayTeam && bet.awayTeam !== filters.awayTeam) {
      return false
    }
    
    // Drużyna ogólnie (gospodarze LUB goście) - UI 1
    if (filters.teamGeneral && 
        bet.homeTeam !== filters.teamGeneral && 
        bet.awayTeam !== filters.teamGeneral) {
      return false
    }
    
    // Pierwsza drużyna ogólnie (H lub A) - UI 2
    if (filters.firstTeamGeneral && 
        bet.homeTeam !== filters.firstTeamGeneral && 
        bet.awayTeam !== filters.firstTeamGeneral) {
      return false
    }
    
    // Druga drużyna ogólnie (H lub A) - UI 2
    if (filters.secondTeamGeneral && 
        bet.homeTeam !== filters.secondTeamGeneral && 
        bet.awayTeam !== filters.secondTeamGeneral) {
      return false
    }
    
    // Zakład
    if (filters.betType && bet.betType !== filters.betType) {
      return false
    }
    
    // Typ
    if (filters.betOption && bet.betOption !== filters.betOption) {
      return false
    }
    
    // Szanse co 5%
    if (filters.chancesRange5 && !isInPercentRange(bet.szanse, filters.chancesRange5)) {
      return false
    }
    
    // Szanse co 10%
    if (filters.chancesRange10 && !isInPercentRange(bet.szanse, filters.chancesRange10)) {
      return false
    }
    
    // Kurs co 0.05
    if (filters.oddsRange005 && !isInOddsRange(bet.odds, filters.oddsRange005)) {
      return false
    }
    
    // Kurs co 0.1
    if (filters.oddsRange01 && !isInOddsRange(bet.odds, filters.oddsRange01)) {
      return false
    }
    
    // Różnica miejsc
    if (filters.standingsDiff && 
        !isInStandingsDiffRange(bet.standingHome, bet.standingAway, filters.standingsDiff)) {
      return false
    }
    
    // Średnia miejsc
    if (filters.standingsAvg && 
        !isInStandingsAvgRange(bet.standingHome, bet.standingAway, filters.standingsAvg)) {
      return false
    }
    
    // Kraj
    if (filters.country && bet.country !== filters.country) {
      return false
    }
    
    // Liga
    if (filters.league && bet.league !== filters.league) {
      return false
    }
    
    return true
  })
}

/**
 * Oblicza statystyki dla przefiltrowanych zakładów
 */
export function calculateAnalytics(bets: BetData[]): AnalyticsResult {
  // Tylko zakłady z wynikiem (TAK lub NIE)
  const verified = bets.filter(bet => 
    bet.entered && 
    (bet.entered.toLowerCase() === 'tak' || bet.entered.toLowerCase() === 'nie')
  )
  
  const wonCount = verified.filter(bet => bet.entered?.toLowerCase() === 'tak').length
  const totalCount = verified.length
  const percentage = totalCount > 0 ? (wonCount / totalCount) * 100 : 0
  
  const displayText = `${percentage.toFixed(1)}% (${wonCount}/${totalCount})`
  
  return {
    percentage,
    wonCount,
    totalCount,
    displayText
  }
}
