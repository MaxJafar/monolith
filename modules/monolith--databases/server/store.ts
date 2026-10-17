import type { BuiltModuleSchema } from '@monolith/drizzle'
import { ClientError } from '@monolith/server-utils'
import { and, asc, eq, inArray, sql } from 'drizzle-orm'
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'

import {
  type Person,
  type SavedView,
  personSchema,
  viewConfigSchema
} from '../shared'
import * as schema from './schema.drizzle'
import { bases, fields, links, records, views } from './schema.drizzle'

export type Database = PostgresJsDatabase<BuiltModuleSchema<typeof schema>>

export type Transaction = Parameters<Parameters<Database['transaction']>[0]>[0]

type Store = Database | Transaction

export async function ownedPeople(db: Store, owner: string): Promise<Person[]> {
  const [workspace] = await db.execute<{ id: string | null }>(
    sql`select current_setting('monolith.workspace_id',true) as id`
  )
  let people: Person[]
  if (workspace?.id) {
    const members = await db.execute<{ id: string; label: string }>(
      sql`select u.id,coalesce(nullif(u.name,''),u.username) as label from users u where u.id=${owner} or exists(select 1 from zillion_databases__workspace_members m where m.workspace_id=${workspace.id} and m.user_id=u.id)`
    )
    people = members.map(person => ({
      ...person,
      kind: 'human' as const,
      status: 'active' as const
    }))
  } else {
    const accounts = await db.execute<{ id: string; label: string }>(sql`
    select id, coalesce(nullif(name, ''), username) as label from users where id = ${owner}
  `)
    people = [
      {
        id: owner,
        label: accounts[0]?.label ?? 'Current account',
        kind: 'human',
        status: 'active'
      }
    ]
  }
  const [available] = await db.execute<{ present: boolean }>(sql`
    select to_regclass('public.zillion_agents__principals') is not null as present
  `)

  if (available?.present) {
    const profiles = await db.execute<{
      id: string
      label: string
      kind: string
      status: string
    }>(sql`
      select id, name as label, kind, status from zillion_agents__principals where owner_id = ${owner} and (${workspace?.id || null}::uuid is null or kind='agent') order by name, id
    `)

    for (const profile of profiles) {
      const person = personSchema.parse(profile)
      const index = people.findIndex(current => current.id === person.id)

      if (index === -1) people.push(person)
      else people[index] = person
    }
  }

  return people
}

export async function validateViewIdentities(
  db: Store,
  owner: string,
  baseFields: Awaited<ReturnType<typeof ownedField>>[],
  view: Pick<SavedView, 'config'>
) {
  for (const filter of [
    ...view.config.filters,
    ...(view.config.filter_groups ?? []).flatMap(group => group.filters)
  ]) {
    const field = baseFields.find(field => field.id === filter.field_id)

    if (
      field?.kind !== 'relation' ||
      ['empty', 'not-empty'].includes(filter.operator)
    )
      continue

    const targets = Array.isArray(filter.value) ? filter.value : [filter.value]

    for (const id of targets) {
      if (typeof id !== 'string')
        throw new ClientError('Relation filter requires a record identifier')

      const target = await ownedRecord(db, owner, id)

      if (target.base_id !== field.target_base_id)
        throw new ClientError(
          'Relation filter target belongs to another database'
        )
    }
  }
}

export async function checkCalendarFieldRemoval(
  db: Store,
  owner: string,
  removed: string[],
  deletingBase?: string
) {
  const saved = await db.select().from(views).where(eq(views.owner_id, owner))

  for (const view of saved) {
    if (view.base_id === deletingBase || view.mode !== 'calendar') continue
    if (
      removed.includes(view.config.date_field_id ?? '') ||
      removed.includes(view.config.end_date_field_id ?? '')
    )
      throw new ClientError(
        `Calendar "${view.name}" uses this date field; change its date settings before deleting it`,
        409
      )
  }
}

export async function ownedBase(
  db: Store,
  owner: string,
  id: string,
  lock = false
) {
  const query = db
    .select()
    .from(bases)
    .where(and(eq(bases.id, id), eq(bases.owner_id, owner)))
  const [base] = await (lock ? query.for('update') : query)

  if (!base) throw new ClientError('Database not found', 404)

  return base
}

export async function ownedRecord(db: Store, owner: string, id: string) {
  const [record] = await db
    .select()
    .from(records)
    .where(and(eq(records.id, id), eq(records.owner_id, owner)))

  if (!record) throw new ClientError('Record not found', 404)

  return record
}

export async function ownedField(db: Store, owner: string, id: string) {
  const [field] = await db
    .select()
    .from(fields)
    .where(and(eq(fields.id, id), eq(fields.owner_id, owner)))

  if (!field) throw new ClientError('Field not found', 404)

  return field
}

export async function baseFields(db: Store, owner: string, base: string) {
  return db
    .select()
    .from(fields)
    .where(and(eq(fields.owner_id, owner), eq(fields.base_id, base)))
    .orderBy(asc(fields.position))
}

export async function cleanRemovedFields(
  db: Store,
  owner: string,
  removed: string[]
) {
  const allRecords = await db
    .select()
    .from(records)
    .where(eq(records.owner_id, owner))

  for (const record of allRecords) {
    if (!removed.some(id => id in record.values)) continue

    const values = { ...record.values }

    for (const id of removed) delete values[id]
    await db
      .update(records)
      .set({ values })
      .where(and(eq(records.id, record.id), eq(records.owner_id, owner)))
  }

  const allViews = await db
    .select()
    .from(views)
    .where(eq(views.owner_id, owner))

  for (const view of allViews) {
    const config = viewConfigSchema.parse(view.config)
    await db
      .update(views)
      .set({
        mode: removed.includes(view.group_field_id ?? '') ? 'table' : view.mode,
        group_field_id: removed.includes(view.group_field_id ?? '')
          ? null
          : view.group_field_id,
        config: {
          ...config,
          filters: config.filters.filter(
            filter => !removed.includes(filter.field_id)
          ),
          filter_groups: config.filter_groups.map(group => ({
            ...group,
            filters: group.filters.filter(
              filter => !removed.includes(filter.field_id)
            )
          })),
          sorts: config.sorts.filter(sort => !removed.includes(sort.field_id)),
          hidden_fields: config.hidden_fields.filter(
            id => !removed.includes(id)
          ),
          property_order: config.property_order.filter(
            id => !removed.includes(id)
          ),
          collection_group_by: removed.includes(
            config.collection_group_by ?? ''
          )
            ? null
            : config.collection_group_by,
          sub_group_by: removed.includes(config.sub_group_by ?? '')
            ? null
            : config.sub_group_by
        }
      })
      .where(and(eq(views.id, view.id), eq(views.owner_id, owner)))
  }
}

export async function replaceLinks(
  db: Transaction,
  owner: string,
  fieldId: string,
  recordId: string,
  targetIds: string[],
  expectedIds?: string[]
) {
  const initial = await ownedField(db, owner, fieldId)
  const reciprocalId = initial.config.reciprocal_field_id

  if (initial.kind !== 'relation' || !reciprocalId || !initial.target_base_id)
    throw new ClientError('This is not a relation field')

  // An advisory lock survives FK cascades and serializes edits from both directions.
  const pair = [fieldId, reciprocalId].sort().join(':')
  await db.execute(
    sql`select pg_advisory_xact_lock(hashtextextended(${pair}, 0))`
  )
  const pairFields = await db
    .select()
    .from(fields)
    .where(
      and(
        eq(fields.owner_id, owner),
        inArray(fields.id, [fieldId, reciprocalId])
      )
    )
    .orderBy(asc(fields.id))
    .for('update')
  const field = pairFields.find(field => field.id === fieldId)
  const reverse = pairFields.find(field => field.id === reciprocalId)

  if (!field || !reverse || reverse.config.reciprocal_field_id !== fieldId)
    throw new ClientError('Relation no longer exists', 409)

  const source = await ownedRecord(db, owner, recordId)

  if (source.base_id !== field.base_id)
    throw new ClientError('Record does not belong to this database')

  if (expectedIds) {
    const existing = await db
      .select()
      .from(links)
      .where(
        and(
          eq(links.owner_id, owner),
          eq(links.field_id, fieldId),
          eq(links.source_record_id, recordId)
        )
      )
    const actual = existing.map(link => link.target_record_id).sort()

    if (JSON.stringify(actual) !== JSON.stringify([...expectedIds].sort()))
      throw new ClientError(
        'These links changed elsewhere. Reload them before saving.',
        409
      )
  }

  const targets = [...new Set(targetIds)]

  if (targets.length !== targetIds.length)
    throw new ClientError('Duplicate relation target')
  if (field.config.cardinality === 'one' && targets.length > 1)
    throw new ClientError('This relation accepts only one record')

  for (const targetId of targets) {
    if (targetId === recordId)
      throw new ClientError('A record cannot relate to itself')

    const target = await ownedRecord(db, owner, targetId)

    if (target.base_id !== field.target_base_id)
      throw new ClientError('Target belongs to another database')

    if (reverse.config.cardinality === 'one') {
      const existing = await db
        .select()
        .from(links)
        .where(
          and(
            eq(links.owner_id, owner),
            eq(links.field_id, reciprocalId),
            eq(links.source_record_id, targetId)
          )
        )

      if (existing.some(link => link.target_record_id !== recordId))
        throw new ClientError(
          'Target is already linked under a one-record constraint',
          409
        )
    }
  }
  await db
    .delete(links)
    .where(
      and(
        eq(links.owner_id, owner),
        eq(links.field_id, fieldId),
        eq(links.source_record_id, recordId)
      )
    )
  await db
    .delete(links)
    .where(
      and(
        eq(links.owner_id, owner),
        eq(links.field_id, reciprocalId),
        eq(links.target_record_id, recordId)
      )
    )
  if (targets.length)
    await db.insert(links).values(
      targets.flatMap(target => [
        {
          owner_id: owner,
          field_id: fieldId,
          source_record_id: recordId,
          target_record_id: target
        },
        {
          owner_id: owner,
          field_id: reciprocalId,
          source_record_id: target,
          target_record_id: recordId
        }
      ])
    )
}
