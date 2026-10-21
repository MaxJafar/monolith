import { findAddonIdentity } from '@monolith/configs'
import type { Route } from '@monolith/server-utils'

type Entry = { name: string; path: string; access: 'read' | 'write' | 'delete' }
const entries: Entry[] = []
function expose(
  group: string,
  prefix: string,
  operations: Record<string, string>,
  access: Entry['access']
) {
  for (const [name, route] of Object.entries(operations))
    entries.push({
      name: `monolith_${group}_${name}`,
      path: `${prefix}/${route}`,
      access
    })
}
const addon = (name: string) => {
  const identity = findAddonIdentity(`@monolith/${name}`)
  if (!identity) throw new Error(`Missing integration addon identity: ${name}`)
  return `/modules/${identity.remoteId}`
}
const databases = addon('databases')
expose(
  'workspaces',
  `${databases}/workspaces`,
  { list: 'list', navigation: 'navigation' },
  'read'
)
expose(
  'pages',
  `${databases}/workspaces`,
  { list: 'pages', metadata: 'getPage' },
  'read'
)
expose(
  'pages',
  `${databases}/workspaces`,
  { create: 'createPage', update_metadata: 'updatePageMetadata' },
  'write'
)
expose('pages', `${databases}/workspaces`, { delete: 'removePage' }, 'delete')
expose(
  'databases',
  `${databases}/workspaceDatabases`,
  { snapshot: 'snapshot', people: 'people' },
  'read'
)
expose(
  'databases',
  `${databases}/workspaceDatabases`,
  { create: 'createBase', update: 'updateBase' },
  'write'
)
expose(
  'databases',
  `${databases}/workspaceDatabases`,
  { delete: 'removeBase' },
  'delete'
)
expose(
  'records',
  `${databases}/workspaceDatabases`,
  {
    create: 'createRecord',
    update: 'updateRecord',
    comment: 'addComment',
    link: 'setLinks'
  },
  'write'
)
expose(
  'records',
  `${databases}/workspaceDatabases`,
  { delete: 'removeRecord' },
  'delete'
)
expose(
  'fields',
  `${databases}/workspaceDatabases`,
  { create: 'createField', update: 'updateField' },
  'write'
)
expose(
  'fields',
  `${databases}/workspaceDatabases`,
  { delete: 'removeField' },
  'delete'
)
expose(
  'views',
  `${databases}/workspaceDatabases`,
  { create: 'createView', update: 'updateView' },
  'write'
)
expose(
  'views',
  `${databases}/workspaceDatabases`,
  { delete: 'removeView' },
  'delete'
)
// Projects and Actions are workspace records. The record/field/link tools above
// operate on them without requiring a separate addon or a second data model.
expose('events', `${databases}/calendar`, { list: 'list' }, 'read')
expose(
  'events',
  `${databases}/calendar`,
  { save: 'save', edit: 'edit', move: 'move', respond: 'respond' },
  'write'
)
// Occurrence mutations can cancel an event, so require destructive permission.
expose(
  'events',
  `${databases}/calendar`,
  { occurrence: 'occurrence' },
  'delete'
)
expose(
  'calendar_notifications',
  `${databases}/calendar`,
  { list: 'notifications' },
  'read'
)
expose(
  'entities',
  '/entities',
  { search: 'search', resolve: 'resolve', context: 'context' },
  'read'
)

// The shared contract serializer describes parsed Zod output: defaulted fields
// appear required there. They are optional on input because the API fills them.
function inputSchema(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(inputSchema)
  if (!value || typeof value !== 'object') return value
  const result = Object.fromEntries(
    Object.entries(value).map(([key, item]) => [key, inputSchema(item)])
  )
  if (
    Array.isArray(result.required) &&
    result.properties &&
    typeof result.properties === 'object'
  ) {
    const properties = result.properties as Record<string, unknown>
    result.required = result.required.filter((key: string) => {
      const property = properties[key]
      return (
        !property ||
        typeof property !== 'object' ||
        !Object.hasOwn(property, 'default')
      )
    })
  }
  return result
}

/** Only reviewed operations are agent tools. Installing an addon must never
 * silently grant agents shell, credential, membership or publishing actions. */
export function buildAgentCatalog(routes: Route[]) {
  return {
    version: 1 as const,
    tools: entries.flatMap(entry => {
      const route = routes.find(
        item => '/' + item.path.replace(/^\/+/, '') === entry.path
      )
      if (
        !route ||
        route.noAuth ||
        route.isDownloadable ||
        (route.media && Object.keys(route.media).length)
      )
        return []
      if (!['GET', 'POST'].includes(route.method)) return []
      const properties: Record<string, unknown> = {}
      const required: string[] = []
      for (const key of ['query', 'body'] as const) {
        const schema = route.input?.[key]
        if (schema && typeof schema === 'object') {
          properties[key] = inputSchema(schema)
          required.push(key)
        }
      }
      return [
        {
          ...entry,
          path: `/api${entry.path}`,
          method: route.method,
          description:
            route.description +
            (entry.name === 'monolith_pages_metadata'
              ? ' This returns page metadata and legacy body; read the current content with monolith_document_read.'
              : ''),
          inputSchema: {
            type: 'object' as const,
            properties,
            required,
            additionalProperties: false
          }
        }
      ]
    })
  }
}
