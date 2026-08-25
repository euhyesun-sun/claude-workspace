import { useState, type FormEvent } from 'react'
import type { Habit } from '../types/habit'
import styles from './HabitFormModal.module.css'

interface Props {
  initialHabit?: Habit
  onSubmit: (name: string, color: string) => void | Promise<void>
  onClose: () => void
}

const DEFAULT_COLOR = '#2dd4bf'

export default function HabitFormModal({ initialHabit, onSubmit, onClose }: Props) {
  const [name, setName] = useState(initialHabit?.name ?? '')
  const [color, setColor] = useState(initialHabit?.color ?? DEFAULT_COLOR)
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    setSubmitting(true)
    try {
      await onSubmit(name.trim(), color)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className={styles.overlay} onClick={onClose}>
      <form className={styles.modal} onClick={(e) => e.stopPropagation()} onSubmit={handleSubmit}>
        <h2>{initialHabit ? '습관 수정' : '습관 추가'}</h2>

        <label className={styles.field}>
          이름
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="예: 운동하기"
            autoFocus
          />
        </label>

        <label className={styles.field}>
          색상
          <input type="color" value={color} onChange={(e) => setColor(e.target.value)} />
        </label>

        <div className={styles.buttons}>
          <button type="button" onClick={onClose} disabled={submitting}>
            취소
          </button>
          <button type="submit" className={styles.primary} disabled={submitting || !name.trim()}>
            {submitting ? '저장 중...' : '저장'}
          </button>
        </div>
      </form>
    </div>
  )
}
