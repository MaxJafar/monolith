// SPDX-License-Identifier: 0BSD
import { expect, it } from 'vitest'

import { visiblePages } from './pages'

it('keeps first, current and last pages reachable in a bounded list', () => {
  expect(visiblePages(50, 100)).toEqual([
    1,
    'gap',
    48,
    49,
    50,
    51,
    52,
    'gap',
    100
  ])
  for (let page = 1; page <= 100; page++) {
    const visible = visiblePages(page, 100)
    expect(visible).toContain(1)
    expect(visible).toContain(page)
    expect(visible).toContain(100)
    expect(visible.length).toBeLessThanOrEqual(9)
    const numbers = visible.filter(
      (value): value is number => typeof value === 'number'
    )
    expect(new Set(numbers).size).toBe(numbers.length)
  }
})

it('handles empty results and stale page selections', () => {
  expect(visiblePages(1, 0)).toEqual([])
  expect(visiblePages(99, 3)).toEqual([1, 2, 3])
  expect(visiblePages(-4, 1)).toEqual([1])
  expect(visiblePages(Number.NaN, 2)).toEqual([1, 2])
  expect(visiblePages(1, Number.POSITIVE_INFINITY)).toEqual([])
})
