import { useState } from 'react'
import { useHabits } from '../hooks/useHabits'
import type { Habit } from '../types/habit'
import HabitCard from './HabitCard'
import HabitFormModal from './HabitFormModal'
import styles from './Dashboard.module.css'

export default function Dashboard() {
  const { habits, loading, error, addHabit, updateHabit, deleteHabit } = useHabits()
  const [editingHabit, setEditingHabit] = useState<Habit | null>(null)
  const [isAdding, setIsAdding] = useState(false)

  const handleDelete = (id: string) => {
    if (window.confirm('이 습관을 삭제할까요? 기록도 함께 삭제됩니다.')) {
      deleteHabit(id)
    }
  }

  return (
    <div>
      <header className={styles.header}>
        <h1>습관 트래커</h1>
        <button type="button" className={styles.addButton} onClick={() => setIsAdding(true)}>
          + 습관 추가
        </button>
      </header>

      {loading && <p className={styles.status}>불러오는 중...</p>}
      {error && <p className={styles.status}>오류: {error}</p>}
      {!loading && !error && habits.length === 0 && (
        <p className={styles.status}>아직 등록된 습관이 없어요. "습관 추가"로 시작해보세요.</p>
      )}

      <div className={styles.grid}>
        {habits.map((habit) => (
          <HabitCard
            key={habit.id}
            habit={habit}
            onEdit={() => setEditingHabit(habit)}
            onDelete={() => handleDelete(habit.id)}
          />
        ))}
      </div>

      {isAdding && (
        <HabitFormModal
          onSubmit={async (name, color) => {
            await addHabit(name, color)
            setIsAdding(false)
          }}
          onClose={() => setIsAdding(false)}
        />
      )}

      {editingHabit && (
        <HabitFormModal
          initialHabit={editingHabit}
          onSubmit={async (name, color) => {
            await updateHabit(editingHabit.id, name, color)
            setEditingHabit(null)
          }}
          onClose={() => setEditingHabit(null)}
        />
      )}
    </div>
  )
}
