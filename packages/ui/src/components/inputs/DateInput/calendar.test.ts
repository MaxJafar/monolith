// SPDX-License-Identifier: 0BSD
import { afterEach, expect, it, vi } from 'vitest'

import {
  clockText,
  dateWithTime,
  dayAllowed,
  dayKey,
  localDate,
  monthAllowed,
  monthDays,
  selectionAllowed,
  shiftDay,
  shiftMonth,
  startingDate
} from './calendar'

afterEach(() => vi.unstubAllEnvs())
it('builds six complete weeks with a Sunday start across leap years', () => {
  const days = monthDays(localDate(2024, 1, 1))
  expect(days).toHaveLength(42)
  expect(days[0].getDay()).toBe(0)
  expect(new Set(days.map(dayKey)).size).toBe(42)
  expect(days.some(day => dayKey(day) === '2024-02-29')).toBe(true)
  expect(dayKey(shiftMonth(localDate(2024, 0, 31), 1))).toBe('2024-02-29')
  expect(dayKey(shiftMonth(localDate(2025, 0, 31), 1))).toBe('2025-02-28')
  expect(dayKey(localDate(42, 1, 3))).toBe('0042-02-03')
})
it('limits months and days inclusively, comparing times only when enabled', () => {
  const min = localDate(2026, 9, 20, 14, 30),
    max = localDate(2026, 10, 2, 17)
  expect(monthAllowed(localDate(2026, 8, 1), min, max)).toBe(false)
  expect(monthAllowed(localDate(2026, 9, 1), min, max)).toBe(true)
  expect(monthAllowed(localDate(2026, 11, 1), min, max)).toBe(false)
  expect(dayAllowed(localDate(2026, 9, 20, 0), min, max)).toBe(true)
  expect(selectionAllowed(localDate(2026, 9, 20, 0), false, min, max)).toBe(
    true
  )
  expect(selectionAllowed(localDate(2026, 9, 20, 14), true, min, max)).toBe(
    false
  )
  expect(selectionAllowed(min, true, min, max)).toBe(true)
  expect(selectionAllowed(max, true, min, max)).toBe(true)
  expect(selectionAllowed(null, false, min, max)).toBe(false)
  expect(selectionAllowed(localDate(2026, 9, 20), false, max, min)).toBe(false)
})
it('keeps the selected wall clock when changing the date and rejects malformed times', () => {
  const date = dateWithTime(localDate(2026, 10, 2), '14:37', true)!
  expect(dayKey(date)).toBe('2026-11-02')
  expect(clockText(date)).toBe('14:37')
  expect(date.getSeconds()).toBe(0)
  expect(clockText(dateWithTime(date, 'bad', false)!)).toBe('00:00')
  for (const time of ['24:00', '12:60', '2:30', '', '12:30:00'])
    expect(dateWithTime(date, time, true)).toBeNull()
})
it('starts inside a bounded range even when today or a stale value is outside it', () => {
  const min = localDate(2026, 9, 20),
    max = localDate(2026, 10, 2)
  expect(startingDate(null, min, max, localDate(2025, 1, 1))).toEqual(min)
  expect(startingDate(localDate(2027, 1, 1), min, max)).toEqual(max)
})
it('detects nonexistent local times at daylight-saving changes and keeps calendar arithmetic local', () => {
  vi.stubEnv('TZ', 'America/New_York')
  const spring = localDate(2026, 2, 8)
  expect(dateWithTime(spring, '02:30', true)).toBeNull()
  expect(clockText(dateWithTime(spring, '03:30', true)!)).toBe('03:30')
  expect(dayKey(shiftDay(localDate(2026, 2, 7), 1))).toBe('2026-03-08')
  expect(dayKey(shiftDay(localDate(2026, 10, 1), 1))).toBe('2026-11-02')
})
