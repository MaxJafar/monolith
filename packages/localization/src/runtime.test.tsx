// SPDX-License-Identifier: 0BSD
// @vitest-environment jsdom
import { createInstance } from 'i18next'
import { StrictMode, act } from 'react'
import { createRoot } from 'react-dom/client'
import { describe, expect, it, vi } from 'vitest'

import { setI18n } from './getI18n'
import {
  I18nInitProvider,
  clientI18nConfig,
  preloadCommonNamespaces,
  useLanguageEffect
} from './runtime'

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })

describe('locale resources', () => {
  it('resolves language aliases and preserves the full add-on namespace', () => {
    const input = vi.fn(() => ({ endpoint: '/locale-endpoint' }))
    const config = clientI18nConfig({
      workspaceAPI: { locales: { getLocale: { input } } },
      getAvailableLanguages: () => [
        { name: 'en', alternative: ['en-US'], icon: 'en' }
      ]
    })
    const backend = config.backend as {
      loadPath(languages: string[], namespaces: string[]): string | undefined
      parse(value: string): unknown
    }
    expect(
      backend.loadPath(['en-US'], ['apps.@monolith/calendar.detail'])
    ).toBe('/locale-endpoint')
    expect(input).toHaveBeenCalledWith({
      lang: 'en',
      namespace: 'apps',
      subnamespace: '@monolith/calendar.detail'
    })
    expect(backend.loadPath(['unsupported'], ['common'])).toBeUndefined()
    expect(backend.loadPath(['en'], ['unknown.section'])).toBeUndefined()
    expect(backend.parse('{"data":{"save":"Save"}}')).toEqual({ save: 'Save' })
    expect(() => backend.parse('{}')).toThrow('no data')
  })

  it('preloads common sections without overwriting a separately loaded namespace', async () => {
    const instance = createInstance()
    await instance.init({
      lng: 'en',
      resources: {
        en: {
          common: { actions: { save: 'Save' }, labels: { title: 'Title' } },
          'common.actions': { save: 'Save changes' }
        }
      }
    })
    preloadCommonNamespaces(instance)
    expect(instance.t('save', { ns: 'common.actions' })).toBe('Save changes')
    expect(instance.t('title', { ns: 'common.labels' })).toBe('Title')
  })
})

describe('localization startup', () => {
  it('shares a Strict Mode initialization and only reveals content after it completes', async () => {
    const host = document.createElement('div'),
      root = createRoot(host)
    let finish!: () => void
    const init = vi.fn(
      () =>
        new Promise<void>(resolve => {
          finish = resolve
        })
    )
    try {
      await act(async () =>
        root.render(
          <StrictMode>
            <I18nInitProvider
              init={init}
              loadingFallback="Loading"
              errorFallback="Failed"
            >
              Workspace
            </I18nInitProvider>
          </StrictMode>
        )
      )
      expect(init).toHaveBeenCalledOnce()
      expect(host.textContent).toBe('Loading')
      await act(async () => {
        finish()
      })
      expect(host.textContent).toBe('Workspace')
    } finally {
      await act(async () => root.unmount())
    }
  })

  it('reports initialization failure and allows a new initializer to recover', async () => {
    const host = document.createElement('div'),
      root = createRoot(host)
    const log = vi.spyOn(console, 'error').mockImplementation(() => {})
    const render = (init: () => Promise<unknown>) => (
      <I18nInitProvider
        init={init}
        loadingFallback="Loading"
        errorFallback="Failed"
      >
        Workspace
      </I18nInitProvider>
    )
    try {
      await act(async () =>
        root.render(
          render(async () => {
            throw Error('Offline')
          })
        )
      )
      expect(host.textContent).toBe('Failed')
      await act(async () => root.render(render(async () => {})))
      expect(host.textContent).toBe('Workspace')
    } finally {
      await act(async () => root.unmount())
      log.mockRestore()
    }
  })

  it('finishes a slow language change before applying the latest selection', async () => {
    const instance = createInstance()
    await instance.init({ lng: 'en', resources: {} })
    setI18n(instance)
    let finish!: () => void
    const change = vi
      .spyOn(instance, 'changeLanguage')
      .mockImplementation(async language => {
        if (language === 'ms')
          await new Promise<void>(resolve => {
            finish = resolve
          })
        instance.language = language!
        return instance.t
      })
    const host = document.createElement('div'),
      root = createRoot(host)
    function Language({ value }: { value: string }) {
      useLanguageEffect(value)
      return null
    }
    try {
      await act(async () => root.render(<Language value="ms" />))
      await act(async () => root.render(<Language value="zh-CN" />))
      expect(change).toHaveBeenCalledTimes(1)
      await act(async () => {
        finish()
      })
      expect(change).toHaveBeenLastCalledWith('zh-CN')
      expect(instance.language).toBe('zh-CN')
    } finally {
      await act(async () => root.unmount())
    }
  })
})
