// SPDX-License-Identifier: 0BSD
import type { Appearance } from '@monolith/blocks'

import { BG_THEME } from '../PersonalizationProvider/constants/bg_theme'

/** Adapted from https://max-jafarov.xyz/ru/ui-kit. No remote styles required. */
export function appearanceThemeVariables(
  preset: Appearance['themePreset'],
  mode: 'light' | 'dark'
): Record<string, string> {
  if (!preset) return {}
  const expressive = preset === 'max-jafarov'
  const dark = mode === 'dark'
  const canvas = expressive
    ? dark
      ? '#0a0a0f'
      : '#f1f2f5'
    : dark
      ? '#191919'
      : '#ffffff'
  const surface = expressive
    ? dark
      ? '#0f1015'
      : '#fafafa'
    : dark
      ? '#202020'
      : '#ffffff'
  const lifted = expressive
    ? dark
      ? '#14151b'
      : '#e7e9ed'
    : dark
      ? '#2c2c2c'
      : '#f1f1ef'
  const text = expressive
    ? dark
      ? '#d4d4d8'
      : '#18181b'
    : dark
      ? '#eeeeec'
      : '#252525'
  // The kit's dim dark swatch is decorative. Use its readable Material role
  // for supporting text throughout the workspace.
  const muted = expressive
    ? dark
      ? '#a5a5ad'
      : '#5f606a'
    : dark
      ? '#a6a6a2'
      : '#73736f'
  const accent = expressive ? '#3b8a82' : text
  const selection = expressive ? '#c94a3c' : '#2383e2'
  const container = `color-mix(in srgb, ${accent} ${expressive ? 22 : 8}%, ${surface})`
  const onContainer = expressive ? (dark ? '#acd9d2' : '#235c55') : text
  const variables: Record<string, string> = {
    color: text,
    backgroundColor: canvas,
    colorScheme: mode,
    fontFamily: 'var(--font-inter)',
    '--bg-primary': canvas,
    '--bg-surface': surface,
    '--bg-lifted': lifted,
    '--bg-sidebar': expressive ? surface : dark ? '#202020' : '#f7f7f5',
    '--text-primary': text,
    '--text-muted': muted,
    '--text-tertiary': muted,
    '--text-dim': expressive
      ? dark
        ? '#3e3e48'
        : '#858691'
      : dark
        ? '#858582'
        : '#91918e',
    '--accent-primary': accent,
    '--accent-teal': accent,
    '--accent-red': '#c94a3c',
    '--accent-amber': '#c9944a',
    '--selection-color': selection,
    '--block-selection': `color-mix(in srgb, ${selection} 18%, transparent)`,
    '--monolith-selection-bg': `color-mix(in srgb, ${selection} 28%, transparent)`,
    '--appearance-selection-background': expressive
      ? selection
      : `color-mix(in srgb, ${selection} 28%, transparent)`,
    '--appearance-selection-text': expressive ? '#ffffff' : 'inherit',
    '--border-subtle': dark ? 'rgb(255 255 255 / 6%)' : 'rgb(0 0 0 / 8%)',
    '--border-medium': dark ? 'rgb(255 255 255 / 10%)' : 'rgb(0 0 0 / 14%)',
    '--md-sys-color-primary': accent,
    '--md-sys-color-primary-container': container,
    '--md-sys-color-on-primary-container': onContainer,
    '--md-sys-color-on-surface': text,
    '--md-sys-color-on-surface-variant': muted,
    '--md-sys-color-surface': canvas,
    '--md-sys-color-surface-container': `color-mix(in srgb, ${text} 5%, ${surface})`,
    '--md-sys-color-surface-container-high': `color-mix(in srgb, ${text} 9%, ${surface})`,
    '--interactive-primary': expressive ? container : text,
    '--interactive-primary-hover': expressive
      ? `color-mix(in srgb, ${text} 9%, ${surface})`
      : dark
        ? '#ffffff'
        : '#404040',
    '--interactive-on-primary': expressive
      ? onContainer
      : dark
        ? '#191919'
        : '#ffffff',
    '--font-inter': "'Inter', sans-serif",
    '--font-family': "'Inter', sans-serif",
    '--font-space-grotesk': expressive
      ? "'Space Grotesk', 'Inter', sans-serif"
      : "'Inter', sans-serif",
    '--appearance-heading-font': expressive
      ? "'Space Grotesk', 'Inter', sans-serif"
      : 'var(--font-inter)',
    '--font-jetbrains-mono': "'JetBrains Mono', monospace",
    '--motion-fast': expressive ? '160ms' : '140ms',
    '--motion-standard': expressive ? '240ms' : '220ms',
    '--motion-expressive': expressive ? '360ms' : '320ms',
    '--motion-normal': expressive ? '240ms' : '220ms',
    '--motion-slow': expressive ? '360ms' : '320ms',
    '--motion-ease': 'cubic-bezier(0.2, 0, 0, 1)',
    '--motion-ease-expressive': 'cubic-bezier(0.2, 0.8, 0.2, 1)',
    '--shape-full': expressive ? '999px' : '9999px',
    '--card-shadow': expressive
      ? 'none'
      : dark
        ? '0 1px 2px #0003'
        : '0 1px 2px #00000008',
    '--floating-shadow': expressive
      ? '0 8px 40px #0003'
      : dark
        ? '0 8px 32px #0005, 0 0 0 1px #ffffff0a'
        : '0 8px 32px #00000014, 0 2px 8px #0000000a',
    '--appearance-focus-outline': expressive
      ? `2px solid ${accent}`
      : `1px solid color-mix(in srgb, ${selection} 35%, transparent)`,
    '--appearance-focus-offset': expressive ? '4px' : '1px',
    '--appearance-control-focus': expressive
      ? `2px solid ${accent}`
      : `2px solid color-mix(in srgb, ${text} 45%, transparent)`,
    '--appearance-input-focus': expressive ? `2px solid ${accent}` : 'none',
    '--appearance-input-focus-color': expressive ? accent : selection,
    '--appearance-input-height': expressive ? '56px' : '3.5rem',
    '--appearance-nav-radius': expressive ? '999px' : '6px',
    '--appearance-nav-height': expressive ? '44px' : '34px',
    '--appearance-nav-selection': expressive
      ? container
      : `color-mix(in srgb, ${text} 7%, transparent)`,
    '--appearance-nav-foreground': expressive ? onContainer : text,
    '--appearance-control-height': expressive ? '44px' : '34px',
    '--appearance-control-border': expressive
      ? 'transparent'
      : 'var(--border-subtle)',
    '--appearance-icon-color': 'currentColor',
    '--affine-brand-color': accent,
    '--affine-primary-color': accent
  }
  const radii = expressive ? [12, 20, 28, 36, 36, 36] : [4, 6, 8, 12, 12, 12]
  ;['sm', 'md', 'lg', 'xl', '2xl', '3xl'].forEach((name, i) => {
    variables[`--shape-${name}`] = `${radii[i]}px`
    variables[`--radius-${name}`] = `${radii[i]}px`
  })
  const palette = expressive
    ? {
        50: '#fafafa',
        100: '#f1f2f5',
        200: '#e7e9ed',
        300: '#d4d4d8',
        400: '#a5a5ad',
        500: '#858691',
        600: '#5f606a',
        700: '#3e3e48',
        800: '#14151b',
        900: '#0f1015',
        950: '#0a0a0f'
      }
    : BG_THEME.zillion
  for (const [level, color] of Object.entries(palette)) {
    variables[`--color-bg-${level}`] = color
    variables[`--color-bg-${level}-ch`] = [1, 3, 5]
      .map(i => parseInt(color.slice(i, i + 2), 16))
      .join(' ')
    variables[`--color-custom-${level}`] =
      `color-mix(in srgb, ${accent} ${Math.min(100, Number(level) / 10)}%, ${surface})`
  }
  variables['--color-custom-500'] = accent
  variables['--color-custom-600'] = accent
  return variables
}
