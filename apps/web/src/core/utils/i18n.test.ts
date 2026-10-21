// SPDX-License-Identifier: 0BSD
import { beforeEach, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  discover: vi.fn(),
  init: vi.fn(),
  use: vi.fn(),
  publish: vi.fn(),
  config: vi.fn(),
  instance: null as any
}))
vi.mock('i18next', () => ({
  get default() {
    return mocks.instance
  }
}))
vi.mock('i18next-http-backend', () => ({ default: {} }))
vi.mock('react-i18next', () => ({ initReactI18next: {} }))
vi.mock('@monolith/localization', () => ({
  setI18n: mocks.publish,
  clientI18nConfig: mocks.config
}))
vi.mock('./workspaceAPI', () => ({
  default: { locales: { listLanguages: { query: mocks.discover } } }
}))
beforeEach(() => {
  vi.resetModules()
  vi.clearAllMocks()
  mocks.instance = { isInitialized: false, use: mocks.use, init: mocks.init }
  mocks.use.mockReturnValue(mocks.instance)
  mocks.init.mockResolvedValue(undefined)
  mocks.discover.mockResolvedValue([
    { name: 'en', icon: 'en' },
    { name: 'ms', icon: 'ms' }
  ])
  mocks.config.mockImplementation((value: any) => value)
})
it('shares one initialization and publishes the loaded language catalog', async () => {
  const { initI18n } = await import('./i18n')
  const a = initI18n(),
    b = initI18n()
  expect(a).toBe(b)
  expect(await a).toBe(mocks.instance)
  expect(mocks.discover).toHaveBeenCalledOnce()
  expect(mocks.config.mock.calls[0]![0].getAvailableLanguages()).toHaveLength(2)
  expect(mocks.publish).toHaveBeenCalledWith(mocks.instance)
})
it('allows a retry after backend initialization fails', async () => {
  mocks.init.mockRejectedValueOnce(new Error('offline'))
  const { initI18n } = await import('./i18n')
  await expect(initI18n()).rejects.toThrow('offline')
  await expect(initI18n()).resolves.toBe(mocks.instance)
  expect(mocks.init).toHaveBeenCalledTimes(2)
})
it('uses English if catalog discovery is unavailable', async () => {
  const warning = vi.spyOn(console, 'warn').mockImplementation(() => {})
  mocks.discover.mockRejectedValueOnce(new Error('offline'))
  const { initI18n, AVAILABLE_LANG } = await import('./i18n')
  await initI18n()
  expect(AVAILABLE_LANG.map(x => x.name)).toEqual(['en'])
  expect(warning).toHaveBeenCalledOnce()
  warning.mockRestore()
})
it('reuses an already initialized instance', async () => {
  mocks.instance.isInitialized = true
  const { initI18n } = await import('./i18n')
  expect(await initI18n()).toBe(mocks.instance)
  expect(mocks.discover).not.toHaveBeenCalled()
  expect(mocks.publish).toHaveBeenCalledWith(mocks.instance)
})
