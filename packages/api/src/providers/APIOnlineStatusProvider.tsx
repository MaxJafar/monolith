// SPDX-License-Identifier: 0BSD
import {
  type ReactNode,
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState
} from 'react'

import { useAPIEndpoint } from './APIEndpointProvider'
import { type ServerEnvironment, checkAPIStatus } from './apiStatus'
import { useConnectionProbe } from './useConnectionProbe'

interface OnlineState {
  isOnline: boolean | 'loading'
  environment: {
    server: ServerEnvironment | null
    client: ServerEnvironment | null
  }
  retry(): void
}
const OnlineContext = createContext<OnlineState | undefined>(undefined)

export function APIOnlineStatusProvider({
  children,
  clientEnvironment
}: {
  children: ReactNode
  clientEnvironment: ServerEnvironment | null
}) {
  const endpoint = useAPIEndpoint()
  const [attempt, setAttempt] = useState(0)
  const result = useConnectionProbe(endpoint, checkAPIStatus, attempt)
  const retry = useCallback(() => setAttempt(value => value + 1), [])
  const value = useMemo<OnlineState>(
    () => ({
      isOnline:
        result.state === 'pending'
          ? 'loading'
          : result.state === 'ready' && result.value !== false,
      environment: {
        server:
          result.state === 'ready' && result.value !== false
            ? result.value
            : null,
        client: clientEnvironment
      },
      retry
    }),
    [result, clientEnvironment, retry]
  )
  return <OnlineContext value={value}>{children}</OnlineContext>
}
export function useAPIOnlineStatus(): OnlineState {
  const state = useContext(OnlineContext)
  if (!state)
    throw new Error('useAPIOnlineStatus requires an APIOnlineStatusProvider')
  return state
}
