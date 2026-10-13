import { and, eq, sql } from 'drizzle-orm'
import { randomUUID } from 'node:crypto'

import { ClientError, registerMutationObserver } from '@lifeforge/server-utils'

import { viewConfigSchema } from '../shared'
import type { ItemType, NativeSourceKind } from '../workspaceShared'
import {
  bases,
  documents,
  recordSources,
  records,
  views,
  workspacePages,
  workspaces
} from './schema.drizzle'
import {
  type Store,
  defaultWorkspace,
  importLegacyDocument,
  lockConnectedOwner,
  withWorkspaceOwner,
  workspaceAccess
} from './workspaceStore'

const sources: Record<
  NativeSourceKind,
  { table: string; type: ItemType; title: string; content: string }
> = {
  todo: {
    table: 'todo_list__entries',
    type: 'task',
    title: 'summary',
    content: 'notes'
  },
  'project-task': {
    table: 'projects__tasks',
    type: 'task',
    title: 'title',
    content: 'content'
  },
  project: {
    table: 'projects__entries',
    type: 'project',
    title: 'name',
    content: 'description'
  },
  note: {
    table: 'notes__entries',
    type: 'note',
    title: 'name',
    content: 'content'
  },
  event: {
    table: 'calendar__events',
    type: 'event',
    title: 'title',
    content: 'description'
  },
  post: {
    table: 'blog__entries',
    type: 'post',
    title: 'title',
    content: 'content'
  }
}
type Native = { id: string; owner_id: string; [key: string]: unknown }
type RecordRow = typeof records.$inferSelect

async function syncing<T>(db: Store, action: () => Promise<T>) {
  const [previous] = await db.execute<{ flag: string | null }>(
    sql`select current_setting('monolith.syncing',true) as flag`
  )
  await db.execute(sql`select set_config('monolith.syncing','1',true)`)
  try {
    return await action()
  } finally {
    await db.execute(
      sql`select set_config('monolith.syncing',${previous?.flag ?? ''},true)`
    )
  }
}

async function sourceBase(db: Store, owner: string, type: ItemType) {
  const [scope] = await db.execute<{ id: string | null }>(
    sql`select current_setting('monolith.workspace_id',true) as id`
  )
  const [scopedWorkspace] = scope?.id
    ? await db
        .select()
        .from(workspaces)
        .where(and(eq(workspaces.id, scope.id), eq(workspaces.owner_id, owner)))
    : []
  const workspace = scopedWorkspace ?? (await defaultWorkspace(db, owner))
  const [existing] = await db
    .select()
    .from(bases)
    .where(
      and(eq(bases.workspace_id, workspace.id), eq(bases.source_type, type))
    )
  if (existing) return existing
  const [base] = await db
    .insert(bases)
    .values({
      owner_id: owner,
      workspace_id: workspace.id,
      source_type: type,
      name: {
        task: 'Tasks',
        note: 'Notes',
        project: 'Projects',
        event: 'Calendar',
        post: 'Blog',
        page: 'Pages'
      }[type]
    })
    .returning()
  if (!base) throw Error('Source database creation failed')
  await db.insert(views).values({
    owner_id: owner,
    base_id: base.id,
    name: 'All',
    mode: 'table',
    config: viewConfigSchema.parse({})
  })
  return base
}

async function nativeRow(
  db: Store,
  owner: string,
  kind: NativeSourceKind,
  id: string
) {
  const [row] = await db.execute<Native>(
    sql`select * ${kind === 'todo' ? sql`,due_date at time zone 'UTC' as due_date` : sql``} from ${sql.identifier(sources[kind].table)} where id=${id} and owner_id=${owner}`
  )
  return row
}

async function attach(
  db: Store,
  record: RecordRow,
  kind: NativeSourceKind,
  nativeId: string
) {
  await db
    .insert(recordSources)
    .values({
      owner_id: record.owner_id,
      record_id: record.id,
      kind,
      native_id: nativeId
    })
    .onConflictDoNothing()
}

async function nativeProject(db: Store, record: RecordRow) {
  if (!record.project_id) return null
  const [project] = await db
    .select()
    .from(records)
    .where(
      and(
        eq(records.id, record.project_id),
        eq(records.owner_id, record.owner_id),
        eq(records.item_type, 'project')
      )
    )
  if (!project) throw new ClientError('Choose a project item in this workspace')
  const [taskBase] = await db
    .select()
    .from(bases)
    .where(eq(bases.id, record.base_id))
  const [projectBase] = await db
    .select()
    .from(bases)
    .where(eq(bases.id, project.base_id))
  if (taskBase?.workspace_id !== projectBase?.workspace_id)
    throw new ClientError('Project belongs to another workspace')
  const [source] = await db
    .select()
    .from(recordSources)
    .where(
      and(
        eq(recordSources.record_id, project.id),
        eq(recordSources.kind, 'project')
      )
    )
  if (!source) {
    await syncItemToModules(db, project)
    return nativeProject(db, record)
  }
  return source.native_id
}

export async function removeItemFromModules(db: Store, record: RecordRow) {
  await syncing(db, async () => {
    const refs = await db
      .select()
      .from(recordSources)
      .where(
        and(
          eq(recordSources.record_id, record.id),
          eq(recordSources.owner_id, record.owner_id)
        )
      )
    // Detach dependent task counterparts before a native project cascade.
    if (refs.some(ref => ref.kind === 'project')) {
      const children = await db
        .select()
        .from(records)
        .where(
          and(
            eq(records.project_id, record.id),
            eq(records.owner_id, record.owner_id)
          )
        )
      for (const child of children) {
        const taskRefs = await db
          .select()
          .from(recordSources)
          .where(
            and(
              eq(recordSources.record_id, child.id),
              eq(recordSources.kind, 'project-task')
            )
          )
        await db
          .delete(recordSources)
          .where(
            and(
              eq(recordSources.record_id, child.id),
              eq(recordSources.kind, 'project-task')
            )
          )
        for (const ref of taskRefs)
          await db.execute(
            sql`delete from projects__tasks where id=${ref.native_id} and owner_id=${record.owner_id}`
          )
        await db
          .update(records)
          .set({ project_id: null, updated: new Date() })
          .where(eq(records.id, child.id))
      }
    }
    await db.delete(recordSources).where(eq(recordSources.record_id, record.id))
    for (const ref of refs)
      await db.execute(
        sql`delete from ${sql.identifier(sources[ref.kind].table)} where id=${ref.native_id} and owner_id=${record.owner_id}`
      )
  })
}

export async function syncItemToModules(
  db: Store,
  record: RecordRow,
  previous?: RecordRow,
  origin?: NativeSourceKind
) {
  if (record.end_date && record.date && record.end_date < record.date)
    throw new ClientError('End date must follow the start date')
  if (
    Array.from(record.title).length > 255 &&
    (['note', 'project', 'event', 'post'].includes(record.item_type) ||
      (record.item_type === 'task' && record.project_id))
  )
    throw new ClientError(
      'This module supports titles up to 255 characters. Shorten the title before changing its type or project.'
    )
  await syncing(db, async () => {
    if (previous && previous.item_type !== record.item_type)
      await removeItemFromModules(db, previous)
    const refs = await db
      .select()
      .from(recordSources)
      .where(
        and(
          eq(recordSources.record_id, record.id),
          eq(recordSources.owner_id, record.owner_id)
        )
      )
    const needed: NativeSourceKind[] =
      record.item_type === 'task'
        ? ['todo', ...(record.project_id ? ['project-task' as const] : [])]
        : record.item_type === 'page'
          ? []
          : [
              record.item_type === 'project'
                ? 'project'
                : record.item_type === 'note'
                  ? 'note'
                  : record.item_type === 'event'
                    ? 'event'
                    : 'post'
            ]
    for (const ref of refs.filter(ref => !needed.includes(ref.kind))) {
      await db.delete(recordSources).where(eq(recordSources.id, ref.id))
      await db.execute(
        sql`delete from ${sql.identifier(sources[ref.kind].table)} where id=${ref.native_id} and owner_id=${record.owner_id}`
      )
    }
    for (const kind of needed) {
      const ref = refs.find(ref => ref.kind === kind)
      const current = ref
        ? await nativeRow(db, record.owner_id, kind, ref.native_id)
        : undefined
      // Importing a native row must not rewrite its dispatch/conflict baseline.
      if (current && origin === kind) continue
      const id = current?.id ?? randomUUID()
      const owner = record.owner_id
      if (current) {
        await db.execute(
          sql`update ${sql.identifier(sources[kind].table)} set ${sql.identifier(sources[kind].title)}=${record.title},${sql.identifier(sources[kind].content)}=${record.content},updated=now() where id=${id} and owner_id=${owner} and (${sql.identifier(sources[kind].title)} is distinct from ${record.title} or ${sql.identifier(sources[kind].content)} is distinct from ${record.content})`
        )
      }
      if (kind === 'todo') {
        if (!current)
          await db.execute(
            sql`insert into todo_list__entries(id,owner_id,summary,notes) values(${id},${owner},${record.title},${record.content})`
          )
        await db.execute(
          sql`update todo_list__entries set updated=case when done is distinct from ${record.done} or due_date is distinct from ${record.date?.toISOString() ?? null}::timestamp then now() else updated end,done=${record.done},completed_at=case when ${record.done} then coalesce(completed_at,now()) else null end,due_date=${record.date?.toISOString() ?? null}::timestamp where id=${id} and owner_id=${owner}`
        )
      } else if (kind === 'project') {
        if (!current)
          await db.execute(
            sql`insert into projects__entries(id,owner_id,name,description,color,icon) values(${id},${owner},${record.title},${record.content},'#3b8a82','lucide:folder')`
          )
      } else if (kind === 'project-task') {
        const projectId = await nativeProject(db, record)
        if (!projectId) continue
        const [column] = await db.execute<{ id: string }>(
          sql`select id from projects__columns where project_id=${projectId} and owner_id=${owner} order by created,id limit 1`
        )
        const columnId = column?.id ?? randomUUID()
        if (!column)
          await db.execute(
            sql`insert into projects__columns(id,owner_id,project_id,name,color,icon) values(${columnId},${owner},${projectId},'Tasks','#3b8a82','lucide:list-todo')`
          )
        if (!current)
          await db.execute(
            sql`insert into projects__tasks(id,owner_id,title,content,column_id,completed) values(${id},${owner},${record.title},${record.content},${columnId},${record.done})`
          )
        else {
          const [location] = await db.execute<{ project_id: string }>(
            sql`select project_id from projects__columns where id=${String(current.column_id)} and owner_id=${owner}`
          )
          await db.execute(
            sql`update projects__tasks set updated=case when completed is distinct from ${record.done} or column_id is distinct from ${location?.project_id === projectId ? String(current.column_id) : columnId}::uuid then now() else updated end,completed=${record.done},column_id=${location?.project_id === projectId ? String(current.column_id) : columnId} where id=${id} and owner_id=${owner}`
          )
        }
      } else if (kind === 'note' && !current) {
        const [subject] = await db.execute<{ id: string }>(
          sql`select id from notes__subjects where owner_id=${owner} order by created,id limit 1`
        )
        const subjectId = subject?.id ?? randomUUID()
        if (!subject) {
          const [workspace] = await db.execute<{ id: string }>(
            sql`select id from notes__workspaces where owner_id=${owner} order by created,id limit 1`
          )
          const workspaceId = workspace?.id ?? randomUUID()
          if (!workspace)
            await db.execute(
              sql`insert into notes__workspaces(id,owner_id,name,icon) values(${workspaceId},${owner},'Personal','lucide:notebook')`
            )
          await db.execute(
            sql`insert into notes__subjects(id,owner_id,title,description,icon,workspace_id) values(${subjectId},${owner},'Workspace notes','','lucide:notebook',${workspaceId})`
          )
        }
        await db.execute(
          sql`insert into notes__entries(id,owner_id,name,type,content,subject_id) values(${id},${owner},${record.title},'note',${record.content},${subjectId})`
        )
      } else if (kind === 'post' && !current) {
        await db.execute(
          sql`insert into blog__entries(id,owner_id,title,content,excerpt,visibility,labels,featured_image) values(${id},${owner},${record.title},${record.content},'','private','','')`
        )
      } else if (kind === 'event') {
        if (!current) {
          await db.execute(
            sql`insert into calendar__events(id,owner_id,title,description,type) values(${id},${owner},${record.title},${record.content},'single')`
          )
          await db.execute(
            sql`insert into calendar__events_single(owner_id,base_event,start,"end") values(${owner},${id},${record.date?.toISOString() ?? null}::timestamp,${record.end_date?.toISOString() ?? record.date?.toISOString() ?? null}::timestamp)`
          )
        } else if (current.type === 'single') {
          if (
            previous &&
            (previous.date?.getTime() !== record.date?.getTime() ||
              previous.end_date?.getTime() !== record.end_date?.getTime())
          )
            await db.execute(
              sql`update calendar__events set updated=now() where id=${id} and owner_id=${owner}`
            )
          await db.execute(
            sql`update calendar__events_single set start=${record.date?.toISOString() ?? null}::timestamp,"end"=${record.end_date?.toISOString() ?? record.date?.toISOString() ?? null}::timestamp where base_event=${id} and owner_id=${owner}`
          )
        } else if (
          previous &&
          (previous.date?.getTime() !== record.date?.getTime() ||
            previous.end_date?.getTime() !== record.end_date?.getTime())
        ) {
          throw new ClientError(
            'Edit recurring dates in Calendar to preserve the recurrence rule',
            409
          )
        }
      }
      if (!ref) await attach(db, record, kind, id)
      else if (!current)
        await db
          .update(recordSources)
          .set({ native_id: id })
          .where(eq(recordSources.id, ref.id))
    }
  })
}

async function importNative(
  db: Store,
  owner: string,
  kind: NativeSourceKind,
  row: Native
) {
  if (kind === 'note' && row.type !== 'note') return
  const [source] = await db
    .select()
    .from(recordSources)
    .where(
      and(
        eq(recordSources.owner_id, owner),
        eq(recordSources.kind, kind),
        eq(recordSources.native_id, row.id)
      )
    )
  const [current] = source
    ? await db
        .select()
        .from(records)
        .where(
          and(eq(records.id, source.record_id), eq(records.owner_id, owner))
        )
    : []
  const values = {
    title: String(row[sources[kind].title] ?? ''),
    content: String(row[sources[kind].content] ?? ''),
    item_type: sources[kind].type,
    updated: new Date(
      Math.max(Date.now(), (current?.updated.getTime() ?? 0) + 1)
    )
  }
  const data: Partial<RecordRow> & typeof values = { ...values }
  if (kind === 'todo') {
    data.done = Boolean(row.done)
    data.date = row.due_date ? new Date(String(row.due_date)) : null
  }
  if (kind === 'project-task') {
    data.done = Boolean(row.completed)
    const [project] = await db.execute<Native>(
      sql`select p.* from projects__entries p join projects__columns c on c.project_id=p.id where c.id=${String(row.column_id)} and p.owner_id=${owner}`
    )
    if (project) {
      const linked = await importNative(db, owner, 'project', project)
      data.project_id = linked?.id ?? null
    }
  }
  if (kind === 'event') {
    const [dates] = await db.execute<{
      start: string | null
      end: string | null
    }>(
      sql`select start at time zone 'UTC' as start,"end" at time zone 'UTC' as "end" from calendar__events_single where base_event=${row.id} and owner_id=${owner} limit 1`
    )
    data.date = dates?.start ? new Date(dates.start) : null
    data.end_date = dates?.end ? new Date(dates.end) : null
  }
  const base = current ? null : await sourceBase(db, owner, sources[kind].type)
  const [record] = current
    ? await db
        .update(records)
        .set(data)
        .where(eq(records.id, current.id))
        .returning()
    : await db
        .insert(records)
        .values({ ...data, owner_id: owner, base_id: base!.id })
        .returning()
  if (!record) throw Error('Item import failed')
  if (!source) await attach(db, record, kind, row.id)
  await syncItemToModules(db, record, current, kind)
  return record
}

export async function importExistingItems(db: Store, owner: string) {
  const workspace = await defaultWorkspace(db, owner)
  const [state] = await db.execute<{ imported: boolean }>(
    sql`select native_imported as imported from zillion_databases__workspaces where id=${workspace.id}`
  )
  if (state?.imported) return
  for (const kind of [
    'project',
    'todo',
    'project-task',
    'note',
    'event',
    'post'
  ] as NativeSourceKind[]) {
    const [available] = await db.execute<{ present: boolean }>(
      sql`select to_regclass(${sources[kind].table}) is not null as present`
    )
    if (!available?.present) continue
    const rows = await db.execute<Native>(
      sql`select * ${kind === 'todo' ? sql`,due_date at time zone 'UTC' as due_date` : sql``} from ${sql.identifier(sources[kind].table)} where owner_id=${owner} order by created,id`
    )
    for (const row of rows) await importNative(db, owner, kind, row)
  }
  await db.execute(
    sql`update zillion_databases__workspaces set native_imported=true where id=${workspace.id} and owner_id=${owner}`
  )
}

export async function drainNativeChanges(
  db: Store,
  userId: string,
  currentOnly = false
) {
  await lockConnectedOwner(db, userId)
  const changes = await db.execute<{
    id: string
    kind: NativeSourceKind | 'event-date' | 'document'
    native_id: string
    operation: string
    payload: Native
  }>(
    sql`select * from monolith_native_changes where (${currentOnly}=false or transaction_id=txid_current()) and owner_id=${userId} order by id`
  )
  // Multiple statements can touch one entity. Synchronize its final transaction state.
  const latest = new Map(
    changes.map(change => [
      `${change.kind === 'event-date' ? 'event' : change.kind}:${change.native_id}`,
      change
    ])
  )
  for (const change of [...latest.values()].sort(
    (left, right) =>
      Number(right.kind === 'project') - Number(left.kind === 'project')
  )) {
    if (change.kind === 'document') {
      const [doc] = await db
        .select()
        .from(documents)
        .where(
          and(
            eq(documents.id, change.native_id),
            eq(documents.owner_id, userId)
          )
        )
      if (doc) {
        const [page] = await db
          .select({ workspace_id: workspacePages.workspace_id })
          .from(workspacePages)
          .where(
            and(
              eq(workspacePages.id, doc.id),
              eq(workspacePages.owner_id, userId)
            )
          )
        const workspaceId =
          page?.workspace_id ?? (await defaultWorkspace(db, userId)).id
        await importLegacyDocument(db, workspaceId, userId, doc)
      } else
        await db
          .delete(workspacePages)
          .where(
            and(
              eq(workspacePages.id, change.native_id),
              eq(workspacePages.owner_id, userId)
            )
          )
      continue
    }
    const kind = change.kind === 'event-date' ? 'event' : change.kind
    const row = await nativeRow(db, userId, kind, change.native_id)
    if (row) await importNative(db, userId, kind, row)
    else {
      const [source] = await db
        .select()
        .from(recordSources)
        .where(
          and(
            eq(recordSources.owner_id, userId),
            eq(recordSources.kind, kind),
            eq(recordSources.native_id, change.native_id)
          )
        )
      if (!source) continue
      const [record] = await db
        .select()
        .from(records)
        .where(
          and(eq(records.id, source.record_id), eq(records.owner_id, userId))
        )
      if (record) {
        await removeItemFromModules(db, record)
        await db.delete(records).where(eq(records.id, record.id))
      }
    }
  }
  if (changes.length)
    await db.execute(
      sql`delete from monolith_native_changes where owner_id=${userId} and id in (${sql.join(
        changes.map(change => sql`${change.id}::bigint`),
        sql`,`
      )})`
    )
}

registerMutationObserver(
  'connected-items',
  async ({ db: database, userId, moduleId, phase, workspaceId }) => {
    if (
      !moduleId ||
      ![
        'lifeforge--todo-list',
        'lifeforge--projects',
        'lifeforge--notes',
        'lifeforge--calendar',
        'lifeforge--blog',
        'zillion--databases',
        'zillion--agents'
      ].includes(moduleId)
    )
      return
    const db = database as Store
    if (
      workspaceId &&
      ['zillion--databases', 'zillion--agents'].includes(moduleId)
    ) {
      const workspace = await workspaceAccess(db, userId, workspaceId)
      await withWorkspaceOwner(db, userId, workspace.owner_id, () =>
        drainNativeChanges(db, workspace.owner_id, phase !== 'before')
      )
    } else await drainNativeChanges(db, userId, phase !== 'before')
  }
)
