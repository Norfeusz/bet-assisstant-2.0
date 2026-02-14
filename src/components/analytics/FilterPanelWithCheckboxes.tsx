import type { BetData, AnalyticsFilters } from '../../types/analytics'
import styles from './FilterPanelWithCheckboxes.module.css'

interface FilterPanelWithCheckboxesProps {
  matchData: BetData
  activeFilters: Set<keyof AnalyticsFilters>
  onToggleFilter: (filter: keyof AnalyticsFilters) => void
  onClearAll: () => void
}

function FilterPanelWithCheckboxes({ 
  matchData, 
  activeFilters, 
  onToggleFilter,
  onClearAll 
}: FilterPanelWithCheckboxesProps) {
  
  // Pomocnicze funkcje do formatowania wartości
  const formatChancesRange5 = (szanse: string | null): string => {
    if (!szanse) return '-'
    const percent = parseFloat(szanse.replace('%', ''))
    const rangeIndex = Math.floor(percent / 5)
    const rangeStart = rangeIndex * 5
    const rangeEnd = rangeStart + 4
    return `${rangeStart}-${rangeEnd}%`
  }

  const formatChancesRange10 = (szanse: string | null): string => {
    if (!szanse) return '-'
    const percent = parseFloat(szanse.replace('%', ''))
    const rangeIndex = Math.floor(percent / 10)
    const rangeStart = rangeIndex * 10
    const rangeEnd = rangeStart + 9
    return `${rangeStart}-${rangeEnd}%`
  }

  const formatOddsRange005 = (odds: number | null): string => {
    if (!odds) return '-'
    const rangeIndex = Math.floor(odds / 0.05)
    const rangeStart = rangeIndex * 0.05
    const rangeEnd = rangeStart + 0.04
    return `${rangeStart.toFixed(2)}-${rangeEnd.toFixed(2)}`
  }

  const formatOddsRange01 = (odds: number | null): string => {
    if (!odds) return '-'
    const rangeIndex = Math.floor(odds / 0.1)
    const rangeStart = rangeIndex * 0.1
    const rangeEnd = rangeStart + 0.09
    return `${rangeStart.toFixed(2)}-${rangeEnd.toFixed(2)}`
  }

  const formatStandingsDiff = (home: number | null, away: number | null): string => {
    if (home === null || away === null) return '-'
    const diff = Math.abs(home - away)
    if (diff === 1) return '1'
    const rangeIndex = Math.floor(diff / 2)
    const rangeStart = rangeIndex * 2
    const rangeEnd = rangeStart + 1
    return rangeStart >= 2 ? `${rangeStart}-${rangeEnd}` : '-'
  }

  const formatStandingsAvg = (home: number | null, away: number | null): string => {
    if (home === null || away === null) return '-'
    const avg = (home + away) / 2
    const rangeStart = Math.floor((avg - 0.5) / 2) * 2 + 1.5
    const rangeEnd = rangeStart + 1
    return `${rangeStart.toFixed(1)}-${rangeEnd.toFixed(1)}`
  }
  
  const filters: Array<{
    key: keyof AnalyticsFilters
    label: string
    value: string
    section: string
  }> = [
    // Drużyny - konkretny status (H lub A)
    { key: 'homeTeam', label: 'Drużyna gospodarzy (tylko jako H)', value: matchData.homeTeam, section: 'Drużyny' },
    { key: 'awayTeam', label: 'Drużyna gości (tylko jako A)', value: matchData.awayTeam, section: 'Drużyny' },
    
    // Drużyny - ogólnie (H lub A)
    { key: 'firstTeamGeneral', label: 'Pierwsza drużyna (H lub A)', value: matchData.homeTeam, section: 'Drużyny' },
    { key: 'secondTeamGeneral', label: 'Druga drużyna (H lub A)', value: matchData.awayTeam, section: 'Drużyny' },
    
    // Zakład
    { key: 'betType', label: 'Zakład', value: matchData.betType, section: 'Zakład' },
    { key: 'betOption', label: 'Typ', value: matchData.betOption, section: 'Zakład' },
    
    // Szanse
    { key: 'chancesRange5', label: 'Szanse co 5%', value: formatChancesRange5(matchData.szanse), section: 'Szanse' },
    { key: 'chancesRange10', label: 'Szanse co 10%', value: formatChancesRange10(matchData.szanse), section: 'Szanse' },
    
    // Kursy
    { key: 'oddsRange005', label: 'Kurs co 0.05', value: formatOddsRange005(matchData.odds), section: 'Kursy' },
    { key: 'oddsRange01', label: 'Kurs co 0.1', value: formatOddsRange01(matchData.odds), section: 'Kursy' },
    
    // Miejsca w tabeli
    { key: 'standingsDiff', label: 'Różnica miejsc |#1-#2|', value: formatStandingsDiff(matchData.standingHome, matchData.standingAway), section: 'Miejsca w tabeli' },
    { key: 'standingsAvg', label: 'Średnia miejsc (#1+#2)/2', value: formatStandingsAvg(matchData.standingHome, matchData.standingAway), section: 'Miejsca w tabeli' },
    
    // Kraj i Liga
    { key: 'country', label: 'Kraj', value: matchData.country || '-', section: 'Lokalizacja' },
    { key: 'league', label: 'Liga', value: matchData.league || '-', section: 'Lokalizacja' },
  ]

  // Grupuj filtry według sekcji
  const groupedFilters = filters.reduce((acc, filter) => {
    if (!acc[filter.section]) {
      acc[filter.section] = []
    }
    acc[filter.section].push(filter)
    return acc
  }, {} as Record<string, typeof filters>)

  const activeCount = activeFilters.size
  const totalCount = filters.length

  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        <h3 className={styles.title}>
          🔍 Aktywne filtry ({activeCount}/{totalCount})
        </h3>
        {activeCount > 0 && (
          <button className={styles.clearButton} onClick={onClearAll}>
            Odznacz wszystkie
          </button>
        )}
      </div>

      <div className={styles.grid}>
        {Object.entries(groupedFilters).map(([section, sectionFilters]) => (
          <div key={section} className={styles.section}>
            <h4 className={styles.sectionTitle}>{section}</h4>
            {sectionFilters.map(filter => (
              <label key={filter.key} className={styles.filterItem}>
                <input
                  type="checkbox"
                  checked={activeFilters.has(filter.key)}
                  onChange={() => onToggleFilter(filter.key)}
                  className={styles.checkbox}
                />
                <div className={styles.filterInfo}>
                  <span className={styles.filterLabel}>{filter.label}</span>
                  <span className={styles.filterValue}>{filter.value}</span>
                </div>
              </label>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

export default FilterPanelWithCheckboxes
