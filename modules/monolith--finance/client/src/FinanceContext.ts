import { createContext, useContext } from 'react'

import type { FinanceState } from './FinanceProvider'

export const FinanceContext = createContext<FinanceState | null>(null)

export function useFinance() {
  const value = useContext(FinanceContext)

  if (!value) throw new Error('FinanceProvider is missing')

  return value
}
