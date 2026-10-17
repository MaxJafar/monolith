import { scheduledRoutine } from '../../../shared'
import type { GymSnapshot } from '../../../shared'

type ReminderSnapshot = Pick<
  GymSnapshot,
  'settings' | 'schedule' | 'routines' | 'workouts' | 'active'
>

export type WorkoutReminder = {
  date: string
  time: string
  timezone: string
  routine_id: string
  routine_name: string
}

export function dueWorkoutReminder(
  data: ReminderSnapshot,
  now: Date
): WorkoutReminder | null {
  if (!data.settings.reminder_enabled || data.active) return null

  try {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: data.settings.timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23'
    }).formatToParts(now)
    const part = (name: string) =>
      parts.find(part => part.type === name)?.value ?? ''
    const date = `${part('year')}-${part('month')}-${part('day')}`
    const time = `${part('hour')}:${part('minute')}`

    if (
      time < data.settings.reminder_time ||
      data.workouts.some(
        workout => workout.status === 'completed' && workout.date === date
      )
    )
      return null

    const routineId = scheduledRoutine(data.schedule, date)
    const routine = data.routines.find(
      routine => routine.id === routineId && !routine.archived
    )

    return routine
      ? {
          date,
          time: data.settings.reminder_time,
          timezone: data.settings.timezone,
          routine_id: routine.id,
          routine_name: routine.name
        }
      : null
  } catch {
    return null
  }
}

export function reminderSlotKey(
  ownerId: string,
  reminder: WorkoutReminder
): string {
  return `zillion-gym:reminder:v1:${ownerId}:${reminder.date}:${reminder.time}:${reminder.timezone}`
}
