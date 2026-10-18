import {
  clearAccessToken,
  getAccessToken,
  setAccessToken
} from '../client/tokenStore'
import type { components } from './generated'
import { gatewayOperations } from './operations'
import { publishWorkspaceChange } from './workspaceChanges'

export type EditorDocumentV2 = components['schemas']['EditorDocumentV2']
export type EditorSnapshot = components['schemas']['Snapshot']
export type EditorSource = components['schemas']['Source']
export type Discovery = components['schemas']['Discovery']
export type ConnectionProfile = {
  origin: string
  serverId: string
  accountId: string
  sessionId: string
}
export type ConnectionFailure =
  | 'dns'
  | 'timeout'
  | 'certificate'
  | 'incompatible'
  | 'expired'
  | 'offline'
  | 'invalid_url'
export type TransportRequest = {
  path: string
  method?: string
  headers?: Record<string, string>
  body?: string
  bodyEncoding?: 'base64'
  signal?: AbortSignal
}
export type TransportResponse = {
  status: number
  body: string
  encoding?: 'base64'
  headers: Record<string, string>
}
export interface ApiTransport {
  request(request: TransportRequest): Promise<TransportResponse>
}
export interface NativeHost {
  readonly platform: 'windows' | 'macos'
  profile(): Promise<ConnectionProfile | null>
  connect(url: string): Promise<Discovery>
  login(
    credentials: components['schemas']['Credentials']
  ): Promise<
    | { accessToken: string; profile: ConnectionProfile }
    | components['schemas']['Challenge']
  >
  totp(
    challenge: string,
    code: string
  ): Promise<{ accessToken: string; profile: ConnectionProfile }>
  refresh(): Promise<{ accessToken: string; profile: ConnectionProfile }>
  signOut(): Promise<void>
  request(request: Omit<TransportRequest, 'signal'>): Promise<TransportResponse>
  readDraft(key: string): Promise<string | null>
  writeDraft(
    key: string,
    value: string,
    expectedVersion: number | null
  ): Promise<void>
  removeDraft(key: string, expectedVersion: number): Promise<void>
  listDrafts(): Promise<string[]>
  openExternal(url: string): Promise<void>
  saveFile(name: string, content: string): Promise<void>
  windowControl?(
    action: 'state' | 'minimize' | 'maximize' | 'close' | 'drag'
  ): Promise<{ maximized: boolean; background?: boolean }>
}

export class GatewayError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly current?: EditorDocumentV2
  ) {
    super(message)
  }
}

export function normalizeServerURL(input: string, development = false) {
  let url: URL
  try {
    url = new URL(
      input.includes('://') ? input.trim() : `https://${input.trim()}`
    )
  } catch {
    throw new GatewayError(
      0,
      'invalid_url',
      'Enter a valid HTTPS server address'
    )
  }
  if (
    (url.protocol !== 'https:' &&
      !(
        development &&
        url.protocol === 'http:' &&
        ['localhost', '127.0.0.1'].includes(url.hostname)
      )) ||
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    (url.pathname !== '/' && url.pathname !== '')
  )
    throw new GatewayError(
      0,
      'invalid_url',
      'Enter an HTTPS server address without a path'
    )
  return url.origin
}

export function assertCompatible(discovery: Discovery) {
  if (
    !discovery.serverId ||
    discovery.apiVersion !== 1 ||
    discovery.editorVersion !== 2 ||
    !discovery.capabilities.includes('device-sessions')
  )
    throw new GatewayError(
      0,
      'incompatible',
      'This server is not compatible with this version of Monolith'
    )
}

/** Reject redirects rather than risk forwarding credentials to another origin. */
export class BrowserTransport implements ApiTransport {
  constructor(
    readonly origin: string,
    private readonly refresh?: () => Promise<boolean>
  ) {}
  async request(request: TransportRequest): Promise<TransportResponse> {
    if (
      !request.path.startsWith('/') ||
      request.path.startsWith('//') ||
      request.path.includes('\\')
    )
      throw new GatewayError(
        0,
        'invalid_url',
        'Requests must use a server-relative path'
      )
    const target = new URL(request.path, this.origin)
    if (target.origin !== this.origin)
      throw new GatewayError(
        0,
        'invalid_url',
        'Request origin is not permitted'
      )
    const send = async () => {
      const token = getAccessToken()
      return fetch(target, {
        method: request.method ?? 'GET',
        headers: {
          ...request.headers,
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: request.body,
        credentials: 'include',
        redirect: 'error',
        signal: request.signal
      })
    }
    let response = await send()
    if (response.status === 401 && this.refresh && (await this.refresh()))
      response = await send()
    return {
      status: response.status,
      body: await response.text(),
      headers: Object.fromEntries(response.headers.entries())
    }
  }
}

export class DesktopTransport implements ApiTransport {
  private refreshing: Promise<boolean> | null = null
  constructor(readonly host: NativeHost) {}
  refresh() {
    if (!this.refreshing)
      this.refreshing = this.host
        .refresh()
        .then(result => {
          setAccessToken(result.accessToken)
          return true
        })
        .catch((error: unknown) => {
          if (error instanceof GatewayError && error.status === 401) {
            clearAccessToken()
            if (typeof window !== 'undefined')
              window.dispatchEvent(new Event('monolith-auth-expired'))
            return false
          }
          throw error
        })
        .finally(() => {
          this.refreshing = null
        })
    return this.refreshing
  }
  async request({ signal, ...request }: TransportRequest) {
    signal?.throwIfAborted()
    // Native code injects credentials and checks the selected origin itself.
    let result = await this.host.request(request)
    if (result.status === 401 && (await this.refresh()))
      result = await this.host.request(request)
    signal?.throwIfAborted()
    return result
  }
}

type Operation = keyof typeof gatewayOperations
export function gatewayQueryKey(
  identity: Pick<ConnectionProfile, 'serverId' | 'accountId'>,
  operation: Operation,
  parameters: Record<string, string> = {}
) {
  const contract = gatewayOperations[operation]
  return [
    'monolith',
    identity.serverId,
    identity.accountId,
    contract.method,
    contract.path,
    parameters
  ] as const
}
export class GatewayClient {
  constructor(
    readonly transport: ApiTransport,
    readonly identity: Pick<ConnectionProfile, 'serverId' | 'accountId'>
  ) {}
  key(operation: Operation, parameters: Record<string, string> = {}) {
    return gatewayQueryKey(this.identity, operation, parameters)
  }
  async call<T>(
    operation: Operation,
    parameters: Record<string, string> = {},
    body?: unknown,
    signal?: AbortSignal
  ): Promise<T> {
    const contract = gatewayOperations[operation]
    let path: string = contract.path
    const query = new URLSearchParams()
    for (const [key, value] of Object.entries(parameters)) {
      const placeholder = `{${key}}`
      if (path.includes(placeholder))
        path = path.replace(placeholder, encodeURIComponent(value))
      else query.set(key, value)
    }
    if (path.includes('{')) throw new Error('Missing API path parameter')
    if (query.size) path += `?${query}`
    const result = await this.transport.request({
      path,
      method: contract.method,
      ...(body !== undefined
        ? {
            body: JSON.stringify(body),
            headers: { 'Content-Type': 'application/json' }
          }
        : {}),
      signal
    })
    let data: unknown
    try {
      data = result.body ? JSON.parse(result.body) : null
    } catch {
      throw new GatewayError(
        result.status,
        'invalid_response',
        'The server returned an invalid response'
      )
    }
    if (result.status < 200 || result.status >= 300) {
      const error = data as Partial<components['schemas']['Problem']> | null
      throw new GatewayError(
        result.status,
        error?.code ?? 'request_failed',
        error?.message ?? 'The request failed',
        error?.current
      )
    }
    if (contract.method !== 'GET' && parameters.workspaceId)
      publishWorkspaceChange({
        ...this.identity,
        workspaceId: parameters.workspaceId
      })
    return data as T
  }
  document(workspaceId: string, source: EditorSource, signal?: AbortSignal) {
    return this.call<EditorDocumentV2>(
      'document',
      { workspaceId, kind: source.kind, id: source.id },
      undefined,
      signal
    )
  }
  initializeDocument(workspaceId: string, source: EditorSource) {
    return this.call<EditorDocumentV2>('initializeDocument', {
      workspaceId,
      kind: source.kind,
      id: source.id
    })
  }
  save(document: EditorDocumentV2, snapshot: EditorSnapshot) {
    return this.call<EditorDocumentV2>(
      'saveDocument',
      {
        workspaceId: document.workspaceId,
        kind: document.source.kind,
        id: document.source.id
      },
      { expectedRevision: document.revision, snapshot }
    )
  }
  recover(document: EditorDocumentV2, snapshot: EditorSnapshot, title: string) {
    return this.call<EditorDocumentV2>(
      'recoverDocument',
      {
        workspaceId: document.workspaceId,
        kind: document.source.kind,
        id: document.source.id
      },
      { snapshot, title }
    )
  }
  rollout(workspaceId: string) {
    return this.call<components['schemas']['Rollout']>('rollout', {
      id: workspaceId
    })
  }
}
