import { getInstance, init } from '@module-federation/runtime'

/** Downloaded bundles must use the same React and provider contexts as Vite's
 * source modules. Production hosts register these through the federation plugin. */
export async function registerDevelopmentShares() {
  const modules = await Promise.all([
    import('react'),
    import('react-dom'),
    import('@tanstack/react-query'),
    import('i18next'),
    import('react-i18next'),
    import('react-router'),
    import('nuqs'),
    import('nuqs/adapters/react'),
    import('@monolith/api'),
    import('@monolith/ui'),
    import('@monolith/federation'),
    import('@monolith/localization')
  ])
  const packages = await Promise.all([
    import('react/package.json'),
    import('react-dom/package.json'),
    import('@tanstack/react-query/package.json'),
    import('i18next/package.json'),
    import('react-i18next/package.json'),
    import('react-router/package.json'),
    import('nuqs/package.json'),
    import('nuqs/package.json'),
    import('../../../../../../packages/api/package.json'),
    import('../../../../../../packages/ui/package.json'),
    import('../../../../../../packages/federation/package.json'),
    import('../../../../../../packages/localization/package.json')
  ])
  const names = [
    'react',
    'react-dom',
    '@tanstack/react-query',
    'i18next',
    'react-i18next',
    'react-router',
    'nuqs',
    'nuqs/adapters/react',
    '@monolith/api',
    '@monolith/ui',
    '@monolith/federation',
    '@monolith/localization'
  ]
  const shared = Object.fromEntries(
    names.map((name, index) => [
      name,
      {
        version: packages[index]!.default.version,
        lib: () => modules[index],
        shareConfig: { singleton: true, requiredVersion: false as const }
      }
    ])
  )
  const instance = getInstance()
  if (instance) instance.registerShared(shared)
  else init({ name: 'host', remotes: [], shared })
}
