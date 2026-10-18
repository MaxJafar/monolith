import { createContext, useContext } from 'react'

import type { workspaceAPI } from './workspaceAPI'

export type Workspace = Awaited<
  ReturnType<typeof workspaceAPI.workspaces.list.query>
>[number]

export type WorkspaceState = {
  workspaces: Workspace[]
  active: Workspace | undefined
  select: (id: string) => void
  activate: (id: string) => void
  refresh: () => Promise<unknown>
  loading: boolean
  error: string | undefined
}

export const WorkspaceContext = createContext<WorkspaceState | null>(null)

export function useWorkspace() {
  const context = useContext(WorkspaceContext)

  if (!context) throw Error('Workspace provider is missing')

  return context
}
