export type JsonObject = Record<string, unknown>
export type Tool = {
  name: string
  description: string
  access: 'read' | 'write' | 'delete'
  method: string
  path: string
  inputSchema: {
    type: 'object'
    properties?: JsonObject
    [key: string]: unknown
  }
}
export type Policy = { allowWrites: boolean; allowDeletes: boolean }
export type Tokens = {
  accessToken: string
  refreshToken: string
  accountId: string
  sessionId: string
  expiresIn: number
}
export type Profile = Omit<Tokens, 'expiresIn'> & {
  version: 1
  server: string
  serverId: string
  expiresAt: number
}
export class MonolithError extends Error {
  constructor(
    message: string,
    readonly code = 'client_error',
    readonly status?: number,
    readonly details?: unknown
  ) {
    super(message)
    this.name = 'MonolithError'
  }
}
