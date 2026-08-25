import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import type { Habit } from '../types/habit'

export function useHabits() {
  const [habits, setHabits] = useState<Habit[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchHabits = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('habits')
      .select('*')
      .order('created_at', { ascending: true })
    if (error) {
      setError(error.message)
    } else {
      setHabits(data ?? [])
      setError(null)
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchHabits()
  }, [fetchHabits])

  const addHabit = useCallback(async (name: string, color: string) => {
    const { data, error } = await supabase
      .from('habits')
      .insert({ name, color })
      .select()
      .single()
    if (error) throw error
    setHabits((prev) => [...prev, data as Habit])
  }, [])

  const updateHabit = useCallback(async (id: string, name: string, color: string) => {
    const { data, error } = await supabase
      .from('habits')
      .update({ name, color })
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    setHabits((prev) => prev.map((h) => (h.id === id ? (data as Habit) : h)))
  }, [])

  const deleteHabit = useCallback(async (id: string) => {
    const { error } = await supabase.from('habits').delete().eq('id', id)
    if (error) throw error
    setHabits((prev) => prev.filter((h) => h.id !== id))
  }, [])

  return { habits, loading, error, addHabit, updateHabit, deleteHabit }
}
