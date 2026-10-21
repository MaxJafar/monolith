// SPDX-License-Identifier: 0BSD
import type { InitOptions } from 'i18next'

import common from '../../../locales/lang-en/common.json'

export const i18nConfig: InitOptions = {
  lng: 'en',
  fallbackLng: 'en',
  defaultNS: 'common',
  ns: ['common'],
  resources: {
    en: {
      common,
      ...Object.fromEntries(
        Object.entries(common).map(([name, content]) => [
          'common.' + name,
          content
        ])
      )
    }
  },
  interpolation: { escapeValue: false },
  react: { useSuspense: false }
}
