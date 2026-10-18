import { useQuery } from '@tanstack/react-query'
import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useLocation } from 'react-router'

import { useAuth } from '@monolith/api'
import { Flex, Icon, Text, usePageChrome } from '@monolith/ui'

import { useAppAppearance } from '@/core/appearance/AppearanceContext'
import ItemDiscussions from '@/core/rooms/ItemDiscussions'
import { CalendarInbox } from '@/core/workspaces/CalendarInbox'
import { useWorkspace } from '@/core/workspaces/WorkspaceProvider'
import { workspaceArea } from '@/core/workspaces/areaPage'
import { workspaceAPI } from '@/core/workspaces/workspaceAPI'

import PageActions from './PageActions'
import { useWorkspaceTabs } from './WorkspaceTabs'
import './monolithAppBar.css'

export default function MonolithAppBar() {
  const { t } = useTranslation([
    'common.appBar',
    'common.systemSearch',
    'common.canvas'
  ])

  const tabs = useWorkspaceTabs()
  const chrome = usePageChrome()
  const { pathname, search } = useLocation()
  const { userData } = useAuth()
  const { active } = useWorkspace()
  const appearance = useAppAppearance()
  const { t: systemText } = useTranslation('common.navigation')

  const routeArea = pathname.split('/')[1] ?? 'dashboard'
  const area = routeArea === 'module-manager' ? 'addons' : routeArea
  const isPage = pathname.startsWith('/page/')
  const isSystem = [
    'calendar',
    'projects',
    'actions',
    'rooms',
    'docs',
    'ideas',
    'dashboard',
    'databases',
    'addons',
    'urpg'
  ].includes(area)
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
    enabled: !!active && !isPage && !isSystem
  })

  const pages = useQuery({
    ...options,
    queryKey: [...options.queryKey, userData?.id],
    enabled: !!userData?.id && pathname.startsWith('/page/')
  })

  const label = isSystem
    ? systemText(area === 'addons' ? 'manageAddons' : area)
    : area === 'tech-lab'
      ? t('techLab')
      : area === 'page'
        ? (pages.data?.page.title ?? t('page'))
        : area
            .replace(/-/g, ' ')
            .replace(/\b[a-z]/g, letter => letter.toUpperCase())
  const routeTitle =
    !isPage &&
    !isSystem &&
    nativePage.data?.page &&
    typeof nativePage.data.page === 'object' &&
    'title' in nativePage.data.page
      ? String(nativePage.data.page.title)
      : area === 'search'
        ? t('common.systemSearch:title')
        : areaPage.titleKey
          ? t(`common.canvas:${areaPage.titleKey}`)
          : label
  const title =
    isPage && chrome?.document?.sourceId === pathname.slice(6)
      ? chrome.document.title || t('page')
      : routeTitle
  const icon =
    appearance.pages[appearance.pageKey]?.icon ??
    {
      dashboard: 'lucide:house',
      calendar: 'lucide:calendar-days',
      projects: 'lucide:layers-2',
      actions: 'lucide:circle-check',
      rooms: 'lucide:messages-square',
      docs: 'lucide:files',
      databases: 'lucide:database',
      urpg: 'lucide:swords',
      search: 'lucide:search'
    }[area] ??
    'lucide:file-text'
  useEffect(() => {
    tabs.describe(title, icon)
  }, [tabs.describe, tabs.active, tabs.tabs, title, icon])

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
        <Text
          as={Link}
          className="monolith-breadcrumb-workspace"
          color="muted"
          to={`/dashboard?workspace=${active?.id ?? ''}`}
        >
          {active?.name ?? 'monolith'}
        </Text>
        <Text aria-hidden="true" color="muted">
          /
        </Text>
        <Icon preserveStyle icon={icon} size="16px" />
        <Text truncate>{title}</Text>
      </Flex>
      <Flex align="center" gap="xs">
        <CalendarInbox />
        <ItemDiscussions />
        <PageActions />
      </Flex>
    </Flex>
  )
}
