import {
  type ReactNode,
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState
} from 'react'

import { refreshAccessToken } from '../client/axios'
import { useAPIEndpoint } from '../providers/APIEndpointProvider'
import { useAuth } from '../providers/AuthProvider'
import {
  type DraftStore,
  IndexedDBDraftStore,
  assertSignOutResolved
} from './draftStore'
import { getNativeRuntime } from './runtime'
import { registerSignOutGuard } from './sessionGuards'
import {
  type ApiTransport,
  BrowserTransport,
  type Discovery,
  GatewayClient,
  assertCompatible
} from './transport'

type GatewayState = {
  client: GatewayClient | null
  drafts: DraftStore
  loading: boolean
  error?: string
}
const browserDrafts = new IndexedDBDraftStore()
const GatewayContext = createContext<GatewayState>({
  client: null,
  drafts: browserDrafts,
  loading: false
})
export const useGateway = () => useContext(GatewayContext)

export function GatewayProvider({
  children,
  transport = getNativeRuntime()?.transport,
  discovery: nativeDiscovery = getNativeRuntime()?.discovery,
  drafts = getNativeRuntime()?.drafts ?? browserDrafts
}: {
  children: ReactNode
  transport?: ApiTransport
  discovery?: Discovery
  drafts?: DraftStore
}) {
  const { userData } = useAuth()
  const endpoint = useAPIEndpoint()
  const [discovery, setDiscovery] = useState<Discovery | null>(
    nativeDiscovery ?? null
  )
  const [loading, setLoading] = useState(!nativeDiscovery)
  const [error, setError] = useState<string>()
  const api = useMemo(
    () =>
      transport ??
      new BrowserTransport(location.origin, () => refreshAccessToken(endpoint)),
    [transport, endpoint]
  )
  useEffect(() => {
    if (nativeDiscovery) {
      setDiscovery(nativeDiscovery)
      setLoading(false)
      return
    }
    const abort = new AbortController()
    setLoading(true)
    setError(undefined)
    const key = `monolith.discovery.${location.origin}`
    void api
      .request({ path: '/.well-known/monolith', signal: abort.signal })
      .then(result => {
        if (
          result.status === 404 ||
          !result.headers['content-type']?.includes('application/json')
        ) {
          setDiscovery(null)
          return
        }
        if (result.status !== 200) throw new Error('Server discovery failed')
        const value = JSON.parse(result.body) as Discovery
        assertCompatible(value)
        setDiscovery(value)
        try {
          localStorage.setItem(key, JSON.stringify(value))
        } catch {
          /* Online editing remains available. */
        }
      })
      .catch(cause => {
        if (abort.signal.aborted) return
        try {
          const cached = JSON.parse(
            localStorage.getItem(key) ?? 'null'
          ) as Discovery | null
          if (cached) {
            assertCompatible(cached)
            setDiscovery(cached)
            return
          }
        } catch {
          /* Incompatible or missing discovery data cannot enable the editor. */
        }
        setError(cause instanceof Error ? cause.message : String(cause))
      })
      .finally(() => {
        if (!abort.signal.aborted) setLoading(false)
      })
    return () => abort.abort()
  }, [api, nativeDiscovery])
  const client = useMemo(
    () =>
      discovery && userData?.id
        ? new GatewayClient(api, {
            serverId: discovery.serverId,
            accountId: userData.id
          })
        : null,
    [api, discovery, userData?.id]
  )
  useEffect(() => {
    if (client)
      return registerSignOutGuard(() =>
        assertSignOutResolved(
          drafts,
          client.identity.serverId,
          client.identity.accountId
        )
      )
  }, [client, drafts])
  return (
    <GatewayContext value={{ client, drafts, loading, error }}>
      {children}
    </GatewayContext>
  )
}
