import dayjs from 'dayjs'
import { and, gte, isNotNull, lte } from 'drizzle-orm'
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'

import { type BuiltModuleSchema } from '@monolith/drizzle'

import * as schema from './schema.drizzle'
import { todoEntries } from './schema.drizzle'

type TodoListDb = PostgresJsDatabase<BuiltModuleSchema<typeof schema>>

export default async function getEvents({
  db,
  start,
  end
}: {
  db: TodoListDb
  start: string
  end: string
}) {
  const entries = await db
    .select()
    .from(todoEntries)
    .where(
      and(
        isNotNull(todoEntries.due_date),
        gte(todoEntries.due_date, dayjs(start).toDate()),
        lte(todoEntries.due_date, dayjs(end).toDate())
      )
    )

  return entries.flatMap(entry => {
    if (!entry.due_date) {
      return []
    }

    return [
      {
        id: entry.id,
        type: 'single' as const,
        title: entry.summary,
        start: entry.due_date.toISOString(),
        end: dayjs(entry.due_date).add(1, 'millisecond').toISOString(),
        category: '_todo',
        calendar: '',
        description: entry.notes,
        location: '',
        location_coords: { lat: 0, lon: 0 },
        reference_link: `/todo-list?entry=${entry.id}`,
        is_strikethrough: entry.done
      }
    ]
  })
}
