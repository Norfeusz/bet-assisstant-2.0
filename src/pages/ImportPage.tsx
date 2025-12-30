import { useState, useEffect } from 'react'
import styles from './ImportPage.module.css'

interface ImportJob {
  id: number
  leagues: number[]
  date_from: string
  date_to: string
  job_type: 'new_matches' | 'update_results'
  status: 'in_queue' | 'pending' | 'running' | 'paused' | 'completed' | 'failed' | 'rate_limited'
  progress: {
    completed_leagues?: number[]
  }
  created_at: string
  error_message?: string
  rate_limit_reset_at?: string
}

interface League {
  id: number
  name: string
  country: string
  enabled: boolean
}

function ImportPage() {
  const [jobs, setJobs] = useState<ImportJob[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [showHidden, setShowHidden] = useState(false)
  const [selectedJobs, setSelectedJobs] = useState<number[]>([])
  const [showCalendar, setShowCalendar] = useState(false)
  const [allJobs, setAllJobs] = useState<ImportJob[]>([]) // All jobs for calendar
  const [calendarDate, setCalendarDate] = useState(new Date()) // Current calendar month
  
  // Modal state
  const [leagues, setLeagues] = useState<League[]>([])
  const [selectedLeagues, setSelectedLeagues] = useState<number[]>([])
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [jobType, setJobType] = useState<'new_matches' | 'update_results'>('new_matches')

  // Load jobs on mount
  useEffect(() => {
    loadJobs()
    const interval = setInterval(loadJobs, 5000) // Auto-refresh every 5s
    return () => clearInterval(interval)
  }, [showHidden])

  // Clear selected jobs when switching tabs
  useEffect(() => {
    setSelectedJobs([])
  }, [showHidden])

  // Load all jobs when calendar opens
  useEffect(() => {
    if (showCalendar) {
      loadAllJobs()
    }
  }, [showCalendar])

  const loadJobs = async () => {
    try {
      const response = await fetch(`/api/import-jobs?showHidden=${showHidden}`)
      if (!response.ok) throw new Error('Failed to load jobs')
      const data = await response.json()
      setJobs(data)
    } catch (error) {
      console.error('Error loading jobs:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadAllJobs = async () => {
    try {
      // Load both visible and hidden jobs for calendar analysis
      const [visibleRes, hiddenRes] = await Promise.all([
        fetch('/api/import-jobs?showHidden=false'),
        fetch('/api/import-jobs?showHidden=true')
      ])
      
      if (!visibleRes.ok || !hiddenRes.ok) throw new Error('Failed to load all jobs')
      
      const visible = await visibleRes.json()
      const hidden = await hiddenRes.json()
      
      // Merge and deduplicate
      const allJobsMap = new Map()
      visible.forEach((job: ImportJob) => allJobsMap.set(job.id, job))
      hidden.forEach((job: ImportJob) => allJobsMap.set(job.id, job))
      
      setAllJobs(Array.from(allJobsMap.values()))
    } catch (error) {
      console.error('Error loading all jobs:', error)
    }
  }

  const openModal = async () => {
    try {
      // Load leagues
      const response = await fetch('/api/config')
      if (!response.ok) throw new Error('Failed to load leagues')
      const data = await response.json()
      setLeagues(data.leagues)
      
      // Set default dates (last 7 days)
      const today = new Date()
      const weekAgo = new Date(today)
      weekAgo.setDate(weekAgo.getDate() - 7)
      
      setDateFrom(weekAgo.toISOString().split('T')[0])
      setDateTo(today.toISOString().split('T')[0])
      setShowModal(true)
    } catch (error) {
      console.error('Error loading leagues:', error)
      alert('Błąd podczas ładowania lig')
    }
  }

  const createJob = async () => {
    if (selectedLeagues.length === 0) {
      alert('Wybierz przynajmniej jedną ligę')
      return
    }

    if (!dateFrom || !dateTo) {
      alert('Wybierz zakres dat')
      return
    }

    if (new Date(dateFrom) > new Date(dateTo)) {
      alert('Data początkowa nie może być późniejsza niż końcowa')
      return
    }

    try {
      const response = await fetch('/api/import-jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leagueIds: selectedLeagues,
          dateFrom,
          dateTo,
          jobType
        })
      })

      if (!response.ok) throw new Error('Failed to create job')
      
      const result = await response.json()
      alert(`✅ Zadanie utworzone! ID: ${result.jobId}`)
      
      setShowModal(false)
      setSelectedLeagues([])
      loadJobs()
    } catch (error) {
      console.error('Error creating job:', error)
      alert('Błąd podczas tworzenia zadania')
    }
  }

  const toggleLeague = (leagueId: number) => {
    setSelectedLeagues(prev =>
      prev.includes(leagueId)
        ? prev.filter(id => id !== leagueId)
        : [...prev, leagueId]
    )
  }

  const toggleAllLeagues = () => {
    if (selectedLeagues.length === leagues.length) {
      setSelectedLeagues([])
    } else {
      setSelectedLeagues(leagues.map(l => l.id))
    }
  }

  // Quick date selection helpers
  const setDatePreset = (preset: string) => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    let from: Date
    let to: Date

    switch (preset) {
      case 'przedwczoraj':
        from = new Date(today)
        from.setDate(today.getDate() - 2)
        to = new Date(from)
        break

      case 'wczoraj':
        from = new Date(today)
        from.setDate(today.getDate() - 1)
        to = new Date(from)
        break

      case 'dzisiaj':
        from = new Date(today)
        to = new Date(today)
        break

      case 'jutro':
        from = new Date(today)
        from.setDate(today.getDate() + 1)
        to = new Date(from)
        break

      case 'pojutrze':
        from = new Date(today)
        from.setDate(today.getDate() + 2)
        to = new Date(from)
        break

      case 'poprzedni-tydzien':
        // Poniedziałek poprzedniego tygodnia
        from = new Date(today)
        const prevWeekDay = from.getDay() || 7 // 0=Sunday -> 7
        from.setDate(from.getDate() - prevWeekDay - 6) // Go to Monday of previous week
        // Niedziela poprzedniego tygodnia
        to = new Date(from)
        to.setDate(from.getDate() + 6)
        break

      case 'obecny-tydzien':
        // Poniedziałek obecnego tygodnia
        from = new Date(today)
        const currWeekDay = from.getDay() || 7
        from.setDate(from.getDate() - currWeekDay + 1)
        // Niedziela obecnego tygodnia
        to = new Date(from)
        to.setDate(from.getDate() + 6)
        break

      case 'nastepny-tydzien':
        // Poniedziałek następnego tygodnia
        from = new Date(today)
        const nextWeekDay = from.getDay() || 7
        from.setDate(from.getDate() - nextWeekDay + 8)
        // Niedziela następnego tygodnia
        to = new Date(from)
        to.setDate(from.getDate() + 6)
        break

      default:
        return
    }

    // Formatuj daty jako YYYY-MM-DD w lokalnej strefie czasowej
    const formatDate = (date: Date) => {
      const year = date.getFullYear()
      const month = String(date.getMonth() + 1).padStart(2, '0')
      const day = String(date.getDate()).padStart(2, '0')
      return `${year}-${month}-${day}`
    }

    setDateFrom(formatDate(from))
    setDateTo(formatDate(to))
  }

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      in_queue: 'W kolejce',
      pending: 'Oczekuje',
      running: 'W trakcie',
      paused: 'Wstrzymane',
      completed: 'Zakończone',
      failed: 'Błąd',
      rate_limited: 'Limit API',
    }
    return labels[status] || status
  }

  const getJobTypeLabel = (type: string) => {
    return type === 'update_results' ? '🔄 Aktualizacja wyników' : '🆕 Import nowych meczów'
  }

  const navigateMonth = (direction: number) => {
    setCalendarDate(prev => {
      const newDate = new Date(prev)
      newDate.setMonth(newDate.getMonth() + direction)
      return newDate
    })
  }

  const renderCalendar = () => {
    // Helper to format date as YYYY-MM-DD in local timezone
    const formatLocalDate = (date: Date) => {
      const year = date.getFullYear()
      const month = String(date.getMonth() + 1).padStart(2, '0')
      const day = String(date.getDate()).padStart(2, '0')
      return `${year}-${month}-${day}`
    }

    // Use all jobs (including hidden) for calendar analysis
    const completedJobs = allJobs.filter(j => j.status === 'completed' || j.status === 'failed')
    
    // Build a map of dates to job types
    const dateMap = new Map<string, Set<string>>()
    
    completedJobs.forEach(job => {
      // Parse ISO date strings
      const fromDate = new Date(job.date_from)
      const toDate = new Date(job.date_to)
      
      // Iterate through all dates in the range
      const currentDate = new Date(fromDate)
      while (currentDate <= toDate) {
        const dateKey = formatLocalDate(currentDate)
        if (!dateMap.has(dateKey)) {
          dateMap.set(dateKey, new Set())
        }
        dateMap.get(dateKey)!.add(job.job_type)
        currentDate.setDate(currentDate.getDate() + 1)
      }
    })

    // Generate calendar for selected month
    const year = calendarDate.getFullYear()
    const month = calendarDate.getMonth()
    
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const daysInMonth = lastDay.getDate()
    const startingDayOfWeek = firstDay.getDay() || 7 // 0=Sunday -> 7
    
    const weeks: JSX.Element[][] = []
    let currentWeek: JSX.Element[] = []
    
    // Add empty cells for days before month starts
    for (let i = 1; i < startingDayOfWeek; i++) {
      currentWeek.push(<div key={`empty-${i}`} className={styles.calendarDay}></div>)
    }
    
    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day)
      const dateKey = formatLocalDate(date)
      const jobTypes = dateMap.get(dateKey)
      
      let dayClass = styles.calendarDayEmpty
      if (jobTypes) {
        // Green (update_results) overrides blue (new_matches)
        if (jobTypes.has('update_results')) {
          dayClass = styles.calendarDayUpdated
        } else if (jobTypes.has('new_matches')) {
          dayClass = styles.calendarDayImported
        }
      }
      
      const handleDayClick = () => {
        setDateFrom(dateKey)
        setDateTo(dateKey)
        setShowCalendar(false)
      }
      
      currentWeek.push(
        <div 
          key={day} 
          className={`${styles.calendarDay} ${dayClass}`}
          onClick={handleDayClick}
        >
          {day}
        </div>
      )
      
      // Start new week on Sunday
      if ((startingDayOfWeek + day - 1) % 7 === 0) {
        weeks.push([...currentWeek])
        currentWeek = []
      }
    }
    
    // Add remaining week if not empty
    if (currentWeek.length > 0) {
      weeks.push(currentWeek)
    }
    
    return (
      <>
        <div className={styles.calendarHeader}>
          <button 
            className={styles.calendarNavBtn} 
            onClick={() => navigateMonth(-1)}
            title="Poprzedni miesiąc"
          >
            ◀
          </button>
          <h3>{firstDay.toLocaleDateString('pl-PL', { month: 'long', year: 'numeric' })}</h3>
          <button 
            className={styles.calendarNavBtn} 
            onClick={() => navigateMonth(1)}
            title="Następny miesiąc"
          >
            ▶
          </button>
        </div>
        <div className={styles.calendarGrid}>
          <div className={styles.calendarWeekdays}>
            <div>Pn</div>
            <div>Wt</div>
            <div>Śr</div>
            <div>Cz</div>
            <div>Pt</div>
            <div>So</div>
            <div>Nd</div>
          </div>
          {weeks.map((week, i) => (
            <div key={i} className={styles.calendarWeek}>
              {week}
            </div>
          ))}
        </div>
      </>
    )
  }

  const calculateProgress = (job: ImportJob) => {
    const totalLeagues = job.leagues.length
    const completedLeagues = job.progress.completed_leagues?.length || 0
    return totalLeagues > 0 ? Math.round((completedLeagues / totalLeagues) * 100) : 0
  }

  const pauseJob = async (jobId: number) => {
    if (!confirm('Czy na pewno wstrzymać to zadanie?')) return

    try {
      const response = await fetch(`/api/import-jobs/${jobId}/pause`, {
        method: 'POST',
      })

      if (!response.ok) throw new Error('Błąd wstrzymywania zadania')
      
      alert('✅ Zadanie wstrzymane')
      await loadJobs()
    } catch (error) {
      console.error('Error pausing job:', error)
      alert('Błąd podczas wstrzymywania zadania')
    }
  }

  const resumeJob = async (jobId: number) => {
    try {
      const response = await fetch(`/api/import-jobs/${jobId}/resume`, {
        method: 'POST',
      })

      if (!response.ok) throw new Error('Błąd wznawiania zadania')
      
      alert('✅ Zadanie wznowione')
      await loadJobs()
    } catch (error) {
      console.error('Error resuming job:', error)
      alert('Błąd podczas wznawiania zadania')
    }
  }

  const cancelJob = async (jobId: number) => {
    if (!confirm('Czy na pewno zakończyć to zadanie? Operacja jest nieodwracalna.')) return

    try {
      const response = await fetch(`/api/import-jobs/${jobId}`, {
        method: 'DELETE',
      })

      if (!response.ok) throw new Error('Błąd kończenia zadania')
      
      alert('✅ Zadanie zakończone')
      await loadJobs()
    } catch (error) {
      console.error('Error canceling job:', error)
      alert('Błąd podczas kończenia zadania')
    }
  }

  const hideJob = async (jobId: number) => {
    try {
      const response = await fetch(`/api/import-jobs/${jobId}/hide`, {
        method: 'POST',
      })

      if (!response.ok) throw new Error('Błąd ukrywania zadania')
      
      await loadJobs()
    } catch (error) {
      console.error('Error hiding job:', error)
      alert('Błąd podczas ukrywania zadania')
    }
  }

  const deleteJob = async (jobId: number) => {
    if (!confirm('Czy na pewno usunąć to zadanie?')) return

    try {
      const response = await fetch(`/api/import-jobs/${jobId}`, {
        method: 'DELETE',
      })

      if (!response.ok) throw new Error('Błąd usuwania zadania')
      
      await loadJobs()
    } catch (error) {
      console.error('Error deleting job:', error)
      alert('Błąd podczas usuwania zadania')
    }
  }

  const toggleJobSelection = (jobId: number) => {
    setSelectedJobs(prev =>
      prev.includes(jobId)
        ? prev.filter(id => id !== jobId)
        : [...prev, jobId]
    )
  }

  const toggleSelectAll = () => {
    if (selectedJobs.length === jobs.length) {
      setSelectedJobs([])
    } else {
      setSelectedJobs(jobs.map(j => j.id))
    }
  }

  const toggleSelectQueuedJobs = () => {
    const queuedJobs = jobs.filter(j => ['in_queue', 'pending'].includes(j.status))
    const queuedIds = queuedJobs.map(j => j.id)
    const allQueuedSelected = queuedIds.every(id => selectedJobs.includes(id))

    if (allQueuedSelected) {
      // Deselect all queued
      setSelectedJobs(prev => prev.filter(id => !queuedIds.includes(id)))
    } else {
      // Select all queued
      setSelectedJobs(prev => [...new Set([...prev, ...queuedIds])])
    }
  }

  const toggleSelectCompletedJobs = () => {
    const completedJobs = jobs.filter(j => ['completed', 'failed'].includes(j.status))
    const completedIds = completedJobs.map(j => j.id)
    const allCompletedSelected = completedIds.every(id => selectedJobs.includes(id))

    if (allCompletedSelected) {
      // Deselect all completed
      setSelectedJobs(prev => prev.filter(id => !completedIds.includes(id)))
    } else {
      // Select all completed
      setSelectedJobs(prev => [...new Set([...prev, ...completedIds])])
    }
  }

  const deleteSelectedJobs = async () => {
    if (selectedJobs.length === 0) {
      alert('Nie zaznaczono żadnych zadań')
      return
    }

    if (!confirm(`Czy na pewno usunąć ${selectedJobs.length} zaznaczonych zadań?`)) return

    try {
      await Promise.all(
        selectedJobs.map(jobId =>
          fetch(`/api/import-jobs/${jobId}`, { method: 'DELETE' })
        )
      )
      
      alert(`✅ Usunięto ${selectedJobs.length} zadań`)
      setSelectedJobs([])
      await loadJobs()
    } catch (error) {
      console.error('Error deleting jobs:', error)
      alert('Błąd podczas usuwania zadań')
    }
  }

  const hideSelectedJobs = async () => {
    if (selectedJobs.length === 0) {
      alert('Nie zaznaczono żadnych zadań')
      return
    }

    try {
      await Promise.all(
        selectedJobs.map(jobId =>
          fetch(`/api/import-jobs/${jobId}/hide`, { method: 'POST' })
        )
      )
      
      alert(`✅ Ukryto ${selectedJobs.length} zadań`)
      setSelectedJobs([])
      await loadJobs()
    } catch (error) {
      console.error('Error hiding jobs:', error)
      alert('Błąd podczas ukrywania zadań')
    }
  }

  const renderJobCard = (job: ImportJob) => {
    const progress = calculateProgress(job)
    const hasActiveProgress = ['running', 'paused', 'rate_limited'].includes(job.status)
    const jobTypeClass = job.job_type === 'new_matches' ? styles.jobCardNewMatches : styles.jobCardUpdateResults

    return (
      <div key={job.id} className={`${styles.jobCard} ${jobTypeClass}`}>
        <div className={styles.jobHeader}>
          <div className={styles.jobTitleRow}>
            <label className={styles.jobCheckbox}>
              <input
                type="checkbox"
                checked={selectedJobs.includes(job.id)}
                onChange={() => toggleJobSelection(job.id)}
              />
            </label>
            <div className={styles.jobTitle}>Zadanie #{job.id}</div>
          </div>
          <span className={`${styles.statusBadge} ${styles[`status${job.status}`]}`}>
            {getStatusLabel(job.status)}
          </span>
        </div>

        <div className={styles.jobInfo}>
          <div>
            <strong>Typ:</strong> {getJobTypeLabel(job.job_type)}
          </div>
          {job.date_from && (
            <div>
              <strong>Od:</strong> {new Date(job.date_from).toLocaleDateString('pl-PL')}
            </div>
          )}
          {job.date_to && (
            <div>
              <strong>Do:</strong> {new Date(job.date_to).toLocaleDateString('pl-PL')}
            </div>
          )}
          <div>
            <strong>Ligi:</strong> {job.leagues.length <= 10 
              ? job.leagues.join(', ') 
              : `${job.leagues.length} lig`}
          </div>
          {job.error_message && (
            <div className={styles.errorMessage}>
              <strong>❌ Błąd:</strong> {job.error_message}
            </div>
          )}
        </div>

        {hasActiveProgress && (
          <div className={styles.progressBar}>
            <div className={styles.progressBarContainer}>
              <div 
                className={styles.progressBarFill} 
                style={{ width: `${progress}%` }}
              >
                {progress}%
              </div>
            </div>
          </div>
        )}

        <div className={styles.jobActions}>
          {job.status === 'running' && (
            <button 
              className={styles.btnAction} 
              onClick={() => pauseJob(job.id)}
              title="Wstrzymaj zadanie"
            >
              ⏸️ Wstrzymaj
            </button>
          )}
          {job.status === 'paused' && (
            <button 
              className={styles.btnAction} 
              onClick={() => resumeJob(job.id)}
              title="Wznów zadanie"
            >
              ▶️ Wznów
            </button>
          )}
          {['running', 'paused', 'in_queue', 'pending'].includes(job.status) && (
            <button 
              className={styles.btnActionDanger} 
              onClick={() => cancelJob(job.id)}
              title="Zakończ zadanie"
            >
              ⏹️ Zakończ
            </button>
          )}
          {!showHidden && ['completed', 'failed'].includes(job.status) && (
            <button 
              className={styles.btnAction} 
              onClick={() => hideJob(job.id)}
              title="Ukryj zadanie"
            >
              👁️ Ukryj
            </button>
          )}
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className={styles.loading}>
        <div className={styles.spinner}></div>
        <p>Ładowanie zadań...</p>
      </div>
    )
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2>🤖 Zadania w Tle</h2>
        <div className={styles.actions}>
          <button className={styles.btnPrimary} onClick={openModal}>
            ➕ Nowe Zadanie
          </button>
          <button 
            className={styles.btnSecondary} 
            onClick={() => setShowHidden(!showHidden)}
          >
            👁️ {showHidden ? 'Pokaż Aktywne' : 'Pokaż Ukryte'}
          </button>
          <button className={styles.btnSecondary} onClick={loadJobs}>
            🔄 Odśwież
          </button>
        </div>
      </div>

      {/* Bulk actions buttons */}
      {selectedJobs.length > 0 && (
        <div className={styles.toolbar}>
          <div className={styles.bulkActions}>
            {!showHidden ? (
              <>
                <button 
                  className={styles.btnBulkDelete} 
                  onClick={deleteSelectedJobs}
                >
                  🗑️ Usuń zaznaczone ({selectedJobs.length})
                </button>
                <button 
                  className={styles.btnBulkHide} 
                  onClick={hideSelectedJobs}
                >
                  👁️ Ukryj zaznaczone ({selectedJobs.length})
                </button>
              </>
            ) : (
              <button 
                className={styles.btnBulkDelete} 
                onClick={deleteSelectedJobs}
              >
                🗑️ Usuń zaznaczone ({selectedJobs.length})
              </button>
            )}
          </div>
        </div>
      )}

      <div className={styles.jobsList}>
        {jobs.length === 0 ? (
          <div className={styles.empty}>
            <p>📭 Brak zadań do wyświetlenia</p>
          </div>
        ) : (
          <>
            {/* Section 1: Active Jobs */}
            {(() => {
              const activeJobs = jobs.filter(j => ['running', 'paused', 'rate_limited'].includes(j.status))
              if (activeJobs.length === 0) return null

              return (
                <div className={styles.section}>
                  <div className={styles.sectionHeader}>
                    <h3>🔄 Zadania aktywne ({activeJobs.length})</h3>
                  </div>
                  <div className={styles.sectionContent}>
                    {activeJobs.map(job => renderJobCard(job))}
                  </div>
                </div>
              )
            })()}

            {/* Section 2: Queued Jobs */}
            {(() => {
              const queuedJobs = jobs.filter(j => ['in_queue', 'pending'].includes(j.status))
              if (queuedJobs.length === 0) return null

              const queuedIds = queuedJobs.map(j => j.id)
              const allQueuedSelected = queuedIds.length > 0 && queuedIds.every(id => selectedJobs.includes(id))

              return (
                <div className={styles.section}>
                  <div className={styles.sectionHeader}>
                    <h3>⏳ Zadania w kolejce ({queuedJobs.length})</h3>
                    <label className={styles.sectionSelectAll}>
                      <input
                        type="checkbox"
                        checked={allQueuedSelected}
                        onChange={toggleSelectQueuedJobs}
                      />
                      <span>Zaznacz wszystkie</span>
                    </label>
                  </div>
                  <div className={styles.sectionContent}>
                    {queuedJobs.map(job => renderJobCard(job))}
                  </div>
                </div>
              )
            })()}

            {/* Section 3: Completed Jobs */}
            {(() => {
              const completedJobs = jobs.filter(j => ['completed', 'failed'].includes(j.status))
              if (completedJobs.length === 0) return null

              const completedIds = completedJobs.map(j => j.id)
              const allCompletedSelected = completedIds.length > 0 && completedIds.every(id => selectedJobs.includes(id))

              return (
                <div className={styles.section}>
                  <div className={styles.sectionHeader}>
                    <h3>✅ Zadania zakończone ({completedJobs.length})</h3>
                    <label className={styles.sectionSelectAll}>
                      <input
                        type="checkbox"
                        checked={allCompletedSelected}
                        onChange={toggleSelectCompletedJobs}
                      />
                      <span>Zaznacz wszystkie</span>
                    </label>
                  </div>
                  <div className={styles.sectionContent}>
                    {completedJobs.map(job => renderJobCard(job))}
                  </div>
                </div>
              )
            })()}
          </>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className={styles.modal} onClick={() => setShowModal(false)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2>➕ Nowe Zadanie Importu</h2>
              <button className={styles.closeBtn} onClick={() => setShowModal(false)}>×</button>
            </div>

            <div className={styles.modalBody}>
              {/* Job Type */}
              <div className={styles.formGroup}>
                <label>🎯 Typ zadania</label>
                <div className={styles.jobTypeButtons}>
                  <button
                    type="button"
                    className={`${styles.jobTypeBtn} ${jobType === 'new_matches' ? styles.jobTypeBtnActive : ''}`}
                    onClick={() => setJobType('new_matches')}
                  >
                    🆕 Import nowych meczów
                  </button>
                  <button
                    type="button"
                    className={`${styles.jobTypeBtn} ${jobType === 'update_results' ? styles.jobTypeBtnActive : ''}`}
                    onClick={() => setJobType('update_results')}
                  >
                    🔄 Aktualizacja wyników
                  </button>
                </div>
                <small className={styles.hint}>
                  {jobType === 'update_results' 
                    ? 'Aktualizuje wyniki meczów, które są w bazie jako nierozegrane'
                    : 'Importuje nadchodzące mecze dla wybranych lig'}
                </small>
              </div>

              {/* Date Range */}
              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label>📅 Data od</label>
                  <input 
                    type="date" 
                    value={dateFrom} 
                    onChange={(e) => setDateFrom(e.target.value)} 
                  />
                </div>
                <div className={styles.formGroup}>
                  <label>📅 Data do</label>
                  <input 
                    type="date" 
                    value={dateTo} 
                    onChange={(e) => setDateTo(e.target.value)} 
                  />
                </div>
              </div>

              {/* Quick Date Selection */}
              <div className={styles.formGroup}>
                <div className={styles.datePresetsHeader}>
                  <label>⚡ Szybki wybór dat</label>
                  <button 
                    type="button"
                    className={styles.btnCalendar} 
                    onClick={() => setShowCalendar(true)}
                  >
                    📅 Sprawdź kalendarz
                  </button>
                </div>
                <div className={styles.datePresets}>
                  <button 
                    type="button"
                    className={styles.btnPreset} 
                    onClick={() => setDatePreset('przedwczoraj')}
                  >
                    Przedwczoraj
                  </button>
                  <button 
                    type="button"
                    className={styles.btnPreset} 
                    onClick={() => setDatePreset('wczoraj')}
                  >
                    Wczoraj
                  </button>
                  <button 
                    type="button"
                    className={styles.btnPreset} 
                    onClick={() => setDatePreset('dzisiaj')}
                  >
                    Dzisiaj
                  </button>
                  <button 
                    type="button"
                    className={styles.btnPreset} 
                    onClick={() => setDatePreset('jutro')}
                  >
                    Jutro
                  </button>
                  <button 
                    type="button"
                    className={styles.btnPreset} 
                    onClick={() => setDatePreset('pojutrze')}
                  >
                    Pojutrze
                  </button>
                  <button 
                    type="button"
                    className={styles.btnPresetWide} 
                    onClick={() => setDatePreset('poprzedni-tydzien')}
                  >
                    📅 Poprzedni tydzień
                  </button>
                  <button 
                    type="button"
                    className={styles.btnPresetWide} 
                    onClick={() => setDatePreset('obecny-tydzien')}
                  >
                    📅 Obecny tydzień
                  </button>
                  <button 
                    type="button"
                    className={styles.btnPresetWide} 
                    onClick={() => setDatePreset('nastepny-tydzien')}
                  >
                    📅 Następny tydzień
                  </button>
                </div>
              </div>

              {/* Leagues */}
              <div className={styles.formGroup}>
                <div className={styles.leaguesHeader}>
                  <label>🏆 Ligi ({selectedLeagues.length}/{leagues.length})</label>
                  <button className={styles.btnSmall} onClick={toggleAllLeagues}>
                    {selectedLeagues.length === leagues.length ? '☐ Odznacz wszystkie' : '☑️ Zaznacz wszystkie'}
                  </button>
                </div>
                <div className={styles.leaguesList}>
                  {leagues.map(league => (
                    <label key={league.id} className={styles.leagueItem}>
                      <input
                        type="checkbox"
                        checked={selectedLeagues.includes(league.id)}
                        onChange={() => toggleLeague(league.id)}
                      />
                      <span className={styles.leagueName}>{league.name}</span>
                      <span className={styles.leagueCountry}>({league.country})</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <div className={styles.modalFooter}>
              <button className={styles.btnSecondary} onClick={() => setShowModal(false)}>
                Anuluj
              </button>
              <button className={styles.btnPrimary} onClick={createJob}>
                ✅ Utwórz Zadanie
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Calendar Modal */}
      {showCalendar && (
        <div className={styles.modal} onClick={() => setShowCalendar(false)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2>📅 Kalendarz Importów</h2>
              <button className={styles.closeBtn} onClick={() => setShowCalendar(false)}>×</button>
            </div>

            <div className={styles.modalBody}>
              <div className={styles.calendarLegend}>
                <div className={styles.legendItem}>
                  <div className={`${styles.legendColor} ${styles.legendEmpty}`}></div>
                  <span>Brak danych</span>
                </div>
                <div className={styles.legendItem}>
                  <div className={`${styles.legendColor} ${styles.legendImported}`}></div>
                  <span>Zimportowane mecze</span>
                </div>
                <div className={styles.legendItem}>
                  <div className={`${styles.legendColor} ${styles.legendUpdated}`}></div>
                  <span>Zaktualizowane wyniki</span>
                </div>
              </div>

              <div className={styles.calendar}>
                {renderCalendar()}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default ImportPage

