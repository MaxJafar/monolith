// SPDX-License-Identifier: 0BSD
import { converter } from 'culori'
import { expect, it } from 'vitest'

import {
  clearCustomColorProperties,
  getColorPalette,
  interpolateColors
} from './themeColors'

const shades = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950]
it.each(['#000000', '#ffffff', '#e74570', '#1689ef', '#808080', 'invalid'])(
  'creates finite monotonic background shades for %s',
  color => {
    const palette = getColorPalette(color, 'bg')
    expect(Object.keys(palette).map(Number)).toEqual(shades)
    const toOklch = converter('oklch')
    let prior = 2
    for (const shade of shades) {
      expect(palette[shade]).toMatch(/^#[a-f0-9]{6}$/i)
      const lightness = toOklch(palette[shade])!.l
      expect(lightness).toBeLessThanOrEqual(prior)
      prior = lightness
    }
  }
)
it.each(['#10b981', '#3b82f6', '#ec4899'])(
  'keeps the exact chosen accent %s',
  color => {
    expect(getColorPalette(color, 'theme')[500]).toBe(color)
  }
)
it('updates and clears only the requested CSS palette', () => {
  const properties = new Map<string, string>([['--unrelated', 'keep']])
  const element = {
    style: {
      setProperty: (key: string, value: string) => properties.set(key, value),
      removeProperty: (key: string) => properties.delete(key)
    }
  } as unknown as HTMLElement
  interpolateColors(element, '#1689ef', 'bg')
  interpolateColors(element, '#e74570', 'theme')
  for (const shade of shades) {
    expect(properties.get('--color-bg-' + shade)).toMatch(
      /^rgb\(\d+ \d+ \d+\)$/
    )
    expect(properties.get('--color-custom-' + shade + '-ch')).toMatch(
      /^\d+ \d+ \d+$/
    )
  }
  clearCustomColorProperties(element, 'bg')
  expect(
    [...properties.keys()].filter(key => key.startsWith('--color-bg-'))
  ).toEqual([])
  expect(properties.get('--color-custom-500')).toBeDefined()
  clearCustomColorProperties(element, 'theme')
  expect([...properties]).toEqual([['--unrelated', 'keep']])
})
