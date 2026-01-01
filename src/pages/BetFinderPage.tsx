import { useState, useEffect, useRef } from 'react'
import styles from './BetFinderPage.module.css'

interface SearchQueue {
  id: number
  searchType: string
  status: 'pending' | 'running' | 'completed' | 'failed'
  results?: SearchResult[]
  createdAt: string
  error?: string
}

interface SearchResult {
  matchId: number
  homeTeam: string
  awayTeam: string
  matchDate: string
  league: string
  country: string
  score: number
  homeStats: TeamStats
  awayStats: TeamStats
  homeOdds?: number
  drawOdds?: number
  awayOdds?: number
  recommendation: string
}

interface TeamStats {
  played: number
  wins: number
  draws: number
  losses: number
  winRate: number
  lossRate: number
  drawRate: number
  avgGoalsScored: number
  avgGoalsConceded: number
}

function BetFinderPage() {
  // State for search parameters
  const [topCount, setTopCount] = useState(10)
  const [matchCount, setMatchCount] = useState(10)
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  
  // State for search queue
  const [searchQueue, setSearchQueue] = useState<SearchQueue[]>([])
  
  // State for modal
  const [showAutoAddModal, setShowAutoAddModal] = useState(false)
  
  // Selected bet types for auto-add
  const [selectedBetTypes, setSelectedBetTypes] = useState<string[]>([])
  
  // Track jobs currently being imported to prevent duplicates (useRef for synchronous access)
  const importingJobIds = useRef<Set<number>>(new Set())
  
  // Flag to prevent concurrent loadSearchQueue calls
  const isLoadingQueue = useRef(false)

  // Initialize dates on mount
  useEffect(() => {
    const today = new Date()
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)
    
    setDateFrom(formatDate(today))
    setDateTo(formatDate(tomorrow))

    // Load search queue on mount
    loadSearchQueue()

    // Auto-refresh queue every 5 seconds
    const interval = setInterval(loadSearchQueue, 5000)
    return () => clearInterval(interval)
  }, [])

  // Check if job was already imported (using localStorage)
  const isJobImported = (jobId: number): boolean => {
    const imported = localStorage.getItem(`bet-finder-imported-${jobId}`)
    return imported === 'true'
  }
  
  // Mark job as imported
  const markJobAsImported = (jobId: number) => {
    localStorage.setItem(`bet-finder-imported-${jobId}`, 'true')
  }
  
  // Load search queue from API
  const loadSearchQueue = async () => {
    // Prevent concurrent calls
    if (isLoadingQueue.current) {
      console.log('⏸️ Queue loading already in progress, skipping...')
      return
    }
    
    isLoadingQueue.current = true
    
    try {
      const response = await fetch('/api/bet-finder/queue')
      if (!response.ok) {
        throw new Error('Failed to load queue')
      }
      const data = await response.json()
      setSearchQueue(data)
      
      // Auto-import completed jobs to Google Sheets (use for...of to properly await)
      for (const job of data) {
        // Skip if already imported or currently importing (synchronous check with useRef)
        if (isJobImported(job.id) || importingJobIds.current.has(job.id)) {
          continue
        }
        
        if (job.status === 'completed' && job.results && job.results.length > 0) {
          // Mark as importing (synchronous with useRef)
          importingJobIds.current.add(job.id)
          console.log(`🔒 Locked job #${job.id} for import`)
          
          try {
            await importToGoogleSheets(job)
            markJobAsImported(job.id)
            await deleteJob(job.id)
          } catch (error) {
            console.error(`Error importing job #${job.id}:`, error)
          } finally {
            // Remove from importing set
            importingJobIds.current.delete(job.id)
            console.log(`🔓 Unlocked job #${job.id}`)
          }
        }
      }
    } catch (error) {
      console.error('Error loading queue:', error)
    } finally {
      isLoadingQueue.current = false
    }
  }
  
  // Delete job from queue
  const deleteJob = async (jobId: number) => {
    try {
      const response = await fetch(`/api/bet-finder/queue/${jobId}`, {
        method: 'DELETE',
      })
      
      // Ignore 404 - job already deleted
      if (response.status === 404) {
        console.log(`⏭️ Job #${jobId} already deleted`)
        return
      }
      
      if (!response.ok) {
        throw new Error('Failed to delete job')
      }
      
      console.log(`🗑️ Deleted job #${jobId} from queue`)
    } catch (error) {
      console.error(`Error deleting job #${jobId}:`, error)
    }
  }
  
  // Import results to Google Sheets using existing endpoint
  const importToGoogleSheets = async (job: SearchQueue): Promise<void> => {
    if (!job.results || job.results.length === 0) return
    
    try {
      console.log(`📤 Importing ${job.results.length} results to Google Sheets...`)
      
      let added = 0
      let skipped = 0
      let errors = 0
      
      // Import each result individually using add-match-bet-builder
      for (const result of job.results) {
        try {
          // Map search type to bet type and option
          const { betType, betOption } = mapSearchTypeToBet(job.searchType, result)
          
          const response = await fetch('/api/strefa-typera/add-match-bet-builder', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              homeTeam: result.homeTeam,
              awayTeam: result.awayTeam,
              league: result.league,
              date: result.matchDate,
              betType,
              betOption,
              odds: '', // Empty for auto-add
              superbetLink: '',
              flashscoreLink: '',
            })
          })
          
          const data = await response.json()
          
          if (data.success) {
            added++
            console.log(`✅ Added: ${result.homeTeam} vs ${result.awayTeam} (${data.szanse})`)
          } else if (data.skipped) {
            skipped++
            console.log(`⏭️ Skipped: ${result.homeTeam} vs ${result.awayTeam} (${data.skipReason})`)
          } else {
            errors++
            console.error(`❌ Error: ${result.homeTeam} vs ${result.awayTeam}`)
          }
        } catch (error) {
          errors++
          console.error(`❌ Error importing ${result.homeTeam} vs ${result.awayTeam}:`, error)
        }
      }
      
      console.log(`📊 Import complete: ${added} added, ${skipped} skipped, ${errors} errors`)
    } catch (error) {
      console.error('Error importing to Google Sheets:', error)
    }
  }
  
  // Map search type to bet type and option
  const mapSearchTypeToBet = (searchType: string, result: SearchResult): { betType: string; betOption: string } => {
    // Map search type to specific bet based on algorithm logic
    switch (searchType) {
      case 'winner-vs-loser':
        // Algorithm analyzes both scenarios and puts info in recommendation
        // Check recommendation to determine if bet should be on home (1) or away (2)
        if (result.recommendation.includes('Zakład: 2') || result.recommendation.includes('przewaga gości')) {
          return { betType: '2', betOption: '-' } // Away win
        } else {
          return { betType: '1', betOption: '-' } // Home win
        }
      
      case 'most-goals':
        return { betType: 'Over', betOption: '2.5' }
      
      case 'least-goals':
        return { betType: 'Under', betOption: '2.5' }
      
      case 'goal-advantage':
        return { betType: 'Over', betOption: '2.5' }
      
      case 'handicap-15':
        return { betType: 'Handi 1', betOption: '-1.5' }
      
      case 'most-bts':
        return { betType: 'BTS', betOption: 'Tak' }
      
      case 'no-bts':
        return { betType: 'BTS', betOption: 'Nie' }
      
      case 'most-corners':
        return { betType: 'Over Rożne', betOption: '9.5' }
      
      case 'least-corners':
        return { betType: 'Under Rożne', betOption: '9.5' }
      
      case 'corner-advantage':
        return { betType: 'Over Rożne', betOption: '9.5' }
      
      case 'corner-handicap':
        return { betType: 'Handi Rożne 1', betOption: '-3.5' }
      
      case 'home-advantage':
        return { betType: '1', betOption: '-' }
      
      case 'away-advantage':
        return { betType: '2', betOption: '-' }
      
      case 'home-goals':
        return { betType: 'Over Gosp', betOption: '1.5' }
      
      case 'away-goals':
        return { betType: 'Over Gość', betOption: '1.5' }
      
      default:
        return { betType: 'Over', betOption: '2.5' }
    }
  }

  const formatDate = (date: Date) => {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  const setTodayDate = () => {
    const today = new Date()
    setDateFrom(formatDate(today))
    setDateTo(formatDate(today))
  }

  const setTomorrowDate = () => {
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    setDateFrom(formatDate(tomorrow))
    setDateTo(formatDate(tomorrow))
  }

  const setDayAfterTomorrowDate = () => {
    const dayAfter = new Date()
    dayAfter.setDate(dayAfter.getDate() + 2)
    setDateFrom(formatDate(dayAfter))
    setDateTo(formatDate(dayAfter))
  }

  const toggleBetType = (betType: string) => {
    setSelectedBetTypes(prev =>
      prev.includes(betType)
        ? prev.filter(type => type !== betType)
        : [...prev, betType]
    )
  }

  const selectAllBetTypes = () => {
    const allTypes = [
      ...betTypeGroups.result.map(t => t.id),
      ...betTypeGroups.goals.map(t => t.id),
      ...betTypeGroups.corners.map(t => t.id),
      ...betTypeGroups.homeAway.map(t => t.id)
    ]
    setSelectedBetTypes(allTypes)
  }

  const deselectAllBetTypes = () => {
    setSelectedBetTypes([])
  }

  // Translate search type to Polish
  const translateSearchType = (type: string): string => {
    const translations: { [key: string]: string } = {
      'winner-vs-loser': '🏆 Wygrane vs Przegrane',
      'most-goals': '⚽ Najwięcej bramek',
      'least-goals': '🎯 Najmniej bramek',
      'goal-advantage': '💪 Przewaga bramkowa',
      'most-bts': '🎯 Najwięcej BTS',
      'no-bts': '🛡️ Bez BTS',
      'most-corners-match': '🚩 Najwięcej rożnych (mecz)',
      'least-corners-match': '📐 Najmniej rożnych (mecz)',
      'most-corners-team': '🔥 Najwięcej rożnych (drużyna)',
      'least-corners-team': '❄️ Najmniej rożnych (drużyna)',
      'corner-advantage': '⚡ Przewaga rożnych',
      'home-wins': '🏠 Wygrane u siebie',
      'away-wins': '✈️ Wygrane na wyjeździe',
      'home-losses': '📉 Porażki u siebie',
      'away-losses': '🔻 Porażki na wyjeździe',
      'home-advantage': '💪 Przewaga gospodarzy',
      'away-advantage': '🚀 Przewaga gości',
    }
    return translations[type] || type
  }

  // Translate status to Polish
  const translateStatus = (status: string): string => {
    const translations: { [key: string]: string } = {
      'pending': '⏳ Oczekuje',
      'running': '▶️ W trakcie',
      'completed': '✅ Ukończono',
      'failed': '❌ Błąd',
    }
    return translations[status] || status
  }

  const addToQueue = async () => {
    if (selectedBetTypes.length === 0) {
      alert('Wybierz przynajmniej jeden typ zakładu')
      return
    }

    try {
      const response = await fetch('/api/bet-finder/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          betTypes: selectedBetTypes,
          topCount,
          matchCount: matchCount === -1 ? 999 : matchCount,
          dateFrom,
          dateTo,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to create search jobs')
      }

      const data = await response.json()
      console.log('✅ Search jobs created:', data)

      // Reload queue
      await loadSearchQueue()

      alert(`✅ Dodano ${data.jobs.length} wyszukiwań do kolejki`)

      setShowAutoAddModal(false)
      setSelectedBetTypes([])
    } catch (error: any) {
      console.error('Error adding to queue:', error)
      alert(`Błąd podczas dodawania do kolejki: ${error.message}`)
    }
  }

  // Bet type groups from step 8
  const betTypeGroups = {
    result: [
      { id: 'winner-vs-loser', label: '🏆 Wygrane vs Przegrane', description: 'Jedna drużyna wygrywa często, druga przegrywa często (auto: 1 lub 2)' }
    ],
    goals: [
      { id: 'most-goals', label: '⚽ Najwięcej bramek', description: 'Obie drużyny mają najwyższą średnią bramek' },
      { id: 'least-goals', label: '🎯 Najmniej bramek', description: 'Obie drużyny mają najniższą średnią bramek' },
      { id: 'goal-advantage', label: '💪 Przewaga bramkowa', description: 'Jedna drużyna dużo strzela, druga dużo traci' },
      { id: 'most-bts', label: '🎯 Najwięcej BTS', description: 'Obie drużyny najczęściej strzelały bramki' },
      { id: 'no-bts', label: '🛡️ Bez BTS', description: 'Tylko jedna drużyna (lub żadna) strzeliła bramki' }
    ],
    corners: [
      { id: 'most-corners-match', label: '🚩 Najwięcej rożnych (mecz)', description: 'Obie drużyny mają najwyższą średnią rożnych w meczu' },
      { id: 'least-corners-match', label: '📐 Najmniej rożnych (mecz)', description: 'Obie drużyny mają najniższą średnią rożnych w meczu' },
      { id: 'most-corners-team', label: '🔥 Najwięcej rożnych (drużyna)', description: 'Drużyna wykonuje najwięcej rożnych pojedynczo' },
      { id: 'least-corners-team', label: '❄️ Najmniej rożnych (drużyna)', description: 'Drużyna wykonuje najmniej rożnych pojedynczo' },
      { id: 'corner-advantage', label: '⚡ Przewaga rożnych', description: 'Jedna drużyna wykonuje dużo, przeciwnik niewiele' }
    ],
    homeAway: [
      { id: 'home-wins', label: '🏠 Wygrane u siebie', description: 'Gospodarze z najwyższym % wygranych u siebie' },
      { id: 'away-wins', label: '✈️ Wygrane na wyjeździe', description: 'Goście z najwyższym % wygranych na wyjeździe' },
      { id: 'home-losses', label: '📉 Porażki u siebie', description: 'Gospodarze z najwyższym % porażek u siebie' },
      { id: 'away-losses', label: '🔻 Porażki na wyjeździe', description: 'Goście z najwyższym % porażek na wyjeździe' },
      { id: 'home-advantage', label: '💪 Przewaga gospodarzy', description: 'Gospodarz mocny u siebie, gość słaby na wyjeździe' },
      { id: 'away-advantage', label: '🚀 Przewaga gości', description: 'Gość mocny na wyjeździe, gospodarz słaby u siebie' }
    ]
  }

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <h2>🔍 Wyszukiwarka Typów</h2>
      </div>

      {/* TOP Results Selection */}
      <div className={styles.section}>
        <h3>Liczba najlepszych wyników</h3>
        <div className={styles.buttonGroup}>
          {[5, 10, 15, 20].map(count => (
            <button
              key={count}
              className={`${styles.btn} ${topCount === count ? styles.btnActive : ''}`}
              onClick={() => setTopCount(count)}
            >
              TOP {count}
            </button>
          ))}
        </div>
      </div>

      {/* Match Count Selection */}
      <div className={styles.section}>
        <h3>Liczba meczów do analizy</h3>
        <div className={styles.buttonGroup}>
          {[5, 10, 15, 20, 30, 50].map(count => (
            <button
              key={count}
              className={`${styles.btn} ${matchCount === count ? styles.btnActive : ''}`}
              onClick={() => setMatchCount(count)}
            >
              {count}
            </button>
          ))}
          <button
            className={`${styles.btn} ${matchCount === -1 ? styles.btnActive : ''}`}
            onClick={() => setMatchCount(-1)}
          >
            Wszystkie
          </button>
        </div>
      </div>

      {/* Date Range Selection */}
      <div className={styles.section}>
        <h3>Zakres dat nadchodzących meczów</h3>
        <div className={styles.dateRange}>
          <div className={styles.dateInputGroup}>
            <label htmlFor="date-from">Od:</label>
            <input
              type="date"
              id="date-from"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className={styles.dateInput}
            />
          </div>
          <div className={styles.dateInputGroup}>
            <label htmlFor="date-to">Do:</label>
            <input
              type="date"
              id="date-to"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className={styles.dateInput}
            />
          </div>
        </div>
        <div className={styles.datePresets}>
          <button className={styles.btnPreset} onClick={setTodayDate}>
            📅 Dzisiejsze mecze
          </button>
          <button className={styles.btnPreset} onClick={setTomorrowDate}>
            📅 Jutrzejsze mecze
          </button>
          <button className={styles.btnPreset} onClick={setDayAfterTomorrowDate}>
            📅 Pojutrzejsze mecze
          </button>
        </div>
      </div>

      {/* Auto Add Button */}
      <div className={styles.section}>
        <h3>Wyszukaj typy</h3>
        <div className={styles.autoAddSection}>
          <button 
            className={styles.btnAutoAdd}
            onClick={() => setShowAutoAddModal(true)}
          >
            🎯 Automatycznie dodaj typy
          </button>
          {/* Debug button to clear localStorage cache */}
          {searchQueue.length === 0 && (
            <button
              className={styles.btnSecondary}
              onClick={() => {
                // Clear only bet-finder related localStorage
                Object.keys(localStorage).forEach(key => {
                  if (key.startsWith('bet-finder-')) {
                    localStorage.removeItem(key)
                  }
                })
                alert('✅ Wyczyszczono cache importów')
              }}
              style={{ marginLeft: '10px', fontSize: '12px', padding: '8px 16px' }}
            >
              🧹 Wyczyść cache
            </button>
          )}
        </div>
      </div>

      {/* Search Queue - Active */}
      <div className={styles.section}>
        <h3>⏳ Aktywne wyszukiwania</h3>
        {searchQueue.filter(job => job.status !== 'completed' || !isJobImported(job.id)).length === 0 ? (
          <div className={styles.emptyQueue}>
            <p>📭 Brak aktywnych wyszukiwań</p>
            <p className={styles.emptyQueueHint}>
              Użyj przycisku "Automatycznie dodaj typy" aby dodać wyszukiwania do kolejki.
              Wyniki zostaną automatycznie zaimportowane do arkusza Google Sheets po zakończeniu.
            </p>
          </div>
        ) : (
          <div className={styles.queueList}>
            {searchQueue
              .filter(job => job.status !== 'completed' || !isJobImported(job.id))
              .map(item => (
              <div key={item.id} className={styles.queueItem}>
                <div className={styles.queueItemHeader}>
                  <span className={styles.queueItemType}>{translateSearchType(item.searchType)}</span>
                  <span className={`${styles.queueItemStatus} ${styles[`status${item.status}`]}`}>
                    {translateStatus(item.status)}
                  </span>
                </div>
                <div className={styles.queueItemDetails}>
                  <div>Utworzono: {new Date(item.createdAt).toLocaleString('pl-PL')}</div>
                  {item.status === 'running' && (
                    <div className={styles.resultsCount}>
                      🔄 Przetwarzanie...
                    </div>
                  )}
                  {item.status === 'completed' && item.results && (
                    <div className={styles.resultsCount}>
                      ⏳ Importowanie do arkusza...
                    </div>
                  )}
                  {item.status === 'failed' && (
                    <div className={styles.errorMessage}>
                      ⚠️ {item.error || 'Nieznany błąd'}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Search Queue - Completed */}
      <div className={styles.section}>
        <div className={styles.sectionHeaderWithButton}>
          <h3>✅ Zakończone wyszukiwania</h3>
          {searchQueue.filter(job => job.status === 'completed' && isJobImported(job.id)).length > 0 && (
            <button
              onClick={async () => {
                if (confirm('Czy na pewno chcesz wyczyścić historię zakończonych wyszukiwań?')) {
                  const completedJobs = searchQueue.filter(job => job.status === 'completed' && isJobImported(job.id))
                  for (const job of completedJobs) {
                    await deleteJob(job.id)
                  }
                  await loadSearchQueue()
                }
              }}
              className={styles.clearHistoryButton}
              title="Wyczyść historię zakończonych"
            >
              🗑️ Wyczyść historię
            </button>
          )}
        </div>
        {searchQueue.filter(job => job.status === 'completed' && isJobImported(job.id)).length === 0 ? (
          <div className={styles.emptyQueue}>
            <p>📭 Brak zakończonych wyszukiwań</p>
          </div>
        ) : (
          <div className={styles.queueList}>
            {searchQueue
              .filter(job => job.status === 'completed' && isJobImported(job.id))
              .map(item => (
              <div key={item.id} className={`${styles.queueItem} ${styles.queueItemCompleted}`}>
                <div className={styles.queueItemHeader}>
                  <span className={styles.queueItemType}>{translateSearchType(item.searchType)}</span>
                  <span className={`${styles.queueItemStatus} ${styles.statuscompleted}`}>
                    ✅ Zaimportowano
                  </span>
                </div>
                <div className={styles.queueItemDetails}>
                  <div>Utworzono: {new Date(item.createdAt).toLocaleString('pl-PL')}</div>
                  {item.results && (
                    <div className={styles.resultsCount}>
                      📊 Znaleziono: {item.results.length} typów
                    </div>
                  )}
                </div>
                <button
                  onClick={async () => {
                    await deleteJob(item.id)
                    await loadSearchQueue()
                  }}
                  className={styles.deleteButton}
                  title="Usuń z historii"
                >
                  🗑️
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Auto Add Modal */}
      {showAutoAddModal && (
        <div className={styles.modal} onClick={() => setShowAutoAddModal(false)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2>🎯 Automatyczne dodawanie typów</h2>
              <button className={styles.closeBtn} onClick={() => setShowAutoAddModal(false)}>×</button>
            </div>

            <div className={styles.modalBody}>
              {/* Result Group */}
              <div className={styles.betTypeGroup}>
                <h4 className={styles.groupTitle}>
                  <span className={styles.groupIcon}>📊</span>
                  Rezultat
                </h4>
                <div className={styles.betTypeList}>
                  {betTypeGroups.result.map(betType => (
                    <label key={betType.id} className={styles.betTypeItem}>
                      <input
                        type="checkbox"
                        checked={selectedBetTypes.includes(betType.id)}
                        onChange={() => toggleBetType(betType.id)}
                      />
                      <div className={styles.betTypeInfo}>
                        <span className={styles.betTypeLabel}>{betType.label}</span>
                        <span className={styles.betTypeDesc}>{betType.description}</span>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Goals Group */}
              <div className={styles.betTypeGroup}>
                <h4 className={styles.groupTitle}>
                  <span className={styles.groupIcon}>⚽</span>
                  Bramki
                </h4>
                <div className={styles.betTypeList}>
                  {betTypeGroups.goals.map(betType => (
                    <label key={betType.id} className={styles.betTypeItem}>
                      <input
                        type="checkbox"
                        checked={selectedBetTypes.includes(betType.id)}
                        onChange={() => toggleBetType(betType.id)}
                      />
                      <div className={styles.betTypeInfo}>
                        <span className={styles.betTypeLabel}>{betType.label}</span>
                        <span className={styles.betTypeDesc}>{betType.description}</span>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Corners Group */}
              <div className={styles.betTypeGroup}>
                <h4 className={styles.groupTitle}>
                  <span className={styles.groupIcon}>🚩</span>
                  Rożne
                </h4>
                <div className={styles.betTypeList}>
                  {betTypeGroups.corners.map(betType => (
                    <label key={betType.id} className={styles.betTypeItem}>
                      <input
                        type="checkbox"
                        checked={selectedBetTypes.includes(betType.id)}
                        onChange={() => toggleBetType(betType.id)}
                      />
                      <div className={styles.betTypeInfo}>
                        <span className={styles.betTypeLabel}>{betType.label}</span>
                        <span className={styles.betTypeDesc}>{betType.description}</span>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Home/Away Group */}
              <div className={styles.betTypeGroup}>
                <h4 className={styles.groupTitle}>
                  <span className={styles.groupIcon}>🏠</span>
                  Dom/Wyjazd
                </h4>
                <div className={styles.betTypeList}>
                  {betTypeGroups.homeAway.map(betType => (
                    <label key={betType.id} className={styles.betTypeItem}>
                      <input
                        type="checkbox"
                        checked={selectedBetTypes.includes(betType.id)}
                        onChange={() => toggleBetType(betType.id)}
                      />
                      <div className={styles.betTypeInfo}>
                        <span className={styles.betTypeLabel}>{betType.label}</span>
                        <span className={styles.betTypeDesc}>{betType.description}</span>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <div className={styles.modalFooter}>
              <div className={styles.selectedCount}>
                Wybrano: {selectedBetTypes.length}
              </div>
              <div className={styles.modalActions}>
                <button 
                  className={styles.btnSelectAll} 
                  onClick={selectedBetTypes.length === 0 ? selectAllBetTypes : deselectAllBetTypes}
                >
                  {selectedBetTypes.length === 0 ? '☑️ Zaznacz wszystkie' : '☐ Odznacz wszystkie'}
                </button>
                <button className={styles.btnSecondary} onClick={() => setShowAutoAddModal(false)}>
                  Anuluj
                </button>
                <button className={styles.btnPrimary} onClick={addToQueue}>
                  ✅ Dodaj do kolejki
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default BetFinderPage
