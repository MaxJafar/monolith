// SPDX-License-Identifier: 0BSD
// @vitest-environment jsdom
import { type ReactNode, act, useState } from 'react'
import { type Root, createRoot } from 'react-dom/client'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'

import type { AccountPreferences } from './UserPersonalizationContext'
import UserPersonalizationProvider, {
  useUserPersonalization
} from './UserPersonalizationProvider'

const service = vi.hoisted(() => ({
  mutate: vi.fn(),
  error: vi.fn(),
  auth: null as any,
  ui: null as any
}))
vi.mock('@monolith/api', () => ({ useAuth: () => service.auth }))
vi.mock('@monolith/ui', () => ({
  usePersonalization: () => service.ui,
  toast: { error: service.error }
}))
vi.mock('@/core/utils/workspaceAPI', () => ({
  default: {
    user: {
      personalization: { updatePersonalization: { mutate: service.mutate } }
    },
    getMedia: ({ key }: { key: string }) => 'https://media.invalid/' + key
  }
}))
;(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true
let root: Root
let actions: AccountPreferences
const initial = () => ({
  id: 'a',
  theme: 'dark',
  color: 'ocean',
  bgTemp: 'stone',
  fontScale: 1,
  borderRadiusMultiplier: 1,
  bordered: false,
  fontFamily: 'Inter',
  language: 'en',
  backdropFilters: {},
  dashboardLayout: {},
  bgImage: null
})
function Probe() {
  actions = useUserPersonalization()
  return null
}
function Harness({ children }: { children: ReactNode }) {
  const [userData, setUserData] = useState<any>(initial)
  const [ui, setUI] = useState<any>({})
  service.auth = { userData, setUserData }
  const setters = Object.fromEntries(
    [
      'theme',
      'rawThemeColor',
      'bgTemp',
      'backdropFilters',
      'language',
      'fontFamily',
      'fontScale',
      'dashboardLayout',
      'borderRadiusMultiplier',
      'bordered',
      'bgImage'
    ].map(key => [
      'set' + key.charAt(0).toUpperCase() + key.slice(1),
      (value: unknown) => setUI((old: any) => ({ ...old, [key]: value }))
    ])
  )
  service.ui = { ...ui, ...setters }
  return <UserPersonalizationProvider>{children}</UserPersonalizationProvider>
}
beforeEach(async () => {
  vi.clearAllMocks()
  service.mutate.mockResolvedValue(undefined)
  root = createRoot(document.createElement('div'))
  await act(async () =>
    root.render(
      <Harness>
        <Probe />
      </Harness>
    )
  )
})
afterEach(() => act(() => root.unmount()))
function deferred() {
  let resolve!: (value?: unknown) => void, reject!: (error: Error) => void
  const promise = new Promise((yes, no) => {
    resolve = yes
    reject = no
  })
  return { promise, resolve, reject }
}
it('hydrates stored tokens and clears a removed background image', async () => {
  expect(service.ui.rawThemeColor).toBe('theme-ocean')
  expect(service.ui.bgTemp).toBe('bg-stone')
  await act(async () =>
    service.auth.setUserData((old: any) => ({
      ...old,
      bgImage: { key: 'photo' }
    }))
  )
  expect(service.ui.bgImage).toBe('https://media.invalid/photo')
  await act(async () =>
    service.auth.setUserData((old: any) => ({ ...old, bgImage: null }))
  )
  expect(service.ui.bgImage).toBe('')
})
it('serializes writes and preserves the latest preview while earlier requests finish', async () => {
  const first = deferred(),
    second = deferred()
  service.mutate
    .mockReturnValueOnce(first.promise)
    .mockReturnValueOnce(second.promise)
  let a!: Promise<void>, b!: Promise<void>
  await act(async () => {
    a = actions.changeTheme('light')
  })
  await act(async () => {
    b = actions.changeTheme('system')
  })
  expect(service.ui.theme).toBe('system')
  expect(service.mutate).toHaveBeenCalledTimes(1)
  await act(async () => {
    first.resolve()
    await a
  })
  expect(service.ui.theme).toBe('system')
  expect(service.auth.userData.theme).toBe('light')
  expect(service.mutate).toHaveBeenCalledTimes(2)
  await act(async () => {
    second.resolve()
    await b
  })
  expect(service.auth.userData.theme).toBe('system')
})
it('restores the last saved value when consecutive previews both fail', async () => {
  const first = deferred(),
    second = deferred()
  service.mutate
    .mockReturnValueOnce(first.promise)
    .mockReturnValueOnce(second.promise)
  let a!: Promise<void>, b!: Promise<void>
  await act(async () => {
    a = actions.changeTheme('light')
  })
  await act(async () => {
    b = actions.changeTheme('system')
  })
  await act(async () => {
    first.reject(new Error('offline'))
    await a
  })
  expect(service.ui.theme).toBe('system')
  await act(async () => {
    second.reject(new Error('offline'))
    await b
  })
  expect(service.ui.theme).toBe('dark')
  expect(service.auth.userData.theme).toBe('dark')
  expect(service.error).toHaveBeenCalledOnce()
})
it('rolls back a rejected preview to the preceding successful request', async () => {
  const first = deferred(),
    second = deferred()
  service.mutate
    .mockReturnValueOnce(first.promise)
    .mockReturnValueOnce(second.promise)
  let a!: Promise<void>, b!: Promise<void>
  await act(async () => {
    a = actions.changeFontScale(1.1)
  })
  await act(async () => {
    b = actions.changeFontScale(1.3)
  })
  await act(async () => {
    first.resolve()
    await a
  })
  await act(async () => {
    second.reject(new Error('offline'))
    await b
  })
  expect(service.ui.fontScale).toBe(1.1)
  expect(service.auth.userData.fontScale).toBe(1.1)
})
it('drops old queued edits and stale responses after an account switch', async () => {
  const first = deferred()
  service.mutate.mockReturnValueOnce(first.promise)
  let a!: Promise<void>, b!: Promise<void>
  await act(async () => {
    a = actions.changeTheme('light')
    b = actions.changeLanguage('ms')
  })
  await act(async () =>
    service.auth.setUserData({ ...initial(), id: 'b', theme: 'system' })
  )
  await act(async () => {
    first.resolve()
    await Promise.all([a, b])
  })
  expect(service.mutate).toHaveBeenCalledTimes(1)
  expect(service.auth.userData.id).toBe('b')
  expect(service.ui.theme).toBe('system')
  expect(service.ui.language).toBe('en')
})
it('normalizes color tokens for persistence and does not write without an account', async () => {
  await act(async () => actions.changeThemeColor('theme-violet'))
  expect(service.mutate).toHaveBeenLastCalledWith({ data: { color: 'violet' } })
  expect(service.ui.rawThemeColor).toBe('theme-violet')
  await act(async () => service.auth.setUserData(null))
  await act(async () => actions.changeTheme('light'))
  expect(service.mutate).toHaveBeenCalledTimes(1)
})
