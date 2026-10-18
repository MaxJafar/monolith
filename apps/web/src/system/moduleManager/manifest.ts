import { lazy } from 'react'

import type { ModuleGroup } from '@monolith/configs'

export default {
  routes: {
    '/': lazy(() => import('./pages/Modules')),
    '/modules': lazy(() => import('./pages/Modules')),
    '/categories': lazy(() => import('./pages/Categories'))
  },
  subsection: [
    {
      label: 'Addons and Widgets',
      icon: 'tabler:puzzle',
      path: '/modules'
    },
    {
      label: 'Categories',
      icon: 'tabler:category',
      path: '/categories'
    }
  ],
  name: 'module-manager',
  displayName: 'Addons and Widgets',
  version: '1.0.0',
  author: 'Monolith contributors',
  description: 'Installed addons for your monolith workspace',
  icon: 'tabler:puzzle',
  category: 'Settings',
  APIKeyAccess: {}
} as ModuleGroup['items'][number]
