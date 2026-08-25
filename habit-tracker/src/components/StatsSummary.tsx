import styles from './StatsSummary.module.css'

interface Props {
  currentStreak: number
  longestStreak: number
  completionRate: number
}

export default function StatsSummary({ currentStreak, longestStreak, completionRate }: Props) {
  return (
    <div className={styles.stats}>
      <div className={styles.stat}>
        <span className={styles.value}>{currentStreak}일</span>
        <span className={styles.label}>현재 연속</span>
      </div>
      <div className={styles.stat}>
        <span className={styles.value}>{longestStreak}일</span>
        <span className={styles.label}>최장 기록</span>
      </div>
      <div className={styles.stat}>
        <span className={styles.value}>{Math.round(completionRate * 100)}%</span>
        <span className={styles.label}>전체 완료율</span>
      </div>
    </div>
  )
}
