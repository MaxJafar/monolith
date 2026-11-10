import tinycolor from 'tinycolor2'
import { describe, expect, it } from 'vitest'

import { appearanceVariables } from './index'

describe('Appearance token scopes', () => {
  it.each(['light', 'dark'] as const)(
    'applies the Max Jafarov kit in %s mode with readable content',
    mode => {
      const tokens = appearanceVariables(
        { themePreset: 'max-jafarov' },
        mode
      ) as Record<string, string>
      expect(tokens['--bg-primary']).toBe(
        mode === 'dark' ? '#0a0a0f' : '#f1f2f5'
      )
      expect(tokens['--accent-primary']).toBe('#3b8a82')
      expect(tokens['--selection-color']).toBe('#c94a3c')
      expect(tokens['--appearance-heading-font']).toContain('Space Grotesk')
      expect(tokens['--shape-lg']).toBe('28px')
      expect(tokens['--card-shadow']).toBe('none')
      expect(
        tinycolor.readability(tokens['--bg-primary'], tokens['--text-primary'])
      ).toBeGreaterThan(4.5)
      expect(
        tinycolor.readability(tokens['--bg-surface'], tokens['--text-muted'])
      ).toBeGreaterThan(4.5)
    }
  )
  it('lets a nested Monolith scope reset every theme token and lets custom colors win', () => {
    const expressive = appearanceVariables(
      { themePreset: 'max-jafarov' },
      'dark'
    ) as Record<string, string>
    const standard = appearanceVariables(
      { themePreset: 'monolith' },
      'dark'
    ) as Record<string, string>
    expect(Object.keys(standard).sort()).toEqual(Object.keys(expressive).sort())
    expect(standard['--shape-lg']).toBe('8px')
    expect(standard['--appearance-heading-font']).toBe('var(--font-inter)')
    const custom = appearanceVariables({
      themePreset: 'max-jafarov',
      background: '#ffffff',
      button: '#224466',
      radius: 0
    }) as Record<string, string>
    expect(custom.backgroundColor).toBe('#ffffff')
    expect(custom['--interactive-primary']).toBe('#224466')
    expect(custom['--radius-md']).toBe('0px')
  })
  it('keeps existing themes intact when no overrides are chosen', () => {
    expect(appearanceVariables({})).toEqual({})
  })
  it('treats accent and button as independent choices', () => {
    const variables = appearanceVariables({
      accent: '#115588',
      button: '#ffffff',
      icons: '#446622'
    }) as Record<string, string>
    expect(variables['--accent-primary']).toBe('#115588')
    expect(variables['--interactive-primary']).toBe('#ffffff')
    expect(variables['--interactive-on-primary']).toBe('#161616')
    expect(variables['--appearance-icon-color']).toBe('#446622')
  })
  it('chooses readable text for custom dark and light backgrounds', () => {
    const dark = appearanceVariables({ background: '#171d29' }) as Record<
      string,
      string
    >
    const light = appearanceVariables({ background: '#fff5f4' }) as Record<
      string,
      string
    >
    expect(dark['--text-primary']).toBe('#f5f5f4')
    expect(dark.color).toBe('#f5f5f4')
    expect(light['--text-primary']).toBe('#252525')
    expect(dark['--md-sys-color-surface']).toBe('#171d29')
    expect(light['--bg-primary']).toBe('#fff5f4')
  })
  it('applies typography and square corners to native and document surfaces', () => {
    const variables = appearanceVariables({
      radius: 0,
      font: { provider: 'system', family: 'serif' }
    }) as Record<string, string>
    expect(variables['--radius-md']).toBe('0px')
    expect(variables['--font-inter']).toBe('"serif", serif')
    expect(variables['--font-family']).toBe(variables['--font-inter'])
  })
  it('maps surface tokens to the active CSS theme even for a contrasting background', () => {
    const darkBackgroundInLightTheme = appearanceVariables(
      { background: '#171d29' },
      'light'
    ) as Record<string, string>
    const lightBackgroundInDarkTheme = appearanceVariables(
      { background: '#ffffff' },
      'dark'
    ) as Record<string, string>
    expect(darkBackgroundInLightTheme['--color-bg-50']).toBe(
      'color-mix(in srgb, #f5f5f4 0%, #171d29)'
    )
    expect(lightBackgroundInDarkTheme['--color-bg-950']).toBe(
      'color-mix(in srgb, #252525 0%, #ffffff)'
    )
  })
})
