// SPDX-License-Identifier: 0BSD
import type { ColorWithOpacity } from '../color-with-opacity'
import { TAILWIND_PALETTE } from './tailwind-palette'

const levels = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950] as const
function dynamicColors<const Prefix extends string>(prefix: Prefix) {
  return Object.fromEntries(
    levels.map(level => [
      `${prefix}-${level}`,
      `var(--color-${prefix}-${level})`
    ])
  ) as Record<`${Prefix}-${(typeof levels)[number]}`, string>
}
const semanticVariables = {
  canvas: 'bg-primary',
  surface: 'bg-surface',
  lifted: 'bg-lifted',
  'surface-container': 'md-sys-color-surface-container',
  'surface-container-high': 'md-sys-color-surface-container-high',
  'primary-container': 'md-sys-color-primary-container',
  'on-primary-container': 'md-sys-color-on-primary-container',
  'text-primary': 'text-primary',
  dangerous: 'accent-red',
  muted: 'md-sys-color-on-surface-variant',
  primary: 'accent-teal'
} as const
const semanticColors = Object.fromEntries(
  Object.entries(semanticVariables).map(([token, variable]) => [
    token,
    `var(--${variable})`
  ])
) as Record<keyof typeof semanticVariables, string>
type PaletteToken = {
  [
    Family in keyof typeof TAILWIND_PALETTE
  ]: `${Family & string}-${keyof (typeof TAILWIND_PALETTE)[Family] & string}`
}[keyof typeof TAILWIND_PALETTE]
const paletteColors = Object.fromEntries(
  Object.entries(TAILWIND_PALETTE).flatMap(([family, shades]) =>
    Object.entries(shades).map(([shade, color]) => [
      family + '-' + shade,
      color
    ])
  )
) as Record<PaletteToken, string>

export const COLORS = Object.freeze({
  ...dynamicColors('bg'),
  ...dynamicColors('custom'),
  ...semanticColors,
  ...paletteColors,
  inherit: 'inherit',
  transparent: 'transparent',
  black: '#000000',
  white: '#ffffff'
})
export type TokenizedColor = keyof typeof COLORS
export type ColorValue = TokenizedColor | ColorWithOpacity
