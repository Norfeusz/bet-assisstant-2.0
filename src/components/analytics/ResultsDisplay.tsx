import type { AnalyticsResult } from '../../types/analytics'
import styles from './ResultsDisplay.module.css'

interface ResultsDisplayProps {
  result: AnalyticsResult
  filteredCount: number
  totalCount: number
}

function ResultsDisplay({ result, filteredCount, totalCount }: ResultsDisplayProps) {
  const getSuccessColor = (percentage: number): string => {
    if (percentage >= 70) return '#4caf50'
    if (percentage >= 60) return '#ff9800'
    if (percentage >= 50) return '#ffc107'
    return '#f44336'
  }

  const successColor = getSuccessColor(result.percentage)

  return (
    <div className={styles.container}>
      <div className={styles.mainResult}>
        <div className={styles.percentageBox} style={{ borderColor: successColor }}>
          <div className={styles.percentage} style={{ color: successColor }}>
            {result.percentage.toFixed(1)}%
          </div>
          <div className={styles.ratio}>
            {result.wonCount} / {result.totalCount}
          </div>
          <div className={styles.label}>Trafność</div>
        </div>

        <div className={styles.stats}>
          <div className={styles.statItem}>
            <div className={styles.statValue}>{result.wonCount}</div>
            <div className={styles.statLabel}>✅ Trafione</div>
          </div>
          
          <div className={styles.statItem}>
            <div className={styles.statValue}>{result.totalCount - result.wonCount}</div>
            <div className={styles.statLabel}>❌ Nietrafione</div>
          </div>
          
          <div className={styles.statItem}>
            <div className={styles.statValue}>{result.totalCount}</div>
            <div className={styles.statLabel}>📊 Weryfikowane</div>
          </div>
        </div>
      </div>

      <div className={styles.info}>
        <div className={styles.infoItem}>
          <span className={styles.infoLabel}>Spełnia filtry:</span>
          <span className={styles.infoValue}>{filteredCount} zakładów</span>
        </div>
        <div className={styles.infoItem}>
          <span className={styles.infoLabel}>Łącznie w arkuszu:</span>
          <span className={styles.infoValue}>{totalCount} zakładów</span>
        </div>
      </div>
    </div>
  )
}

export default ResultsDisplay
