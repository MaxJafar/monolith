export interface paths {
  '/.well-known/monolith': {
    parameters: {
      query?: never
      header?: never
      path?: never
      cookie?: never
    }
    get: operations['discovery']
    put?: never
    post?: never
    delete?: never
    options?: never
    head?: never
    patch?: never
    trace?: never
  }
  '/api/v1/device-sessions': {
    parameters: {
      query?: never
      header?: never
      path?: never
      cookie?: never
    }
    get: operations['devices']
    put?: never
    post: operations['login']
    delete?: never
    options?: never
    head?: never
    patch?: never
    trace?: never
  }
  '/api/v1/device-sessions/totp': {
    parameters: {
      query?: never
      header?: never
      path?: never
      cookie?: never
    }
    get?: never
    put?: never
    post: operations['totp']
    delete?: never
    options?: never
    head?: never
    patch?: never
    trace?: never
  }
  '/api/v1/device-sessions/refresh': {
    parameters: {
      query?: never
      header?: never
      path?: never
      cookie?: never
    }
    get?: never
    put?: never
    post: operations['refresh']
    delete?: never
    options?: never
    head?: never
    patch?: never
    trace?: never
  }
  '/api/v1/device-sessions/{id}': {
    parameters: {
      query?: never
      header?: never
      path?: never
      cookie?: never
    }
    get?: never
    put?: never
    post?: never
    delete: operations['revoke']
    options?: never
    head?: never
    patch?: never
    trace?: never
  }
  '/api/v1/editor-documents/{kind}/{id}': {
    parameters: {
      query?: never
      header?: never
      path?: never
      cookie?: never
    }
    get: operations['document']
    put: operations['saveDocument']
    post?: never
    delete?: never
    options?: never
    head?: never
    patch?: never
    trace?: never
  }
  '/api/v1/editor-documents/{kind}/{id}/initialize': {
    parameters: {
      query?: never
      header?: never
      path?: never
      cookie?: never
    }
    get?: never
    put?: never
    post: operations['initializeDocument']
    delete?: never
    options?: never
    head?: never
    patch?: never
    trace?: never
  }
  '/api/v1/editor-sources/{kind}/{id}': {
    parameters: {
      query?: never
      header?: never
      path?: never
      cookie?: never
    }
    get: operations['resolveSource']
    put?: never
    post?: never
    delete?: never
    options?: never
    head?: never
    patch?: never
    trace?: never
  }
  '/api/v1/editor-documents/{kind}/{id}/recover': {
    parameters: {
      query?: never
      header?: never
      path?: never
      cookie?: never
    }
    get?: never
    put?: never
    post: operations['recoverDocument']
    delete?: never
    options?: never
    head?: never
    patch?: never
    trace?: never
  }
  '/api/v1/workspaces/{id}/editor': {
    parameters: {
      query?: never
      header?: never
      path?: never
      cookie?: never
    }
    get: operations['rollout']
    put?: never
    post?: never
    delete?: never
    options?: never
    head?: never
    patch?: never
    trace?: never
  }
  '/api/v1/bootstrap': {
    parameters: {
      query?: never
      header?: never
      path?: never
      cookie?: never
    }
    get?: never
    put?: never
    post: operations['bootstrap']
    delete?: never
    options?: never
    head?: never
    patch?: never
    trace?: never
  }
}
export type webhooks = Record<string, never>
export interface components {
  schemas: {
    /** @enum {string} */
    SourceKind: 'page' | 'record' | 'note'
    Source: {
      kind: components['schemas']['SourceKind']
      id: string
    }
    Block: {
      /** @constant */
      type: 'block'
      id: string
      flavour: string
      version: number
      props: {
        [key: string]: unknown
      }
      children: components['schemas']['Block'][]
    }
    Snapshot: {
      /** @constant */
      type: 'page'
      meta: {
        id: string
        title: string
        createDate: number
        tags: string[]
      }
      blocks: components['schemas']['Block']
    }
    EditorDocumentV2: {
      source: components['schemas']['Source']
      workspaceId: string
      revision: number
      /** @constant */
      formatVersion: 2
      snapshot: components['schemas']['Snapshot']
      recovery: boolean
      /** Format: date-time */
      updatedAt: string
    }
    Problem: {
      code: string
      message: string
      current?: components['schemas']['EditorDocumentV2']
    }
    Discovery: {
      serverId: string
      name: string
      apiVersion: number
      editorVersion: number
      publicUrl: string
      capabilities: string[]
    }
    Credentials: {
      email: string
      password: string
      deviceName: string
    }
    Tokens: {
      accessToken: string
      refreshToken: string
      accountId: string
      sessionId: string
      expiresIn: number
    }
    Challenge: {
      /** @constant */
      state: 'totp_required'
      challenge: string
    }
    Rollout: {
      enabled: boolean
      /** @constant */
      formatVersion: 2
      /** @enum {string} */
      role: 'owner' | 'editor' | 'viewer'
    }
    SaveDocument: {
      expectedRevision: number
      snapshot: components['schemas']['Snapshot']
    }
    RecoverDocument: {
      title: string
      snapshot: components['schemas']['Snapshot']
    }
    Device: {
      id: string
      name: string
      createdAt: string
      lastSeenAt: string
      expiresAt: string
      revokedAt: string | null
      current: boolean
    }
  }
  responses: never
  parameters: never
  requestBodies: never
  headers: never
  pathItems: never
}
export type $defs = Record<string, never>
export interface operations {
  discovery: {
    parameters: {
      query?: never
      header?: never
      path?: never
      cookie?: never
    }
    requestBody?: never
    responses: {
      /** @description Success */
      200: {
        headers: {
          [name: string]: unknown
        }
        content: {
          'application/json': components['schemas']['Discovery']
        }
      }
      /** @description Request failed */
      default: {
        headers: {
          [name: string]: unknown
        }
        content: {
          'application/json': components['schemas']['Problem']
        }
      }
    }
  }
  devices: {
    parameters: {
      query?: never
      header?: never
      path?: never
      cookie?: never
    }
    requestBody?: never
    responses: {
      /** @description Success */
      200: {
        headers: {
          [name: string]: unknown
        }
        content: {
          'application/json': components['schemas']['Device'][]
        }
      }
      /** @description Request failed */
      default: {
        headers: {
          [name: string]: unknown
        }
        content: {
          'application/json': components['schemas']['Problem']
        }
      }
    }
  }
  login: {
    parameters: {
      query?: never
      header?: never
      path?: never
      cookie?: never
    }
    requestBody: {
      content: {
        'application/json': components['schemas']['Credentials']
      }
    }
    responses: {
      /** @description Success */
      200: {
        headers: {
          [name: string]: unknown
        }
        content: {
          'application/json': components['schemas']['Challenge']
        }
      }
      /** @description Success */
      201: {
        headers: {
          [name: string]: unknown
        }
        content: {
          'application/json': components['schemas']['Tokens']
        }
      }
      /** @description Request failed */
      default: {
        headers: {
          [name: string]: unknown
        }
        content: {
          'application/json': components['schemas']['Problem']
        }
      }
    }
  }
  totp: {
    parameters: {
      query?: never
      header?: never
      path?: never
      cookie?: never
    }
    requestBody: {
      content: {
        'application/json': {
          challenge: string
          code: string
        }
      }
    }
    responses: {
      /** @description Success */
      201: {
        headers: {
          [name: string]: unknown
        }
        content: {
          'application/json': components['schemas']['Tokens']
        }
      }
      /** @description Request failed */
      default: {
        headers: {
          [name: string]: unknown
        }
        content: {
          'application/json': components['schemas']['Problem']
        }
      }
    }
  }
  refresh: {
    parameters: {
      query?: never
      header?: never
      path?: never
      cookie?: never
    }
    requestBody: {
      content: {
        'application/json': {
          refreshToken: string
        }
      }
    }
    responses: {
      /** @description Success */
      200: {
        headers: {
          [name: string]: unknown
        }
        content: {
          'application/json': components['schemas']['Tokens']
        }
      }
      /** @description Request failed */
      default: {
        headers: {
          [name: string]: unknown
        }
        content: {
          'application/json': components['schemas']['Problem']
        }
      }
    }
  }
  revoke: {
    parameters: {
      query?: never
      header?: never
      path: {
        id: string
      }
      cookie?: never
    }
    requestBody?: never
    responses: {
      /** @description Success */
      204: {
        headers: {
          [name: string]: unknown
        }
        content: {
          'application/json': null
        }
      }
      /** @description Request failed */
      default: {
        headers: {
          [name: string]: unknown
        }
        content: {
          'application/json': components['schemas']['Problem']
        }
      }
    }
  }
  document: {
    parameters: {
      query: {
        workspaceId: string
      }
      header?: never
      path: {
        kind: components['schemas']['SourceKind']
        id: string
      }
      cookie?: never
    }
    requestBody?: never
    responses: {
      /** @description Success */
      200: {
        headers: {
          [name: string]: unknown
        }
        content: {
          'application/json': components['schemas']['EditorDocumentV2']
        }
      }
      /** @description Request failed */
      default: {
        headers: {
          [name: string]: unknown
        }
        content: {
          'application/json': components['schemas']['Problem']
        }
      }
    }
  }
  saveDocument: {
    parameters: {
      query: {
        workspaceId: string
      }
      header?: never
      path: {
        kind: components['schemas']['SourceKind']
        id: string
      }
      cookie?: never
    }
    requestBody: {
      content: {
        'application/json': components['schemas']['SaveDocument']
      }
    }
    responses: {
      /** @description Success */
      200: {
        headers: {
          [name: string]: unknown
        }
        content: {
          'application/json': components['schemas']['EditorDocumentV2']
        }
      }
      /** @description Revision conflict */
      409: {
        headers: {
          [name: string]: unknown
        }
        content: {
          'application/json': components['schemas']['Problem']
        }
      }
      /** @description Request failed */
      default: {
        headers: {
          [name: string]: unknown
        }
        content: {
          'application/json': components['schemas']['Problem']
        }
      }
    }
  }
  initializeDocument: {
    parameters: {
      query: {
        workspaceId: string
      }
      header?: never
      path: {
        kind: components['schemas']['SourceKind']
        id: string
      }
      cookie?: never
    }
    requestBody?: never
    responses: {
      /** @description Success */
      200: {
        headers: {
          [name: string]: unknown
        }
        content: {
          'application/json': components['schemas']['EditorDocumentV2']
        }
      }
      /** @description Request failed */
      default: {
        headers: {
          [name: string]: unknown
        }
        content: {
          'application/json': components['schemas']['Problem']
        }
      }
    }
  }
  resolveSource: {
    parameters: {
      query?: never
      header?: never
      path: {
        kind: components['schemas']['SourceKind']
        id: string
      }
      cookie?: never
    }
    requestBody?: never
    responses: {
      /** @description Success */
      200: {
        headers: {
          [name: string]: unknown
        }
        content: {
          'application/json':
            | {
                /** @constant */
                migrated: false
              }
            | {
                /** @constant */
                migrated: true
                workspaceId: string
                source: components['schemas']['Source']
              }
        }
      }
      /** @description Request failed */
      default: {
        headers: {
          [name: string]: unknown
        }
        content: {
          'application/json': components['schemas']['Problem']
        }
      }
    }
  }
  recoverDocument: {
    parameters: {
      query: {
        workspaceId: string
      }
      header?: never
      path: {
        kind: components['schemas']['SourceKind']
        id: string
      }
      cookie?: never
    }
    requestBody: {
      content: {
        'application/json': components['schemas']['RecoverDocument']
      }
    }
    responses: {
      /** @description Success */
      201: {
        headers: {
          [name: string]: unknown
        }
        content: {
          'application/json': components['schemas']['EditorDocumentV2']
        }
      }
      /** @description Request failed */
      default: {
        headers: {
          [name: string]: unknown
        }
        content: {
          'application/json': components['schemas']['Problem']
        }
      }
    }
  }
  rollout: {
    parameters: {
      query?: never
      header?: never
      path: {
        id: string
      }
      cookie?: never
    }
    requestBody?: never
    responses: {
      /** @description Success */
      200: {
        headers: {
          [name: string]: unknown
        }
        content: {
          'application/json': components['schemas']['Rollout']
        }
      }
      /** @description Request failed */
      default: {
        headers: {
          [name: string]: unknown
        }
        content: {
          'application/json': components['schemas']['Problem']
        }
      }
    }
  }
  bootstrap: {
    parameters: {
      query?: never
      header: {
        Authorization: string
      }
      path?: never
      cookie?: never
    }
    requestBody: {
      content: {
        'application/json': {
          email: string
          password: string
          name: string
        }
      }
    }
    responses: {
      /** @description Success */
      201: {
        headers: {
          [name: string]: unknown
        }
        content: {
          'application/json': {
            accountId: string
          }
        }
      }
      /** @description Request failed */
      default: {
        headers: {
          [name: string]: unknown
        }
        content: {
          'application/json': components['schemas']['Problem']
        }
      }
    }
  }
}
