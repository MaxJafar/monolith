import i18n, { type Resource } from 'i18next'
import { initReactI18next } from 'react-i18next'

import { type ModuleConfig, addonPackageName } from '@monolith/configs'
import { configureBundledModules } from '@monolith/federation'
import { setI18n } from '@monolith/localization'
import { registerWorkspaceIcons } from '@monolith/ui'

const manifests = import.meta.glob<{ default: ModuleConfig }>(
  '../../../modules/monolith--{calendar,projects,todo-list,notes,databases}/client/manifest.ts'
)
const packages = import.meta.glob<{ name: string }>(
  '../../../modules/*/package.json',
  { eager: true }
)
configureBundledModules(
  Object.fromEntries(
    Object.entries(manifests).map(([path, load]) => [
      packages[path.replace('/client/manifest.ts', '/package.json')]!.name,
      load
    ])
  )
)

export async function initializeBundle() {
  registerWorkspaceIcons()
  const resources: Resource = {}
  const common = import.meta.glob<Record<string, unknown>>(
    '../../../locales/lang-*/*.json',
    { eager: true, import: 'default' }
  )
  for (const [path, value] of Object.entries(common)) {
    const match = path.match(/lang-([^/]+)\/([^/]+)\.json$/)!
    if (match[2] === 'package') continue
    const language = (resources[match[1]!] ??= {})
    language[match[2] === 'common' ? 'common' : `apps.${match[2]}`] = value
    if (match[2] === 'common')
      for (const [key, section] of Object.entries(value))
        if (section && typeof section === 'object')
          language[`common.${key}`] = section as Record<string, unknown>
  }
  const modules = import.meta.glob<Record<string, unknown>>(
    '../../../modules/*/locales/*.json',
    { eager: true, import: 'default' }
  )
  for (const [path, value] of Object.entries(modules)) {
    const match = path.match(/modules\/([^/]+)\/locales\/([^/]+)\.json$/)!
    const language = (resources[match[2]!] ??= {})
    language[`apps.${match[1]}`] = value
    const packageName =
      packages[`../../../modules/${match[1]}/package.json`]?.name
    if (packageName) language[`apps.${packageName}`] = value
    language[`apps.${addonPackageName(match[1]!)}`] = value
  }
  // The browser locale endpoint supplies sidebar labels; bundled clients need
  // the identical derived namespace without fetching locale files remotely.
  for (const language of Object.values(resources)) {
    const sidebar = language['common.sidebar'] as Record<string, unknown>
    sidebar.apps = Object.fromEntries(
      Object.entries(language).flatMap(([key, value]) =>
        key.startsWith('apps.') &&
        value &&
        typeof value === 'object' &&
        'title' in value
          ? [
              [
                key.slice(5),
                { title: value.title, subsections: value.subsections ?? {} }
              ]
            ]
          : []
      )
    )
  }
  await i18n.use(initReactI18next).init({
    resources,
    lng: navigator.language,
    supportedLngs: ['en', 'ms', 'zh-CN', 'zh-TW'],
    fallbackLng: 'en',
    ns: ['common'],
    defaultNS: 'common',
    interpolation: { escapeValue: false }
  })
  setI18n(i18n)
}
