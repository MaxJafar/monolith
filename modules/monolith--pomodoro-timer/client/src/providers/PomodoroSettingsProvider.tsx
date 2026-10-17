import { useQuery } from '@tanstack/react-query'
import { createContext, useContext } from 'react'

import type { InferOutput } from '@monolith/api'
import { WithQuery } from '@monolith/ui'

import { workspaceAPI } from '@/manifest'

export type PomodoroSettings = InferOutput<typeof workspaceAPI.settings.get>

const PomodoroSettingsContext = createContext<PomodoroSettings | null>(null)

function PomodoroSettingsProvider({ children }: { children: React.ReactNode }) {
  const settingsQuery = useQuery(workspaceAPI.settings.get.queryOptions())

  return (
    <WithQuery query={settingsQuery}>
      {settings => (
        <PomodoroSettingsContext.Provider value={settings}>
          {children}
        </PomodoroSettingsContext.Provider>
      )}
    </WithQuery>
  )
}

export default PomodoroSettingsProvider

export function usePomodoroSettings() {
  const context = useContext(PomodoroSettingsContext)

  if (!context) {
    throw new Error(
      'usePomodoroSettings must be used within a PomodoroSettingsProvider'
    )
  }

  return context
}
