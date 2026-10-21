// SPDX-License-Identifier: 0BSD
import { clampRgb, formatHex } from 'culori'

export const paletteLevels = [
  '50',
  '100',
  '200',
  '300',
  '400',
  '500',
  '600',
  '700',
  '800',
  '900',
  '950'
] as const
export type PaletteLevel = (typeof paletteLevels)[number]
export type ColorRamp = Record<PaletteLevel, string>

// Monolith's named palette uses a shared lightness scale and a tapered chroma curve.
const lightness = [
  0.98, 0.95, 0.9, 0.82, 0.7, 0.61, 0.52, 0.43, 0.32, 0.22, 0.14
]
function ramp(hue: number, chroma: number): ColorRamp {
  return Object.fromEntries(
    paletteLevels.map((level, index) => {
      const position = index / (paletteLevels.length - 1)
      const saturation = chroma * (0.12 + 0.88 * Math.sin(Math.PI * position))
      return [
        level,
        formatHex(
          clampRgb({
            mode: 'oklch',
            l: lightness[index],
            c: saturation,
            h: hue
          })
        )
      ]
    })
  ) as ColorRamp
}

const seeds = {
  slate: [250, 0.025],
  gray: [255, 0.012],
  zinc: [285, 0.012],
  neutral: [0, 0],
  stone: [65, 0.016],
  mauve: [325, 0.025],
  olive: [110, 0.025],
  mist: [210, 0.018],
  taupe: [45, 0.023],
  red: [25, 0.17],
  orange: [50, 0.14],
  amber: [78, 0.13],
  yellow: [95, 0.13],
  lime: [125, 0.14],
  green: [145, 0.14],
  emerald: [165, 0.12],
  teal: [185, 0.1],
  cyan: [210, 0.1],
  sky: [235, 0.12],
  blue: [260, 0.15],
  indigo: [280, 0.16],
  violet: [300, 0.16],
  purple: [315, 0.16],
  fuchsia: [335, 0.17],
  pink: [350, 0.15],
  rose: [10, 0.16]
} satisfies Record<string, [number, number]>
export type PaletteName = keyof typeof seeds
export const MONOLITH_PALETTE = Object.fromEntries(
  Object.entries(seeds).map(([name, [hue, chroma]]) => [
    name,
    ramp(hue, chroma)
  ])
) as Record<PaletteName, ColorRamp>
