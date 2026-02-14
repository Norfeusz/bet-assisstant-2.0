import type { BetData } from '../../types/analytics'
import styles from './MatchSelector.module.css'

interface MatchSelectorProps {
  matches: BetData[]
  selectedMatchId: number | null
  onSelectMatch: (matchId: number | null) => void
}

function MatchSelector({ matches, selectedMatchId, onSelectMatch }: MatchSelectorProps) {
  // Grupuj mecze według unikalnego klucza (mecz + zakład)
  // Jeśli ten sam mecz ma różne zakłady, będą oddzielne opcje
  const uniqueMatches = matches.reduce((acc, match) => {
    const key = `${match.homeTeam}|${match.awayTeam}|${match.betType}|${match.betOption}`
    if (!acc.find(m => 
      `${m.homeTeam}|${m.awayTeam}|${m.betType}|${m.betOption}` === key
    )) {
      acc.push(match)
    }
    return acc
  }, [] as BetData[])

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h3 className={styles.title}>⚽ Wybierz mecz z Bet Builder</h3>
        {selectedMatchId && (
          <button 
            className={styles.clearButton}
            onClick={() => onSelectMatch(null)}
          >
            Wyczyść wybór
          </button>
        )}
      </div>

      <div className={styles.selector}>
        <select 
          value={selectedMatchId || ''} 
          onChange={(e) => onSelectMatch(e.target.value ? parseInt(e.target.value) : null)}
          className={styles.select}
        >
          <option value="">-- Wybierz mecz --</option>
          {uniqueMatches.map(match => (
            <option key={match.id} value={match.id}>
              {match.homeTeam} vs {match.awayTeam} • {match.betType} - {match.betOption}
              {match.league && ` • ${match.league}`}
            </option>
          ))}
        </select>
      </div>

      {selectedMatchId && (
        <div className={styles.info}>
          <span className={styles.infoIcon}>ℹ️</span>
          <span className={styles.infoText}>
            Filtry zostały automatycznie ustawione według danych tego meczu. 
            Możesz odznaczać filtry aby zobaczyć jak wpływają na statystyki.
          </span>
        </div>
      )}
    </div>
  )
}

export default MatchSelector
