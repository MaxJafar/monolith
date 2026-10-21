// SPDX-License-Identifier: 0BSD
function positiveInteger(value: number): string {
  if (!Number.isSafeInteger(value) || value < 1)
    throw new RangeError('Grid counts must be positive integers')
  return value.toString(10)
}

export const normalizeGridTrack = (value: number | string): string =>
  typeof value === 'string'
    ? value
    : ['repeat(', positiveInteger(value), ', minmax(0, 1fr))'].join('')

export const normalizeGridSpan = (value: number | string): string =>
  typeof value === 'string' ? value : 'span ' + positiveInteger(value)
