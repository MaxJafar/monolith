// SPDX-License-Identifier: 0BSD
import { formatHex, parse } from 'culori'
import tinycolor from 'tinycolor2'

import { BG_THEME } from './constants/bg_theme'
import accents from './constants/theme_color_hex'
import type {
  IPersonalizationData,
  Preferences
} from './interfaces/personalization_provider_interfaces'
import { getColorPalette } from './utils/themeColors'

export const defaults: Preferences = {
  theme: 'light',
  rawThemeColor: '#252525',
  bgTemp: 'bg-zillion',
  fontFamily: 'Inter',
  fontScale: 1,
  borderRadiusMultiplier: 1,
  bordered: false,
  bgImage: '',
  language: 'en',
  dashboardLayout: {},
  backdropFilters: {
    blur: 'none',
    brightness: 100,
    contrast: 100,
    saturation: 100,
    overlayOpacity: 50
  }
}
export const accentNames = Object.fromEntries(
  Object.entries(accents).map(([key, color]) => [
    'theme-' + key.replace(/[A-Z]/g, letter => '-' + letter.toLowerCase()),
    color
  ])
)
export function hexColor(value: string): string | undefined {
  if (!value.startsWith('#')) return
  const parsed = parse(value)
  return parsed ? formatHex(parsed) : undefined
}
export function resolvePalette(choice: string) {
  const custom = hexColor(choice)
  return custom
    ? getColorPalette(custom, 'bg')
    : (BG_THEME[choice.replace(/^bg-/, '') as keyof typeof BG_THEME] ??
        BG_THEME.zillion)
}
export function resolveAccent(choice: string) {
  return hexColor(choice) ?? accentNames[choice] ?? defaults.rawThemeColor
}
export function derivePreferences(settings: Preferences, systemDark: boolean) {
  const derivedTheme =
    settings.theme === 'system'
      ? systemDark
        ? 'dark'
        : 'light'
      : settings.theme
  const bgTempPalette = resolvePalette(settings.bgTemp)
  const derivedThemeColor = resolveAccent(settings.rawThemeColor)
  return {
    derivedTheme,
    derivedThemeColor,
    bgTempPalette,
    getMostReadableColor(background = derivedThemeColor) {
      return tinycolor
        .mostReadable(background, [bgTempPalette[100], bgTempPalette[800]])
        .toHexString()
    }
  }
}
export function initialPreferences(overrides: Partial<IPersonalizationData>) {
  const initial = {
    ...defaults,
    backdropFilters: { ...defaults.backdropFilters },
    dashboardLayout: {}
  } as Preferences
  for (const key of Object.keys(defaults) as (keyof Preferences)[]) {
    const value = overrides[key]
    if (value !== undefined) Object.assign(initial, { [key]: value })
  }
  if (overrides.theme === undefined) {
    try {
      const stored = localStorage.getItem('monolith.theme')
      if (stored === 'dark' || stored === 'light' || stored === 'system')
        initial.theme = stored
    } catch {
      /* A blocked storage area must not prevent rendering. */
    }
  }
  return initial
}
