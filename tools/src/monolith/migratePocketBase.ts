import dotenv from 'dotenv'
import { createHash } from 'node:crypto'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import postgres from 'postgres'
import z from 'zod'

const recordSchema = z.record(z.string(), z.unknown())
const mappingSchema = z.object({
  target: z.string().regex(/^[a-z][a-z0-9_]*$/),
  fields: z.record(z.string(), z.string()).default({}),
  defaults: recordSchema.default({}),
  relations: z.record(z.string(), z.string()).default({}),
  ignoreFields: z.record(z.string(), z.string().min(1)).default({})
})
const snapshotSchema = z.object({
  version: z.literal(1),
  collections: z.record(z.string(), z.array(recordSchema)),
  mappings: z.record(z.string(), mappingSchema).optional(),
  files: z
    .array(
      z.object({
        collection: z.string(),
        record: z.string(),
        field: z.string(),
        path: z.string(),
        mimeType: z.string().min(1)
      })
    )
    .default([])
})

export type Snapshot = z.input<typeof snapshotSchema>

type Mapping = z.infer<typeof mappingSchema>

export type Column = {
  name: string
  type: string
  nullable: boolean
  default: string | null
  references?: string
}

export type Catalog = Record<string, Column[]>

export type PlannedRow = {
  source: string
  sourceId: string
  table: string
  id: string
  values: Record<string, unknown>
  dependencies: string[]
}

export type PlannedFile = {
  sourcePath: string
  key: string
  table: string
  rowId: string
  field: string
  ownerId: string
  moduleId: string
  originalName: string
  mimeType: string
  size: number
  digest: string
}

export type MigrationPlan = {
  fingerprint: string
  rows: PlannedRow[]
  files: PlannedFile[]
  idMapping: Record<string, string>
  blockers: string[]
  warnings: string[]
  counts: Record<string, number>
}

const digestSchema = z.string().regex(/^[a-f0-9]{64}$/)
const journalSchema = z.object({
  version: z.literal(1),
  batch: z.uuid(),
  fingerprint: digestSchema,
  rows: z.array(
    z.object({
      table: z.string().regex(/^[a-z][a-z0-9_]*$/),
      id: z.uuid(),
      digest: digestSchema
    })
  ),
  files: z.array(
    z.object({
      key: z
        .string()
        .regex(/^[a-z][a-z0-9-]*\/[a-f0-9-]{36}(?:\.[a-zA-Z0-9.]{1,20})?$/),
      digest: digestSchema
    })
  ),
  createdAt: z.iso.datetime()
})

export type Journal = z.infer<typeof journalSchema>

const systemFields = new Set([
  'id',
  'collectionId',
  'collectionName',
  'expand',
  '_owner',
  'owner',
  'owner_id',
  'user',
  'user_id'
])
const namespaces = [
  'todo_list',
  'idea_box',
  'calendar',
  'pomodoro_timer',
  'code_time',
  'achievements',
  'wallet'
]
const specialMappings: Record<string, z.input<typeof mappingSchema>> = {
  users: {
    target: 'users',
    fields: {
      emailVisibility: 'email_visibility',
      dateOfBirth: 'date_of_birth',
      bgTemp: 'bg_temp',
      bgImage: 'bg_image',
      backdropFilters: 'backdrop_filters',
      fontFamily: 'font_family',
      dashboardLayout: 'dashboard_layout',
      APIKeysMasterPasswordHash: 'api_keys_master_password_hash',
      twoFASecret: 'two_fa_secret',
      fontScale: 'font_scale',
      borderRadiusMultiplier: 'border_radius_multiplier',
      passwordHash: 'auth_password_hash',
      password_hash: 'auth_password_hash'
    },
    ignoreFields: {
      tokenKey:
        'Legacy session tokens are intentionally not migrated; sign in again.',
      password: 'PocketBase system placeholder; passwordHash is required.',
      lastResetSentAt:
        'Legacy auth timestamp is not used by the current auth system.',
      lastVerificationSentAt:
        'Legacy auth timestamp is not used by the current auth system.'
    }
  },
  blog__categories: {
    target: 'blog__categories',
    defaults: { color: '#f97316', icon: 'tabler:folder' }
  },
  blog__entries: {
    target: 'blog__entries',
    fields: { category: 'category_id' },
    defaults: {
      content: '',
      excerpt: '',
      visibility: 'private',
      category_id: null,
      labels: '',
      featured_image: ''
    }
  },
  wishlist__lists: {
    target: 'wishlist__lists',
    defaults: { description: '', color: '#f97316', icon: 'tabler:gift' }
  },
  wishlist__entries: {
    target: 'wishlist__entries',
    fields: { list: 'list_id' },
    defaults: { url: '', image: '', price: 0, bought: false }
  },
  notes_workspaces: {
    target: 'notes__workspaces',
    defaults: { icon: 'tabler:folder' }
  },
  notes_subjects: {
    target: 'notes__subjects',
    fields: { workspace: 'workspace_id' },
    defaults: { description: '', icon: 'tabler:folder' }
  },
  notes_entries: {
    target: 'notes__entries',
    fields: { subject: 'subject_id', parent: 'parent_id' },
    defaults: { parent_id: null, content: '', type: 'note' },
    ignoreFields: {
      path: 'Legacy path is derived from the migrated parent hierarchy.'
    }
  },
  projects_m_categories: {
    target: 'projects__categories',
    defaults: { icon: 'tabler:folder' }
  },
  projects_m_statuses: {
    target: 'projects__statuses',
    defaults: { icon: 'tabler:circle', color: '#f97316' }
  },
  projects_m_technologies: {
    target: 'projects__technologies',
    defaults: { icon: 'tabler:code' }
  },
  projects_m_visibilities: {
    target: 'projects__visibilities',
    defaults: { icon: 'tabler:eye' }
  },
  projects_m_entries: {
    target: 'projects__entries',
    fields: {
      category: 'category_id',
      status: 'status_id',
      visibility: 'visibility_id',
      technologies: 'technology_ids'
    },
    relations: { technology_ids: 'projects_m_technologies' },
    defaults: {
      description: '',
      icon: 'tabler:briefcase',
      color: '#f97316',
      category_id: null,
      status_id: null,
      visibility_id: null,
      technology_ids: []
    }
  },
  projects_m_kanban_columns: {
    target: 'projects__columns',
    fields: { project: 'project_id' },
    defaults: { icon: 'tabler:columns', color: '#f97316' }
  },
  projects_m_kanban_entries: {
    target: 'projects__tasks',
    fields: { column: 'column_id' },
    defaults: { content: '', completed: false }
  },
  flashcards_tags: {
    target: 'flashcards__tags',
    defaults: { color: '#f97316' },
    ignoreFields: { amount: 'Tag totals are derived from deck rows.' }
  },
  flashcards_decks: {
    target: 'flashcards__decks',
    fields: { tag: 'tag_id' },
    defaults: { description: '', tag_id: null },
    ignoreFields: { card_amount: 'Card totals are derived from card rows.' }
  },
  flashcards_cards: { target: 'flashcards__cards', fields: { deck: 'deck_id' } }
}

function normalizeCollection(source: string) {
  return source
    .replace(/([a-z])([A-Z])/g, '$1_$2')
    .replaceAll('-', '_')
    .toLowerCase()
}

function mappingFor(
  source: string,
  catalog: Catalog,
  custom: Record<string, Mapping>
): Mapping | undefined {
  if (custom[source]) return custom[source]

  const normalized = normalizeCollection(source)
  const predefined = specialMappings[source] || specialMappings[normalized]

  if (predefined) return mappingSchema.parse(predefined)

  for (const namespace of namespaces) {
    const table = normalized.startsWith(namespace + '__')
      ? normalized
      : normalized.startsWith(namespace + '_')
        ? namespace + '__' + normalized.slice(namespace.length + 1)
        : ''

    if (table && catalog[table])
      return mappingSchema.parse({
        target: table,
        relations:
          table === 'todo_list__entries'
            ? { tags: 'todo_list__tags' }
            : table.includes('wallet__')
              ? { ledgers: 'wallet__ledgers' }
              : table === 'idea_box__entries'
                ? { tags: 'idea_box__tags' }
                : {}
      })
  }
  if (normalized === '_pb_users_auth_')
    return mappingSchema.parse(specialMappings.users)

  return undefined
}

export function stableId(collection: string, oldId: string): string {
  const namespace = Buffer.from('3b149da4fb95444a8ec4d0807165e7da', 'hex')
  const bytes = createHash('sha1')
    .update(namespace)
    .update(collection + ':' + oldId)
    .digest()
    .subarray(0, 16)
  bytes[6] = (bytes[6]! & 15) | 80
  bytes[8] = (bytes[8]! & 63) | 128
  const hex = bytes.toString('hex')

  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}

function canonical(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonical)
  if (value instanceof Date) return value.toISOString()
  if (value && typeof value === 'object')
    return Object.fromEntries(
      Object.entries(value)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, entry]) => [key, canonical(entry)])
    )

  return value
}

export function digest(value: unknown): string {
  return createHash('sha256')
    .update(JSON.stringify(canonical(value)))
    .digest('hex')
}

function identifier(value: string) {
  if (!/^[a-z][a-z0-9_]*$/.test(value))
    throw new Error('Invalid database identifier')

  return '"' + value + '"'
}

function isPasswordHash(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    (/^\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}$/.test(value) ||
      /^\$argon2(?:id|i|d)\$v=\d+\$m=\d+,t=\d+,p=\d+\$[A-Za-z0-9+/]+\$[A-Za-z0-9+/]+$/.test(
        value
      ))
  )
}

export function assertLocalDestination(url: string): void {
  const target = new URL(url)

  if (
    !['127.0.0.1', 'localhost', '[::1]'].includes(target.hostname) ||
    !/^\/(zillion_dev|zillion_test(?:_[a-z0-9]+)?)$/.test(target.pathname)
  ) {
    throw new Error(
      'Migration tools only accept loopback zillion_dev/zillion_test databases. Production switching is outside this task.'
    )
  }
}

function orderRows(rows: PlannedRow[], blockers: string[]) {
  const byId = new Map(rows.map(row => [row.table + ':' + row.id, row]))
  const completed = new Set<string>()
  const active = new Set<string>()
  const ordered: PlannedRow[] = []

  function visit(row: PlannedRow) {
    const key = row.table + ':' + row.id

    if (completed.has(key)) return

    if (active.has(key)) {
      blockers.push('Cyclic relation in ' + row.source)

      return
    }
    active.add(key)

    for (const dependency of row.dependencies) {
      const target = byId.get(dependency)

      if (target) visit(target)
    }
    active.delete(key)
    completed.add(key)
    ordered.push(row)
  }
  for (const row of rows) visit(row)

  return ordered
}

export async function planMigration(
  input: Snapshot,
  catalog: Catalog,
  options: { ownerSourceId: string; filesRoot?: string }
): Promise<MigrationPlan> {
  const snapshot = snapshotSchema.parse(input)
  const custom = snapshot.mappings || {}
  const blockers: string[] = []
  const warnings: string[] = []
  const idMapping: Record<string, string> = {}
  const mappings: Record<string, Mapping> = {}
  const records: Record<string, Record<string, unknown>> = {}
  const rows: PlannedRow[] = []
  const files: PlannedFile[] = []
  const counts: Record<string, number> = {}

  for (const [source, entries] of Object.entries(snapshot.collections)) {
    if (!entries.length) continue

    const mapping = mappingFor(source, catalog, custom)

    if (!mapping || !catalog[mapping.target]) {
      blockers.push('No destination mapping for collection ' + source)
      continue
    }
    mappings[source] = mapping

    for (const record of entries) {
      if (typeof record.id !== 'string' || !record.id) {
        blockers.push('Missing source record id in ' + source)
        continue
      }

      const key = source + ':' + record.id

      if (idMapping[key]) {
        blockers.push('Duplicate source id in ' + source)
        continue
      }
      idMapping[key] = stableId(source, record.id)
      records[key] = record
    }
  }

  const usersSource = Object.keys(mappings).find(
    source => mappings[source]?.target === 'users'
  )
  const selectedOwner =
    usersSource && idMapping[usersSource + ':' + options.ownerSourceId]

  if (!selectedOwner)
    blockers.push(
      'Explicit owner source id must identify a user included in the snapshot'
    )

  function resolveRelation(
    source: string,
    field: string,
    targetTable: string,
    value: unknown,
    dependencies: string[]
  ) {
    if (!value) return null

    const candidates = Object.keys(mappings).filter(
      name => mappings[name]?.target === targetTable
    )
    const matches = candidates.flatMap(name =>
      idMapping[name + ':' + String(value)]
        ? [{ source: name, id: idMapping[name + ':' + String(value)]! }]
        : []
    )

    if (matches.length !== 1) {
      blockers.push('Unresolved relation ' + source + '.' + field)

      return null
    }

    const match = matches[0]!
    dependencies.push(targetTable + ':' + match.id)
    const targetRecord = records[match.source + ':' + String(value)]
    const sourceRecordOwner =
      targetRecord?._owner ||
      targetRecord?.owner_id ||
      targetRecord?.owner ||
      targetRecord?.user_id ||
      targetRecord?.user ||
      options.ownerSourceId

    return { id: match.id, owner: String(sourceRecordOwner) }
  }

  for (const [key, record] of Object.entries(records)) {
    const separator = key.indexOf(':')
    const source = key.slice(0, separator)
    const sourceId = key.slice(separator + 1)
    const mapping = mappings[source]!
    const columns = catalog[mapping.target]!
    const values: Record<string, unknown> = {
      ...mapping.defaults,
      id: idMapping[key]
    }
    const dependencies: string[] = []
    const sourceOwner = String(
      record._owner ||
        record.owner_id ||
        record.owner ||
        record.user_id ||
        record.user ||
        options.ownerSourceId
    )
    const ownerId = usersSource && idMapping[usersSource + ':' + sourceOwner]

    if (mapping.target !== 'users') {
      if (!ownerId) blockers.push('Unresolved owner in ' + source)
      else {
        values.owner_id = ownerId
        dependencies.push('users:' + ownerId)
      }
    }

    for (const [field, value] of Object.entries(record)) {
      if (systemFields.has(field)) continue

      if (mapping.ignoreFields[field]) {
        warnings.push(source + '.' + field + ': ' + mapping.ignoreFields[field])
        continue
      }

      const destination = mapping.fields[field] || field
      const column = columns.find(column => column.name === destination)

      if (!column) {
        blockers.push('Unmapped field ' + source + '.' + field)
        continue
      }
      values[destination] = value
    }

    for (const column of columns) {
      if (!(column.name in values)) {
        if (column.default !== null || column.nullable) continue
        blockers.push(
          'Missing required destination field ' +
            mapping.target +
            '.' +
            column.name
        )
        continue
      }

      const value = values[column.name]

      if (value === null && !column.nullable)
        blockers.push(
          'Required destination field is null: ' +
            mapping.target +
            '.' +
            column.name
        )

      const relationSource = mapping.relations[column.name]
      const relationTable = relationSource
        ? mappings[relationSource]?.target ||
          mappingFor(relationSource, catalog, custom)?.target
        : column.references

      if (column.type === 'uuid' && !['id', 'owner_id'].includes(column.name)) {
        if (!value && column.nullable) values[column.name] = null
        else if (relationTable) {
          const relation = resolveRelation(
            source,
            column.name,
            relationTable,
            value,
            dependencies
          )

          if (relation?.owner !== sourceOwner && relationTable !== 'users')
            blockers.push('Cross-owner relation ' + source + '.' + column.name)
          values[column.name] = relation?.id || null
        } else
          blockers.push(
            'UUID relation needs a mapping for ' + source + '.' + column.name
          )
      } else if (relationSource) {
        if (!Array.isArray(value)) {
          blockers.push(
            'Relation array required for ' + source + '.' + column.name
          )
          continue
        }
        values[column.name] = value.map(oldId => {
          const relation =
            relationTable &&
            resolveRelation(
              source,
              column.name,
              relationTable,
              oldId,
              dependencies
            )

          if (relation && relation.owner !== sourceOwner)
            blockers.push('Cross-owner relation ' + source + '.' + column.name)

          return relation ? relation.id : null
        })
      } else if (column.type === 'json' || column.type === 'jsonb') {
        if (typeof value === 'string') {
          try {
            values[column.name] = JSON.parse(value)
          } catch {
            blockers.push('Invalid JSON field ' + source + '.' + column.name)
          }
        }
      } else if (
        value === '' &&
        column.nullable &&
        (column.type.includes('timestamp') || column.type === 'date')
      )
        values[column.name] = null
      else if (column.type.includes('timestamp') || column.type === 'date') {
        if (
          value !== null &&
          (typeof value !== 'string' || !Number.isFinite(Date.parse(value)))
        )
          blockers.push('Invalid date field ' + source + '.' + column.name)
      } else if (column.name === 'labels' && Array.isArray(value))
        values[column.name] = value.map(String).join(', ')
      else if (
        column.type === 'bool' &&
        typeof value === 'number' &&
        [0, 1].includes(value)
      )
        values[column.name] = value === 1
      else if (column.type === 'bool' && typeof value !== 'boolean')
        blockers.push('Boolean required for ' + source + '.' + column.name)
      else if (
        ['int2', 'int4', 'int8', 'float4', 'float8', 'numeric'].includes(
          column.type
        ) &&
        (typeof value !== 'number' || !Number.isFinite(value))
      )
        blockers.push(
          'Finite number required for ' + source + '.' + column.name
        )
      else if (value !== null && typeof value === 'object')
        blockers.push(
          'Structured value needs a mapping for ' + source + '.' + column.name
        )
    }
    if (
      mapping.target === 'users' &&
      !isPasswordHash(values.auth_password_hash)
    )
      blockers.push(
        'User password hash missing or unsupported; public API exports cannot preserve the old password'
      )

    const fileFields = [
      'avatar',
      'bg_image',
      'cover',
      'image',
      'receipt',
      'featured_image',
      'file'
    ]

    for (const field of fileFields) {
      const value = values[field]

      if (
        typeof value === 'string' &&
        value &&
        !/^https?:\/\//.test(value) &&
        !snapshot.files.some(
          file =>
            file.collection === source &&
            file.record === sourceId &&
            (mapping.fields[file.field] || file.field) === field
        )
      )
        blockers.push('File manifest required for ' + source + '.' + field)
    }
    rows.push({
      source,
      sourceId,
      table: mapping.target,
      id: idMapping[key]!,
      values,
      dependencies
    })
    counts[mapping.target] = (counts[mapping.target] || 0) + 1
  }

  for (const row of rows) {
    if (
      row.table === 'wishlist__entries' &&
      typeof row.values.price === 'number' &&
      row.values.price < 0
    )
      blockers.push('Wishlist price must be nonnegative')

    if (row.table === 'notes__entries' && row.values.parent_id) {
      const parent = rows.find(
        candidate =>
          candidate.table === row.table && candidate.id === row.values.parent_id
      )

      if (
        !parent ||
        parent.values.type !== 'folder' ||
        parent.values.subject_id !== row.values.subject_id
      )
        blockers.push('Notes parent must be a folder in the same subject')
    }
  }

  for (const file of snapshot.files) {
    const row = rows.find(
      row => row.source === file.collection && row.sourceId === file.record
    )

    if (!row || !options.filesRoot) {
      blockers.push('File manifest needs an existing row and a files root')
      continue
    }

    const root = await fs.realpath(options.filesRoot)
    const sourcePath = await fs
      .realpath(path.resolve(root, file.path))
      .catch(() => '')

    if (!sourcePath || !sourcePath.startsWith(root + path.sep)) {
      blockers.push('Missing file or unsafe file path in ' + file.collection)
      continue
    }

    const stat = await fs.stat(sourcePath)

    if (!stat.isFile()) {
      blockers.push('File manifest entry is not a file')
      continue
    }

    const field = mappings[file.collection]!.fields[file.field] || file.field

    if (!catalog[row.table]?.some(column => column.name === field)) {
      blockers.push('File manifest has an unmapped destination field')
      continue
    }

    if (
      files.some(
        candidate =>
          candidate.table === row.table &&
          candidate.rowId === row.id &&
          candidate.field === field
      )
    ) {
      blockers.push(
        'Multiple files require an explicit destination mapping for ' +
          file.collection +
          '.' +
          field
      )
      continue
    }

    const extension = path
      .extname(sourcePath)
      .slice(0, 20)
      .replace(/[^.a-zA-Z0-9]/g, '')
    const moduleId =
      row.table === 'users'
        ? 'user'
        : 'monolith--' + row.table.split('__')[0]!.replaceAll('_', '-')
    const key =
      moduleId +
      '/' +
      stableId(file.collection, file.record + ':' + field) +
      extension
    const content = await fs.readFile(sourcePath)
    files.push({
      sourcePath,
      key,
      table: row.table,
      rowId: row.id,
      field,
      ownerId: row.table === 'users' ? row.id : String(row.values.owner_id),
      moduleId,
      originalName: path.basename(sourcePath),
      mimeType: file.mimeType,
      size: stat.size,
      digest: createHash('sha256').update(content).digest('hex')
    })
    row.values[field] = key
  }

  return {
    fingerprint: digest({
      snapshot,
      ownerSourceId: options.ownerSourceId,
      files: files.map(file => ({ key: file.key, digest: file.digest }))
    }),
    rows: orderRows(rows, blockers),
    files,
    idMapping,
    blockers: [...new Set(blockers)],
    warnings: [...new Set(warnings)],
    counts
  }
}

export async function readCatalog(
  connection: ReturnType<typeof postgres>
): Promise<Catalog> {
  const columns = await connection<
    {
      table_name: string
      column_name: string
      udt_name: string
      is_nullable: string
      column_default: string | null
    }[]
  >`select table_name, column_name, udt_name, is_nullable, column_default from information_schema.columns where table_schema = 'public' order by ordinal_position`
  const catalog: Catalog = {}

  for (const column of columns) {
    if (!Object.hasOwn(catalog, column.table_name))
      catalog[column.table_name] = []
    catalog[column.table_name]!.push({
      name: column.column_name,
      type: column.udt_name,
      nullable: column.is_nullable === 'YES',
      default: column.column_default
    })
  }

  const references = await connection<
    { source: string; field: string; target: string }[]
  >`select c.conrelid::regclass::text as source, a.attname as field, c.confrelid::regclass::text as target from pg_constraint c join pg_attribute a on a.attrelid = c.conrelid and a.attnum = any(c.conkey) where c.contype = 'f' and c.connamespace = 'public'::regnamespace`

  for (const reference of references) {
    const column = catalog[reference.source]?.find(
      column => column.name === reference.field
    )

    if (column) column.references = reference.target
  }

  return catalog
}

function parameters(row: PlannedRow, catalog: Catalog) {
  return Object.entries(row.values).map(([field, value]) => {
    const type = catalog[row.table]?.find(column => column.name === field)?.type

    if (value === undefined || value === null) return null
    if (type === 'json' || type === 'jsonb') return JSON.stringify(value)
    if (
      typeof value === 'string' ||
      typeof value === 'boolean' ||
      typeof value === 'number'
    )
      return value
    throw new Error('Unrepresentable destination value')
  })
}

async function privateWrite(file: string, value: unknown) {
  await fs.mkdir(path.dirname(file), { recursive: true })
  const temporary = file + '.tmp'
  await fs.writeFile(temporary, JSON.stringify(value, null, 2) + '\n', {
    mode: 0o600
  })
  await fs.rename(temporary, file)
}

async function readJournal(file: string): Promise<Journal | null> {
  let content: string

  try {
    content = await fs.readFile(file, 'utf8')
  } catch (failure) {
    if (
      failure instanceof Error &&
      'code' in failure &&
      failure.code === 'ENOENT'
    )
      return null
    throw failure
  }

  return journalSchema.parse(JSON.parse(content))
}

export async function applyMigration(
  plan: MigrationPlan,
  options: { databaseUrl: string; storageRoot: string; journalPath: string }
): Promise<{ inserted: number; skipped: number; files: number }> {
  assertLocalDestination(options.databaseUrl)
  if (plan.blockers.length)
    throw new Error(
      'Migration has unresolved blockers; run dry-run and review the report'
    )

  const previous = await readJournal(options.journalPath)

  if (previous && previous.fingerprint !== plan.fingerprint)
    throw new Error('Journal belongs to a different snapshot')

  const connection = postgres(options.databaseUrl, {
    max: 1,
    onnotice: () => {}
  })
  const journal: Journal = previous || {
    version: 1,
    batch: stableId('migration', plan.fingerprint),
    fingerprint: plan.fingerprint,
    rows: [],
    files: [],
    createdAt: new Date().toISOString()
  }

  let inserted = 0
  let skipped = 0

  const copied: string[] = []

  try {
    const catalog = await readCatalog(connection)
    await connection.begin(async transaction => {
      await transaction`select pg_advisory_xact_lock(hashtext('zillion-pocketbase-migration'))`

      for (const row of plan.rows) {
        const columns = Object.keys(row.values)
        const existing = await transaction.unsafe(
          `select to_jsonb(t) as record from ${identifier(row.table)} t where id = $1`,
          [row.id]
        )

        if (existing.length) {
          const known = journal.rows.find(
            item => item.table === row.table && item.id === row.id
          )

          if (!known)
            throw new Error(
              'Destination id already exists outside this migration; refusing to overwrite'
            )
          skipped++
          continue
        }

        const query = `insert into ${identifier(row.table)} (${columns.map(identifier).join(', ')}) values (${columns.map((_, index) => '$' + (index + 1)).join(', ')}) returning to_jsonb(${identifier(row.table)}.*) as record`
        const result = await transaction.unsafe(query, parameters(row, catalog))
        journal.rows = journal.rows.filter(
          item => item.table !== row.table || item.id !== row.id
        )
        journal.rows.push({
          table: row.table,
          id: row.id,
          digest: digest(result[0]?.record)
        })
        inserted++
      }

      for (const file of plan.files) {
        const target = path.resolve(options.storageRoot, file.key)

        if (!target.startsWith(path.resolve(options.storageRoot) + path.sep))
          throw new Error('Unsafe storage destination')

        const existingMetadata =
          await transaction`select key, owner_id from files where key = ${file.key}`

        if (existingMetadata.length) {
          if (
            !journal.files.some(item => item.key === file.key) ||
            String(existingMetadata[0]?.owner_id) !== file.ownerId
          )
            throw new Error('File already exists outside this migration')
          continue
        }
        await fs.mkdir(path.dirname(target), { recursive: true })
        if (
          !(await fs.realpath(path.dirname(target))).startsWith(
            (await fs.realpath(options.storageRoot)) + path.sep
          )
        )
          throw new Error('Storage directory escapes through a symbolic link')

        const sourceBytes = await fs.readFile(file.sourcePath)

        if (
          createHash('sha256').update(sourceBytes).digest('hex') !== file.digest
        )
          throw new Error('Source file changed after dry-run')
        await fs.copyFile(file.sourcePath, target, fs.constants.COPYFILE_EXCL)
        copied.push(target)
        await transaction`insert into files (key, original_name, mime_type, size, thumbs, module_id, owner_id) values (${file.key}, ${file.originalName}, ${file.mimeType}, ${file.size}, '[]'::jsonb, ${file.moduleId}, ${file.ownerId})`
        journal.files = journal.files.filter(item => item.key !== file.key)
        journal.files.push({ key: file.key, digest: file.digest })
      }
      // Journal is saved before commit so interrupted runs retain the rollback inventory.
      // A failed commit is harmless: rollback verifies that recorded rows actually exist.
      await privateWrite(options.journalPath, journal)
    })

    return { inserted, skipped, files: copied.length }
  } catch (failure) {
    for (const file of copied) await fs.unlink(file).catch(() => {})
    throw failure
  } finally {
    await connection.end()
  }
}

export async function rollbackMigration(options: {
  databaseUrl: string
  storageRoot: string
  journalPath: string
}): Promise<number> {
  assertLocalDestination(options.databaseUrl)
  const journal = await readJournal(options.journalPath)

  if (!journal) throw new Error('Rollback journal was not found')

  const connection = postgres(options.databaseUrl, {
    max: 1,
    onnotice: () => {}
  })

  let removed = 0

  try {
    const catalog = await readCatalog(connection)
    await connection.begin(async transaction => {
      await transaction`select pg_advisory_xact_lock(hashtext('zillion-pocketbase-migration'))`

      for (const row of journal.rows) {
        const current = await transaction.unsafe(
          `select to_jsonb(t) as record from ${identifier(row.table)} t where id = $1`,
          [row.id]
        )

        if (current.length && digest(current[0]?.record) !== row.digest)
          throw new Error(
            'Imported data changed after migration; automatic rollback refused'
          )

        for (const [table, columns] of Object.entries(catalog)) {
          const dependentColumns = columns.filter(
            column =>
              column.references === row.table ||
              (row.table === 'users' && column.name === 'owner_id')
          )

          for (const column of dependentColumns) {
            const knownIds = journal.rows
              .filter(item => item.table === table)
              .map(item => item.id)
            const exclusion =
              columns.some(column => column.name === 'id') && knownIds.length
                ? ' and id <> all($2::uuid[])'
                : ''
            const result = await transaction.unsafe(
              `select count(*)::int as count from ${identifier(table)} where ${identifier(column.name)} = $1${exclusion}`,
              exclusion ? [row.id, knownIds] : [row.id]
            )

            // File metadata is removed using the separate journal inventory.
            if (table === 'files') {
              const unexpected =
                await transaction`select count(*)::int as count from files where owner_id = ${row.id} and key <> all(${journal.files.map(file => file.key)}::text[])`

              if (Number(unexpected[0]?.count) > 0)
                throw new Error(
                  'New files depend on migrated data; automatic rollback refused'
                )
            } else if (Number(result[0]?.count) > 0)
              throw new Error(
                'New records depend on migrated data; automatic rollback refused'
              )
          }
        }
      }

      for (const file of journal.files) {
        const target = path.resolve(options.storageRoot, file.key)

        if (!target.startsWith(path.resolve(options.storageRoot) + path.sep))
          throw new Error('Unsafe rollback file path')

        const bytes = await fs.readFile(target).catch(() => null)

        if (
          bytes &&
          createHash('sha256').update(bytes).digest('hex') !== file.digest
        )
          throw new Error(
            'Imported file changed after migration; automatic rollback refused'
          )
      }

      for (const row of [...journal.rows].reverse()) {
        const result = await transaction.unsafe(
          `delete from ${identifier(row.table)} where id = $1 returning id`,
          [row.id]
        )
        removed += result.length
      }
      for (const file of journal.files)
        await transaction`delete from files where key = ${file.key}`
    })
    for (const file of journal.files)
      await fs
        .unlink(path.resolve(options.storageRoot, file.key))
        .catch(() => {})
    await fs.rename(options.journalPath, options.journalPath + '.rolled-back')

    return removed
  } finally {
    await connection.end()
  }
}

export function safeReport(plan: MigrationPlan) {
  return {
    fingerprint: plan.fingerprint,
    counts: plan.counts,
    files: plan.files.length,
    blockers: plan.blockers,
    warnings: plan.warnings,
    idMapping: plan.idMapping
  }
}

/** Reads an offline PocketBase SQLite copy without opening a network connection. */
export async function readPocketBaseDatabase(
  databasePath: string
): Promise<Snapshot> {
  const { DatabaseSync } = await import('node:sqlite')
  const database = new DatabaseSync(path.resolve(databasePath), {
    readOnly: true
  })

  try {
    const metadataColumns = database
      .prepare('pragma table_info(_collections)')
      .all()
      .map(column => String(column.name))
    const schemaColumn = metadataColumns.includes('fields')
      ? 'fields'
      : metadataColumns.includes('schema')
        ? 'schema'
        : undefined

    if (!schemaColumn)
      throw new Error(
        'PocketBase collection metadata has no supported field schema'
      )

    const metadata = database
      .prepare(
        'select id, name, type, "' +
          schemaColumn +
          '" as fields from _collections'
      )
      .all()
    const collections: Record<string, Record<string, unknown>[]> = {}
    const files: z.input<typeof snapshotSchema>['files'] = []

    for (const collection of metadata) {
      const name = String(collection.name)

      if (name.startsWith('_') || collection.type === 'view') continue
      // Names are read from SQLite metadata, then restricted before interpolation.
      if (!/^[A-Za-z][A-Za-z0-9_]*$/.test(name))
        throw new Error('Unsupported PocketBase collection identifier')

      const records = database
        .prepare('select * from "' + name + '"')
        .all() as Record<string, unknown>[]

      let fields: { name: string; type: string }[] = []

      try {
        fields = z
          .array(z.object({ name: z.string(), type: z.string() }))
          .parse(JSON.parse(String(collection.fields || '[]')))
      } catch {
        throw new Error('PocketBase collection fields could not be read')
      }

      for (const record of records) {
        for (const field of fields) {
          // Current PocketBase auth schemas store the hash in the password field;
          // older schemas store passwordHash directly. Normalize only offline DB data.
          if (
            collection.type === 'auth' &&
            field.name === 'password' &&
            field.type === 'password'
          ) {
            if (!isPasswordHash(record.password))
              throw new Error(
                'Offline auth password hash is missing or unsupported'
              )
            if (record.passwordHash && record.passwordHash !== record.password)
              throw new Error('Offline auth password columns disagree')
            record.passwordHash = record.password
            delete record.password
          }

          if (
            ['json', 'relation', 'select', 'file'].includes(field.type) &&
            typeof record[field.name] === 'string' &&
            ['{', '['].some(prefix =>
              String(record[field.name]).startsWith(prefix)
            )
          ) {
            try {
              record[field.name] = JSON.parse(String(record[field.name]))
            } catch {
              throw new Error('PocketBase structured field could not be read')
            }
          }
          if (field.type === 'bool' && typeof record[field.name] === 'number')
            record[field.name] = record[field.name] === 1

          if (field.type === 'file') {
            const names = Array.isArray(record[field.name])
              ? (record[field.name] as unknown[])
              : [record[field.name]]

            for (const filename of names) {
              if (typeof filename !== 'string' || !filename) continue
              if (filename !== path.basename(filename))
                throw new Error('Unsafe PocketBase file name')

              const extension = path.extname(filename).toLowerCase()
              const mimeTypes: Record<string, string> = {
                '.png': 'image/png',
                '.jpg': 'image/jpeg',
                '.jpeg': 'image/jpeg',
                '.gif': 'image/gif',
                '.webp': 'image/webp',
                '.pdf': 'application/pdf',
                '.txt': 'text/plain',
                '.md': 'text/markdown',
                '.svg': 'image/svg+xml'
              }
              files.push({
                collection: name,
                record: String(record.id),
                field: field.name,
                path:
                  String(collection.id) +
                  '/' +
                  String(record.id) +
                  '/' +
                  filename,
                mimeType: mimeTypes[extension] || 'application/octet-stream'
              })
            }
          }
        }
      }
      collections[name] = records
    }

    return { version: 1, collections, files }
  } finally {
    database.close()
  }
}

async function main() {
  const args = process.argv.slice(2)
  const get = (name: string) => {
    const index = args.indexOf(name)

    return index === -1 ? undefined : args[index + 1]
  }
  const root = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    '../../..'
  )
  dotenv.config({ path: path.join(root, 'env/.env.local'), quiet: true })
  const databaseUrl = process.env.DATABASE_ADMIN_URL

  if (!databaseUrl)
    throw new Error(
      'DATABASE_ADMIN_URL is required for local migration rehearsal'
    )
  assertLocalDestination(databaseUrl)
  const journalPath = path.resolve(
    get('--journal') || path.join(root, '.temp/migration/journal.json')
  )
  const storageRoot = path.resolve(
    get('--storage') || path.join(root, '.temp/migration/storage')
  )

  if (args.includes('--rollback')) {
    console.log(
      JSON.stringify({
        rolledBack: await rollbackMigration({
          databaseUrl,
          storageRoot,
          journalPath
        })
      })
    )

    return
  }

  const source = get('--snapshot')
  const pocketbase = get('--pocketbase')
  const ownerSourceId = get('--owner')

  if ((!source && !pocketbase) || (source && pocketbase) || !ownerSourceId)
    throw new Error(
      'Use --pocketbase /private/pb_data/data.db or --snapshot /private/export.json, plus --owner OLD_USER_ID [--files /private/storage] [--apply]. Dry-run is the default.'
    )

  const connection = postgres(databaseUrl, { max: 1, onnotice: () => {} })

  let catalog: Catalog

  try {
    catalog = await readCatalog(connection)
  } finally {
    await connection.end()
  }

  const input = pocketbase
    ? await readPocketBaseDatabase(pocketbase)
    : (JSON.parse(await fs.readFile(source!, 'utf8')) as Snapshot)
  const plan = await planMigration(input, catalog, {
    ownerSourceId,
    filesRoot:
      get('--files') ||
      (pocketbase ? path.join(path.dirname(pocketbase), 'storage') : undefined)
  })
  const reportPath = path.resolve(
    get('--report') || path.join(root, '.temp/migration/report.json')
  )
  await privateWrite(reportPath, safeReport(plan))
  const summary = {
    mode: args.includes('--apply') ? 'apply' : 'dry-run',
    counts: plan.counts,
    fileCount: plan.files.length,
    blockerCount: plan.blockers.length,
    warningCount: plan.warnings.length
  }

  if (args.includes('--apply'))
    console.log(
      JSON.stringify({
        ...summary,
        ...(await applyMigration(plan, {
          databaseUrl,
          storageRoot,
          journalPath
        }))
      })
    )
  else console.log(JSON.stringify(summary))
  if (plan.blockers.length) process.exitCode = 1
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  main().catch(() => {
    console.error(
      'Migration failed. Review the private dry-run report or local test diagnostics. Source records and credentials are never printed.'
    )
    process.exitCode = 1
  })
}
