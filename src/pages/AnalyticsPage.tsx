import { useState, useMemo, useEffect } from 'react'
import type { SheetType, BetData, AnalyticsFilters } from '../types/analytics'
import { getAnalyticsBets, getBetBuilderMatches } from '../api/analytics'
import { filterBets, calculateAnalytics } from '../utils/analyticsUtils'
import FilterPanel from '../components/analytics/FilterPanel'
import FilterPanelWithCheckboxes from '../components/analytics/FilterPanelWithCheckboxes'
import MatchSelector from '../components/analytics/MatchSelector'
import ResultsDisplay from '../components/analytics/ResultsDisplay'
import styles from './AnalyticsPage.module.css'

type UIMode = 'filters' | 'match'

function AnalyticsPage() {
  const [uiMode, setUIMode] = useState<UIMode>('filters')
  const [activeSheet, setActiveSheet] = useState<SheetType>('typy')
  const [isLoading, setIsLoading] = useState(false)
  const [dataLoaded, setDataLoaded] = useState(false)
  const [bets, setBets] = useState<BetData[]>([])
  const [error, setError] = useState<string | null>(null)
  const [filters, setFilters] = useState<AnalyticsFilters>({})
  
  // UI 2 - Wybór meczu
  const [betBuilderMatches, setBetBuilderMatches] = useState<BetData[]>([])
  const [selectedMatchId, setSelectedMatchId] = useState<number | null>(null)
  const [activeFiltersSet, setActiveFiltersSet] = useState<Set<keyof AnalyticsFilters>>(new Set())

  const handleLoadData = async () => {
    setIsLoading(true)
    setError(null)
    
    try {
      if (uiMode === 'filters') {
        // UI 1 - Ładuj dane z Typy/Kupony
        console.log(`Ładowanie danych z arkusza: ${activeSheet}`)
        const response = await getAnalyticsBets(activeSheet)
        
        if (response.success) {
          setBets(response.data)
          setDataLoaded(true)
          console.log(`✅ Załadowano ${response.count} zakładów z arkusza "${activeSheet}"`)
        } else {
          throw new Error('Nie udało się załadować danych')
        }
      } else {
        // UI 2 - Ładuj mecze z Bet Builder + dane do analizy
        console.log('Ładowanie meczów z Bet Builder...')
        const [matchesResponse, betsResponse] = await Promise.all([
          getBetBuilderMatches(),
          getAnalyticsBets(activeSheet)
        ])
        
        if (matchesResponse.success && betsResponse.success) {
          setBetBuilderMatches(matchesResponse.data)
          setBets(betsResponse.data)
          setDataLoaded(true)
          console.log(`✅ Załadowano ${matchesResponse.count} meczów z Bet Builder`)
        } else {
          throw new Error('Nie udało się załadować danych')
        }
      }
    } catch (err) {
      console.error('Błąd ładowania danych:', err)
      setError(err instanceof Error ? err.message : 'Nieznany błąd')
      setDataLoaded(false)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSheetChange = (sheet: SheetType) => {
    setActiveSheet(sheet)
    setDataLoaded(false)
    setBets([])
    setError(null)
    setFilters({})
    setSelectedMatchId(null)
  }

  const handleUIModeChange = (mode: UIMode) => {
    setUIMode(mode)
    setDataLoaded(false)
    setBets([])
    setBetBuilderMatches([])
    setFilters({})
    setSelectedMatchId(null)
    setError(null)
  }

  const handleClearFilters = () => {
    setFilters({})
  }

  // UI 2 - Obsługa wyboru meczu
  const selectedMatch = useMemo(() => 
    betBuilderMatches.find(m => m.id === selectedMatchId),
    [betBuilderMatches, selectedMatchId]
  )

  // UI 2 - Auto-uzupełnienie filtrów przy wyborze meczu
  useEffect(() => {
    if (selectedMatch && uiMode === 'match') {
      // Pomocnicze funkcje do formatowania wartości
      const formatChancesRange5 = (szanse: string | null): string | undefined => {
        if (!szanse) return undefined
        const percent = parseFloat(szanse.replace('%', ''))
        const rangeIndex = Math.floor(percent / 5)
        const rangeStart = rangeIndex * 5
        const rangeEnd = rangeStart + 4
        return `${rangeStart}-${rangeEnd}%`
      }

      const formatChancesRange10 = (szanse: string | null): string | undefined => {
        if (!szanse) return undefined
        const percent = parseFloat(szanse.replace('%', ''))
        const rangeIndex = Math.floor(percent / 10)
        const rangeStart = rangeIndex * 10
        const rangeEnd = rangeStart + 9
        return `${rangeStart}-${rangeEnd}%`
      }

      const formatOddsRange005 = (odds: number | null): string | undefined => {
        if (!odds) return undefined
        const rangeIndex = Math.floor(odds / 0.05)
        const rangeStart = rangeIndex * 0.05
        const rangeEnd = rangeStart + 0.04
        return `${rangeStart.toFixed(2)}-${rangeEnd.toFixed(2)}`
      }

      const formatOddsRange01 = (odds: number | null): string | undefined => {
        if (!odds) return undefined
        const rangeIndex = Math.floor(odds / 0.1)
        const rangeStart = rangeIndex * 0.1
        const rangeEnd = rangeStart + 0.09
        return `${rangeStart.toFixed(2)}-${rangeEnd.toFixed(2)}`
      }

      const formatStandingsDiff = (home: number | null, away: number | null): string | undefined => {
        if (home === null || away === null) return undefined
        const diff = Math.abs(home - away)
        if (diff === 1) return '1'
        const rangeIndex = Math.floor(diff / 2)
        const rangeStart = rangeIndex * 2
        const rangeEnd = rangeStart + 1
        return rangeStart >= 2 ? `${rangeStart}-${rangeEnd}` : undefined
      }

      const formatStandingsAvg = (home: number | null, away: number | null): string | undefined => {
        if (home === null || away === null) return undefined
        const avg = (home + away) / 2
        const rangeStart = Math.floor((avg - 0.5) / 2) * 2 + 1.5
        const rangeEnd = rangeStart + 1
        return `${rangeStart.toFixed(1)}-${rangeEnd.toFixed(1)}`
      }

      const newFilters: AnalyticsFilters = {
        homeTeam: selectedMatch.homeTeam,
        awayTeam: selectedMatch.awayTeam,
        firstTeamGeneral: selectedMatch.homeTeam,
        secondTeamGeneral: selectedMatch.awayTeam,
        betType: selectedMatch.betType,
        betOption: selectedMatch.betOption,
        chancesRange5: formatChancesRange5(selectedMatch.szanse),
        chancesRange10: formatChancesRange10(selectedMatch.szanse),
        oddsRange005: formatOddsRange005(selectedMatch.odds),
        oddsRange01: formatOddsRange01(selectedMatch.odds),
        standingsDiff: formatStandingsDiff(selectedMatch.standingHome, selectedMatch.standingAway),
        standingsAvg: formatStandingsAvg(selectedMatch.standingHome, selectedMatch.standingAway),
        country: selectedMatch.country || undefined,
        league: selectedMatch.league || undefined,
      }
      setFilters(newFilters)
      
      // Wszystkie filtry aktywne na start (tylko te które mają wartość)
      const allFilterKeys = Object.entries(newFilters)
        .filter(([_, value]) => value !== undefined)
        .map(([key]) => key) as Array<keyof AnalyticsFilters>
      setActiveFiltersSet(new Set(allFilterKeys))
    }
  }, [selectedMatch, uiMode])

  // UI 2 - Toggle filtra (checkbox)
  const handleToggleFilter = (filterKey: keyof AnalyticsFilters) => {
    setActiveFiltersSet(prev => {
      const newSet = new Set(prev)
      if (newSet.has(filterKey)) {
        newSet.delete(filterKey)
      } else {
        newSet.add(filterKey)
      }
      return newSet
    })
  }

  // UI 2 - Wyczyść wszystkie checkboxy
  const handleClearAllCheckboxes = () => {
    setActiveFiltersSet(new Set())
  }

  // UI 2 - Filtruj tylko według aktywnych (zaznaczonych) filtrów
  const activeFilters = useMemo(() => {
    if (uiMode !== 'match') return filters
    
    const result: AnalyticsFilters = {}
    activeFiltersSet.forEach(key => {
      if (filters[key]) {
        result[key] = filters[key]
      }
    })
    return result
  }, [filters, activeFiltersSet, uiMode])

  // Filtruj zakłady i oblicz statystyki
  const filteredBets = useMemo(() => 
    filterBets(bets, uiMode === 'match' ? activeFilters : filters), 
    [bets, filters, activeFilters, uiMode]
  )
  const analytics = useMemo(() => calculateAnalytics(filteredBets), [filteredBets])

  return (
    <div className="container">
      <div className={styles.header}>
        <h2>📈 Analityka</h2>
        
        {/* Wybór UI Mode */}
        <div className={styles.modeToggle}>
          <button
            className={`${styles.modeButton} ${uiMode === 'filters' ? styles.active : ''}`}
            onClick={() => handleUIModeChange('filters')}
            disabled={isLoading}
          >
            📋 Filtry
          </button>
          <button
            className={`${styles.modeButton} ${uiMode === 'match' ? styles.active : ''}`}
            onClick={() => handleUIModeChange('match')}
            disabled={isLoading}
          >
            ⚽ Mecz
          </button>
        </div>
        
        {/* Toggle Typy / Kupony - dla obu trybów */}
        <div className={styles.sheetToggle}>
          <button
            className={`${styles.toggleButton} ${activeSheet === 'typy' ? styles.active : ''}`}
            onClick={() => handleSheetChange('typy')}
            disabled={isLoading}
          >
            Typy
          </button>
          <button
            className={`${styles.toggleButton} ${activeSheet === 'kupony' ? styles.active : ''}`}
            onClick={() => handleSheetChange('kupony')}
            disabled={isLoading}
          >
            Kupony
          </button>
        </div>

        {/* Przycisk ładowania danych */}
        <button
          className={styles.loadButton}
          onClick={handleLoadData}
          disabled={isLoading}
        >
          {isLoading ? 'Ładowanie...' : dataLoaded ? 'Odśwież dane' : 'Załaduj dane'}
        </button>
      </div>

      {/* Komunikat o błędzie */}
      {error && (
        <div className={styles.errorBanner}>
          <span className={styles.errorIcon}>⚠️</span>
          <span>{error}</span>
        </div>
      )}

      {/* UI 1 - Filtry */}
      {dataLoaded && uiMode === 'filters' && bets.length > 0 && (
        <>
          <FilterPanel
            bets={bets}
            filters={filters}
            onFilterChange={setFilters}
            onClearFilters={handleClearFilters}
          />
          
          <ResultsDisplay
            result={analytics}
            filteredCount={filteredBets.length}
            totalCount={bets.length}
          />
        </>
      )}

      {/* UI 2 - Wybór meczu */}
      {dataLoaded && uiMode === 'match' && (
        <>
          <MatchSelector
            matches={betBuilderMatches}
            selectedMatchId={selectedMatchId}
            onSelectMatch={setSelectedMatchId}
          />
          
          {selectedMatch && (
            <>
              <FilterPanelWithCheckboxes
                matchData={selectedMatch}
                activeFilters={activeFiltersSet}
                onToggleFilter={handleToggleFilter}
                onClearAll={handleClearAllCheckboxes}
              />
              
              <ResultsDisplay
                result={analytics}
                filteredCount={filteredBets.length}
                totalCount={bets.length}
              />
            </>
          )}
        </>
      )}

      {/* Empty state */}
      {!dataLoaded && (
        <div className={styles.content}>
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>📊</div>
            <p>Kliknij "Załaduj dane" aby rozpocząć analizę</p>
            <p className={styles.emptySubtext}>
              Źródło danych: Arkusz "{activeSheet === 'typy' ? 'Typy' : 'Kupony'}"
              {uiMode === 'match' && ' • Mecze: Bet Builder'}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

export default AnalyticsPage
