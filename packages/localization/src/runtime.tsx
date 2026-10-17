import type { InitOptions, i18n } from 'i18next'
import { type ReactNode, useEffect, useState } from 'react'
import { getI18n as currentReactI18n } from 'react-i18next'

import { getI18n } from './getI18n'

type LocaleRequest = {
  lang: string
  namespace: 'apps' | 'common'
  subnamespace: string
}
type Configuration = {
  workspaceAPI: {
    locales: {
      getLocale: { input: (request: LocaleRequest) => { endpoint: string } }
    }
  }
  getAvailableLanguages: () => Array<{
    name: string
    alternative?: string[]
    icon: string
  }>
}

export function clientI18nConfig({
  workspaceAPI,
  getAvailableLanguages
}: Configuration): InitOptions {
  return {
    lng: 'en',
    fallbackLng: 'en',
    ns: ['common'],
    fallbackNS: false,
    cleanCode: true,
    maxRetries: 1,
    saveMissing: false,
    debug: false,
    interpolation: { escapeValue: false },
    parseMissingKeyHandler: key => '[MISSING LOCALE] ' + key,
    returnedObjectHandler: (key, value, options) =>
      JSON.stringify({ key, value, options }),
    backend: {
      loadPath(languages: string[], namespaces: string[]) {
        const requested = languages[0]
        const language = getAvailableLanguages().find(
          entry =>
            entry.name === requested ||
            entry.alternative?.includes(requested ?? '')
        )
        const [namespace, ...parts] = (namespaces[0] || '').split('.')
        if (!language || (namespace !== 'common' && namespace !== 'apps'))
          return undefined
        return workspaceAPI.locales.getLocale.input({
          lang: language.name,
          namespace,
          subnamespace: parts.join('.')
        }).endpoint
      },
      parse(text: string) {
        return JSON.parse(text).data
      }
    }
  }
}

export function useLanguageEffect(language: string): void {
  useEffect(() => {
    const instance = getI18n()
    if (!language || !instance || instance.language === language) return
    void instance
      .changeLanguage(language)
      .catch(error => console.error('Language could not be loaded', error))
  }, [language])
}

export function preloadCommonNamespaces(instance: i18n): void {
  for (const language of instance.languages?.length
    ? instance.languages
    : ['en']) {
    const bundle = instance.getResourceBundle(language, 'common') as
      Record<string, unknown> | undefined
    for (const [section, values] of Object.entries(bundle ?? {})) {
      if (
        values &&
        typeof values === 'object' &&
        !instance.hasResourceBundle(language, 'common.' + section)
      )
        instance.addResourceBundle(
          language,
          'common.' + section,
          values,
          true,
          true
        )
    }
  }
}

export function I18nCommonNameSpacePreloadProvider({
  children
}: {
  children: ReactNode
}) {
  useEffect(() => {
    const instance = currentReactI18n()
    if (!instance) return
    const sync = () => preloadCommonNamespaces(instance)
    instance.on('loaded', sync)
    sync()
    return () => {
      instance.off('loaded', sync)
    }
  }, [])
  return children
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
  const [state, setState] = useState<'pending' | 'ready' | 'error'>('pending')
  useEffect(() => {
    let subscribed = true
    setState('pending')
    Promise.resolve()
      .then(init)
      .then(
        () => {
          if (subscribed) setState('ready')
        },
        error => {
          console.error('Localization initialization failed', error)
          if (subscribed) setState('error')
        }
      )
    return () => {
      subscribed = false
    }
  }, [init])
  return state === 'ready'
    ? children
    : state === 'error'
      ? errorFallback
      : loadingFallback
}
