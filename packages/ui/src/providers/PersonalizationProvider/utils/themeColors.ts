// SPDX-License-Identifier: 0BSD
import { clampRgb, converter, formatHex } from 'culori'

const levels = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950]
const perceptual = converter('oklch')
const rgb = converter('rgb')
type PaletteKind = 'bg' | 'theme'

/** A continuous, perceptually ordered ramp anchored on the chosen accent. */
export function getColorPalette(
  color: string,
  kind: PaletteKind
): Record<number, string> {
  const seed = perceptual(color) ?? {
    mode: 'oklch' as const,
    l: 0.55,
    c: 0.12,
    h: 250
  }
  return Object.fromEntries(
    levels.map(level => {
      const position = (level - 50) / 900
      const left = level <= 500
      const distance = Math.abs(level - 500) / 450
      const lightness =
        kind === 'bg'
          ? 0.985 - 0.84 * position
          : seed.l + ((left ? 0.985 : 0.14) - seed.l) * distance
      const chroma =
        kind === 'bg'
          ? Math.min(seed.c, 0.03) * Math.sin(Math.PI * position)
          : seed.c * (1 - 0.85 * distance)
      const value =
        kind === 'theme' && level === 500
          ? formatHex(clampRgb(rgb(seed)))
          : formatHex(
              clampRgb({
                mode: 'oklch',
                l: lightness,
                c: chroma,
                h: seed.h ?? 0
              })
            )
      return [level, value]
    })
  )
}

function prefix(kind: PaletteKind) {
  return '--color-' + (kind === 'bg' ? 'bg-' : 'custom-')
}
export function interpolateColors(
  element: HTMLElement,
  color: string,
  kind: PaletteKind
) {
  for (const [level, hex] of Object.entries(getColorPalette(color, kind))) {
    const channels = [1, 3, 5]
      .map(offset => parseInt(hex.slice(offset, offset + 2), 16))
      .join(' ')
    const property = prefix(kind) + level
    element.style.setProperty(property, 'rgb(' + channels + ')')
    element.style.setProperty(property + '-ch', channels)
  }
}
export function clearCustomColorProperties(
  element: HTMLElement,
  kind: PaletteKind
) {
  for (const level of levels) {
    const property = prefix(kind) + level
    element.style.removeProperty(property)
    element.style.removeProperty(property + '-ch')
  }
}
