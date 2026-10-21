import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  type ReactNode,
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState
} from 'react'
import { useTranslation } from 'react-i18next'
import { useLocation, useNavigate } from 'react-router'

import { useAuth } from '@monolith/api'
import { useFederation } from '@monolith/federation'

import { useAppAppearance } from '@/core/appearance/AppearanceContext'
import { useWorkspace } from '@/core/workspaces/WorkspaceProvider'
import { workspaceAPI } from '@/core/workspaces/workspaceAPI'

import {
  type WorkspaceNavigation,
  archivedNavigationKeys,
  coreAddonPaths,
  moveNavigationItem,
  navigationSchema
} from '../../../../../../../modules/monolith--databases/navigationShared'
import { resolveModuleAvailability } from '../../utils/moduleAvailability'
import { modulePath } from '../../utils/navigation'
import CanvasPagePeek from '../CanvasPagePeek'

export type NavigationItem = {
  key: string
  title: string
  icon: string
  href: string
  kind: 'page' | 'addon'
  parent: string | null
  revision?: number
  id: string
}

type State = ReturnType<typeof useNavigationState>

const Context = createContext<State | null>(null)

export function useNavigation() {
  const value = useContext(Context)

  if (!value) throw Error('Navigation provider missing')

  return value
}

const empty = navigationSchema.parse({})

function useNavigationState() {
  const { active } = useWorkspace(),
    { userData } = useAuth(),
    cache = useQueryClient(),
    navigate = useNavigate(),
    location = useLocation()
  const { moduleGroups } = useFederation(),
    { t } = useTranslation('common.navigation')

  const appearance = useAppAppearance()
  const { t: translate, i18n } = useTranslation()
  const [labelsVersion, setLabelsVersion] = useState(0)

  const [available, setAvailable] = useState(
    moduleGroups.flatMap(group => group.items)
  )
  const [query, setQuery] = useState(''),
    [sort, setSort] = useState('manual'),
    [showHidden, setShowHidden] = useState(false)
  const [pending, setPending] = useState(false),
    [error, setError] = useState(''),
    [announcement, setAnnouncement] = useState('')
  const [createdPage, setCreatedPage] = useState<{
    id: string
    workspace: string
    locationLabel: string
  }>()

  const lock = useRef(false)
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())

  const scope = active?.id ?? '00000000-0000-4000-8000-000000000000'
  const collapsedKey = `monolith:sidebar:${userData?.id}:${scope}`
  const navOptions = workspaceAPI.workspaces.navigation
    .input({ workspace_id: scope })
    .queryOptions()
  const navigation = useQuery({
    ...navOptions,
    queryKey: [...navOptions.queryKey, userData?.id],
    enabled: !!active
  })
  const pageOptions = workspaceAPI.workspaces.pages
    .input({ workspace_id: scope })
    .queryOptions()
  const pages = useQuery({
    ...pageOptions,
    queryKey: [...pageOptions.queryKey, userData?.id],
    enabled: !!active
  })
  useEffect(() => {
    let current = true
    void resolveModuleAvailability(moduleGroups.flatMap(group => group.items))
      .then(items => {
        if (current) setAvailable(items)
      })
      .catch(cause => {
        if (current) setError(String(cause))
      })

    return () => {
      current = false
    }
  }, [moduleGroups])
  useEffect(() => {
    setQuery('')

    try {
      const saved: unknown = JSON.parse(
        localStorage.getItem(collapsedKey) ?? '[]'
      )
      setCollapsed(
        new Set(
          Array.isArray(saved)
            ? saved.filter((id): id is string => typeof id === 'string')
            : []
        )
      )
    } catch {
      setCollapsed(new Set())
    }
    setError('')
  }, [scope, collapsedKey])
  useEffect(() => {
    let current = true

    const namespaces = available
      .filter(item => item.rawModule)
      .map(item => `apps.${item.name}`)
    void i18n
      .loadNamespaces(namespaces)
      .then(() => {
        if (current) setLabelsVersion(version => version + 1)
      })
      .catch(() => undefined)

    return () => {
      current = false
    }
  }, [available, i18n, i18n.resolvedLanguage])
  const config = navigation.data ?? empty
  useEffect(() => {
    const page = pages.data?.find(
      value => location.pathname === value.route_key
    )

    if (!page) return

    const ancestors = new Set<string>()

    let current = page

    while (current.parent_id && !ancestors.has(`page:${current.parent_id}`)) {
      ancestors.add(`page:${current.parent_id}`)
      const parent = pages.data?.find(value => value.id === current.parent_id)

      if (!parent) break
      current = parent
    }
    ancestors.add(
      config.items.find(value => value.key === `page:${current.id}`)?.group ??
        'pages'
    )
    setCollapsed(old =>
      [...ancestors].some(key => old.has(key))
        ? new Set([...old].filter(key => !ancestors.has(key)))
        : old
    )
  }, [location.pathname, pages.data, config.items])
  const items = useMemo<NavigationItem[]>(
    () => [
      ...(pages.data ?? [])
        .filter(page => page.route_key.startsWith('/page/'))
        .map(page => ({
          key: `page:${page.id}`,
          id: page.id,
          kind: 'page' as const,
          title: page.title,
          icon:
            appearance.pages[page.route_key]?.icon ||
            page.icon ||
            'lucide:file-text',
          href: `/page/${page.id}?workspace=${scope}`,
          parent: page.parent_id,
          revision: page.revision
        })),
      ...available
        .filter(
          item =>
            item.rawModule &&
            item.rawModule.experience?.kind !== 'widget' &&
            !item.disabled &&
            !item.hidden &&
            !coreAddonPaths.has(modulePath(item.name).slice(1)) &&
            active?.enabled_modules.includes(modulePath(item.name).slice(1))
        )
        .map(item => ({
          key: `addon:${modulePath(item.name).slice(1)}`,
          id: modulePath(item.name).slice(1),
          kind: 'addon' as const,
          title:
            config.items.find(
              value => value.key === `addon:${modulePath(item.name).slice(1)}`
            )?.label ||
            (i18n.exists(`apps.${item.name}:title`)
              ? translate(`apps.${item.name}:title`)
              : item.rawModule?.displayName || item.name),
          icon:
            appearance.pages[modulePath(item.name)]?.icon ||
            item.icon ||
            'lucide:puzzle',
          href: `${modulePath(item.name)}?workspace=${scope}`,
          parent: null
        }))
    ],
    [
      pages.data,
      available,
      active?.enabled_modules,
      scope,
      translate,
      i18n,
      labelsVersion,
      config.items,
      appearance.pages
    ]
  )
  const groups = [
    { id: 'pages', name: t('pages') },
    ...config.groups,
    { id: 'addons', name: t('addons') }
  ]
  const settings = new Map(config.items.map(item => [item.key, item]))
  const rank = new Map(config.items.map((item, index) => [item.key, index]))
  const canEdit =
    !!active && active.role !== 'viewer' && !!navigation.data && !pending
  const groupFor = (item: NavigationItem) =>
    settings.get(item.key)?.group ?? (item.kind === 'page' ? 'pages' : 'addons')
  const isHidden = (item: NavigationItem) =>
    settings.get(item.key)?.hidden ?? false
  const archived = useMemo(
    () => archivedNavigationKeys(config, items),
    [config, items]
  )
  const isArchived = (item: NavigationItem) => archived.has(item.key)
  const ordered = [...items].sort((a, b) =>
    sort === 'name'
      ? a.title.localeCompare(b.title)
      : (rank.get(a.key) ?? 10000) - (rank.get(b.key) ?? 10000)
  )
  const byKey = new Map(items.map(item => [item.key, item]))
  const completeConfig = {
    ...config,
    items: [
      ...config.items,
      ...items
        .filter(item => !settings.has(item.key))
        .map(item => ({ key: item.key, group: groupFor(item), hidden: false }))
    ]
  }
  const children = (parent: string | null, group?: string): NavigationItem[] =>
    ordered.filter(
      item =>
        item.parent === parent &&
        !isArchived(item) &&
        (parent !== null || !group || groupFor(item) === group) &&
        (showHidden || !isHidden(item))
    )
  const matches = (
    item: NavigationItem,
    visited = new Set<string>()
  ): boolean => {
    if (
      !query.trim() ||
      item.title.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase())
    )
      return true
    if (visited.has(item.key)) return false
    visited.add(item.key)

    return children(item.id).some(child => matches(child, visited))
  }

  async function run(action: () => Promise<void>) {
    if (!canEdit || lock.current) return false
    lock.current = true
    setPending(true)
    setError('')

    try {
      await action()

      return true
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause))
      await navigation.refetch()
      await pages.refetch()

      return false
    } finally {
      lock.current = false
      setPending(false)
    }
  }

  async function save(next: WorkspaceNavigation) {
    const saved = await workspaceAPI.workspaces.saveNavigation
      .input({ workspace_id: scope })
      .mutate(next)
    cache.setQueryData([...navOptions.queryKey, userData?.id], saved)
    setAnnouncement(t('saved'))
  }

  const refreshPages = async () => {
    await cache.invalidateQueries({
      queryKey: workspaceAPI.workspaces.pages.key
    })
    await cache.invalidateQueries({
      queryKey: workspaceAPI.workspaces.getPage.key
    })
  }

  async function createPage(parent: string | null = null, group = 'pages') {
    return run(async () => {
      const page = await workspaceAPI.workspaces.createPage
        .input({ workspace_id: scope })
        .mutate({ title: t('untitled'), parent_id: parent })

      if (group !== 'pages')
        await save(moveNavigationItem(completeConfig, `page:${page.id}`, group))
      setCollapsed(old => {
        const next = new Set(old)

        if (parent) next.delete(`page:${parent}`)
        next.delete(group)

        return next
      })
      await refreshPages()
      setCreatedPage({
        id: page.id,
        workspace: scope,
        locationLabel: parent
          ? (byKey.get(`page:${parent}`)?.title ?? t('pages'))
          : (groups.find(item => item.id === group)?.name ?? t('pages'))
      })
    })
  }

  async function move(
    key: string,
    group: string,
    before?: string,
    parent: string | null = null
  ) {
    return run(async () => {
      const item = byKey.get(key)

      if (!item || key === before) return
      if (item.kind === 'page' && item.parent !== parent)
        await workspaceAPI.workspaces.updatePageMetadata
          .input({ id: item.id })
          .mutate({ parent_id: parent, expected_revision: item.revision! })
      await save(moveNavigationItem(completeConfig, key, group, before))
      await refreshPages()
      setCollapsed(old => {
        const next = new Set(old)
        next.delete(group)
        if (parent) next.delete(`page:${parent}`)

        return next
      })
    })
  }

  async function rename(
    item: NavigationItem,
    title: string,
    icon?: string,
    color?: string
  ) {
    return run(async () => {
      if (item.kind === 'page') {
        await workspaceAPI.workspaces.updatePageMetadata
          .input({ id: item.id })
          .mutate({ title, expected_revision: item.revision! })
        await refreshPages()
      }
      await save({
        ...completeConfig,
        items: completeConfig.items.map(value =>
          value.key === item.key
            ? {
                ...value,
                ...(item.kind === 'addon' ? { label: title } : {}),
                icon,
                color
              }
            : value
        )
      })
    })
  }

  async function remove(item: NavigationItem) {
    return run(async () => {
      if (item.kind === 'page') {
        await workspaceAPI.workspaces.removePage
          .input({ id: item.id })
          .mutate({ expected_revision: item.revision! })
        await refreshPages()
        if (location.pathname === `/page/${item.id}`)
          navigate(`/dashboard?workspace=${scope}`)
      }
      await save({
        ...config,
        items: [
          ...config.items.filter(value => value.key !== item.key),
          ...(item.kind === 'addon'
            ? [
                {
                  ...config.items.find(value => value.key === item.key),
                  key: item.key,
                  group: groupFor(item),
                  hidden: true
                }
              ]
            : [])
        ]
      })
    })
  }

  async function hide(item: NavigationItem) {
    return run(() =>
      save({
        ...completeConfig,
        items: completeConfig.items.map(value =>
          value.key === item.key ? { ...value, hidden: !isHidden(item) } : value
        )
      })
    )
  }

  async function archive(item: NavigationItem, archived = true) {
    return run(() =>
      save({
        ...completeConfig,
        items: completeConfig.items.map(saved =>
          saved.key === item.key ? { ...saved, archived } : saved
        )
      })
    )
  }

  async function addGroup(
    name: string,
    icon = 'lucide:folder',
    color?: string
  ) {
    return run(() =>
      save({
        ...config,
        groups: [
          ...config.groups,
          { id: crypto.randomUUID(), name, icon, color: color || undefined }
        ]
      })
    )
  }

  async function renameGroup(
    id: string,
    name: string,
    icon?: string,
    color?: string
  ) {
    return run(() =>
      save({
        ...config,
        groups: config.groups.map(group =>
          group.id === id
            ? { ...group, name, icon, color: color || undefined }
            : group
        )
      })
    )
  }

  async function removeGroup(id: string) {
    return run(() =>
      save({
        ...config,
        groups: config.groups.filter(group => group.id !== id),
        items: config.items.map(item =>
          item.group === id
            ? {
                ...item,
                group: item.key.startsWith('page:') ? 'pages' : 'addons'
              }
            : item
        )
      })
    )
  }

  async function reorderGroup(id: string, offset: number) {
    return run(async () => {
      const groups = [...config.groups],
        index = groups.findIndex(group => group.id === id),
        target = index + offset

      if (index < 0 || target < 0 || target >= groups.length) return

      const [group] = groups.splice(index, 1)

      if (group) groups.splice(target, 0, group)
      await save({ ...config, groups })
    })
  }

  const toggle = (id: string) =>
    setCollapsed(old => {
      const next = new Set(old)

      if (next.has(id)) next.delete(id)
      else next.add(id)

      try {
        localStorage.setItem(collapsedKey, JSON.stringify([...next]))
      } catch {
        /* Navigation still works without storage. */
      }

      return next
    })

  return {
    active,
    scope,
    items,
    groups,
    query,
    setQuery,
    sort,
    setSort,
    showHidden,
    setShowHidden,
    pending,
    error: error || navigation.error?.message || pages.error?.message,
    announcement,
    canEdit,
    config,
    children,
    matches,
    isHidden,
    isArchived,
    archive,
    groupFor,
    collapsed,
    toggle,
    createPage,
    createdPage,
    closeCreatedPage: () => setCreatedPage(undefined),
    move,
    rename,
    remove,
    hide,
    addGroup,
    renameGroup,
    removeGroup,
    reorderGroup,
    loading: !navigation.isFetched || !pages.isFetched
  }
}

export function NavigationProvider({ children }: { children: ReactNode }) {
  const state = useNavigationState()

  return (
    <Context value={state}>
      {children}
      {state.createdPage && (
        <CanvasPagePeek
          {...state.createdPage}
          onClose={state.closeCreatedPage}
        />
      )}
    </Context>
  )
}
