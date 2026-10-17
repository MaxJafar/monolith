import { createContext, useContext } from 'react'

import type { AgentState } from './AgentProvider'

export const AgentContext = createContext<AgentState | null>(null)

export function useAgents() {
  const value = useContext(AgentContext)

  if (!value) throw new Error('AgentProvider is required')

  return value
}
