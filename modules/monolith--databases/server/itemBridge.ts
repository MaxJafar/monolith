// SPDX-License-Identifier: 0BSD
import { and, eq, sql } from 'drizzle-orm'
import { randomUUID } from 'node:crypto'

import { ClientError, registerMutationObserver } from '@monolith/server-utils'

import { viewConfigSchema } from '../shared'
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

type Item = typeof records.$inferSelect
type Kind = 'project' | 'project-task'
type Native = { id: string; owner_id: string; [key: string]: unknown }
const sources = {
  project: {
    table: 'projects__entries',
    title: 'name',
    content: 'description'
  },
  'project-task': {
    table: 'projects__tasks',
    title: 'title',
    content: 'content'
  }
} as const
const supported = (kind: string): kind is Kind =>
  kind === 'project' || kind === 'project-task'
async function available(db: Store) {
  const [state] = await db.execute<{ ready: boolean }>(
    sql`select to_regclass('projects__entries') is not null and to_regclass('projects__columns') is not null and to_regclass('projects__tasks') is not null as ready`
  )
  return state?.ready === true
}
async function syncing<T>(db: Store, operation: () => Promise<T>) {
  const [before] = await db.execute<{ flag: string | null }>(
    sql`select current_setting('monolith.syncing',true) as flag`
  )
  await db.execute(sql`select set_config('monolith.syncing','1',true)`)
  try {
    return await operation()
  } finally {
    await db.execute(
      sql`select set_config('monolith.syncing',${before?.flag || '0'},true)`
    )
  }
}
async function references(db: Store, item: Item) {
  const rows = await db
    .select()
    .from(recordSources)
    .where(
      and(
        eq(recordSources.record_id, item.id),
        eq(recordSources.owner_id, item.owner_id)
      )
    )
  return rows.filter((row): row is typeof row & { kind: Kind } =>
    supported(row.kind)
  )
}
async function row(db: Store, owner: string, kind: Kind, id: string) {
  return (
    await db.execute<Native>(
      sql`select * from ${sql.identifier(sources[kind].table)} where id=${id} and owner_id=${owner}`
    )
  )[0]
}
async function link(db: Store, item: Item, kind: Kind, id: string) {
  await db
    .insert(recordSources)
    .values({
      owner_id: item.owner_id,
      record_id: item.id,
      kind,
      native_id: id
    })
    .onConflictDoNothing()
}
async function baseFor(db: Store, owner: string, kind: Kind) {
  const [scope] = await db.execute<{ id: string | null }>(
    sql`select current_setting('monolith.workspace_id',true) as id`
  )
  const [scoped] = scope?.id
    ? await db
        .select()
        .from(workspaces)
        .where(and(eq(workspaces.id, scope.id), eq(workspaces.owner_id, owner)))
    : []
  const workspace = scoped ?? (await defaultWorkspace(db, owner)),
    type = kind === 'project' ? 'project' : 'task'
  const [existing] = await db
    .select()
    .from(bases)
    .where(
      and(eq(bases.workspace_id, workspace.id), eq(bases.source_type, type))
    )
  if (existing) return existing
  const [created] = await db
    .insert(bases)
    .values({
      owner_id: owner,
      workspace_id: workspace.id,
      source_type: type,
      table_type: kind === 'project' ? 'project' : 'action',
      name: kind === 'project' ? 'Projects' : 'Actions'
    })
    .returning()
  if (!created) throw Error('Work queue database could not be created')
  await db.insert(views).values({
    owner_id: owner,
    base_id: created.id,
    name: 'All',
    mode: 'table',
    config: viewConfigSchema.parse({})
  })
  return created
}
async function projectFor(db: Store, item: Item) {
  if (!item.project_id) return null
  const [project] = await db
    .select()
    .from(records)
    .where(
      and(
        eq(records.id, item.project_id),
        eq(records.owner_id, item.owner_id),
        eq(records.item_type, 'project')
      )
    )
  if (!project) throw new ClientError('Project not found', 404)
  const found = await db
    .select({ id: bases.id, workspace: bases.workspace_id })
    .from(bases)
    .where(sql`${bases.id} in (${item.base_id}::uuid,${project.base_id}::uuid)`)
  if (
    found.length !== (item.base_id === project.base_id ? 1 : 2) ||
    (found.length > 1 && found[0]?.workspace !== found[1]?.workspace)
  )
    throw new ClientError('Project belongs to another workspace')
  let ref = (await references(db, project)).find(ref => ref.kind === 'project')
  if (!ref) {
    await syncItemToModules(db, project)
    ref = (await references(db, project)).find(ref => ref.kind === 'project')
  }
  return ref?.native_id ?? null
}
export async function removeItemFromModules(db: Store, item: Item) {
  if (!(await available(db))) return
  await syncing(db, async () => {
    const refs = await references(db, item)
    if (refs.some(ref => ref.kind === 'project')) {
      const children = await db
        .select()
        .from(records)
        .where(
          and(
            eq(records.project_id, item.id),
            eq(records.owner_id, item.owner_id)
          )
        )
      for (const child of children) {
        for (const ref of await references(db, child))
          if (ref.kind === 'project-task') {
            await db.delete(recordSources).where(eq(recordSources.id, ref.id))
            await db.execute(
              sql`delete from projects__tasks where id=${ref.native_id} and owner_id=${item.owner_id}`
            )
          }
        await db
          .update(records)
          .set({ project_id: null, updated: new Date() })
          .where(eq(records.id, child.id))
      }
    }
    for (const ref of refs) {
      await db.delete(recordSources).where(eq(recordSources.id, ref.id))
      await db.execute(
        sql`delete from ${sql.identifier(sources[ref.kind].table)} where id=${ref.native_id} and owner_id=${item.owner_id}`
      )
    }
  })
}
export async function syncItemToModules(
  db: Store,
  item: Item,
  previous?: Item,
  origin?: Kind
) {
  if (item.date && item.end_date && item.end_date < item.date)
    throw new ClientError('End date must follow the start date')
  if (!(await available(db))) return
  await syncing(db, async () => {
    if (previous && previous.item_type !== item.item_type)
      await removeItemFromModules(db, previous)
    const refs = await references(db, item),
      needed: Kind[] =
        item.item_type === 'project'
          ? ['project']
          : item.item_type === 'task' && item.project_id
            ? ['project-task']
            : []
    if (needed.length && Array.from(item.title).length > 255)
      throw new ClientError(
        'Agent work item titles support up to 255 characters'
      )
    for (const ref of refs.filter(ref => !needed.includes(ref.kind))) {
      await db.delete(recordSources).where(eq(recordSources.id, ref.id))
      await db.execute(
        sql`delete from ${sql.identifier(sources[ref.kind].table)} where id=${ref.native_id} and owner_id=${item.owner_id}`
      )
    }
    for (const kind of needed) {
      const ref = refs.find(ref => ref.kind === kind),
        current = ref
          ? await row(db, item.owner_id, kind, ref.native_id)
          : undefined
      if (current && origin === kind) continue
      const id = current?.id ?? randomUUID(),
        owner = item.owner_id
      if (current)
        await db.execute(
          sql`update ${sql.identifier(sources[kind].table)} set ${sql.identifier(sources[kind].title)}=${item.title},${sql.identifier(sources[kind].content)}=${item.content},updated=now() where id=${id} and owner_id=${owner} and (${sql.identifier(sources[kind].title)} is distinct from ${item.title} or ${sql.identifier(sources[kind].content)} is distinct from ${item.content})`
        )
      if (kind === 'project') {
        if (!current)
          await db.execute(
            sql`insert into projects__entries(id,owner_id,name,description,color,icon) values(${id},${owner},${item.title},${item.content},'#3b8a82','lucide:folder')`
          )
      } else {
        const project = await projectFor(db, item)
        if (!project) continue
        const [column] = await db.execute<{ id: string }>(
          sql`select id from projects__columns where project_id=${project} and owner_id=${owner} order by created,id limit 1`
        )
        const columnId = column?.id ?? randomUUID()
        if (!column)
          await db.execute(
            sql`insert into projects__columns(id,owner_id,project_id,name,color,icon) values(${columnId},${owner},${project},'Tasks','#3b8a82','lucide:list-todo')`
          )
        if (!current)
          await db.execute(
            sql`insert into projects__tasks(id,owner_id,title,content,column_id,completed) values(${id},${owner},${item.title},${item.content},${columnId},${item.done})`
          )
        else {
          const [location] = await db.execute<{ project_id: string }>(
            sql`select project_id from projects__columns where id=${String(current.column_id)} and owner_id=${owner}`
          )
          const next =
            location?.project_id === project
              ? String(current.column_id)
              : columnId
          await db.execute(
            sql`update projects__tasks set completed=${item.done},column_id=${next},updated=case when completed is distinct from ${item.done} or column_id is distinct from ${next}::uuid then now() else updated end where id=${id} and owner_id=${owner}`
          )
        }
      }
      if (!ref) await link(db, item, kind, id)
      else if (!current)
        await db
          .update(recordSources)
          .set({ native_id: id })
          .where(eq(recordSources.id, ref.id))
    }
  })
}
async function importWork(
  db: Store,
  owner: string,
  kind: Kind,
  native: Native
): Promise<Item> {
  const [source] = await db
    .select()
    .from(recordSources)
    .where(
      and(
        eq(recordSources.owner_id, owner),
        eq(recordSources.kind, kind),
        eq(recordSources.native_id, native.id)
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
  const values: Partial<Item> & {
    title: string
    content: string
    item_type: 'task' | 'project'
  } = {
    title: String(native[sources[kind].title] ?? ''),
    content: String(native[sources[kind].content] ?? ''),
    item_type: kind === 'project' ? 'project' : 'task',
    updated: new Date(
      Math.max(Date.now(), (current?.updated.getTime() ?? 0) + 1)
    )
  }
  if (kind === 'project-task') {
    values.done = Boolean(native.completed)
    values.status = values.done
      ? 'done'
      : current?.status === 'active'
        ? 'active'
        : 'planned'
    const [project] = await db.execute<Native>(
      sql`select p.* from projects__entries p join projects__columns c on c.project_id=p.id where c.id=${String(native.column_id)} and p.owner_id=${owner} and c.owner_id=${owner}`
    )
    if (project)
      values.project_id = (await importWork(db, owner, 'project', project)).id
  }
  const base = current ? null : await baseFor(db, owner, kind)
  const [item] = current
    ? await db
        .update(records)
        .set(values)
        .where(eq(records.id, current.id))
        .returning()
    : await db
        .insert(records)
        .values({ ...values, owner_id: owner, base_id: base!.id })
        .returning()
  if (!item) throw Error('Agent work item import failed')
  if (!source) await link(db, item, kind, native.id)
  await syncItemToModules(db, item, current, kind)
  return item
}
export async function importExistingItems(db: Store, owner: string) {
  if (!(await available(db))) return
  const workspace = await defaultWorkspace(db, owner)
  if (workspace.native_imported) return
  for (const kind of ['project', 'project-task'] as const) {
    for (const item of await db.execute<Native>(
      sql`select * from ${sql.identifier(sources[kind].table)} where owner_id=${owner} order by created,id`
    ))
      await importWork(db, owner, kind, item)
  }
  await db
    .update(workspaces)
    .set({ native_imported: true })
    .where(and(eq(workspaces.id, workspace.id), eq(workspaces.owner_id, owner)))
}
export async function drainNativeChanges(
  db: Store,
  userId: string,
  currentOnly = false
) {
  await lockConnectedOwner(db, userId)
  const [journal] = await db.execute<{ present: boolean }>(
    sql`select to_regclass('monolith_native_changes') is not null as present`
  )
  if (!journal?.present) return
  const changes = await db.execute<{
    id: string
    kind: string
    native_id: string
  }>(
    sql`select * from monolith_native_changes where (${currentOnly}=false or transaction_id=txid_current()) and owner_id=${userId} order by id`
  )
  const latest = new Map(
    changes.map(change => [change.kind + ':' + change.native_id, change])
  )
  const workReady = await available(db)
  for (const change of [...latest.values()].sort(
    (a, b) => Number(b.kind === 'project') - Number(a.kind === 'project')
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
          .select({ workspace: workspacePages.workspace_id })
          .from(workspacePages)
          .where(
            and(
              eq(workspacePages.id, doc.id),
              eq(workspacePages.owner_id, userId)
            )
          )
        await importLegacyDocument(
          db,
          page?.workspace ?? (await defaultWorkspace(db, userId)).id,
          userId,
          doc
        )
      } else
        await db
          .delete(workspacePages)
          .where(
            and(
              eq(workspacePages.id, change.native_id),
              eq(workspacePages.owner_id, userId)
            )
          )
    } else if (workReady && supported(change.kind)) {
      const item = await row(db, userId, change.kind, change.native_id)
      if (item) await importWork(db, userId, change.kind, item)
      else {
        const [ref] = await db
          .select()
          .from(recordSources)
          .where(
            and(
              eq(recordSources.owner_id, userId),
              eq(recordSources.kind, change.kind),
              eq(recordSources.native_id, change.native_id)
            )
          )
        const [record] = ref
          ? await db
              .select()
              .from(records)
              .where(
                and(eq(records.id, ref.record_id), eq(records.owner_id, userId))
              )
          : []
        if (record) {
          await removeItemFromModules(db, record)
          await db.delete(records).where(eq(records.id, record.id))
        }
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
      !['monolith--databases', 'monolith--agents', 'monolith--gym'].includes(
        moduleId
      )
    )
      return
    const db = database as Store
    if (workspaceId) {
      const workspace = await workspaceAccess(db, userId, workspaceId)
      await withWorkspaceOwner(db, userId, workspace.owner_id, () =>
        drainNativeChanges(db, workspace.owner_id, phase !== 'before')
      )
    } else await drainNativeChanges(db, userId, phase !== 'before')
  }
)
