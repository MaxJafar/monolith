import { lazy } from 'react'

import { defineAddon } from '@monolith/federation'

import contract from './contract'

const { workspaceAPI, ...manifest } = defineAddon({
  subsection: [
    { label: 'Dashboard', icon: 'tabler:dashboard', path: '' },
    {
      label: 'Transactions',
      icon: 'tabler:arrows-exchange',
      path: 'transactions'
    },
    { label: 'Assets', icon: 'tabler:wallet', path: 'assets' },
    { label: 'Manage', icon: 'tabler:adjustments', path: 'manage' },
    {
      label: 'Spending Heatmap',
      icon: 'tabler:map-pin',
      path: 'spending-heatmap'
    },
    {
      label: 'Financial Statements',
      icon: 'tabler:file-text',
      path: 'statements'
    }
  ],
  routes: {
    '/': lazy(() => import('@/pages/Dashboard')),
    '/transactions': lazy(() => import('@/pages/Transactions')),
    '/assets': lazy(() => import('@/pages/Assets')),
    '/manage': lazy(() => import('@/pages/Manage')),
    '/spending-heatmap': lazy(() => import('@/pages/SpendingHeatmap')),
    '/statements': lazy(() => import('@/pages/Statements'))
  },
  widgets: [() => import('@/widgets/AssetsBalance')],
  contract
})

export default manifest

export { workspaceAPI }
