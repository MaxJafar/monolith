import _ from 'lodash'
import { Fragment, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useLocation } from 'react-router'

import { useFederation } from '@lifeforge/federation'
import {
  Box,
  EmptyStateScreen,
  Flex,
  MainSidebarItem,
  useMainSidebarState,
  usePersonalization
} from '@lifeforge/ui'

import { useWorkspace } from '@/core/workspaces/WorkspaceProvider'

import { resolveModuleAvailability } from '../../utils/moduleAvailability'
import {
  modulePath,
  navigationMatches,
  pathIsActive
} from '../../utils/navigation'
import MainSidebarTitle from './MainSidebarTitle'

function SidebarItems({ query }: { query: string }) {
  const { active } = useWorkspace()
  const { moduleGroups, categoryTranslations } = useFederation()
  const { language } = usePersonalization()
  const { t, i18n } = useTranslation()
  const location = useLocation()
  const { toggleSidebar } = useMainSidebarState()
  const [resolvedModuleGroups, setResolvedModuleGroups] = useState(moduleGroups)

  const filteredRoutes = useMemo(
    () =>
      resolvedModuleGroups
        .map(group => ({
          ...group,
          items: group.items.filter(
            item =>
              !item.disabled &&
              !item.hidden &&
              (!active ||
                [
                  'dashboard',
                  'settings',
                  'account-settings',
                  'api-keys',
                  'documentation',
                  'personalization',
                  'module-manager'
                ].includes(modulePath(item.name).slice(1)) ||
                active.enabled_modules.some(
                  module => module === modulePath(item.name).slice(1)
                )) &&
              (navigationMatches(
                query,
                group.title,
                categoryTranslations[group.title.toLowerCase()]?.[language] ??
                  ''
              ) ||
                navigationMatches(
                  query,
                  item.name,
                  t(`apps.${item.name}:title`, { defaultValue: item.name })
                ))
          )
        }))
        .filter(group => group.items.length > 0),
    [
      query,
      resolvedModuleGroups,
      categoryTranslations,
      language,
      t,
      i18n.resolvedLanguage,
      active
    ]
  )

  useEffect(() => {
    let cancelled = false

    async function resolveModuleGroups() {
      const updatedRoutes = await Promise.all(
        moduleGroups.map(async category => {
          const updatedItems = await resolveModuleAvailability(category.items)

          return { ...category, items: updatedItems }
        })
      )

      if (!cancelled) setResolvedModuleGroups(updatedRoutes)
    }
    void resolveModuleGroups()

    return () => {
      cancelled = true
    }
  }, [moduleGroups])

  return (
    <Flex
      aria-label={t('common.sidebar:items.module')}
      as="nav"
      direction="column"
      gap="xs"
      pb="sm"
    >
      {filteredRoutes.length > 0 ? (
        filteredRoutes.map(item => {
          const filteredModules = item.items.filter(
            subItem => !subItem.disabled && !subItem.hidden
          )

          return (
            <Fragment key={`section-${item.title || item.items[0]?.name}`}>
              {item.title !== '' && filteredModules.length > 0 && (
                <MainSidebarTitle title={item.title} />
              )}
              {filteredModules.map(subItem => {
                const path = modulePath(subItem.name)
                const type = (
                  {
                    '/projects': 'project',
                    '/notes': 'note',
                    '/calendar': 'event',
                    '/blog': 'post',
                    '/todo-list': 'task'
                  } as Record<string, string>
                )[path]
                const link =
                  active && type && !active.is_default
                    ? `/databases?workspace=${active.id}&type=${type}`
                    : ['/databases', '/agents'].includes(path) && active
                      ? `${path}?workspace=${active.id}`
                      : path
                const currentType = new URLSearchParams(location.search).get(
                  'type'
                )
                const isActive =
                  link.includes('?type=') || link.includes('&type=')
                    ? location.pathname === '/databases' && currentType === type
                    : pathIsActive(location.pathname, path) &&
                      !(path === '/databases' && currentType)

                return (
                  <MainSidebarItem
                    key={_.kebabCase(subItem.name)}
                    active={isActive}
                    icon={subItem.icon}
                    label={subItem.name}
                    link={link}
                    sidebarExpanded={true}
                    subsection={subItem.subsection}
                    toggleSidebar={toggleSidebar}
                  />
                )
              })}
            </Fragment>
          )
        })
      ) : (
        <Box flex="1" p="lg">
          <EmptyStateScreen
            smaller
            icon="tabler:search-off"
            message={{
              id: 'modules',
              namespace: 'common.sidebar'
            }}
          />
        </Box>
      )}
    </Flex>
  )
}

export default SidebarItems
