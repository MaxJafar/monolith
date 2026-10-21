// SPDX-License-Identifier: 0BSD
import { converter } from 'culori'
import { expect, it } from 'vitest'

import { TAILWIND_PALETTE } from './constants/tailwind-palette'
import { MONOLITH_PALETTE, paletteLevels } from './palette'

it('provides complete, distinct ramps under the existing named-color API', () => {
  expect(TAILWIND_PALETTE).toBe(MONOLITH_PALETTE)
  expect(Object.keys(MONOLITH_PALETTE)).toHaveLength(26)
  for (const shades of Object.values(MONOLITH_PALETTE)) {
    expect(Object.keys(shades)).toEqual([...paletteLevels])
    expect(new Set(Object.values(shades)).size).toBe(paletteLevels.length)
    for (const color of Object.values(shades))
      expect(color).toMatch(/^#[a-f0-9]{6}$/i)
  }
})
it('keeps perceptual lightness descending through every generated ramp', () => {
  const oklch = converter('oklch')
  for (const shades of Object.values(MONOLITH_PALETTE)) {
    const values = Object.values(shades).map(color => oklch(color)!.l)
    values
      .slice(1)
      .forEach((value, index) => expect(value).toBeLessThan(values[index]))
  }
})
