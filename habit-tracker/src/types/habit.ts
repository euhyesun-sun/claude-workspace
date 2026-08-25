export interface Habit {
  id: string
  name: string
  color: string
  created_at: string
}

export interface HabitLog {
  id: string
  habit_id: string
  log_date: string
  created_at: string
}
