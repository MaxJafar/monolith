// SPDX-License-Identifier: 0BSD
import { type RefObject, Suspense } from 'react'
import { ErrorBoundary } from 'react-error-boundary'
import { Responsive } from 'react-grid-layout'
import { useTranslation } from 'react-i18next'

import { ModuleMetadataProvider } from '@monolith/federation'
import {
  Box,
  LoadingScreen,
  useDivSize,
  usePersonalization
} from '@monolith/ui'

import { useUserPersonalization } from '@/core/providers/features/UserPersonalizationProvider'

import { useWidgets } from '../providers/WidgetProvider'
import {
  readDashboardLayout,
  shouldPersistDashboardLayout
} from '../utils/layout'
import NotFoundWidget from './NotFoundWidget'
import WorkspaceOverview from './WorkspaceOverview'

const breakpoints = { lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }
export default function DashboardGrid({
  wrapperRef,
  canLayoutChange
}: {
  wrapperRef: RefObject<HTMLDivElement | null>
  canLayoutChange: boolean
}) {
  const { dashboardLayout } = usePersonalization(),
    save = useUserPersonalization(),
    catalog = useWidgets()
  const { width } = useDivSize(wrapperRef),
    { t } = useTranslation('common.dashboard')
  const layout = readDashboardLayout(dashboardLayout)
  const ids = [
    ...new Set(Object.values(layout).flatMap(rows => rows.map(row => row.i)))
  ]
  if (!ids.length) return <WorkspaceOverview />
  if (!width) return <LoadingScreen message={t('loading')} />
  const breakpoint =
    Object.entries(breakpoints).find(([, minimum]) => width >= minimum)?.[0] ??
    'xxs'
  return (
    <Responsive
      className="monolith-dashboard-grid"
      width={width}
      breakpoints={breakpoints}
      cols={{ lg: 8, md: 8, sm: 4, xs: 4, xxs: 4 }}
      layouts={layout}
      containerPadding={[0, 0]}
      margin={[12, 12]}
      rowHeight={100}
      isDraggable={canLayoutChange}
      isResizable={canLayoutChange}
      onLayoutChange={(_, computed) => {
        if (shouldPersistDashboardLayout(canLayoutChange, layout, computed))
          void save.changeDashboardLayout(computed)
      }}
    >
      {ids.map(id => {
        const { component: View, name } = catalog.getComponent(id)
        const tile = layout[breakpoint]?.find(row => row.i === id)
        const dimension = { w: tile?.w ?? 4, h: tile?.h ?? 4 }
        return (
          <Box key={id} position="relative" className="monolith-dashboard-tile">
            <ErrorBoundary
              resetKeys={[View]}
              fallback={<NotFoundWidget widgetId={id} dimension={dimension} />}
            >
              <Suspense fallback={<LoadingScreen message={t('loading')} />}>
                {catalog.loading ? (
                  <LoadingScreen message={t('loading')} />
                ) : (
                  <ModuleMetadataProvider value={{ name, title: '', icon: '' }}>
                    <View widgetId={id} dimension={dimension} />
                  </ModuleMetadataProvider>
                )}
              </Suspense>
            </ErrorBoundary>
            {canLayoutChange && (
              <div
                className="monolith-dashboard-drag-cover"
                aria-hidden="true"
              />
            )}
          </Box>
        )
      })}
    </Responsive>
  )
}
