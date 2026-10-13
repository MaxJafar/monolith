import dayjs from 'dayjs'

import {
  type Routine,
  type ScheduleItem,
  type Workout,
  scheduledRoutine
} from '../../../shared'

export function historyMonth(
  month: string,
  workouts: Workout[],
  schedule: ScheduleItem[],
  routines: Routine[]
) {
  const first = dayjs(`${month}-01`)
  const start = first.subtract((first.day() + 6) % 7, 'day')
  const days = Array.from({ length: 42 }, (_, index) => {
    const date = start.add(index, 'day').format('YYYY-MM-DD')
    const routineId = scheduledRoutine(schedule, date)
    const override = schedule.find(item => item.date === date)

    return {
      date,
      in_month: date.startsWith(`${month}-`),
      completed: workouts.filter(
        workout => workout.status === 'completed' && workout.date === date
      ),
      routine: routines.find(routine => routine.id === routineId) ?? null,
      override: !!override,
      explicit_rest: !!override && override.routine_id === null
    }
  })

  return {
    days,
    completed: workouts.filter(
      workout =>
        workout.status === 'completed' && workout.date.startsWith(`${month}-`)
    )
  }
}
