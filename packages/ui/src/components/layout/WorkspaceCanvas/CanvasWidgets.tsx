import { type ReactNode, createContext, useContext } from 'react'

import type { PageTarget } from '@monolith/blocks'

import type { CanvasPageStorage } from './index'

export type InlineDatabaseMode =
  | 'table'
  | 'kanban'
  | 'calendar'
  | 'gallery'
  | 'list'
  | 'chart'
  | 'dashboard'
  | 'timeline'

export type CanvasWidgetConfiguration = {
  filter: string
  onViewChange?: (id: string) => void
  onHeightChange?: (height: number) => void
  onConfigChange?: (filter: string) => void
  readOnly?: boolean
}

export type CanvasWidgetCatalog = {
  actions?: { id: string; title: string; project: string; done: boolean }[]
  actionsLoading?: boolean
  completeAction?: (id: string) => Promise<void>
  addToDashboard?: (id: string, filter: string) => void
  requestedWidget?: { id: string; filter: string }
  consumeRequestedWidget?: () => void
  pageStorage?: (key: string) => CanvasPageStorage | undefined
  pages?: PageTarget[]
  openPage?: (page: Pick<PageTarget, 'id' | 'kind'>) => void
  databases?: {
    id: string
    workspaceId: string
    name: string
    views: { id: string; name: string }[]
  }[]
  createDatabase?: (
    name: string,
    mode?: InlineDatabaseMode
  ) => Promise<{ workspaceId: string; baseId: string; viewId: string }>
  widgets: Record<
    string,
    { title: string; icon: string; module?: string; filterable?: boolean }
  >
  render: (id: string, configuration?: CanvasWidgetConfiguration) => ReactNode
}

const CanvasWidgets = createContext<CanvasWidgetCatalog>({
  widgets: {},
  render: () => null
})

export function CanvasWidgetExtensionProvider({
  value,
  children
}: {
  value: CanvasWidgetCatalog
  children: ReactNode
}) {
  return <CanvasWidgets value={value}>{children}</CanvasWidgets>
}

export const useCanvasWidgets = () => useContext(CanvasWidgets)
