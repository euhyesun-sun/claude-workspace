import { differenceInCalendarDays, format, parseISO, subDays } from 'date-fns'

export type CompletedDateSet = Set<string>

/**
 * 오늘이 아직 체크되지 않았어도 스트릭을 0으로 리셋하지 않는다 —
 * 오늘이 완료면 오늘부터, 아니면 어제부터 거꾸로 센다.
 */
export function currentStreak(completed: CompletedDateSet, today: Date = new Date()): number {
  const todayStr = format(today, 'yyyy-MM-dd')
  let cursor = completed.has(todayStr) ? today : subDays(today, 1)
  let streak = 0
  while (completed.has(format(cursor, 'yyyy-MM-dd'))) {
    streak++
    cursor = subDays(cursor, 1)
  }
  return streak
}

export function longestStreak(completed: CompletedDateSet): number {
  if (completed.size === 0) return 0
  const sorted = Array.from(completed).sort()
  let longest = 1
  let run = 1
  for (let i = 1; i < sorted.length; i++) {
    const gap = differenceInCalendarDays(parseISO(sorted[i]), parseISO(sorted[i - 1]))
    run = gap === 1 ? run + 1 : 1
    longest = Math.max(longest, run)
  }
  return longest
}

export function completionRate(
  completed: CompletedDateSet,
  createdAt: string,
  today: Date = new Date(),
): number {
  const start = parseISO(createdAt)
  const totalDays = differenceInCalendarDays(today, start) + 1
  if (totalDays <= 0) return 0
  return completed.size / totalDays
}
