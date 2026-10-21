// SPDX-License-Identifier: 0BSD
export function rowOffsets(
  count: number,
  estimate: number,
  measured: (row: number) => number | undefined
): number[] {
  const offsets = [0]
  for (let row = 0; row < count; row++) {
    const value = measured(row)
    offsets.push(
      offsets[row] +
        (value !== undefined && Number.isFinite(value) && value > 0
          ? value
          : Math.max(1, estimate))
    )
  }
  return offsets
}
export function visibleRows(
  offsets: readonly number[],
  scroll: number,
  height: number,
  overscan = 2
) {
  const count = offsets.length - 1
  if (!count) return { from: 0, to: 0 }
  function rowAt(position: number) {
    let low = 0,
      high = count
    while (low < high) {
      const middle = Math.floor((low + high) / 2)
      if (offsets[middle + 1] <= position) low = middle + 1
      else high = middle
    }
    return Math.min(count - 1, low)
  }
  return {
    from: Math.max(0, rowAt(Math.max(0, scroll)) - overscan),
    to: Math.min(
      count,
      rowAt(Math.max(0, scroll) + Math.max(0, height)) + overscan + 1
    )
  }
}
