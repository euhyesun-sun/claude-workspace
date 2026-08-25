import { addDays, format, startOfWeek } from 'date-fns'

export interface DayCell {
  date: string
  weekIndex: number
  dayOfWeek: number
}

const WEEKS = 53

export function buildYearGrid(endDate: Date = new Date()): DayCell[] {
  const currentWeekStart = startOfWeek(endDate, { weekStartsOn: 0 })
  const gridStart = addDays(currentWeekStart, -(WEEKS - 1) * 7)

  const cells: DayCell[] = []
  for (let weekIndex = 0; weekIndex < WEEKS; weekIndex++) {
    for (let dayOfWeek = 0; dayOfWeek < 7; dayOfWeek++) {
      const date = addDays(gridStart, weekIndex * 7 + dayOfWeek)
      if (date > endDate) continue
      cells.push({ date: format(date, 'yyyy-MM-dd'), weekIndex, dayOfWeek })
    }
  }
  return cells
}
