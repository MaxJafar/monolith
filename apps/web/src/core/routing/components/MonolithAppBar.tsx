import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Link, useLocation } from 'react-router'

import { useAuth } from '@lifeforge/api'
import {
  Button,
  Flex,
  Text,
  useMainSidebarState,
  usePersonalization
} from '@lifeforge/ui'

import { useUserPersonalization } from '@/core/providers/features/UserPersonalizationContext'
import { useWorkspace } from '@/core/workspaces/WorkspaceProvider'
import { workspaceArea } from '@/core/workspaces/areaPage'
import { workspaceAPI } from '@/core/workspaces/workspaceAPI'

import './monolithAppBar.css'

export default function MonolithAppBar() {
  const { t } = useTranslation([
    'common.appBar',
    'common.systemSearch',
    'common.canvas'
  ])

  const { sidebarExpanded, toggleSidebar } = useMainSidebarState()
  const { derivedTheme } = usePersonalization()
  const { changeTheme } = useUserPersonalization()
  const { pathname, search } = useLocation()
  const { userData } = useAuth()
  const { active } = useWorkspace()

  const isPage = pathname.startsWith('/page/')
  const options = workspaceAPI.workspaces.getPage
    .input({
      id: isPage ? pathname.slice(6) : '00000000-0000-4000-8000-000000000000'
    })
    .queryOptions()
  const areaPage = workspaceArea(pathname, search)
  const areaOptions = workspaceAPI.workspaces.getAreaPage
    .input({
      workspace_id: active?.id ?? '00000000-0000-4000-8000-000000000000',
      key: areaPage.key
    })
    .queryOptions()
  const nativePage = useQuery({
    ...areaOptions,
    queryKey: [...areaOptions.queryKey, userData?.id],
    enabled: !!active && !isPage
  })

  const pages = useQuery({
    ...options,
    queryKey: [...options.queryKey, userData?.id],
    enabled: !!userData?.id && pathname.startsWith('/page/')
  })

  const area = pathname.split('/')[1] ?? 'dashboard'
  const label =
    area === 'dashboard'
      ? t('workspace')
      : area === 'tech-lab'
        ? t('techLab')
        : area === 'page'
          ? (pages.data?.page.title ?? t('page'))
          : area
              .replace(/-/g, ' ')
              .replace(/\b[a-z]/g, letter => letter.toUpperCase())

  return (
    <Flex
      align="center"
      as="header"
      className="monolith-page-bar"
      flexShrink="0"
      gap="md"
      justify="between"
    >
      <Flex align="center" gap="sm" minWidth="0">
        <Button
          aria-controls="workspace-navigation"
          aria-expanded={sidebarExpanded}
          aria-label={t(sidebarExpanded ? 'closeSidebar' : 'openSidebar')}
          icon="lucide:panel-left"
          variant="plain"
          onClick={toggleSidebar}
        />
        <Text as={Link} color="muted" to="/dashboard">
          monolith
        </Text>
        <Text aria-hidden="true" color="muted">
          /
        </Text>
        <Text truncate>
          {!isPage &&
          nativePage.data?.page &&
          typeof nativePage.data.page === 'object' &&
          'title' in nativePage.data.page
            ? String(nativePage.data.page.title)
            : areaPage.titleKey
              ? t(`common.canvas:${areaPage.titleKey}`)
              : label}
        </Text>
      </Flex>
      <Flex align="center" gap="xs">
        <Button
          aria-label={t('common.systemSearch:title')}
          as={Link}
          icon="lucide:search"
          to="/search"
          variant="plain"
        />
        <Button
          aria-label={t(derivedTheme === 'dark' ? 'lightTheme' : 'darkTheme')}
          icon={derivedTheme === 'dark' ? 'lucide:sun' : 'lucide:moon'}
          variant="plain"
          onClick={() =>
            void changeTheme(derivedTheme === 'dark' ? 'light' : 'dark')
          }
        />
        <Button
          aria-label={t('account')}
          as={Link}
          icon="lucide:user-round"
          to="/account-settings"
          variant="plain"
        />
      </Flex>
    </Flex>
  )
}
