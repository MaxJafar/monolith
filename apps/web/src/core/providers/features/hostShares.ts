import { getInstance, init } from '@module-federation/runtime'

/** Load the host's shared modules before registering any remotes. Otherwise an
 * addon can supply a lazy singleton (notably nuqs) whose private context differs
 * from the adapter already mounted by the host. Development also needs explicit
 * registration because source aliases bypass the federation build plugin. */
export async function registerHostShares() {
  const modules = await Promise.all([
    import('react'),
    import('react-dom'),
    import('react-dom/server.edge'),
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
    'react-dom/server',
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
