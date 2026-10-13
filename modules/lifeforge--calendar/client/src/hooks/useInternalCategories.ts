import { useQueries } from '@tanstack/react-query'
import { useMemo } from 'react'

import { useModuleTranslation } from '@lifeforge/localization'

import type { CalendarCategory } from '@/components/Calendar'
import { forgeAPI } from '@/manifest'

interface InternalCategory {
  id: string
  name: string
  color: string
  icon: string
  requiredModule: string
}

const INTERNAL_CATEGORIES: Record<string, InternalCategory> = {
  _gym: {
    id: '_gym',
    name: 'Gym training',
    color: '#f58a38',
    icon: 'tabler:barbell',
    requiredModule: 'zillion--gym'
  },
  _external: {
    id: '_external',
    name: 'ICS subscriptions',
    color: '#38bdf8',
    icon: 'tabler:calendar-share',
    requiredModule: ''
  },
  _databases: {
    id: '_databases',
    name: 'Database records',
    color: '#ff8904',
    icon: 'tabler:database',
    requiredModule: 'zillion--databases'
  },
  _todo: {
    id: '_todo',
    name: 'Todo Deadline',
    color: '#F44336',
    icon: 'tabler:hexagon-letter-x',
    requiredModule: 'lifeforge--todo-list'
  },
  _movie: {
    id: '_movie',
    name: 'Movie',
    color: '#ff8904',
    icon: 'tabler:movie',
    requiredModule: 'lifeforge--movies'
  }
}

export function useInternalCategories() {
  const { t } = useModuleTranslation()

  const moduleIds = useMemo(
    () => [
      ...new Set(
        Object.values(INTERNAL_CATEGORIES)
          .map(c => c.requiredModule)
          .filter(Boolean)
      )
    ],
    []
  )

  const availabilityQueries = useQueries({
    queries: moduleIds.map(moduleId =>
      forgeAPI.checkModuleAvailability({ id: moduleId }).queryOptions()
    )
  })

  const availabilityMap = useMemo(() => {
    const map: Record<string, boolean> = {}
    moduleIds.forEach((id, i) => {
      map[id] = availabilityQueries[i]?.data ?? false
    })

    return map
  }, [moduleIds, availabilityQueries])

  return useMemo(() => {
    const values = Object.values(INTERNAL_CATEGORIES)
      .filter(c => !c.requiredModule || availabilityMap[c.requiredModule])
      .map(e => ({
        ...e,
        name:
          e.id === '_external'
            ? t('filters.sources.ics')
            : e.id === '_databases'
              ? t('filters.sources.database')
              : e.id === '_gym'
                ? t('filters.sources.gym')
                : e.name
      })) as CalendarCategory[]

    const map = Object.fromEntries(
      values.map(category => [category.id, category])
    ) as unknown as Record<string, CalendarCategory>

    return { values, map }
  }, [availabilityMap, t])
}
