// SPDX-License-Identifier: 0BSD
// @vitest-environment jsdom
import { act } from 'react'
import { type Root, createRoot } from 'react-dom/client'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'

import { PersonalizationProvider, usePersonalization } from '.'
import { applyTheme } from './applyTheme'
import type { IPersonalizationData } from './interfaces/personalization_provider_interfaces'
import { defaults, derivePreferences, initialPreferences } from './preferences'

vi.mock('@monolith/localization', () => ({ useLanguageEffect: vi.fn() }))

let container: HTMLDivElement, root: Root
beforeEach(() => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  localStorage.clear()
  container = document.createElement('div')
  document.body.append(container)
  root = createRoot(container)
})
afterEach(async () => {
  await act(async () => root.unmount())
  container.remove()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

it('uses device theme only when no explicit initial theme was supplied', () => {
  localStorage.setItem('monolith.theme', 'dark')
  expect(initialPreferences({}).theme).toBe('dark')
  expect(initialPreferences({ theme: 'light' }).theme).toBe('light')
  localStorage.setItem('monolith.theme', 'not-a-mode')
  expect(initialPreferences({}).theme).toBe('light')
  vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
    throw Error('disabled')
  })
  expect(initialPreferences({}).theme).toBe('light')
})
it('resolves saved names, custom hex and unknown values to usable palettes', () => {
  const named = derivePreferences(
    {
      ...defaults,
      theme: 'system',
      rawThemeColor: 'theme-deep-purple',
      bgTemp: 'bg-slate'
    },
    true
  )
  expect(named.derivedTheme).toBe('dark')
  expect(named.derivedThemeColor).toMatch(/^#[a-f0-9]{6}$/i)
  const custom = derivePreferences(
    { ...defaults, rawThemeColor: '#abc', bgTemp: '#e74570' },
    false
  )
  expect(custom.derivedThemeColor).toBe('#aabbcc')
  expect(custom.getMostReadableColor('#ffffff')).toBe(custom.bgTempPalette[800])
  const unknown = derivePreferences(
    { ...defaults, rawThemeColor: 'retired', bgTemp: 'missing' },
    false
  )
  expect(unknown.derivedThemeColor).toBe(defaults.rawThemeColor)
  expect(Object.keys(unknown.bgTempPalette)).toHaveLength(11)
})
it('scopes preview themes and restores only owned changes', () => {
  container.className = 'unrelated'
  container.style.setProperty('--custom-font-scale', '1.3')
  container.style.setProperty('--other', 'keep')
  const htmlClass = document.documentElement.className
  const undo = applyTheme(
    container,
    {
      ...defaults,
      theme: 'dark',
      fontScale: 1.2,
      rawThemeColor: '#ef5555',
      bordered: true
    },
    false
  )
  expect(container.classList.contains('dark')).toBe(true)
  expect(container.classList.contains('bordered')).toBe(true)
  expect(container.style.getPropertyValue('--color-custom-500')).toBe('#ef5555')
  expect(container.style.getPropertyValue('--custom-font-scale')).toBe('1.2')
  expect(document.documentElement.className).toBe(htmlClass)
  container.style.setProperty('--block-selection', 'external-change')
  undo()
  expect(container.className).toBe('unrelated')
  expect(container.style.getPropertyValue('--color-custom-500')).toBe('')
  expect(container.style.getPropertyValue('--custom-font-scale')).toBe('1.3')
  expect(container.style.getPropertyValue('--other')).toBe('keep')
  expect(container.style.getPropertyValue('--block-selection')).toBe(
    'external-change'
  )
})
it('keeps setter identities and supports functional updates', async () => {
  let state!: IPersonalizationData
  function Read() {
    state = usePersonalization()
    return null
  }
  await act(async () =>
    root.render(
      <PersonalizationProvider
        workspaceAPI={{} as never}
        defaultValueOverride={{ rootElement: container }}
      >
        <Read />
      </PersonalizationProvider>
    )
  )
  const setter = state.setFontScale
  await act(async () => {
    setter(previous => previous + 0.1)
    state.setTheme('dark')
    state.setDashboardLayout(previous => ({
      ...previous,
      workspace: [{ i: 'a', x: 0, y: 0, w: 2, h: 2 }]
    }))
  })
  expect(state.fontScale).toBe(1.1)
  expect(state.setFontScale).toBe(setter)
  expect(state.derivedTheme).toBe('dark')
  expect(state.dashboardLayout.workspace[0].i).toBe('a')
  expect(container.classList.contains('dark')).toBe(true)
  expect(localStorage.getItem('monolith.theme')).toBeNull()
})
it('responds to operating-system theme changes and removes its listener', async () => {
  let notify = () => {}
  let matches = false
  const remove = vi.fn()
  const media = {
    get matches() {
      return matches
    },
    addEventListener: vi.fn((_type, fn) => {
      notify = fn
    }),
    removeEventListener: remove
  }
  vi.stubGlobal('matchMedia', () => media)
  let state!: IPersonalizationData
  function Read() {
    state = usePersonalization()
    return null
  }
  await act(async () =>
    root.render(
      <PersonalizationProvider
        workspaceAPI={{} as never}
        defaultValueOverride={{ rootElement: container, theme: 'system' }}
      >
        <Read />
      </PersonalizationProvider>
    )
  )
  expect(state.derivedTheme).toBe('light')
  await act(async () => {
    matches = true
    notify()
  })
  expect(state.derivedTheme).toBe('dark')
  await act(async () => root.render(null))
  expect(remove).toHaveBeenCalledOnce()
  expect(container.classList.contains('dark')).toBe(false)
})
