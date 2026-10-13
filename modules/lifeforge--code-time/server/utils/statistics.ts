import dayjs from 'dayjs'
import { asc } from 'drizzle-orm'
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'

import { type BuiltModuleSchema } from '@lifeforge/drizzle'

import type { CodeTimeSchema } from '../forge'
import { dailyEntries } from '../schema.drizzle'

type CodeTimeDb = PostgresJsDatabase<BuiltModuleSchema<CodeTimeSchema>>

export default async (db: CodeTimeDb) => {
  const everything = await db
    .select()
    .from(dailyEntries)
    .orderBy(asc(dailyEntries.date))

  return calculateStatistics(everything)
}

export function calculateStatistics(
  entries: Pick<typeof dailyEntries.$inferSelect, 'date' | 'total_minutes'>[],
  today = dayjs().format('YYYY-MM-DD')
) {
  const dateMap: Record<string, number> = {}

  for (const item of entries) {
    const date = dayjs(item.date).format('YYYY-MM-DD')
    dateMap[date] = (dateMap[date] ?? 0) + item.total_minutes
  }

  const allDates = Object.keys(dateMap)
    .filter(date => (dateMap[date] ?? 0) > 0)
    .sort()
  const total = entries.reduce((sum, item) => sum + item.total_minutes, 0)

  let longestStreak = 0
  let streak = 0
  let previous: string | undefined

  for (const date of allDates) {
    streak =
      previous && dayjs(date).diff(dayjs(previous), 'day') === 1
        ? streak + 1
        : 1
    longestStreak = Math.max(longestStreak, streak)
    previous = date
  }

  let currentStreak = 0
  let cursor = dayjs(today)

  if (!allDates.includes(today)) cursor = cursor.subtract(1, 'day')

  while (allDates.includes(cursor.format('YYYY-MM-DD'))) {
    currentStreak += 1
    cursor = cursor.subtract(1, 'day')
  }

  return {
    'Most time spent': Math.max(0, ...Object.values(dateMap)),
    'Total time spent': total,
    'Average time spent': allDates.length > 0 ? total / allDates.length : 0,
    'Longest streak': longestStreak,
    'Current streak': currentStreak,
    'Time spent today': dateMap[today] ?? 0
  }
}
