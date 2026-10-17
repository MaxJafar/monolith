import { describe, expect, it } from 'vitest'

import { appearanceVariables } from './index'

describe('Appearance token scopes', () => {
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
