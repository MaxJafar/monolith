// SPDX-License-Identifier: 0BSD
import { COLORS, type TokenizedColor } from './constants/colors'

export type OpacityValue = `${5 | 10 | 20 | 30 | 40 | 50 | 60 | 70 | 80 | 90}%`
const identity = Symbol.for('app.monolith.color.opacity.v1')
const percentages = new Set([5, 10, 20, 30, 40, 50, 60, 70, 80, 90])

/** Stable branding lets host and federated addons exchange color values. */
export class ColorWithOpacity {
  readonly [identity] = true
  constructor(
    readonly token: TokenizedColor,
    readonly opacity: OpacityValue
  ) {
    if (
      !Object.hasOwn(COLORS, token) ||
      !percentages.has(Number(opacity.slice(0, -1))) ||
      !opacity.endsWith('%')
    ) {
      throw new TypeError('Unknown color token or opacity')
    }
    Object.freeze(this)
  }
  toString() {
    return [
      'color-mix(in srgb, ',
      COLORS[this.token],
      ' ',
      this.opacity,
      ', transparent)'
    ].join('')
  }
}
export const colorWithOpacity = (
  token: TokenizedColor,
  opacity: OpacityValue
) => new ColorWithOpacity(token, opacity)
export function isColorWithOpacity(value: unknown): value is ColorWithOpacity {
  if (!value || typeof value !== 'object') return false
  const candidate = value as Partial<ColorWithOpacity>
  return (
    candidate[identity] === true &&
    typeof candidate.token === 'string' &&
    Object.hasOwn(COLORS, candidate.token) &&
    typeof candidate.opacity === 'string' &&
    candidate.opacity.endsWith('%') &&
    percentages.has(Number(candidate.opacity.slice(0, -1)))
  )
}
