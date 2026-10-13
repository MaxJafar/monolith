import { createContext, useContext } from 'react'

import type { TechLabState } from './TechLabProvider'

export const TechLabContext = createContext<TechLabState | null>(null)

export function useTechLab() {
  const value = useContext(TechLabContext)

  if (!value) throw new Error('TechLabProvider is missing')

  return value
}
