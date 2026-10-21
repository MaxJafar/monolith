// SPDX-License-Identifier: 0BSD
import { ROOT_DIR } from '@constants'
import { createServiceLogger } from '@functions/logging'
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { z } from 'zod'

export const ALLOWED_NAMESPACE = ['apps', 'common'] as const
export const LANGUAGE_PACK_PATH = join(ROOT_DIR, 'locales')
export interface LangManifest {
  packName: string
  name: string
  icon: string
  displayName: string
  alternative?: string[]
}
export interface LocaleData {
  title?: string
  subsections?: Record<string, unknown>
  [key: string]: unknown
}
export interface LanguageCatalog {
  manifests: LangManifest[]
  locales: Record<string, Record<string, LocaleData>>
}
const code = z.string().regex(/^[a-zA-Z]{2,3}(?:-[a-zA-Z0-9]{2,8})*$/)
const packageMetadata = z.object({
  name: z.string().regex(/^@monolith\/(?:.+--)?lang-.+$/),
  version: z.string().regex(/^\d+\.\d+\.\d+$/),
  description: z.string(),
  author: z.string(),
  monolith: z.object({
    code,
    displayName: z.string(),
    icon: z.string(),
    alternative: z.array(code).optional()
  })
})
const jsonObject = z.record(z.string(), z.unknown())

export function readLocaleObject(file: string): LocaleData {
  return jsonObject.parse(JSON.parse(readFileSync(file, 'utf8')))
}

/** Build a complete snapshot before replacing the live catalog. */
export function loadLanguageCatalog(directory: string): LanguageCatalog {
  if (!existsSync(directory))
    throw new Error('No language pack directory: ' + directory)
  const manifests: LangManifest[] = []
  const locales: LanguageCatalog['locales'] = Object.create(null)
  const used = new Set<string>()
  for (const folder of readdirSync(directory, { withFileTypes: true }).sort(
    (a, b) => a.name.localeCompare(b.name)
  )) {
    if (folder.name.startsWith('.') || folder.name === 'package.json') continue
    if (!folder.isDirectory())
      throw new Error('Expected a language pack directory: ' + folder.name)
    const base = join(directory, folder.name)
    const metadata = packageMetadata.parse(
      JSON.parse(readFileSync(join(base, 'package.json'), 'utf8'))
    ).monolith
    const identifiers = [metadata.code, ...(metadata.alternative ?? [])]
    for (const identifier of identifiers) {
      if (used.has(identifier))
        throw new Error('Duplicate language identifier: ' + identifier)
      used.add(identifier)
    }
    const sections: Record<string, LocaleData> = Object.create(null)
    for (const entry of readdirSync(base, { withFileTypes: true })) {
      if (entry.name.startsWith('.') || entry.name === 'package.json') continue
      if (!entry.isFile() || !entry.name.endsWith('.json'))
        throw new Error(
          'Expected a locale JSON file: ' + join(base, entry.name)
        )
      sections[entry.name.slice(0, -5)] = readLocaleObject(
        join(base, entry.name)
      )
    }
    locales[metadata.code] = sections
    manifests.push({
      packName: folder.name,
      name: metadata.code,
      icon: metadata.icon,
      displayName: metadata.displayName,
      alternative: metadata.alternative
    })
  }
  if (!manifests.length)
    throw new Error('At least one language pack is required')
  return { manifests, locales }
}
export function canonicalLanguage(
  catalog: LanguageCatalog,
  requested: string
): string | undefined {
  return catalog.manifests.find(
    item => item.name === requested || item.alternative?.includes(requested)
  )?.name
}

export class LocaleService {
  private static snapshot: LanguageCatalog = { manifests: [], locales: {} }
  static getLanguagePacks(): string[] {
    return this.snapshot.manifests.map(item => item.packName)
  }
  static getLangManifests(): LangManifest[] {
    return structuredClone(this.snapshot.manifests)
  }
  static getSystemLocales(): LanguageCatalog['locales'] {
    return structuredClone(this.snapshot.locales)
  }
  static getAllowedLang(): string[][] {
    return this.snapshot.manifests.map(item => [
      item.name,
      ...(item.alternative ?? [])
    ])
  }
  static validateAndLoad(): void {
    const next = loadLanguageCatalog(LANGUAGE_PACK_PATH)
    this.snapshot = next
    createServiceLogger('Locale Loader').info(
      'Loaded language packs: ' +
        next.manifests.map(item => item.name).join(', ')
    )
  }
}
