import { createContext, useContext } from 'react'

import type { GymState } from './GymProvider'

export const GymContext = createContext<GymState | null>(null)

export function useGym() {
  const value = useContext(GymContext)

  if (!value) throw new Error('GymProvider is missing')

  return value
}
