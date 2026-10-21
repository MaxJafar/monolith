// SPDX-License-Identifier: 0BSD
import { BG_THEME } from './constants/bg_theme'
import type { Preferences } from './interfaces/personalization_provider_interfaces'
import { accentNames, derivePreferences, hexColor } from './preferences'
import { getColorPalette } from './utils/themeColors'

/** Each mount owns only its changed properties, so isolated previews can unmount cleanly. */
export function applyTheme(
  root: HTMLElement,
  settings: Preferences,
  systemDark: boolean
) {
  const { derivedTheme, derivedThemeColor } = derivePreferences(
    settings,
    systemDark
  )
  const undo: (() => void)[] = []
  function property(element: HTMLElement, key: string, value: string) {
    const prior = element.style.getPropertyValue(key)
    const priority = element.style.getPropertyPriority(key)
    element.style.setProperty(key, value)
    const installed = element.style.getPropertyValue(key)
    undo.push(() => {
      if (element.style.getPropertyValue(key) !== installed) return
      if (prior) element.style.setProperty(key, prior, priority)
      else element.style.removeProperty(key)
    })
  }
  function flag(element: HTMLElement, name: string, enabled: boolean) {
    const prior = element.classList.contains(name)
    element.classList.toggle(name, enabled)
    undo.push(() => {
      if (element.classList.contains(name) === enabled)
        element.classList.toggle(name, prior)
    })
  }
  const dark = derivedTheme === 'dark'
  const global = root === document.body || root === document.documentElement
  for (const element of new Set(
    global ? [root, document.documentElement] : [root]
  )) {
    flag(element, 'dark', dark)
    property(element, 'color-scheme', derivedTheme)
    property(element, 'background-color', dark ? '#191919' : '#ffffff')
  }
  flag(root, 'bordered', settings.bordered)
  const backgroundClass = 'bg-' + settings.bgTemp.replace(/^bg-/, '')
  for (const name of Object.keys(BG_THEME))
    flag(root, 'bg-' + name, backgroundClass === 'bg-' + name)
  for (const name of Object.keys(accentNames))
    flag(root, name, settings.rawThemeColor === name)
  flag(root, 'bg-custom', !!hexColor(settings.bgTemp))
  flag(root, 'theme-custom', !!hexColor(settings.rawThemeColor))
  const accent =
    hexColor(settings.rawThemeColor) ??
    (accentNames[settings.rawThemeColor] ? undefined : derivedThemeColor)
  for (const [kind, color] of [
    ['bg', hexColor(settings.bgTemp)],
    ['theme', accent]
  ] as const) {
    const prefix = kind === 'bg' ? '--color-bg-' : '--color-custom-'
    const palette = color ? getColorPalette(color, kind) : undefined
    for (const level of Object.keys(BG_THEME.zillion)) {
      const value = palette?.[Number(level)] ?? ''
      property(root, prefix + level, value)
      property(
        root,
        prefix + level + '-ch',
        value
          ? [1, 3, 5].map(i => parseInt(value.slice(i, i + 2), 16)).join(' ')
          : ''
      )
    }
  }
  const selection = ['#252525', '#eeeeec'].includes(
    derivedThemeColor.toLowerCase()
  )
    ? '#2383e2'
    : derivedThemeColor
  property(root, '--selection-color', selection)
  property(
    root,
    '--block-selection',
    `color-mix(in srgb, ${selection} 18%, transparent)`
  )
  property(
    root,
    '--monolith-selection-bg',
    `color-mix(in srgb, ${selection} 28%, transparent)`
  )
  const scaleRoot = global ? document.documentElement : root
  property(
    scaleRoot,
    '--custom-font-scale',
    String(
      Number.isFinite(settings.fontScale) && settings.fontScale > 0
        ? settings.fontScale
        : 1
    )
  )
  property(
    scaleRoot,
    '--custom-border-radius-multiplier',
    String(
      Number.isFinite(settings.borderRadiusMultiplier) &&
        settings.borderRadiusMultiplier >= 0
        ? settings.borderRadiusMultiplier
        : 1
    )
  )
  return () => {
    for (const restore of undo.reverse()) restore()
  }
}
