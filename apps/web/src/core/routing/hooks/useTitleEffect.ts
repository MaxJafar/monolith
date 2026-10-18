import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useLocation } from 'react-router'

import { useFederation } from '@monolith/federation'

import { modulePath, pathIsActive } from '../utils/navigation'

function useTitleEffect() {
  const { moduleGroups } = useFederation()
  const { pathname } = useLocation()
  const { t } = useTranslation('common.navigation')

  useEffect(() => {
    const target = moduleGroups
      .flatMap(group => group.items)
      .find(item => pathIsActive(pathname, modulePath(item.name)))
    const routeArea = pathname.split('/')[1] ?? ''
    const area = routeArea === 'module-manager' ? 'addons' : routeArea
    document.title = [
      'calendar',
      'projects',
      'actions',
      'docs',
      'ideas',
      'dashboard',
      'databases',
      'addons'
    ].includes(area)
      ? `${t(area)} · monolith`
      : target?.rawModule
        ? `${target.rawModule.displayName} · monolith`
        : 'monolith'
  }, [pathname, moduleGroups, t])
}

export default useTitleEffect
