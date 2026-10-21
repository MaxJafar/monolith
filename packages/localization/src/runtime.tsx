// SPDX-License-Identifier: 0BSD
import type { InitOptions, i18n } from 'i18next'
import { type ReactNode, useEffect, useState } from 'react'
import { getI18n as reactI18n } from 'react-i18next'

import { getI18n } from './getI18n'

interface LocaleRequest {
  lang: string
  namespace: 'apps' | 'common'
  subnamespace: string
}
interface Configuration {
  workspaceAPI: {
    locales: {
      getLocale: { input(request: LocaleRequest): { endpoint: string } }
    }
  }
  getAvailableLanguages(): {
    name: string
    alternative?: string[]
    icon: string
  }[]
}

export function clientI18nConfig(config: Configuration): InitOptions {
  return {
    lng: 'en',
    fallbackLng: 'en',
    ns: ['common'],
    fallbackNS: false,
    interpolation: { escapeValue: false },
    cleanCode: true,
    saveMissing: false,
    debug: false,
    maxRetries: 1,
    parseMissingKeyHandler: key => '[MISSING LOCALE] ' + key,
    returnedObjectHandler: (key, value, options) =>
      JSON.stringify({ key, value, options }),
    backend: {
      loadPath(languages: string[], namespaces: string[]) {
        const requested = languages[0]
        const requestedNamespace = namespaces[0] ?? ''
        const split = requestedNamespace.indexOf('.')
        const namespace =
          split < 0 ? requestedNamespace : requestedNamespace.slice(0, split)
        if (namespace !== 'apps' && namespace !== 'common') return undefined
        const language = config
          .getAvailableLanguages()
          .find(
            item =>
              item.name === requested ||
              item.alternative?.includes(requested ?? '')
          )
        if (!language) return undefined
        return config.workspaceAPI.locales.getLocale.input({
          lang: language.name,
          namespace,
          subnamespace: split < 0 ? '' : requestedNamespace.slice(split + 1)
        }).endpoint
      },
      parse(payload: string) {
        const response = JSON.parse(payload)
        if (
          !response ||
          typeof response !== 'object' ||
          !Object.hasOwn(response, 'data')
        ) {
          throw new Error('Locale response has no data')
        }
        return response.data
      }
    }
  }
}

const languageRequests = new WeakMap<
  i18n,
  { desired: string; pending: Promise<unknown> }
>()
export function useLanguageEffect(language: string): void {
  useEffect(() => {
    const instance = getI18n()
    if (!instance || !language) return
    let queue = languageRequests.get(instance)
    if (!queue) {
      queue = { desired: language, pending: Promise.resolve() }
      languageRequests.set(instance, queue)
    }
    queue.desired = language
    const state = queue
    state.pending = state.pending
      .catch(() => {})
      .then(() => {
        if (state.desired === language && instance.language !== language)
          return instance.changeLanguage(language)
      })
      .catch(error => {
        console.error('Language update failed', error)
      })
  }, [language])
}

export function preloadCommonNamespaces(instance: i18n): void {
  const languages = instance.languages?.length ? instance.languages : ['en']
  for (const language of languages) {
    const common = instance.getResourceBundle(language, 'common')
    if (!common || typeof common !== 'object') continue
    for (const section of Object.keys(common)) {
      const namespace = 'common.' + section
      const contents = common[section]
      if (
        contents &&
        typeof contents === 'object' &&
        !instance.hasResourceBundle(language, namespace)
      ) {
        instance.addResourceBundle(language, namespace, contents, true, true)
      }
    }
  }
}

export function I18nCommonNameSpacePreloadProvider({
  children
}: {
  children: ReactNode
}) {
  useEffect(() => {
    const instance = reactI18n()
    if (!instance) return
    const refresh = () => preloadCommonNamespaces(instance)
    refresh()
    instance.on('loaded', refresh)
    return () => {
      instance.off('loaded', refresh)
    }
  }, [])
  return children
}

const initializing = new WeakMap<() => Promise<unknown>, Promise<unknown>>()
function initialize(callback: () => Promise<unknown>) {
  const current = initializing.get(callback)
  if (current) return current
  const pending = Promise.resolve().then(callback)
  initializing.set(callback, pending)
  const release = () => {
    if (initializing.get(callback) === pending) initializing.delete(callback)
  }
  void pending.then(release, release)
  return pending
}

export function I18nInitProvider({
  children,
  init,
  loadingFallback,
  errorFallback
}: {
  children: ReactNode
  init: () => Promise<unknown>
  loadingFallback: ReactNode
  errorFallback: ReactNode
}) {
  const [result, setResult] = useState<{
    initializer: typeof init
    status: 'ready' | 'error'
  } | null>(null)
  useEffect(() => {
    let active = true
    setResult(null)
    void initialize(init).then(
      () => {
        if (active) setResult({ initializer: init, status: 'ready' })
      },
      error => {
        console.error('Localization initialization failed', error)
        if (active) setResult({ initializer: init, status: 'error' })
      }
    )
    return () => {
      active = false
    }
  }, [init])
  if (!result || result.initializer !== init) return loadingFallback
  return result.status === 'ready' ? children : errorFallback
}
