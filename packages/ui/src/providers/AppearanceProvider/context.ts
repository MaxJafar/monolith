import { createContext, useContext } from 'react'

import type { Appearance, AppearanceScope } from '@monolith/blocks'

export type AppearanceContextValue = {
  appearance: Appearance
  openEditor?: (scope?: AppearanceScope) => void
  changeCover?: (cover: Appearance['cover']) => Promise<void>
  changeIcon?: (icon: Appearance['icon']) => Promise<void>
  readOnly?: boolean
}

export const AppearanceContext = createContext<AppearanceContextValue>({
  appearance: {}
})

export function useAppearance() {
  return useContext(AppearanceContext)
}
