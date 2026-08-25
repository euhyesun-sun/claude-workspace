import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

export function useHabitLogs(habitId: string) {
  const [completedDates, setCompletedDates] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)

  const fetchLogs = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('habit_logs')
      .select('log_date')
      .eq('habit_id', habitId)
    if (!error && data) {
      setCompletedDates(new Set(data.map((row) => row.log_date as string)))
    }
    setLoading(false)
  }, [habitId])

  useEffect(() => {
    fetchLogs()
  }, [fetchLogs])

  const toggleDate = useCallback(
    async (date: string) => {
      const wasCompleted = completedDates.has(date)

      setCompletedDates((prev) => {
        const next = new Set(prev)
        if (wasCompleted) next.delete(date)
        else next.add(date)
        return next
      })

      const { error } = wasCompleted
        ? await supabase.from('habit_logs').delete().eq('habit_id', habitId).eq('log_date', date)
        : await supabase.from('habit_logs').insert({ habit_id: habitId, log_date: date })

      if (error) {
        // 실패 시 낙관적 업데이트 되돌리기
        setCompletedDates((prev) => {
          const next = new Set(prev)
          if (wasCompleted) next.add(date)
          else next.delete(date)
          return next
        })
      }
    },
    [habitId, completedDates],
  )

  return { completedDates, toggleDate, loading }
}
