import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useRef, useState } from 'react'
import { useSearchParams } from 'react-router'

import { useAuth } from '@lifeforge/api'
import { useModuleTranslation } from '@lifeforge/localization'

import { forgeAPI } from '@/manifest'

import type { AgentSnapshot } from '../../shared'
import { AgentContext } from './AgentContext'

const empty: AgentSnapshot = {
  playbooks: [],
  principals: [],
  projects: [],
  members: [],
  tasks: [],
  runs: [],
  activity: [],
  credentials: [],
  pages: [],
  usage: []
}

function useAgentState() {
  const { t } = useModuleTranslation()
  const client = useQueryClient()
  const [params, setParams] = useSearchParams()
  const { userData } = useAuth()

  const query = useQuery({
    queryKey: [...forgeAPI.snapshot.key, userData?.id, params.get('workspace')],
    queryFn: () => forgeAPI.snapshot.query(),
    staleTime: 0,
    refetchOnWindowFocus: true,
    refetchInterval: 10000
  })

  const [busy, setBusy] = useState(false),
    [error, setError] = useState('')
  const data = query.data ?? empty
  const requested = params.get('section') ?? 'work'
  const section = ['work', 'people', 'runs', 'usage', 'playbooks'].includes(
    requested
  )
    ? requested
    : 'work'

  const acting = useRef(false)

  function navigate(updates: Record<string, string | null>) {
    setParams(current => {
      const next = new URLSearchParams(current)

      for (const [key, value] of Object.entries(updates)) {
        if (value === null) next.delete(key)
        else next.set(key, value)
      }

      return next
    })
  }

  async function act(job: () => Promise<unknown>) {
    if (acting.current) return false
    acting.current = true
    setBusy(true)
    setError('')

    try {
      await job()
      await client.invalidateQueries({ queryKey: forgeAPI.key })

      return true
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : t('failed'))

      return false
    } finally {
      acting.current = false
      setBusy(false)
    }
  }

  return { data, section, params, navigate, act, busy, error, query, setError }
}

export type AgentState = ReturnType<typeof useAgentState>

export function AgentProvider({ children }: { children: React.ReactNode }) {
  const value = useAgentState()

  return <AgentContext value={value}>{children}</AgentContext>
}
