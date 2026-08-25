import { useMemo } from 'react'
import { useHabitLogs } from '../hooks/useHabitLogs'
import { completionRate, currentStreak, longestStreak } from '../utils/streaks'
import type { Habit } from '../types/habit'
import HeatmapCalendar from './HeatmapCalendar'
import StatsSummary from './StatsSummary'
import styles from './HabitCard.module.css'

interface Props {
  habit: Habit
  onEdit: () => void
  onDelete: () => void
}

export default function HabitCard({ habit, onEdit, onDelete }: Props) {
  const { completedDates, toggleDate } = useHabitLogs(habit.id)

  const stats = useMemo(
    () => ({
      current: currentStreak(completedDates),
      longest: longestStreak(completedDates),
      rate: completionRate(completedDates, habit.created_at),
    }),
    [completedDates, habit.created_at],
  )

  return (
    <div className={styles.card}>
      <div className={styles.cardHeader}>
        <div className={styles.title}>
          <span className={styles.swatch} style={{ backgroundColor: habit.color }} />
          <span className={styles.name}>{habit.name}</span>
        </div>
        <div className={styles.actions}>
          <button type="button" onClick={onEdit}>
            수정
          </button>
          <button type="button" onClick={onDelete}>
            삭제
          </button>
        </div>
      </div>

      <HeatmapCalendar completedDates={completedDates} color={habit.color} onToggle={toggleDate} />

      <StatsSummary currentStreak={stats.current} longestStreak={stats.longest} completionRate={stats.rate} />
    </div>
  )
}
