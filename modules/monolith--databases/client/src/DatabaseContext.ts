import { createContext, useContext } from 'react'

import type { DatabaseContextValue } from './DatabaseProvider'

export const DatabaseContext = createContext<DatabaseContextValue | null>(null)

export function useDatabases() {
  const context = useContext(DatabaseContext)

  if (!context) throw new Error('DatabaseProvider is required')

  return context
}
