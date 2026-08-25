import { useMemo } from 'react'
import { parseISO } from 'date-fns'
import { buildYearGrid } from '../utils/dateGrid'
import { cellColor } from '../utils/color'
import styles from './HeatmapCalendar.module.css'

interface Props {
  completedDates: Set<string>
  color: string
  onToggle: (date: string) => void
}

export default function HeatmapCalendar({ completedDates, color, onToggle }: Props) {
  const cells = useMemo(() => buildYearGrid(), [])
  const weekCount = useMemo(() => Math.max(...cells.map((c) => c.weekIndex)) + 1, [cells])

  const monthLabels = useMemo(() => {
    const firstDateByWeek = new Map<number, string>()
    for (const cell of cells) {
      if (!firstDateByWeek.has(cell.weekIndex)) firstDateByWeek.set(cell.weekIndex, cell.date)
    }
    const labels: { weekIndex: number; label: string }[] = []
    let lastMonth = -1
    for (const [weekIndex, date] of firstDateByWeek) {
      const month = parseISO(date).getMonth()
      if (month !== lastMonth) {
        labels.push({ weekIndex, label: `${month + 1}월` })
        lastMonth = month
      }
    }
    return labels
  }, [cells])

  return (
    <div className={styles.scroll}>
      <div className={styles.monthRow} style={{ gridTemplateColumns: `repeat(${weekCount}, 11px)` }}>
        {monthLabels.map((m) => (
          <span key={m.weekIndex} className={styles.monthLabel} style={{ gridColumn: m.weekIndex + 1 }}>
            {m.label}
          </span>
        ))}
      </div>
      <div className={styles.grid} style={{ gridTemplateColumns: `repeat(${weekCount}, 11px)` }}>
        {cells.map((cell) => {
          const completed = completedDates.has(cell.date)
          return (
            <button
              key={cell.date}
              type="button"
              className={styles.cell}
              style={{
                gridColumn: cell.weekIndex + 1,
                gridRow: cell.dayOfWeek + 1,
                backgroundColor: cellColor(color, completed),
              }}
              title={cell.date}
              onClick={() => onToggle(cell.date)}
            />
          )
        })}
      </div>
    </div>
  )
}
