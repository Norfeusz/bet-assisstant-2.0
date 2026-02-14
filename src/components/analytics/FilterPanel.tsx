import { useMemo } from 'react'
import type { BetData, AnalyticsFilters } from '../../types/analytics'
import {
  extractUniqueValues,
  extractActualPercentRanges5,
  extractActualPercentRanges10,
  extractActualOddsRanges005,
  extractActualOddsRanges01,
  extractActualStandingsDiffRanges,
  extractActualStandingsAvgRanges,
  filterBets
} from '../../utils/analyticsUtils'
import styles from './FilterPanel.module.css'

interface FilterPanelProps {
  bets: BetData[]
  filters: AnalyticsFilters
  onFilterChange: (filters: AnalyticsFilters) => void
  onClearFilters: () => void
}

function FilterPanel({ bets, filters, onFilterChange, onClearFilters }: FilterPanelProps) {
  // Funkcja pomocnicza - generuje opcje dla danego pola
  // Pokazuje opcje z danych przefiltrowanych WSZYSTKIMI filtrami OPRÓCZ tego pola
  const getOptionsForField = (field: keyof AnalyticsFilters, extractor: (bets: BetData[]) => string[]) => {
    const filtersWithoutThisField = { ...filters }
    delete filtersWithoutThisField[field]
    const relevantBets = filterBets(bets, filtersWithoutThisField)
    return extractor(relevantBets)
  }

  // Generuj opcje dla każdego dropdownu
  const options = useMemo(() => {
    const getUniqueValues = (field: keyof BetData) => (bets: BetData[]) => extractUniqueValues(bets, field)
    const getAllTeams = (bets: BetData[]) => [...new Set([
      ...extractUniqueValues(bets, 'homeTeam'),
      ...extractUniqueValues(bets, 'awayTeam')
    ])].sort()

    return {
      homeTeams: getOptionsForField('homeTeam', getUniqueValues('homeTeam')),
      awayTeams: getOptionsForField('awayTeam', getUniqueValues('awayTeam')),
      allTeams: getOptionsForField('teamGeneral', getAllTeams),
      betTypes: getOptionsForField('betType', getUniqueValues('betType')),
      betOptions: getOptionsForField('betOption', getUniqueValues('betOption')),
      countries: getOptionsForField('country', getUniqueValues('country')),
      leagues: getOptionsForField('league', getUniqueValues('league')),
      percentRanges5: getOptionsForField('chancesRange5', extractActualPercentRanges5),
      percentRanges10: getOptionsForField('chancesRange10', extractActualPercentRanges10),
      oddsRanges005: getOptionsForField('oddsRange005', extractActualOddsRanges005),
      oddsRanges01: getOptionsForField('oddsRange01', extractActualOddsRanges01),
      standingsDiff: getOptionsForField('standingsDiff', extractActualStandingsDiffRanges),
      standingsAvg: getOptionsForField('standingsAvg', extractActualStandingsAvgRanges)
    }
  }, [bets, filters])

  const handleChange = (field: keyof AnalyticsFilters, value: string) => {
    onFilterChange({
      ...filters,
      [field]: value || undefined
    })
  }

  const activeFilterCount = Object.values(filters).filter(v => v).length

  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        <h3 className={styles.title}>🔍 Filtry</h3>
        {activeFilterCount > 0 && (
          <button className={styles.clearButton} onClick={onClearFilters}>
            Wyczyść filtry ({activeFilterCount})
          </button>
        )}
      </div>

      <div className={styles.grid}>
        {/* Drużyny */}
        <div className={styles.section}>
          <h4 className={styles.sectionTitle}>Drużyny</h4>
          
          <div className={styles.field}>
            <label>Drużyna gospodarzy</label>
            <select 
              value={filters.homeTeam || ''} 
              onChange={(e) => handleChange('homeTeam', e.target.value)}
            >
              <option value="">-- Wszystkie --</option>
              {options.homeTeams.map(team => (
                <option key={team} value={team}>{team}</option>
              ))}
            </select>
          </div>

          <div className={styles.field}>
            <label>Drużyna gości</label>
            <select 
              value={filters.awayTeam || ''} 
              onChange={(e) => handleChange('awayTeam', e.target.value)}
            >
              <option value="">-- Wszystkie --</option>
              {options.awayTeams.map(team => (
                <option key={team} value={team}>{team}</option>
              ))}
            </select>
          </div>

          <div className={styles.field}>
            <label>Drużyna ogólnie (H lub A)</label>
            <select 
              value={filters.teamGeneral || ''} 
              onChange={(e) => handleChange('teamGeneral', e.target.value)}
            >
              <option value="">-- Wszystkie --</option>
              {options.allTeams.map(team => (
                <option key={team} value={team}>{team}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Zakład i Typ */}
        <div className={styles.section}>
          <h4 className={styles.sectionTitle}>Zakład</h4>
          
          <div className={styles.field}>
            <label>Zakład</label>
            <select 
              value={filters.betType || ''} 
              onChange={(e) => handleChange('betType', e.target.value)}
            >
              <option value="">-- Wszystkie --</option>
              {options.betTypes.map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>

          <div className={styles.field}>
            <label>Typ</label>
            <select 
              value={filters.betOption || ''} 
              onChange={(e) => handleChange('betOption', e.target.value)}
            >
              <option value="">-- Wszystkie --</option>
              {options.betOptions.map(option => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Szanse */}
        <div className={styles.section}>
          <h4 className={styles.sectionTitle}>Szanse</h4>
          
          <div className={styles.field}>
            <label>Szanse co 5%</label>
            <select 
              value={filters.chancesRange5 || ''} 
              onChange={(e) => handleChange('chancesRange5', e.target.value)}
            >
              <option value="">-- Wszystkie --</option>
              {options.percentRanges5.map(range => (
                <option key={range} value={range}>{range}</option>
              ))}
            </select>
          </div>

          <div className={styles.field}>
            <label>Szanse co 10%</label>
            <select 
              value={filters.chancesRange10 || ''} 
              onChange={(e) => handleChange('chancesRange10', e.target.value)}
            >
              <option value="">-- Wszystkie --</option>
              {options.percentRanges10.map(range => (
                <option key={range} value={range}>{range}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Kursy */}
        <div className={styles.section}>
          <h4 className={styles.sectionTitle}>Kursy</h4>
          
          <div className={styles.field}>
            <label>Kurs co 0.05</label>
            <select 
              value={filters.oddsRange005 || ''} 
              onChange={(e) => handleChange('oddsRange005', e.target.value)}
            >
              <option value="">-- Wszystkie --</option>
              {options.oddsRanges005.map(range => (
                <option key={range} value={range}>{range}</option>
              ))}
            </select>
          </div>

          <div className={styles.field}>
            <label>Kurs co 0.1</label>
            <select 
              value={filters.oddsRange01 || ''} 
              onChange={(e) => handleChange('oddsRange01', e.target.value)}
            >
              <option value="">-- Wszystkie --</option>
              {options.oddsRanges01.map(range => (
                <option key={range} value={range}>{range}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Miejsca w tabeli */}
        <div className={styles.section}>
          <h4 className={styles.sectionTitle}>Miejsca w tabeli</h4>
          
          <div className={styles.field}>
            <label>Różnica miejsc |#1-#2|</label>
            <select 
              value={filters.standingsDiff || ''} 
              onChange={(e) => handleChange('standingsDiff', e.target.value)}
            >
              <option value="">-- Wszystkie --</option>
              {options.standingsDiff.map(range => (
                <option key={range} value={range}>{range}</option>
              ))}
            </select>
          </div>

          <div className={styles.field}>
            <label>Średnia miejsc (#1+#2)/2</label>
            <select 
              value={filters.standingsAvg || ''} 
              onChange={(e) => handleChange('standingsAvg', e.target.value)}
            >
              <option value="">-- Wszystkie --</option>
              {options.standingsAvg.map(range => (
                <option key={range} value={range}>{range}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Kraj i Liga */}
        <div className={styles.section}>
          <h4 className={styles.sectionTitle}>Lokalizacja</h4>
          
          <div className={styles.field}>
            <label>Kraj</label>
            <select 
              value={filters.country || ''} 
              onChange={(e) => handleChange('country', e.target.value)}
            >
              <option value="">-- Wszystkie --</option>
              {options.countries.map(country => (
                <option key={country} value={country}>{country}</option>
              ))}
            </select>
          </div>

          <div className={styles.field}>
            <label>Liga</label>
            <select 
              value={filters.league || ''} 
              onChange={(e) => handleChange('league', e.target.value)}
            >
              <option value="">-- Wszystkie --</option>
              {options.leagues.map(league => (
                <option key={league} value={league}>{league}</option>
              ))}
            </select>
          </div>
        </div>
      </div>
    </div>
  )
}

export default FilterPanel
