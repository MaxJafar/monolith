import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  type ComponentType,
  Suspense,
  useEffect,
  useMemo,
  useRef,
  useState
} from 'react'
import { ErrorBoundary } from 'react-error-boundary'
import { useTranslation } from 'react-i18next'
import { useLocation, useNavigate } from 'react-router'

import { useAPIEndpoint, useAuth } from '@monolith/api'
import { type CanvasPage, validateCanvasPage } from '@monolith/blocks'
import { ModuleMetadataProvider } from '@monolith/federation'
import {
  Box,
  type CanvasWidgetConfiguration,
  CanvasWidgetExtensionProvider,
  type InlineDatabaseMode,
  Text
} from '@monolith/ui'

import { CharacterWidget } from '@/addons/urpg/Character'
import { useWorkspace } from '@/core/workspaces/WorkspaceProvider'
import { workspaceArea } from '@/core/workspaces/areaPage'
import { workspaceAPI } from '@/core/workspaces/workspaceAPI'
import WidgetProvider, {
  useWidgets
} from '@/system/dashboard/providers/WidgetProvider'

import { coreAddonPaths } from '../../../../../../modules/monolith--databases/navigationShared'
import { modulePath } from '../utils/navigation'
import { WorkspaceWidget, coreWidgets } from './WorkspaceWidgets'

const rpgWidgets = {
  rpgProfile: 'profile',
  rpgVitals: 'vitals',
  rpgXP: 'xp'
} as const

function Bridge({ children }: { children: React.ReactNode }) {
  const { active } = useWorkspace(),
    { userData } = useAuth()

  const endpoint = useAPIEndpoint()
  const cache = useQueryClient()
  const location = useLocation()
  const navigate = useNavigate()

  const [requestedWidget, setRequestedWidget] = useState<{
    id: string
    filter: string
  }>()
  useEffect(
    () => setRequestedWidget(undefined),
    [active?.id, endpoint, userData?.id]
  )

  const databaseEndpoint = workspaceAPI.workspaceDatabases.snapshot.input({
    workspace_id: active?.id ?? '00000000-0000-4000-8000-000000000000'
  })
  const options = databaseEndpoint.queryOptions()
  const databases = useQuery({
    ...options,
    queryKey: [...options.queryKey, endpoint, userData?.id],
    enabled: !!active
  })
  const pageEndpoint = workspaceAPI.workspaces.pages.input({
    workspace_id: active?.id ?? '00000000-0000-4000-8000-000000000000'
  })
  const pageOptions = pageEndpoint.queryOptions()
  const pages = useQuery({
    ...pageOptions,
    queryKey: [...pageOptions.queryKey, endpoint, userData?.id],
    enabled: !!active
  })

  const { widgets, getComponent, loading } = useWidgets()

  const resourceOptions = workspaceAPI.workspaceGraph.resources
    .input({
      workspace_id: active?.id ?? '00000000-0000-4000-8000-000000000000'
    })
    .queryOptions({ refetchInterval: 5000 })
  const resources = useQuery({
    ...resourceOptions,
    queryKey: [...resourceOptions.queryKey, endpoint, userData?.id],
    enabled: !!active && !!userData?.id
  })

  const { t, i18n } = useTranslation(['common.canvas', 'common.widgets'])
  const [labelsReady, setLabelsReady] = useState('')

  const namespaceKey = [
    ...new Set(
      Object.values(widgets).map(widget => `apps.${widget.moduleName}`)
    )
  ]
    .sort()
    .join('|')
  const language = i18n.resolvedLanguage

  useEffect(() => {
    if (!namespaceKey) return
    let cancelled = false
    void i18n
      .loadNamespaces(namespaceKey.split('|'))
      .then(() => {
        if (!cancelled) setLabelsReady(`${language}:${namespaceKey}`)
      })
      .catch(() => undefined)

    return () => {
      cancelled = true
    }
  }, [i18n, language, namespaceKey])

  const value = useMemo(
    () => ({
      requestedWidget,
      consumeRequestedWidget: () => setRequestedWidget(undefined),
      addToDashboard: (id: string, filter: string) => {
        if (!active || active.role === 'viewer') return
        setRequestedWidget({ id, filter })
        navigate(`/dashboard?workspace=${active.id}`)
      },
      actions: (databases.data?.records ?? [])
        .filter(row => row.item_type === 'task')
        .map(row => ({
          id: row.id,
          title: row.title,
          done: row.done || row.status === 'done',
          project:
            databases.data?.records.find(
              project => project.id === row.project_id
            )?.title ?? ''
        })),
      actionsLoading: databases.isFetching || databases.isError,
      completeAction:
        active && active.role !== 'viewer' && !databases.isError
          ? async (id: string) => {
              const task = databases.data?.records.find(
                row => row.id === id && row.item_type === 'task'
              )

              if (!task)
                throw new Error(
                  'This action is no longer available in this workspace.'
                )
              await workspaceAPI.workspaceDatabases.updateRecord
                .input({ workspace_id: active.id, id })
                .mutate({
                  expected_updated: task.updated,
                  done: true,
                  status: 'done'
                })
              await cache.invalidateQueries({
                queryKey: workspaceAPI.workspaceDatabases.snapshot.key
              })
              await cache.invalidateQueries({
                queryKey: workspaceAPI.snapshot.key
              })
            }
          : undefined,
      pageStorage: (key: string) => {
        if (!active) return undefined

        const area = workspaceArea(key, location.search)
        const endpoint = workspaceAPI.workspaces.getAreaPage.input({
          workspace_id: active.id,
          key: area.key
        })

        return {
          canonical: pages.data?.some(page => page.route_key === area.key)
            ? {
                workspaceId: active.id,
                source: {
                  kind: 'page' as const,
                  id: pages.data.find(page => page.route_key === area.key)!.id
                }
              }
            : undefined,
          title: area.titleKey ? t(area.titleKey) : undefined,
          queryKey: [...endpoint.queryOptions().queryKey, userData?.id],
          readOnly: active.role === 'viewer',
          load: async () => {
            const result = await endpoint.query()

            if (result.page !== null) validateCanvasPage(result.page)

            return { page: result.page }
          },
          save: async (page: CanvasPage) => {
            const result = await workspaceAPI.workspaces.saveAreaPage
              .input({ workspace_id: active.id, key: area.key })
              .mutate({ page, expected_revision: page.revision })
            validateCanvasPage(result.page)

            return { page: result.page }
          },
          onSaved: () =>
            cache.invalidateQueries({
              queryKey: workspaceAPI.workspaces.pages.key
            })
        }
      },
      pages: [
        ...(resources.data ?? []),
        ...(pages.data ?? [])
          .filter(page => page.route_key.startsWith('/page/'))
          .map(page => ({
            id: page.id,
            title: page.title,
            kind: 'document' as const,
            context: active?.name ?? ''
          })),
        ...(databases.data?.records ?? []).map(record => ({
          id: record.id,
          title: record.title,
          kind: 'record' as const,
          context:
            databases.data?.bases.find(base => base.id === record.base_id)
              ?.name ?? ''
        }))
      ],
      openPage: (page: { id: string; kind: string }) => {
        if (page.kind === 'redraw') {
          const file = resources.data?.find(
            file => file.kind === 'redraw' && file.id === page.id
          )

          if (file?.href) navigate(file.href)

          return
        }

        if (page.kind === 'document')
          navigate(`/page/${page.id}?workspace=${active?.id ?? ''}`)
        else {
          const record = databases.data?.records.find(
            record => record.id === page.id
          )

          if (record)
            navigate(
              `/databases?${new URLSearchParams({ workspace: active!.id, base: record.base_id, record: record.id })}`
            )
        }
      },
      createDatabase:
        active?.role === 'viewer' || !active
          ? undefined
          : async (name: string, mode: InlineDatabaseMode = 'table') => {
              const base = await workspaceAPI.workspaceDatabases.createBase
                .input({ workspace_id: active.id })
                .mutate({
                  name,
                  description: '',
                  initial_view: mode,
                  view_name: t(`common:inlineDatabase.modes.${mode}`)
                })
              const latest = await databases.refetch()

              return {
                workspaceId: active.id,
                baseId: base.id,
                viewId:
                  latest.data?.views.find(view => view.base_id === base.id)
                    ?.id ?? ''
              }
            },
      databases: (databases.data?.bases ?? []).map(base => ({
        id: base.id,
        name: base.name,
        workspaceId: active!.id,
        views: (databases.data?.views ?? [])
          .filter(view => view.base_id === base.id)
          .map(view => ({ id: view.id, name: view.name }))
      })),
      widgets: {
        ...(active?.enabled_modules.includes('urpg')
          ? Object.fromEntries(
              Object.keys(rpgWidgets).map(id => [
                id,
                {
                  title: t(`common:urpg.widgets.${id}`),
                  icon: 'lucide:swords',
                  module: 'urpg'
                }
              ])
            )
          : {}),
        ...Object.fromEntries(
          Object.entries(coreWidgets).map(([id, icon]) => [
            id,
            { title: t(`common.widgets:catalog.${id}`), icon, module: 'core' }
          ])
        ),
        ...Object.fromEntries(
          Object.entries(widgets)
            .filter(
              ([, widget]) =>
                !active ||
                coreAddonPaths.has(modulePath(widget.moduleName).slice(1)) ||
                active.enabled_modules.some(
                  module => module === modulePath(widget.moduleName).slice(1)
                )
            )
            .map(([id, widget]) => [
              id,
              {
                title: (() => {
                  const keys = [
                    `common.canvas:widgets.${id}`,
                    `apps.${widget.moduleName}:widgets.${id}.title`,
                    `apps.${widget.moduleName}:widgets.${id}`
                  ]
                  const key = keys.find(key => i18n.exists(key))

                  return key
                    ? t(key)
                    : id
                        .replace(/([a-z])([A-Z])/g, '$1 $2')
                        .replace(/^./, letter => letter.toUpperCase())
                })(),
                icon: widget.icon,
                module: widget.moduleName,
                filterable: [
                  'projectOverview',
                  'techLabServices',
                  'techLabDevice',
                  'techLabUptime',
                  'techLabFleet'
                ].includes(id)
              }
            ])
        )
      },
      render: (id: string, configuration?: CanvasWidgetConfiguration) => {
        if (id in rpgWidgets && active?.enabled_modules.includes('urpg'))
          return (
            <CharacterWidget
              key={`${active.id}:${id}`}
              mode={rpgWidgets[id as keyof typeof rpgWidgets]}
              readOnly={active.role === 'viewer' || configuration?.readOnly}
            />
          )
        if (Object.prototype.hasOwnProperty.call(coreWidgets, id))
          return (
            <WorkspaceWidget
              key={`${active?.id}:${userData?.id}:${id}`}
              configuration={configuration}
              data={databases.data}
              failed={databases.isError}
              id={id}
              loading={databases.isPending}
              readOnly={
                active?.role === 'viewer' ||
                !active ||
                !!configuration?.readOnly
              }
              retry={() => {
                void databases.refetch()
              }}
              workspaceId={active?.id ?? ''}
            />
          )

        const widget = widgets[id]

        if (loading) return <Text role="status">{t('loading')}</Text>
        if (
          !widget ||
          (active &&
            !coreAddonPaths.has(modulePath(widget.moduleName).slice(1)) &&
            !active.enabled_modules.includes(
              modulePath(widget.moduleName).slice(1)
            ))
        )
          return <Text color="muted">{t('unavailableWidget')}</Text>

        const { component: Component, name } = getComponent(id)

        return (
          <ErrorBoundary
            key={id}
            fallback={<Text role="alert">{t('unavailableWidget')}</Text>}
          >
            <ModuleMetadataProvider
              value={{
                name: name ?? '',
                title: widget.moduleName,
                icon: widget.icon
              }}
            >
              <Suspense fallback={<Text role="status">{t('loading')}</Text>}>
                <MeasuredWidget
                  component={Component}
                  configuration={{
                    ...configuration,
                    filter: configuration?.filter ?? '',
                    readOnly:
                      active?.role === 'viewer' ||
                      !active ||
                      !!configuration?.readOnly
                  }}
                  id={id}
                />
              </Suspense>
            </ModuleMetadataProvider>
          </ErrorBoundary>
        )
      }
    }),
    [
      requestedWidget,
      widgets,
      getComponent,
      loading,
      t,
      i18n,
      labelsReady,
      databases.data,
      databases.isPending,
      databases.isFetching,
      databases.isError,
      active,
      pages.data,
      resources.data,
      endpoint,
      userData?.id,
      cache,
      location.search,
      navigate
    ]
  )

  return (
    <CanvasWidgetExtensionProvider value={value}>
      {children}
    </CanvasWidgetExtensionProvider>
  )
}

export default function CanvasWidgetBridge({
  children
}: {
  children: React.ReactNode
}) {
  return (
    <WidgetProvider>
      <Bridge>{children}</Bridge>
    </WidgetProvider>
  )
}

function MeasuredWidget({
  component: Component,
  id,
  configuration
}: {
  component: ComponentType<{
    dimension: { w: number; h: number }
    filter: string
    widgetId: string
    readOnly?: boolean
    onViewChange?: (id: string) => void
    onHeightChange?: (height: number) => void
    onConfigChange?: (filter: string) => void
  }>
  id: string
  configuration?: CanvasWidgetConfiguration
}) {
  const element = useRef<HTMLDivElement>(null)
  const [dimension, setDimension] = useState({ w: 600, h: 300 })

  useEffect(() => {
    if (!element.current) return
    let frame = 0

    const observer = new ResizeObserver(([entry]) => {
      if (!entry) return
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() =>
        setDimension(current => {
          const w = Math.round(entry.contentRect.width)

          return w === current.w ? current : { w, h: current.h }
        })
      )
    })
    observer.observe(element.current)

    return () => {
      observer.disconnect()
      cancelAnimationFrame(frame)
    }
  }, [])

  return (
    <Box ref={element} minWidth="0">
      <Component
        dimension={dimension}
        filter={configuration?.filter ?? ''}
        readOnly={configuration?.readOnly}
        widgetId={id}
        onConfigChange={configuration?.onConfigChange}
        onHeightChange={configuration?.onHeightChange}
        onViewChange={configuration?.onViewChange}
      />
    </Box>
  )
}
