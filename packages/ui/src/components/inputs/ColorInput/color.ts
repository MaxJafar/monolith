// SPDX-License-Identifier: 0BSD
export type RGB = { r: number; g: number; b: number }
export type HSV = { h: number; s: number; v: number }
const bound = (value: number, max: number) =>
  Math.max(0, Math.min(max, Number.isFinite(value) ? value : 0))

/** Colors stored by Monolith use opaque six-digit sRGB hex. */
export function parseHex(value: string): string | undefined {
  const digits = value.trim().replace(/^#/, '')
  if (/^[a-f\d]{3}$/i.test(digits))
    return (
      '#' +
      [...digits]
        .map(char => char + char)
        .join('')
        .toUpperCase()
    )
  if (/^[a-f\d]{6}$/i.test(digits)) return '#' + digits.toUpperCase()
}
export function hexToRgb(hex: string): RGB {
  const normalized = parseHex(hex) ?? '#000000'
  const value = Number.parseInt(normalized.slice(1), 16)
  return { r: value >> 16, g: (value >> 8) & 255, b: value & 255 }
}
export function rgbToHex(rgb: RGB): string {
  return (
    '#' +
    [rgb.r, rgb.g, rgb.b]
      .map(value => Math.round(bound(value, 255)).toString(16).padStart(2, '0'))
      .join('')
      .toUpperCase()
  )
}
export function rgbToHsv({ r, g, b }: RGB): HSV {
  const red = bound(r, 255) / 255,
    green = bound(g, 255) / 255,
    blue = bound(b, 255) / 255
  const high = Math.max(red, green, blue),
    low = Math.min(red, green, blue),
    range = high - low
  let hue = 0
  if (range) {
    hue =
      high === red
        ? (green - blue) / range
        : high === green
          ? 2 + (blue - red) / range
          : 4 + (red - green) / range
    hue = (hue * 60 + 360) % 360
  }
  return { h: hue, s: high ? (range / high) * 100 : 0, v: high * 100 }
}
export function hsvToHex(hsv: HSV): string {
  const hue = (((Number.isFinite(hsv.h) ? hsv.h : 0) % 360) + 360) % 360
  const saturation = bound(hsv.s, 100) / 100,
    value = bound(hsv.v, 100) / 100
  const chroma = saturation * value
  const secondary = chroma * (1 - Math.abs(((hue / 60) % 2) - 1))
  const sectors = [
    [chroma, secondary, 0],
    [secondary, chroma, 0],
    [0, chroma, secondary],
    [0, secondary, chroma],
    [secondary, 0, chroma],
    [chroma, 0, secondary]
  ]
  const [r, g, b] = sectors[Math.floor(hue / 60)]
  const offset = value - chroma
  return rgbToHex({
    r: (r + offset) * 255,
    g: (g + offset) * 255,
    b: (b + offset) * 255
  })
}

// Generated hues and neutral shades replace the inherited curated palette datasets.
export const colorSwatches = [
  ...[12, 29, 48, 106, 157, 198, 226, 260, 292, 329].map(h =>
    hsvToHex({ h, s: 54, v: 84 })
  ),
  ...[12, 29, 48, 106, 157, 198, 226, 260, 292, 329].map(h =>
    hsvToHex({ h, s: 26, v: 96 })
  ),
  ...Array.from({ length: 10 }, (_, index) =>
    hsvToHex({ h: 0, s: 0, v: (index * 100) / 9 })
  )
]
