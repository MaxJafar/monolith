// SPDX-License-Identifier: 0BSD
import { type KeyboardEvent, useLayoutEffect, useRef, useState } from 'react'

import {
  dayAllowed,
  dayKey,
  localDate,
  monthDays,
  shiftDay,
  shiftMonth
} from '../calendar'

export function DateGrid({
  month,
  selected,
  min,
  max,
  locale,
  onSelect,
  onMonth
}: {
  month: Date
  selected: Date | null
  min?: Date
  max?: Date
  locale: string
  onSelect: (date: Date) => void
  onMonth: (date: Date) => void
}) {
  const days = monthDays(month)
  const [focused, setFocused] = useState(() => selected ?? month)
  const pendingFocus = useRef<string | null>(null)
  const grid = useRef<HTMLDivElement>(null)
  const focusKey = days.some(
    day => dayKey(day) === dayKey(focused) && dayAllowed(day, min, max)
  )
    ? dayKey(focused)
    : dayKey(
        days.find(
          day =>
            day.getMonth() === month.getMonth() && dayAllowed(day, min, max)
        ) ?? month
      )
  useLayoutEffect(() => {
    if (!pendingFocus.current) return
    grid.current
      ?.querySelector<HTMLButtonElement>(
        '[data-date="' + pendingFocus.current + '"]'
      )
      ?.focus()
    pendingFocus.current = null
  })
  function move(event: KeyboardEvent<HTMLButtonElement>, day: Date) {
    let next: Date | undefined
    if (event.key === 'ArrowRight') next = shiftDay(day, 1)
    if (event.key === 'ArrowLeft') next = shiftDay(day, -1)
    if (event.key === 'ArrowDown') next = shiftDay(day, 7)
    if (event.key === 'ArrowUp') next = shiftDay(day, -7)
    if (event.key === 'Home') next = shiftDay(day, -day.getDay())
    if (event.key === 'End') next = shiftDay(day, 6 - day.getDay())
    if (event.key === 'PageUp')
      next = shiftMonth(day, event.shiftKey ? -12 : -1)
    if (event.key === 'PageDown')
      next = shiftMonth(day, event.shiftKey ? 12 : 1)
    if (!next) return
    event.preventDefault()
    if (!dayAllowed(next, min, max)) return
    setFocused(next)
    pendingFocus.current = dayKey(next)
    if (
      next.getMonth() !== month.getMonth() ||
      next.getFullYear() !== month.getFullYear()
    )
      onMonth(localDate(next.getFullYear(), next.getMonth(), 1))
  }
  const today = dayKey(new Date())
  const fullDate = new Intl.DateTimeFormat(locale, { dateStyle: 'full' })
  const weekday = new Intl.DateTimeFormat(locale, { weekday: 'short' })
  return (
    <div
      ref={grid}
      className="monolith-date-grid"
      role="grid"
      aria-label={new Intl.DateTimeFormat(locale, {
        month: 'long',
        year: 'numeric'
      }).format(month)}
    >
      <div role="row" className="monolith-date-week">
        {Array.from({ length: 7 }, (_, day) => (
          <span role="columnheader" key={day}>
            {weekday.format(localDate(2026, 0, 4 + day))}
          </span>
        ))}
      </div>
      {Array.from({ length: 6 }, (_, week) => (
        <div role="row" className="monolith-date-week" key={week}>
          {days.slice(week * 7, week * 7 + 7).map(day => {
            const key = dayKey(day),
              active = selected && dayKey(selected) === key
            return (
              <div key={key} role="gridcell" aria-selected={!!active}>
                <button
                  type="button"
                  data-date={key}
                  tabIndex={key === focusKey ? 0 : -1}
                  aria-label={fullDate.format(day)}
                  aria-current={key === today ? 'date' : undefined}
                  data-outside={
                    day.getMonth() !== month.getMonth() || undefined
                  }
                  disabled={!dayAllowed(day, min, max)}
                  onKeyDown={event => move(event, day)}
                  onFocus={() => setFocused(day)}
                  onClick={() => {
                    setFocused(day)
                    onSelect(day)
                  }}
                >
                  {day.getDate()}
                </button>
              </div>
            )
          })}
        </div>
      ))}
    </div>
  )
}
