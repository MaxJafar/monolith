import { setAccessToken } from '../client/tokenStore'
import { NativeDraftStore } from './draftStore'
import {
  type ConnectionProfile,
  DesktopTransport,
  type Discovery,
  type NativeHost
} from './transport'

export type NativeRuntime = {
  host: NativeHost
  transport: DesktopTransport
  profile: ConnectionProfile
  discovery: Discovery
  drafts: NativeDraftStore
}
let runtime: NativeRuntime | null = null
export const getNativeRuntime = () => runtime
export function configureNativeRuntime(
  host: NativeHost,
  profile: ConnectionProfile,
  discovery: Discovery,
  accessToken: string
) {
  if (
    runtime?.profile.serverId === profile.serverId &&
    runtime.profile.accountId === profile.accountId
  ) {
    runtime.profile = profile
    runtime.discovery = discovery
    setAccessToken(accessToken)
    return runtime
  }
  runtime = {
    host,
    profile,
    discovery,
    transport: new DesktopTransport(host),
    drafts: new NativeDraftStore(host)
  }
  setAccessToken(accessToken)
  return runtime
}
export function clearNativeRuntime() {
  runtime = null
}

/** Non-Monolith bootstrap reads use the same native origin policy as module APIs. */
export async function applicationFetch(
  input: string,
  init: RequestInit = {}
): Promise<Response> {
  if (!runtime) return fetch(input, { ...init, redirect: 'error' })
  const url = new URL(input, runtime.profile.origin)
  if (url.origin !== runtime.profile.origin)
    throw new Error('Application request origin is not permitted')
  const result = await runtime.transport.request({
    path: url.pathname.startsWith('/api/')
      ? url.pathname + url.search
      : '/api' + url.pathname + url.search,
    method: init.method,
    headers: Object.fromEntries(new Headers(init.headers)),
    body: typeof init.body === 'string' ? init.body : undefined,
    signal: init.signal ?? undefined
  })
  return new Response(result.status === 204 ? null : result.body, {
    status: result.status,
    headers: result.headers
  })
}
