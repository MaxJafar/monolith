// SPDX-License-Identifier: 0BSD
/** Always include both ends; reserve at most five consecutive pages around the selection. */
export function visiblePages(page: number, total: number): (number | 'gap')[] {
  const count = Number.isFinite(total) ? Math.max(0, Math.floor(total)) : 0
  if (!count) return []
  const current = Number.isFinite(page)
    ? Math.max(1, Math.min(count, Math.floor(page)))
    : 1
  const start = Math.max(1, Math.min(current - 2, count - 4))
  const selected = new Set([1, count])
  for (let n = start; n <= Math.min(count, start + 4); n++) selected.add(n)
  const result: (number | 'gap')[] = []
  let previous = 0
  for (const value of [...selected].sort((a, b) => a - b)) {
    if (previous && value - previous > 1) result.push('gap')
    result.push(value)
    previous = value
  }
  return result
}
