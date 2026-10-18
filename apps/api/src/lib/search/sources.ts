import { contentText } from '@monolith/blocks'
import { ClientError, canonicalBodies } from '@monolith/server-utils'
import { sql } from 'drizzle-orm'

import type { db as database } from '../../core/drizzle'
import { type Source, digest, limits } from './retrieval'

export type Store = Pick<typeof database, 'execute'>

export type Scope = { workspace_id?: string; module?: string }

type Row = Record<string, unknown>
type Adapter = {
  table: string
  module: string
  title: string
  fields: string[]
  key?: string
}

// This list intentionally contains content fields only. Never enumerate users,
// credentials, settings, agent snapshots, push endpoints, or arbitrary tables.
export const adapters: Adapter[] = [
  {
    table: 'notes__entries',
    module: 'notes',
    title: 'name',
    fields: ['content']
  },
  {
    table: 'todo_list__entries',
    module: 'todo-list',
    title: 'summary',
    fields: ['notes', 'done', 'due_date']
  },
  {
    table: 'projects__entries',
    module: 'projects',
    title: 'name',
    fields: ['description']
  },
  {
    table: 'projects__tasks',
    module: 'projects',
    title: 'title',
    fields: ['content', 'done']
  },
  {
    table: 'calendar__events',
    module: 'calendar',
    title: 'title',
    fields: ['description']
  },
  {
    table: 'blog__entries',
    module: 'blog',
    title: 'title',
    fields: ['content']
  },
  {
    table: 'achievements__entries',
    module: 'achievements',
    title: 'title',
    fields: ['thoughts', 'achieved_on']
  },
  {
    table: 'achievements__categories',
    module: 'achievements',
    title: 'name',
    fields: []
  },
  {
    table: 'flashcards__decks',
    module: 'flashcards',
    title: 'name',
    fields: ['description']
  },
  {
    table: 'flashcards__cards',
    module: 'flashcards',
    title: 'question',
    fields: ['answer']
  },
  {
    table: 'wishlist__lists',
    module: 'wishlist',
    title: 'name',
    fields: ['description']
  },
  {
    table: 'wishlist__entries',
    module: 'wishlist',
    title: 'name',
    fields: ['url', 'price', 'notes']
  },
  {
    table: 'idea_box__containers',
    module: 'idea-box',
    title: 'name',
    fields: []
  },
  { table: 'idea_box__folders', module: 'idea-box', title: 'name', fields: [] },
  {
    table: 'idea_box__entries_text',
    module: 'idea-box',
    title: 'content',
    fields: [],
    key: 'base_entry'
  },
  {
    table: 'idea_box__entries_link',
    module: 'idea-box',
    title: 'link',
    fields: [],
    key: 'base_entry'
  },
  {
    table: 'pomodoro_timer__sessions',
    module: 'pomodoro-timer',
    title: 'name',
    fields: ['duration', 'created']
  },
  {
    table: 'code_time__daily_entries',
    module: 'code-time',
    title: 'date',
    fields: ['projects', 'languages', 'relative_files', 'total_minutes']
  },
  {
    table: 'wallet__assets',
    module: 'wallet',
    title: 'name',
    fields: ['starting_balance', 'is_liability']
  },
  { table: 'wallet__ledgers', module: 'wallet', title: 'name', fields: [] },
  {
    table: 'wallet__categories',
    module: 'wallet',
    title: 'name',
    fields: ['type']
  },
  { table: 'wallet__platforms', module: 'wallet', title: 'name', fields: [] },
  {
    table: 'wallet__budgets',
    module: 'wallet',
    title: 'month',
    fields: ['year', 'amount', 'rollover_enabled']
  },
  {
    table: 'wallet__transactions_income_expenses',
    module: 'wallet',
    title: 'particulars',
    fields: ['type', 'location_name'],
    key: 'base_transaction'
  },
  {
    table: 'wallet__transactions',
    module: 'wallet',
    title: 'type',
    fields: ['amount', 'date']
  },
  {
    table: 'wallet__savings_goals',
    module: 'wallet',
    title: 'name',
    fields: ['target_amount', 'current_amount', 'target_date']
  },
  {
    table: 'wallet__transaction_templates',
    module: 'wallet',
    title: 'name',
    fields: ['particulars', 'amount']
  },
  {
    table: 'zillion_agents__playbooks',
    module: 'agents',
    title: 'name',
    fields: ['description', 'instructions', 'checks']
  },
  {
    table: 'zillion_agents__principals',
    module: 'agents',
    title: 'name',
    fields: ['role', 'instructions']
  },
  {
    table: 'zillion_agents__activity',
    module: 'agents',
    title: 'action',
    fields: ['message', 'created']
  },
  {
    table: 'zillion_gym__exercises',
    module: 'gym',
    title: 'name',
    fields: ['muscle_group', 'equipment', 'instructions']
  },
  {
    table: 'zillion_gym__routines',
    module: 'gym',
    title: 'name',
    fields: ['notes']
  },
  {
    table: 'zillion_gym__workouts',
    module: 'gym',
    title: 'name',
    fields: ['date', 'status', 'notes', 'bodyweight_kg']
  },
  {
    table: 'zillion_gym__bodyweight',
    module: 'gym',
    title: 'date',
    fields: ['weight_kg', 'notes']
  },
  {
    table: 'zillion_tech_lab__devices',
    module: 'tech-lab',
    title: 'name',
    fields: [
      'kind',
      'host',
      'os',
      'cpu',
      'gpu',
      'storage',
      'location',
      'notes',
      'tags'
    ]
  },
  {
    table: 'zillion_tech_lab__services',
    module: 'tech-lab',
    title: 'name',
    fields: [
      'kind',
      'category',
      'url',
      'address',
      'description',
      'notes',
      'tags'
    ]
  }
]

export function plain(value: unknown): string {
  if (value == null) return ''
  if (typeof value === 'string')
    return contentText(value)
      .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .trim()
  if (Array.isArray(value)) return value.map(plain).join('\n')
  if (typeof value === 'object')
    return Object.entries(value)
      .map(([key, v]) => `${key}: ${plain(v)}`)
      .join('\n')

  return String(value)
}

/** Every search re-reads authorized content; persisted vectors grant no access. */
export async function collectSources(
  db: Store,
  actor: string,
  scope: Scope = {}
): Promise<Source[]> {
  const catalog = await db.execute<{ table_name: string; column_name: string }>(
    sql`select table_name,column_name from information_schema.columns where table_schema='public'`
  )
  const columns = new Map<string, Set<string>>()

  for (const c of catalog) {
    const set = columns.get(c.table_name) ?? new Set()
    set.add(c.column_name)
    columns.set(c.table_name, set)
  }

  const sources: Source[] = []
  const seen = new Set<string>()
  const bridged = new Set<string>()
  const canonical = await canonicalBodies(db, scope.workspace_id)

  let characters = 0

  function add(source: Omit<Source, 'fingerprint'>) {
    if (scope.module && source.module !== scope.module) return
    if (scope.workspace_id && source.workspace !== scope.workspace_id) return
    if (seen.has(source.id)) return
    if (!source.title && !source.text) return
    source = { ...source, text: source.text || source.title }
    characters += source.text.length
    if (
      source.text.length > limits.document ||
      sources.length >= limits.sources ||
      characters > limits.characters
    )
      throw new ClientError(
        'Search content limit exceeded. Select a workspace or module to narrow the index.',
        413
      )
    sources.push({ ...source, fingerprint: digest(JSON.stringify(source)) })
    seen.add(source.id)
  }
  if (columns.has('zillion_databases__workspaces')) {
    const workspaces = await db.execute<{
      id: string
      owner_id: string
    }>(sql`select w.id,w.owner_id from zillion_databases__workspaces w where
      (w.owner_id=${actor} or exists(select 1 from zillion_databases__workspace_members m where m.workspace_id=w.id and m.user_id=${actor}))
      ${scope.workspace_id ? sql`and w.id=${scope.workspace_id}` : sql``}`)

    if (scope.workspace_id && !workspaces.length)
      throw new ClientError('Workspace not found', 404)

    for (const w of workspaces) {
      const pages = await db.execute<Row>(
        sql`select id,title,route_key,body from zillion_databases__workspace_pages where workspace_id=${w.id} and owner_id=${w.owner_id} limit ${limits.sources + 1}`
      )

      for (const page of pages) {
        const body = page.body as {
          blocks?: { type: string; title: string; content: string }[]
        }
        const route = String(page.route_key)
        add({
          id: `page:${page.id}`,
          title:
            canonical.get(`page:${page.id}`)?.snapshot.meta.title ??
            String(page.title),
          module: 'databases',
          workspace: w.id,
          entityType: route.startsWith('/page/') ? 'page' : 'surface',
          href:
            (route.startsWith('/') && !route.startsWith('//')
              ? route
              : `/page/${page.id}`) + `?workspace=${w.id}`,
          text: canonical.has(`page:${page.id}`)
            ? plain(canonical.get(`page:${page.id}`)!.content)
            : (body.blocks ?? [])
                .filter(b =>
                  ['document', 'heading', 'callout', 'button'].includes(b.type)
                )
                .map(b =>
                  [b.title, plain(b.content)].filter(Boolean).join('\n')
                )
                .join('\n\n')
        })
      }
      // Switch ownership only after an explicit membership check, and always
      // restrict owner-scoped records to that verified workspace's bases.
      await db.execute(
        sql`select set_config('zillion.user_id',${w.owner_id},true)`
      )

      try {
        const rows =
          await db.execute<Row>(sql`select r.id,r.title,r.content,r.item_type,r.tags,r.values,r.done,r.date,b.id as base_id,b.name as base_name,s.kind as native_kind,s.native_id from zillion_databases__records r join zillion_databases__bases b on b.id=r.base_id
          left join zillion_databases__record_sources s on s.record_id=r.id and s.owner_id=r.owner_id
          where b.workspace_id=${w.id} and b.owner_id=${w.owner_id} and r.owner_id=${w.owner_id} limit ${limits.sources + 1}`)
        const nativeModules: Record<string, string> = {
          todo: 'todo-list',
          'project-task': 'projects',
          project: 'projects',
          note: 'notes',
          event: 'calendar',
          post: 'blog'
        }
        const nativeTables: Record<string, string> = {
          todo: 'todo_list__entries',
          'project-task': 'projects__tasks',
          project: 'projects__entries',
          note: 'notes__entries',
          event: 'calendar__events',
          post: 'blog__entries'
        }

        for (const r of rows) {
          if (r.native_id && w.owner_id === actor)
            bridged.add(`${nativeTables[String(r.native_kind)]}:${r.native_id}`)
          add({
            id: `record:${r.id}`,
            title:
              canonical.get(`record:${r.id}`)?.snapshot.meta.title ??
              String(r.title),
            module: nativeModules[String(r.native_kind)] ?? 'databases',
            workspace: w.id,
            entityType: String(r.item_type || 'page'),
            tags: Array.isArray(r.tags) ? r.tags.map(String) : [],
            bodyText: [
              plain(canonical.get(`record:${r.id}`)?.content ?? r.content),
              plain(r.values)
            ].join('\n'),
            href: `/databases?workspace=${w.id}&base=${r.base_id}&record=${r.id}`,
            text: [
              r.base_name,
              r.item_type,
              plain(r.tags),
              plain(canonical.get(`record:${r.id}`)?.content ?? r.content),
              plain(r.values),
              r.date ? String(r.date) : '',
              r.done ? 'Completed' : ''
            ].join('\n')
          })
        }
      } finally {
        await db.execute(
          sql`select set_config('zillion.user_id',${actor},true)`
        )
      }

      if (columns.has('zillion_databases__knowledge_sources')) {
        const imported = await db.execute<Row>(
          sql`select id,title,imported_content,collection_id from zillion_databases__knowledge_sources where workspace_id=${w.id} and kind='text' limit ${limits.sources + 1}`
        )

        for (const r of imported)
          add({
            id: `knowledge:${r.id}`,
            title: String(r.title),
            text: plain(r.imported_content),
            module: 'databases',
            workspace: w.id,
            href: `/databases?workspace=${w.id}&knowledge=${r.collection_id}`
          })
      }
    }
  } else if (scope.workspace_id)
    throw new ClientError('Workspaces unavailable', 503)

  if (!scope.workspace_id) {
    for (const adapter of adapters) {
      if (scope.module && scope.module !== adapter.module) continue

      const available = columns.get(adapter.table)

      // Legacy schemas acquire owner_id during the isolation migration. An
      // unmigrated table must never be read by whole-system search.
      if (!available?.has('owner_id') || !available.has(adapter.title)) continue

      const names = [
        ...new Set([
          'id',
          adapter.key ?? 'id',
          adapter.title,
          ...adapter.fields
        ])
      ].filter(name => available.has(name))
      const rows = await db.execute<Row>(
        sql`select ${sql.join(
          names.map(n => sql.identifier(n)),
          sql`, `
        )} from ${sql.identifier(adapter.table)} where owner_id=${actor} limit ${limits.sources + 1}`
      )
      const workoutDetails = new Map<string, string[]>()

      if (
        adapter.table === 'zillion_gym__workouts' &&
        columns.get('zillion_gym__workout_entries')?.has('owner_id') &&
        columns.get('zillion_gym__workout_sets')?.has('owner_id')
      ) {
        const sets =
          await db.execute<Row>(sql`select e.workout_id,e.exercise->>'name' as exercise,s.position,s.weight_kg,s.reps,s.seconds,s.minutes,s.speed_kmh,s.done
          from zillion_gym__workout_entries e join zillion_gym__workout_sets s on s.entry_id=e.id and s.owner_id=e.owner_id
          where e.owner_id=${actor} and s.owner_id=${actor} order by e.workout_id,e.position,s.position limit ${limits.chunks + 1}`)

        if (sets.length > limits.chunks)
          throw new ClientError('Workout search detail limit exceeded', 413)

        for (const set of sets) {
          const key = String(set.workout_id),
            details = workoutDetails.get(key) ?? []
          details.push(
            `${set.exercise}: set ${Number(set.position) + 1}, ${set.weight_kg} kg, ${set.reps} reps, ${set.seconds} seconds, ${set.minutes} minutes, ${set.speed_kmh} km/h, ${set.done ? 'completed' : 'planned'}`
          )
          workoutDetails.set(key, details)
        }
      }

      for (const r of rows) {
        if (bridged.has(`${adapter.table}:${r.id}`)) continue

        if (adapter.table === 'notes__entries' && canonical.has(`note:${r.id}`))
          r.content = canonical.get(`note:${r.id}`)!.content

        const title = plain(r[adapter.title])
        add({
          id: `${adapter.table}:${r.id}`,
          title: title.slice(0, 240) || adapter.module,
          module: adapter.module,
          workspace: null,
          href: `/${adapter.module}?searchItem=${r[adapter.key ?? 'id']}`,
          text: [
            title,
            ...adapter.fields
              .filter(name => available.has(name))
              .map(name => `${name.replaceAll('_', ' ')}: ${plain(r[name])}`),
            ...(workoutDetails.get(String(r.id)) ?? [])
          ].join('\n')
        })
      }
    }

    if (columns.get('files')?.has('owner_id')) {
      const files = await db.execute<Row>(
        sql`select key,original_name,mime_type,size,module_id,created from files where owner_id=${actor} limit ${limits.sources + 1}`
      )
      const moduleNames = new Set(
        adapters.map(a => a.module).concat('databases')
      )

      for (const f of files) {
        const module = String(f.module_id).replace(/^.*--/, '')

        if (!moduleNames.has(module)) continue
        add({
          id: `file:${f.key}`,
          title: String(f.original_name),
          module,
          workspace: null,
          href: `/${module}`,
          text: `File: ${f.original_name}\nType: ${f.mime_type}\nSize: ${f.size}\nCreated: ${f.created}`,
          file: {
            key: String(f.key),
            mime: String(f.mime_type),
            size: Number(f.size)
          }
        })
      }
    }
  }

  return sources.sort((a, b) => a.id.localeCompare(b.id))
}
