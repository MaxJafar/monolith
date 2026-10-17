import { readFileSync, writeFileSync } from 'node:fs'
import openapiTS, { astToString } from 'openapi-typescript'

// The versioned HTTP contract is authored here and emitted as both a public
// OpenAPI document and TypeScript. Query keys use these operation definitions.
const ref = name => ({ $ref: `#/components/schemas/${name}` })
const string = { type: 'string' }
const integer = { type: 'integer' }
const object = (properties, required = Object.keys(properties)) => ({
  type: 'object',
  properties,
  required,
  additionalProperties: false
})
const array = items => ({ type: 'array', items })
const json = schema => ({ 'application/json': { schema } })
const response = schema => ({ description: 'Success', content: json(schema) })
const param = (name, where = 'path', schema = string) => ({
  name,
  in: where,
  required: true,
  schema
})
const sourceParams = [
  param('kind', 'path', ref('SourceKind')),
  param('id'),
  param('workspaceId', 'query')
]
const schemas = {
  SourceKind: { type: 'string', enum: ['page', 'record', 'note'] },
  Source: object({ kind: ref('SourceKind'), id: string }),
  Block: object({
    type: { const: 'block', type: 'string' },
    id: string,
    flavour: string,
    version: integer,
    props: { type: 'object', additionalProperties: true },
    children: array(ref('Block'))
  }),
  Snapshot: object({
    type: { type: 'string', const: 'page' },
    meta: object({
      id: string,
      title: string,
      createDate: integer,
      tags: array(string)
    }),
    blocks: ref('Block')
  }),
  EditorDocumentV2: object({
    source: ref('Source'),
    workspaceId: string,
    revision: integer,
    formatVersion: { type: 'integer', const: 2 },
    snapshot: ref('Snapshot'),
    recovery: { type: 'boolean' },
    updatedAt: { type: 'string', format: 'date-time' }
  }),
  Problem: object(
    { code: string, message: string, current: ref('EditorDocumentV2') },
    ['code', 'message']
  ),
  Discovery: object({
    serverId: string,
    name: string,
    apiVersion: integer,
    editorVersion: integer,
    publicUrl: string,
    capabilities: array(string)
  }),
  Credentials: object({ email: string, password: string, deviceName: string }),
  Tokens: object({
    accessToken: string,
    refreshToken: string,
    accountId: string,
    sessionId: string,
    expiresIn: integer
  }),
  Challenge: object({
    state: { type: 'string', const: 'totp_required' },
    challenge: string
  }),
  Rollout: object({
    enabled: { type: 'boolean' },
    formatVersion: { type: 'integer', const: 2 },
    role: { type: 'string', enum: ['owner', 'editor', 'viewer'] }
  }),
  SaveDocument: object({
    expectedRevision: integer,
    snapshot: ref('Snapshot')
  }),
  RecoverDocument: object({ title: string, snapshot: ref('Snapshot') }),
  Device: object({
    id: string,
    name: string,
    createdAt: string,
    lastSeenAt: string,
    expiresAt: string,
    revokedAt: { type: ['string', 'null'] },
    current: { type: 'boolean' }
  })
}
const paths = {}
const operations = {}
function operation(
  method,
  path,
  operationId,
  schema,
  {
    body,
    parameters = [],
    status = 200,
    public: isPublic = false,
    extra = {}
  } = {}
) {
  paths[path] ??= {}
  paths[path][method] = {
    operationId,
    parameters,
    ...(isPublic ? { security: [] } : {}),
    ...(body ? { requestBody: { required: true, content: json(body) } } : {}),
    responses: {
      [status]: response(schema),
      ...extra,
      default: { description: 'Request failed', content: json(ref('Problem')) }
    }
  }
  operations[operationId] = { method: method.toUpperCase(), path }
}
operation('get', '/.well-known/monolith', 'discovery', ref('Discovery'), {
  public: true
})
operation('post', '/api/v1/device-sessions', 'login', ref('Tokens'), {
  public: true,
  body: ref('Credentials'),
  status: 201,
  extra: { 200: response(ref('Challenge')) }
})
operation('post', '/api/v1/device-sessions/totp', 'totp', ref('Tokens'), {
  public: true,
  body: object({ challenge: string, code: string }),
  status: 201
})
operation('post', '/api/v1/device-sessions/refresh', 'refresh', ref('Tokens'), {
  public: true,
  body: object({ refreshToken: string })
})
operation('get', '/api/v1/device-sessions', 'devices', array(ref('Device')))
operation(
  'delete',
  '/api/v1/device-sessions/{id}',
  'revoke',
  { type: 'null' },
  { parameters: [param('id')], status: 204 }
)
operation(
  'get',
  '/api/v1/editor-documents/{kind}/{id}',
  'document',
  ref('EditorDocumentV2'),
  { parameters: sourceParams }
)
operation(
  'post',
  '/api/v1/editor-documents/{kind}/{id}/initialize',
  'initializeDocument',
  ref('EditorDocumentV2'),
  { parameters: sourceParams }
)
operation(
  'get',
  '/api/v1/editor-sources/{kind}/{id}',
  'resolveSource',
  {
    oneOf: [
      object({ migrated: { type: 'boolean', const: false } }),
      object({
        migrated: { type: 'boolean', const: true },
        workspaceId: string,
        source: ref('Source')
      })
    ]
  },
  { parameters: [param('kind', 'path', ref('SourceKind')), param('id')] }
)
operation(
  'put',
  '/api/v1/editor-documents/{kind}/{id}',
  'saveDocument',
  ref('EditorDocumentV2'),
  {
    parameters: sourceParams,
    body: ref('SaveDocument'),
    extra: {
      409: { description: 'Revision conflict', content: json(ref('Problem')) }
    }
  }
)
operation(
  'post',
  '/api/v1/editor-documents/{kind}/{id}/recover',
  'recoverDocument',
  ref('EditorDocumentV2'),
  { parameters: sourceParams, body: ref('RecoverDocument'), status: 201 }
)
operation('get', '/api/v1/workspaces/{id}/editor', 'rollout', ref('Rollout'), {
  parameters: [param('id')]
})
operation(
  'post',
  '/api/v1/bootstrap',
  'bootstrap',
  object({ accountId: string }),
  {
    public: true,
    body: object({ email: string, password: string, name: string }),
    parameters: [
      { name: 'Authorization', in: 'header', required: true, schema: string }
    ],
    status: 201
  }
)
const spec = {
  openapi: '3.1.0',
  info: { title: 'Monolith gateway', version: '1.0.0' },
  security: [{ bearerAuth: [] }],
  paths,
  components: {
    schemas,
    securitySchemes: {
      bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' }
    }
  }
}
const root = new URL('../', import.meta.url)
const outputs = [
  [
    'apps/gateway/internal/server/openapi.json',
    JSON.stringify(spec, null, 2) + '\n'
  ],
  ['packages/api/src/desktop/generated.ts', astToString(await openapiTS(spec))],
  [
    'packages/api/src/desktop/operations.ts',
    '// Generated by pnpm gateway:contract; do not edit.\nexport const gatewayOperations = ' +
      JSON.stringify(operations, null, 2) +
      ' as const\n'
  ]
]
for (const [path, content] of outputs) {
  const target = new URL(path, root)
  if (process.argv.includes('--check')) {
    if (readFileSync(target, 'utf8').replaceAll('\r\n', '\n') !== content)
      throw new Error(`Regenerate ${path}`)
  } else writeFileSync(target, content)
}
console.log('Gateway OpenAPI and client contract are synchronized')
