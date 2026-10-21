// SPDX-License-Identifier: 0BSD
// @vitest-environment jsdom
import { act, useState } from 'react'
import { type Root, createRoot } from 'react-dom/client'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'

import { localDate } from '../calendar'
import { DateGrid } from './DateGrid'

let container: HTMLDivElement, root: Root
const select = vi.fn()
function Example() {
  const [month, setMonth] = useState(localDate(2026, 9, 1))
  return (
    <DateGrid
      month={month}
      selected={localDate(2026, 9, 31)}
      min={localDate(2026, 9, 20)}
      max={localDate(2026, 10, 5)}
      locale="en"
      onSelect={select}
      onMonth={setMonth}
    />
  )
}
beforeEach(() => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  container = document.createElement('div')
  document.body.append(container)
  root = createRoot(container)
  select.mockReset()
})
afterEach(async () => {
  await act(async () => root.unmount())
  container.remove()
  vi.unstubAllGlobals()
})
it('exposes selectable dates, a single tab stop and disabled range boundaries', async () => {
  await act(async () => root.render(<Example />))
  expect(container.querySelectorAll('button[tabindex="0"]')).toHaveLength(1)
  expect(
    (container.querySelector('[data-date="2026-10-19"]') as HTMLButtonElement)
      .disabled
  ).toBe(true)
  const chosen = container.querySelector(
    '[data-date="2026-10-31"]'
  ) as HTMLButtonElement
  expect(
    chosen.closest('[role="gridcell"]')?.getAttribute('aria-selected')
  ).toBe('true')
  await act(async () => chosen.click())
  expect(select).toHaveBeenCalledWith(localDate(2026, 9, 31))
})
it('moves keyboard focus across month boundaries and cannot cross the maximum', async () => {
  await act(async () => root.render(<Example />))
  const chosen = container.querySelector(
    '[data-date="2026-10-31"]'
  ) as HTMLButtonElement
  await act(async () => {
    chosen.focus()
    chosen.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true })
    )
  })
  expect(document.activeElement?.getAttribute('data-date')).toBe('2026-11-01')
  expect(
    container.querySelector('[role="grid"]')?.getAttribute('aria-label')
  ).toBe('November 2026')
  const end = container.querySelector(
    '[data-date="2026-11-05"]'
  ) as HTMLButtonElement
  await act(async () => {
    end.focus()
    end.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true })
    )
  })
  expect(document.activeElement).toBe(end)
  expect(select).not.toHaveBeenCalled()
})
