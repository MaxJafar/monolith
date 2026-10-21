// SPDX-License-Identifier: 0BSD
import type { Day } from './model'

type Interval = { every: number }
type RelativeDay = {
  type: 'exactDate' | 'relativeDay'
  onThe: string
  onTheDay: string
}
export type FreqSpecificParams = {
  hourly: Interval
  daily: Interval
  weekly: Interval & { onDays: Day[] }
  monthly: Interval & RelativeDay & { onDate: number }
  yearly: RelativeDay & { month: number; date: number; onTheDayOfMonth: number }
}
export type RRuleParams = {
  [K in keyof FreqSpecificParams]: {
    freq: K
    data: FreqSpecificParams[K]
    end: { type: 'never' | 'after' | 'on'; after: number; on: Date | null }
  }
}[keyof FreqSpecificParams]
