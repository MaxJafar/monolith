// SPDX-License-Identifier: 0BSD
import i18n from 'i18next'
import Backend from 'i18next-http-backend'
import { initReactI18next } from 'react-i18next'

import { clientI18nConfig, setI18n } from '@monolith/localization'

import workspaceAPI from './workspaceAPI'

export let AVAILABLE_LANG: {
  name: string
  alternative?: string[]
  icon: string
}[] = [{ name: 'en', icon: 'circle-flags:gb' }]
let initializing: Promise<typeof i18n> | undefined
async function initialize() {
  try {
    const languages = await workspaceAPI.locales.listLanguages.query()
    if (languages.length) AVAILABLE_LANG = languages
  } catch (error) {
    console.warn('Language discovery failed; using English', error)
  }
  await i18n
    .use(Backend)
    .use(initReactI18next)
    .init(
      clientI18nConfig({
        workspaceAPI,
        getAvailableLanguages: () => AVAILABLE_LANG
      })
    )
  setI18n(i18n)
  return i18n
}
export function initI18n(): Promise<typeof i18n> {
  if (i18n.isInitialized) {
    setI18n(i18n)
    return Promise.resolve(i18n)
  }
  if (!initializing)
    initializing = initialize().catch(error => {
      initializing = undefined
      throw error
    })
  return initializing
}
