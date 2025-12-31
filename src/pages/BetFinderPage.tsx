import { useState, useEffect } from 'react'
import styles from './BetFinderPage.module.css'

interface SearchQueue {
  id: number
  searchType: string
  status: 'pending' | 'running' | 'completed' | 'failed'
  results?: any[]
  createdAt: string
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

  // Initialize dates on mount
  useEffect(() => {
    const today = new Date()
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)
    
    setDateFrom(formatDate(today))
    setDateTo(formatDate(tomorrow))
  }, [])

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

  const addToQueue = async () => {
    if (selectedBetTypes.length === 0) {
      alert('Wybierz przynajmniej jeden typ zakładu')
      return
    }

    // TODO: Implement queue logic - will be handled by new agent
    console.log('Adding to queue:', {
      betTypes: selectedBetTypes,
      topCount,
      matchCount,
      dateFrom,
      dateTo
    })

    setShowAutoAddModal(false)
    setSelectedBetTypes([])
  }

  // Bet type groups from step 8
  const betTypeGroups = {
    result: [
      { id: 'winner-vs-loser', label: '🏆 Wygrane vs Przegrane', description: 'Drużyna z najwyższym % wygranych vs drużyna z najwyższym % przegranych' }
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
        </div>
      </div>

      {/* Search Queue */}
      <div className={styles.section}>
        <h3>Kolejka wyszukiwań</h3>
        {searchQueue.length === 0 ? (
          <div className={styles.emptyQueue}>
            <p>📭 Brak wyszukiwań w kolejce</p>
            <p className={styles.emptyQueueHint}>
              Użyj przycisku "Automatycznie dodaj typy" aby dodać wyszukiwania do kolejki
            </p>
          </div>
        ) : (
          <div className={styles.queueList}>
            {searchQueue.map(item => (
              <div key={item.id} className={styles.queueItem}>
                <div className={styles.queueItemHeader}>
                  <span className={styles.queueItemType}>{item.searchType}</span>
                  <span className={`${styles.queueItemStatus} ${styles[`status${item.status}`]}`}>
                    {item.status}
                  </span>
                </div>
                <div className={styles.queueItemDetails}>
                  {new Date(item.createdAt).toLocaleString('pl-PL')}
                </div>
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
