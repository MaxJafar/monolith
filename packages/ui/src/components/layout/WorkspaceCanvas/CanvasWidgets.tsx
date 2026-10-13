import { type ReactNode, createContext, useContext } from 'react'

import type { PageTarget } from '@lifeforge/blocks'

import type { CanvasPageStorage } from './index'

export type CanvasWidgetCatalog = {
  pageStorage?: (key: string) => CanvasPageStorage | undefined
  pages?: PageTarget[]
  openPage?: (page: Pick<PageTarget, 'id' | 'kind'>) => void
  databases?: {
    id: string
    workspaceId: string
    name: string
    views: { id: string; name: string }[]
  }[]
  widgets: Record<string, { title: string; icon: string; filterable?: boolean }>
  render: (id: string, configuration?: { filter: string }) => ReactNode
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
