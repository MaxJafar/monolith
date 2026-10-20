export const SHARED_PACKAGES = {
  '@monolith/api': {
    aliasRegex: /^@monolith\/api$/,
    entryPoint: '../packages/api/src/index.ts'
  },
  '@monolith/federation': {
    aliasRegex: /^@monolith\/federation$/,
    entryPoint: '../packages/federation/src/index.ts'
  },
  '@monolith/localization': {
    aliasRegex: /^@monolith\/localization$/,
    entryPoint: '../packages/localization/src/index.ts'
  },
  '@monolith/ui': {
    aliasRegex: /^@monolith\/ui$/,
    entryPoint: '../packages/ui/src/index.ts'
  }
}

export const SHARED_DEPS = {
  react: {},
  'react-dom': {},
  '@tanstack/react-query': {},
  i18next: {},
  'react-i18next': {},
  'react-router': {},
  nuqs: {},
  'nuqs/adapters/react': {
    version: '2.9.0'
  }
} as const

// Addons run inside Monolith and must consume its providers and state. Bundling
// fallback libraries can execute a second private context before loadShare even
// selects the host singleton (for example nuqs' adapter context).
export const ADDON_SHARED = Object.fromEntries(
  [
    ...Object.entries(SHARED_DEPS),
    ...Object.keys(SHARED_PACKAGES).map(name => [name, {}] as const)
  ].map(([name, config]) => [
    name,
    { ...config, singleton: true, import: false as const }
  ])
)
