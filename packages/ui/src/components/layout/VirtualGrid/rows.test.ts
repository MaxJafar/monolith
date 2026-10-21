// SPDX-License-Identifier: 0BSD
import { expect, it } from 'vitest'

import { rowOffsets, visibleRows } from './rows'

it('covers every intersecting row when card heights vary and the window moves', () => {
  const offsets = rowOffsets(1000, 320, row =>
    row % 3 === 0 ? 480 : row % 3 === 1 ? 90 : undefined
  )
  for (const scroll of [0, 89, 480, 3000, offsets.at(-1)! - 700]) {
    const { from, to } = visibleRows(offsets, scroll, 700)
    const intersecting = Array.from(
      { length: 1000 },
      (_, index) => index
    ).filter(row => offsets[row + 1] > scroll && offsets[row] <= scroll + 700)
    for (const row of intersecting) expect(row >= from && row < to).toBe(true)
    expect(to - from).toBeLessThan(15)
  }
})
it('handles empty collections and stale scroll positions after filtering', () => {
  expect(visibleRows([0], 500, 300)).toEqual({ from: 0, to: 0 })
  expect(visibleRows([0, 100, 200], 9000, 300)).toEqual({ from: 0, to: 2 })
  expect(rowOffsets(3, 50, () => 0)).toEqual([0, 50, 100, 150])
})
