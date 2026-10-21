// SPDX-License-Identifier: 0BSD
import { existsSync } from 'node:fs'
import { join } from 'node:path'

import { addonPackageName, addonWireName } from '@monolith/configs'
import { ModuleRegistry } from '@monolith/module-runtime/registry'

import {
  type LanguageCatalog,
  type LocaleData,
  canonicalLanguage,
  readLocaleObject
} from '../../core/functions/initialization/localeService'

export interface AddonLocaleSource {
  id: string
  name: string
  directory: string
}
export function installedLocaleSources(): AddonLocaleSource[] {
  return ModuleRegistry.entries.flatMap(item => {
    const directory = ModuleRegistry.getPath(item.id)
    return directory ? [{ id: item.id, name: item.name, directory }] : []
  })
}
const record = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === 'object' && !Array.isArray(value)
const own = (
  object: Record<string, unknown> | undefined,
  name: string
): unknown => (object && Object.hasOwn(object, name) ? object[name] : undefined)

export function lookupLocale(
  catalog: LanguageCatalog,
  addons: AddonLocaleSource[],
  query: {
    lang: string
    namespace: 'common' | 'apps'
    subnamespace: string
  }
): Record<string, unknown> | null {
  const language = canonicalLanguage(catalog, query.lang)
  if (!language) return null
  const readAddon = (addon: AddonLocaleSource): LocaleData => {
    const file = join(addon.directory, 'locales', language + '.json')
    return existsSync(file) ? readLocaleObject(file) : {}
  }
  const section = query.subnamespace
  if (query.namespace === 'apps') {
    const packageName = addonPackageName(
      section.startsWith('@') ? section : '@monolith/' + section
    )
    const selected = addons.find(
      item => item.id === section || item.name === packageName
    )
    return selected ? readAddon(selected) : {}
  }
  const system = catalog.locales[language] ?? {}
  const common = system.common
  const selected =
    own(system, section) ?? (section ? own(common, section) : common)
  const result = record(selected) ? structuredClone(selected) : {}
  if (section && section !== 'sidebar') return result
  const apps: Record<string, unknown> = Object.create(null)
  for (const addon of addons) {
    const locale = readAddon(addon)
    if (!Object.keys(locale).length) continue
    const label = {
      title: locale.title ?? '',
      subsections: locale.subsections ?? {}
    }
    apps[addon.name] = label
    apps[addonWireName(addon.name, false)] = label
  }
  for (const [name, locale] of Object.entries(system)) {
    if (typeof locale.title === 'string')
      apps[name] = {
        title: locale.title,
        subsections: locale.subsections ?? {}
      }
  }
  const sidebar = section
    ? result
    : record(result.sidebar)
      ? result.sidebar
      : (result.sidebar = {})
  sidebar.apps = apps
  return result
}
