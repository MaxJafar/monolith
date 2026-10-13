import { useQuery , useQueryClient } from '@tanstack/react-query'
import { Suspense, useEffect, useMemo, useState } from 'react'
import { ErrorBoundary } from 'react-error-boundary'
import { useTranslation } from 'react-i18next'
import { useLocation, useNavigate } from 'react-router'

import { useAuth } from '@lifeforge/api'
import { type CanvasPage, validateCanvasPage } from '@lifeforge/blocks'
import { ModuleMetadataProvider } from '@lifeforge/federation'
import { CanvasWidgetExtensionProvider, Text } from '@lifeforge/ui'

import { useWorkspace } from '@/core/workspaces/WorkspaceProvider'
import { workspaceArea } from '@/core/workspaces/areaPage'
import { workspaceAPI } from '@/core/workspaces/workspaceAPI'
import WidgetProvider, {
  useWidgets
} from '@/system/dashboard/providers/WidgetProvider'

import { modulePath } from '../utils/navigation'

function Bridge({ children }: { children: React.ReactNode }) {
  const { active } = useWorkspace(),
    { userData } = useAuth()
  
const cache = useQueryClient()
  const location = useLocation()
  const navigate = useNavigate()
  
const databaseEndpoint = workspaceAPI.workspaceDatabases.snapshot.input({
    workspace_id: active?.id ?? '00000000-0000-4000-8000-000000000000'
  })
  const options = databaseEndpoint.queryOptions()
  const databases = useQuery({
    ...options,
    queryKey: [...options.queryKey, userData?.id],
    enabled: !!active
  })
  const pageEndpoint = workspaceAPI.workspaces.pages.input({
    workspace_id: active?.id ?? '00000000-0000-4000-8000-000000000000'
  })
  const pageOptions = pageEndpoint.queryOptions()
  const pages = useQuery({
    ...pageOptions,
    queryKey: [...pageOptions.queryKey, userData?.id],
    enabled: !!active
  })
  
const { widgets, getComponent, loading } = useWidgets()
  const { t, i18n } = useTranslation('common.canvas')
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
      pageStorage: (key: string) => {
        if (!active) return undefined

        const area = workspaceArea(key, location.search)
        const endpoint = workspaceAPI.workspaces.getAreaPage.input({
          workspace_id: active.id,
          key: area.key
        })

        return {
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
        if (page.kind === 'document') navigate(`/page/${page.id}`)
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
      databases: (databases.data?.bases ?? []).map(base => ({
        id: base.id,
        name: base.name,
        workspaceId: active!.id,
        views: (databases.data?.views ?? [])
          .filter(view => view.base_id === base.id)
          .map(view => ({ id: view.id, name: view.name }))
      })),
      widgets: Object.fromEntries(
        Object.entries(widgets)
          .filter(
            ([, widget]) =>
              !active ||
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
              filterable: [
                'projectOverview',
                'techLabServices',
                'techLabDevice'
              ].includes(id)
            }
          ])
      ),
      render: (id: string, configuration?: { filter: string }) => {
        const widget = widgets[id]

        if (loading) return <Text role="status">{t('loading')}</Text>
        if (!widget) return <Text color="muted">{t('unavailableWidget')}</Text>

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
                <Component
                  dimension={{ w: 600, h: 300 }}
                  filter={configuration?.filter ?? ''}
                  widgetId={id}
                />
              </Suspense>
            </ModuleMetadataProvider>
          </ErrorBoundary>
        )
      }
    }),
    [
      widgets,
      getComponent,
      loading,
      t,
      i18n,
      labelsReady,
      databases.data,
      active,
      pages.data,
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
