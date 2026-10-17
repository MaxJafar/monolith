import dayjs from 'dayjs'
import timezone from 'dayjs/plugin/timezone'
import utc from 'dayjs/plugin/utc'
import { and, eq, gte, lte, or } from 'drizzle-orm'
import { createHash } from 'node:crypto'

import { scheduledRoutine, settingsInputSchema } from '../shared'
import { routines, schedule, settings, workouts } from './schema.drizzle'
import type { GymStore } from './store'

dayjs.extend(utc)
dayjs.extend(timezone)

export default async function getEvents({
  db,
  start,
  end
}: {
  db: GymStore
  start: string
  end: string
}) {
  // Calendar invokes this inside the authenticated owner's forced-RLS transaction.
  const [preference] = await db.select().from(settings).limit(1)

  if (!preference) return []

  const values = settingsInputSchema.parse(preference.values)
  const rangeStart = dayjs(start)
  const rangeEnd = dayjs(end)
  const from = rangeStart
    .tz(values.timezone)
    .subtract(1, 'day')
    .format('YYYY-MM-DD')
  const through = rangeEnd
    .tz(values.timezone)
    .add(1, 'day')
    .format('YYYY-MM-DD')
  const [plans, calendar, history] = await Promise.all([
    db
      .select()
      .from(routines)
      .where(
        and(
          eq(routines.owner_id, preference.owner_id),
          eq(routines.archived, false)
        )
      ),
    db
      .select()
      .from(schedule)
      .where(eq(schedule.owner_id, preference.owner_id)),
    db
      .select()
      .from(workouts)
      .where(
        and(
          eq(workouts.owner_id, preference.owner_id),
          eq(workouts.status, 'completed'),
          or(
            and(gte(workouts.date, from), lte(workouts.date, through)),
            and(
              gte(workouts.finished_at, rangeStart.toDate()),
              lte(workouts.started_at, rangeEnd.toDate())
            )
          )
        )
      )
  ])
  const rows = history.flatMap(workout =>
    workout.finished_at &&
    workout.finished_at.getTime() >= rangeStart.valueOf() &&
    workout.started_at.getTime() <= rangeEnd.valueOf()
      ? [
          {
            id: workout.id,
            title: workout.name,
            description: workout.notes,
            reference_link: `/gym?section=history&workout=${workout.id}`,
            is_strikethrough: true,
            start: workout.started_at.toISOString(),
            end: workout.finished_at.toISOString()
          }
        ]
      : []
  )
  const span = Math.min(368, dayjs(through).diff(dayjs(from), 'day') + 1)

  for (let index = 0; index < span; index++) {
    const date = dayjs(from).add(index, 'day').format('YYYY-MM-DD')
    const id = scheduledRoutine(calendar, date)
    const routine = plans.find(item => item.id === id)

    if (
      !routine ||
      history.some(
        workout => workout.date === date && workout.routine_id === id
      )
    )
      continue

    const hash = createHash('sha256')
      .update(`gym:${preference.owner_id}:${date}:${id}`)
      .digest('hex')
    const begins = dayjs.tz(`${date} ${values.reminder_time}`, values.timezone)
    const finishes = begins.add(45, 'minute')

    if (
      finishes.valueOf() < rangeStart.valueOf() ||
      begins.valueOf() > rangeEnd.valueOf()
    )
      continue
    rows.push({
      id: `${hash.slice(0, 8)}-${hash.slice(8, 12)}-5${hash.slice(13, 16)}-a${hash.slice(17, 20)}-${hash.slice(20, 32)}`,
      title: routine.name,
      description: routine.notes,
      reference_link: `/gym?section=plan&routine=${routine.id}&date=${date}`,
      is_strikethrough: false,
      start: begins.toISOString(),
      end: finishes.toISOString()
    })
  }

  return rows.map(row => ({
    ...row,
    type: 'single' as const,
    category: '_gym',
    calendar: '',
    location: '',
    location_coords: { lat: 0, lon: 0 }
  }))
}
