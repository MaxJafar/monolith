import { createTabbedView } from '@lifeforge/ui'

export const ManageTabbedView = createTabbedView({
  useNuqs: true,
  tabs: [
    { id: 'categories', name: 'manage.categories', icon: 'tabler:apps' },
    {
      id: 'platforms',
      name: 'manage.platforms',
      icon: 'tabler:building-store'
    },
    { id: 'templates', name: 'manage.templates', icon: 'tabler:template' },
    { id: 'ledgers', name: 'manage.ledgers', icon: 'tabler:book' }
  ]
})
