// SPDX-License-Identifier: 0BSD
type SharedSource = { aliasRegex: RegExp; entryPoint: string }
const sources = ['api', 'federation', 'localization', 'ui'] as const
export const SHARED_PACKAGES: Record<
  `@monolith/${(typeof sources)[number]}`,
  SharedSource
> = Object.fromEntries(
  sources.map(name => [
    '@monolith/' + name,
    {
      aliasRegex: new RegExp('^@monolith/' + name + '$'),
      entryPoint: '../packages/' + name + '/src/index.ts'
    }
  ])
) as Record<`@monolith/${(typeof sources)[number]}`, SharedSource>

export const SHARED_DEPS = {
  react: {},
  'react-dom': {},
  '@tanstack/react-query': {},
  i18next: {},
  'react-i18next': {},
  'react-router': {},
  nuqs: {},
  'nuqs/adapters/react': { version: '2.9.0' }
} as const

// Add-ons consume the host's stateful libraries and must not bundle private fallbacks.
export const ADDON_SHARED = Object.fromEntries(
  Object.entries({
    ...SHARED_DEPS,
    ...Object.fromEntries(Object.keys(SHARED_PACKAGES).map(name => [name, {}]))
  }).map(([name, options]) => [
    name,
    { ...options, singleton: true, import: false as const }
  ])
)
