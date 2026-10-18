import { createContext, useContext } from 'react'

import type { Appearance, AppearanceScope } from '@monolith/blocks'

export type AppearanceState = {
  global: Appearance
  workspace: Appearance
  pages: Record<string, Appearance>
  pageKey: string
  workspaceId: string
  accountId: string
  globalRevision: number
  workspaceRevision: number
  canEdit: boolean
  ready: boolean
  error: string
  openEditor: (scope?: AppearanceScope) => void
  reload: () => Promise<void>
  save: (
    scope: AppearanceScope,
    appearance: Appearance,
    revision: number
  ) => Promise<number>
}

export const AppAppearanceContext = createContext<AppearanceState | null>(null)

export function useAppAppearance() {
  const state = useContext(AppAppearanceContext)

  if (!state) throw Error('Appearance provider missing')

  return state
}
