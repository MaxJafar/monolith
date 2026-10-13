import { useEffect } from 'react'
import { useLocation } from 'react-router'

import { useFederation } from '@lifeforge/federation'

import { modulePath, pathIsActive } from '../utils/navigation'

function useTitleEffect() {
  const { moduleGroups } = useFederation()
  const { pathname } = useLocation()

  useEffect(() => {
    const target = moduleGroups
      .flatMap(group => group.items)
      .find(item => pathIsActive(pathname, modulePath(item.name)))
    document.title = target?.rawModule
      ? `${target.rawModule.displayName} · monolith`
      : 'monolith'
  }, [pathname, moduleGroups])
}

export default useTitleEffect
