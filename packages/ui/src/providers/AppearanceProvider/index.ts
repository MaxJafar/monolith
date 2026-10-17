import type { Appearance } from '@monolith/blocks'
import type { CSSProperties } from 'react'
import tinycolor from 'tinycolor2'

export * from './context'

/** Runtime user choices become inherited tokens rather than component overrides. */
export function appearanceVariables(
  appearance: Appearance,
  theme: 'light' | 'dark' = 'light'
): CSSProperties {
  const variables: Record<string, string> = {}

  if (appearance.background) {
    const background = appearance.background
    const foreground = tinycolor
      .mostReadable(background, ['#f5f5f4', '#252525'])
      .toHexString()
    Object.assign(variables, {
      color: foreground,
      '--bg-primary': background,
      '--bg-surface': background,
      '--bg-sidebar': `color-mix(in srgb, ${background} 96%, ${foreground})`,
      '--bg-lifted': `color-mix(in srgb, ${background} 92%, ${foreground})`,
      '--text-primary': foreground,
      '--text-muted': `color-mix(in srgb, ${foreground} 68%, ${background})`,
      '--text-dim': `color-mix(in srgb, ${foreground} 52%, ${background})`,
      '--text-tertiary': 'var(--text-muted)',
      '--border-subtle': `color-mix(in srgb, ${foreground} 12%, transparent)`,
      '--border-medium': `color-mix(in srgb, ${foreground} 22%, transparent)`,
      '--md-sys-color-surface-container': 'var(--bg-lifted)',
      '--md-sys-color-surface-container-high': `color-mix(in srgb, ${background} 88%, ${foreground})`,
      '--md-sys-color-on-surface-variant': 'var(--text-muted)',
      '--md-sys-color-on-primary-container': foreground,
      '--md-sys-color-on-surface': foreground,
      '--md-sys-color-surface': background
    })
    const shades = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950]
    const mix = [0, 3, 6, 14, 36, 50, 62, 75, 86, 94, 100]
    shades.forEach((shade, index) => {
      const weight = mix[theme === 'dark' ? shades.length - 1 - index : index]
      variables[`--color-bg-${shade}`] =
        `color-mix(in srgb, ${foreground} ${weight}%, ${background})`
    })
  }

  if (appearance.accent) {
    Object.assign(variables, {
      '--accent-primary': appearance.accent,
      '--selection-color': appearance.accent,
      '--block-selection': `color-mix(in srgb, ${appearance.accent} 8%, transparent)`,
      '--monolith-selection-bg': `color-mix(in srgb, ${appearance.accent} 28%, transparent)`,
      '--affine-brand-color': appearance.accent,
      '--affine-primary-color': appearance.accent,
      '--accent-teal': appearance.accent,
      '--md-sys-color-primary': appearance.accent,
      '--md-sys-color-primary-container': `color-mix(in srgb, ${appearance.accent} 12%, var(--bg-surface))`,
      '--color-custom-500': appearance.accent,
      '--color-custom-600': appearance.accent
    })
    for (const shade of [50, 100, 200, 300, 400, 700, 800, 900])
      variables[`--color-custom-${shade}`] =
        `color-mix(in srgb, ${appearance.accent} ${Math.min(100, shade / 10)}%, var(--bg-surface))`
  }

  const button = appearance.button ?? appearance.accent

  if (button) {
    Object.assign(variables, {
      '--interactive-primary': button,
      '--interactive-primary-hover': tinycolor(button).isLight()
        ? tinycolor(button).darken(8).toHexString()
        : tinycolor(button).lighten(8).toHexString(),
      '--interactive-on-primary': tinycolor
        .mostReadable(button, ['#ffffff', '#161616'])
        .toHexString()
    })
  }
  if (appearance.icons) variables['--appearance-icon-color'] = appearance.icons

  if (appearance.font) {
    const family = appearance.font.family
    const fallback =
      family === 'Lora' || family === 'serif'
        ? 'serif'
        : family === 'JetBrains Mono' || family === 'monospace'
          ? 'monospace'
          : 'sans-serif'
    variables['--font-inter'] = `"${family}", ${fallback}`
    variables['--font-family'] = variables['--font-inter']
    variables.fontFamily = 'var(--font-inter)'
  }

  if (appearance.radius !== undefined) {
    for (const [name, scale] of [
      ['sm', 0.5],
      ['md', 1],
      ['lg', 1.5],
      ['xl', 2],
      ['2xl', 2],
      ['3xl', 2]
    ] as const) {
      variables[`--shape-${name}`] = `${appearance.radius * scale}px`
      variables[`--radius-${name}`] = `${appearance.radius * scale}px`
    }
  }

  return variables
}
