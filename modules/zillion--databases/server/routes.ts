import dayjs from 'dayjs'
import { and, eq, inArray } from 'drizzle-orm'
import { createSelectSchema } from 'drizzle-orm/zod'
import { randomUUID } from 'node:crypto'
import z from 'zod'

import { ClientError } from '@lifeforge/server-utils'

import {
  type CalendarFeed,
  applyView,
  calendarFeedSchema,
  fieldConfigSchema,
  fieldKind,
  isISODate,
  isoDate,
  personSchema,
  propertyValue,
  valuesSchema,
  viewConfigSchema,
  viewMode
} from '../shared'
import { itemType } from '../workspaceShared'
import forge from './forge'
import {
  drainNativeChanges,
  importExistingItems,
  removeItemFromModules,
  syncItemToModules
} from './itemBridge'
import { prepareContent } from './knowledge'
import {
  convertFieldValue,
  convertViewField,
  ownerId,
  validateCalendarValue,
  validateValues,
  validateView
} from './model'
import {
  bases,
  fields,
  links,
  recordSources,
  records,
  views
} from './schema.drizzle'
import {
  baseFields,
  checkCalendarFieldRemoval,
  cleanRemovedFields,
  ownedBase,
  ownedField,
  ownedPeople,
  ownedRecord,
  replaceLinks,
  validateViewIdentities
} from './store'
import { defaultWorkspace } from './workspaceStore'

const idQuery = z.object({ id: z.string().uuid() })
const name = z.string().trim().min(1).max(255)
const baseDto = createSelectSchema(bases)
const fieldDto = createSelectSchema(fields).extend({
  kind: fieldKind,
  config: fieldConfigSchema
})
const recordDto = createSelectSchema(records).extend({ values: valuesSchema })
const viewDto = createSelectSchema(views).extend({
  mode: viewMode,
  config: viewConfigSchema
})
const linkDto = createSelectSchema(links)
const baseInput = z.object({
  name,
  description: z.string().max(10000).default('')
})
const recordInput = z.object({
  title: z.string().trim().min(1).max(1000000),
  content: z.string().max(1000000).default(''),
  values: valuesSchema.default({}),
  item_type: itemType.optional(),
  done: z.boolean().optional(),
  date: z.string().datetime().nullable().optional(),
  end_date: z.string().datetime().nullable().optional(),
  project_id: z.string().uuid().nullable().optional()
})
const viewInput = z.object({
  name,
  mode: viewMode,
  group_field_id: z.string().uuid().nullable().default(null),
  config: viewConfigSchema
})

export const snapshot = forge
  .query({
    description: 'Read databases owned by the authenticated user',
    output: {
      OK: z.object({
        bases: z.array(baseDto),
        fields: z.array(fieldDto),
        records: z.array(recordDto),
        views: z.array(viewDto),
        links: z.array(linkDto)
      })
    }
  })
  .callback(async ({ db, res, response }) => {
    const owner = ownerId(res)
    await importExistingItems(db, owner)
    await drainNativeChanges(db, owner)
    const [ownedBases, ownedFields, ownedRecords, ownedViews, ownedLinks] =
      await Promise.all([
        db.select().from(bases).where(eq(bases.owner_id, owner)),
        db.select().from(fields).where(eq(fields.owner_id, owner)),
        db.select().from(records).where(eq(records.owner_id, owner)),
        db.select().from(views).where(eq(views.owner_id, owner)),
        db.select().from(links).where(eq(links.owner_id, owner))
      ])

    return response.ok({
      bases: ownedBases,
      fields: ownedFields,
      records: ownedRecords,
      views: ownedViews.map(view => ({
        ...view,
        config: viewConfigSchema.parse(view.config)
      })),
      links: ownedLinks
    })
  })

export const people = forge
  .query({
    description: 'Read the current account and owned workspace principals',
    output: { OK: z.array(personSchema) }
  })
  .callback(async ({ db, res, response }) =>
    response.ok(await ownedPeople(db, ownerId(res)))
  )

export const calendarFeed = forge
  .query({
    description: 'Read filtered dated records from owned saved calendar views',
    input: {
      query: z.object({
        today: isoDate.optional(),
        time_zone: z
          .string()
          .max(100)
          .refine(value => {
            try {
              new Intl.DateTimeFormat('en', { timeZone: value })
              return true
            } catch {
              return false
            }
          }, 'Use a valid time zone')
          .optional()
      })
    },
    output: { OK: calendarFeedSchema }
  })
  .callback(async ({ db, res, query, response }) => {
    const owner = ownerId(res)
    const [
      ownedBases,
      ownedFields,
      ownedRecords,
      ownedViews,
      ownedLinks,
      principals
    ] = await Promise.all([
      db.select().from(bases).where(eq(bases.owner_id, owner)),
      db.select().from(fields).where(eq(fields.owner_id, owner)),
      db.select().from(records).where(eq(records.owner_id, owner)),
      db
        .select()
        .from(views)
        .where(and(eq(views.owner_id, owner), eq(views.mode, 'calendar'))),
      db.select().from(links).where(eq(links.owner_id, owner)),
      ownedPeople(db, owner)
    ])
    const feed: CalendarFeed = { sources: [], items: [] }
    const sources = await db
      .select()
      .from(recordSources)
      .where(
        and(eq(recordSources.owner_id, owner), eq(recordSources.kind, 'event'))
      )
    const principalIds = new Set(principals.map(person => person.id))

    for (const saved of ownedViews) {
      const base = ownedBases.find(base => base.id === saved.base_id)
      const properties = ownedFields.filter(
        field => field.base_id === saved.base_id
      )
      const view = { ...saved, config: viewConfigSchema.parse(saved.config) }

      if (!base) continue
      validateView(properties, view, [...principalIds])
      const selected = applyView(
        ownedRecords
          .filter(record => record.base_id === base.id)
          .map(record => ({
            ...record,
            date: record.date?.toISOString() ?? null,
            end_date: record.end_date?.toISOString() ?? null,
            updated: record.updated.toISOString()
          })),
        view,
        ownedLinks,
        { today: query.today, timeZone: query.time_zone }
      )

      let unscheduled = 0

      for (const record of selected) {
        const start = propertyValue(
          record,
          view.config.date_field_id ?? '',
          query.time_zone
        )
        const endValue = view.config.end_date_field_id
          ? propertyValue(
              record,
              view.config.end_date_field_id,
              query.time_zone
            )
          : null
        const end = endValue == null || endValue === '' ? start : endValue

        if (!isISODate(start) || !isISODate(end) || end < start) {
          unscheduled++
          continue
        }

        const tags = properties
          .filter(field => field.kind === 'multi-select')
          .flatMap(field => {
            const value = record.values[field.id]

            return Array.isArray(value)
              ? value.filter(option => field.config.options.includes(option))
              : []
          })
        const owners = properties
          .filter(field => field.kind === 'person')
          .flatMap(field => {
            const value = record.values[field.id]

            return typeof value === 'string' && principalIds.has(value)
              ? [value]
              : []
          })

        feed.items.push({
          id: `${view.id}:${record.id}`,
          record_id: record.id,
          title: record.title,
          start,
          end,
          source_id: view.id,
          tags: [...new Set(tags)],
          owners: [...new Set(owners)],
          href: `/databases?${new URLSearchParams({ ...(base.workspace_id ? { workspace: base.workspace_id } : {}), base: base.id, view: view.id, record: record.id })}`,
          native_event_id: sources.find(
            source => source.record_id === record.id
          )?.native_id
        })
      }
      feed.sources.push({
        source_id: view.id,
        view_id: view.id,
        base_id: base.id,
        name: view.name,
        base_name: base.name,
        unscheduled_count: unscheduled
      })
    }

    return response.ok(feed)
  })

export const createBase = forge
  .mutation({
    description: 'Create a database with a saved table view',
    input: { body: baseInput },
    output: { CREATED: baseDto }
  })
  .callback(async ({ db, res, body, response }) => {
    const owner = ownerId(res)
    const base = await db.transaction(async tx => {
      const workspace = await defaultWorkspace(tx, owner)
      const [created] = await tx
        .insert(bases)
        .values({ owner_id: owner, ...body, workspace_id: workspace.id })
        .returning()

      if (!created) throw new Error('Database creation failed')
      await tx.insert(views).values({
        owner_id: owner,
        base_id: created.id,
        name: 'Table',
        mode: 'table',
        config: viewConfigSchema.parse({})
      })

      return created
    })

    return response.created(base)
  })

export const updateBase = forge
  .mutation({
    description: 'Rename or describe a database',
    input: { query: idQuery, body: baseInput },
    output: { OK: baseDto }
  })
  .callback(async ({ db, res, query, body, response }) => {
    const owner = ownerId(res)
    await ownedBase(db, owner, query.id)
    const [updated] = await db
      .update(bases)
      .set({ ...body, updated: dayjs().toDate() })
      .where(and(eq(bases.id, query.id), eq(bases.owner_id, owner)))
      .returning()

    if (!updated) throw new ClientError('Database not found', 404)

    return response.ok(updated)
  })

export const removeBase = forge
  .mutation({
    description: 'Delete a database and incident relation definitions',
    input: { query: idQuery },
    output: { NO_CONTENT: true }
  })
  .callback(async ({ db, res, query, response }) => {
    const owner = ownerId(res)
    await db.transaction(async tx => {
      await ownedBase(tx, owner, query.id, true)
      const contained = await tx
        .select()
        .from(records)
        .where(and(eq(records.base_id, query.id), eq(records.owner_id, owner)))
      for (const record of contained) await removeItemFromModules(tx, record)
      const allFields = await tx
        .select()
        .from(fields)
        .where(eq(fields.owner_id, owner))
      const removed = allFields
        .filter(
          field =>
            field.base_id === query.id || field.target_base_id === query.id
        )
        .map(field => field.id)
      await cleanRemovedFields(tx, owner, removed)
      await tx
        .delete(bases)
        .where(and(eq(bases.id, query.id), eq(bases.owner_id, owner)))
    })

    return response.noContent()
  })

export const createField = forge
  .mutation({
    description: 'Create a typed field or a reciprocal pair of relation fields',
    input: {
      body: z.object({
        base_id: z.string().uuid(),
        name,
        kind: fieldKind,
        options: z.array(name).max(100).default([]),
        target_base_id: z.string().uuid().nullable().default(null),
        reverse_name: name.optional(),
        cardinality: z.enum(['one', 'many']).default('many'),
        reverse_cardinality: z.enum(['one', 'many']).default('many')
      })
    },
    output: { CREATED: fieldDto }
  })
  .callback(async ({ db, res, body, response }) => {
    const owner = ownerId(res)
    const created = await db.transaction(async tx => {
      const baseIds = [
        ...new Set([
          body.base_id,
          ...(body.target_base_id ? [body.target_base_id] : [])
        ])
      ].sort()

      for (const id of baseIds) await ownedBase(tx, owner, id, true)
      if (new Set(body.options).size !== body.options.length)
        throw new ClientError('Select options must be unique')

      const existing = await baseFields(tx, owner, body.base_id)
      const id = randomUUID(),
        reverseId = body.kind === 'relation' ? randomUUID() : null

      if (body.kind === 'relation' && !body.target_base_id)
        throw new ClientError('Relation target database required')
      if (body.kind !== 'relation' && body.target_base_id)
        throw new ClientError('Only relation fields accept a target database')

      const [field] = await tx
        .insert(fields)
        .values({
          id,
          owner_id: owner,
          base_id: body.base_id,
          name: body.name,
          kind: body.kind,
          target_base_id: body.target_base_id,
          position: existing.length,
          config: {
            options: body.options,
            cardinality: body.cardinality,
            reciprocal_field_id: reverseId
          }
        })
        .returning()

      if (!field) throw new Error('Field creation failed')

      if (reverseId && body.target_base_id) {
        const targetFields = await baseFields(tx, owner, body.target_base_id)
        await tx.insert(fields).values({
          id: reverseId,
          owner_id: owner,
          base_id: body.target_base_id,
          name: body.reverse_name ?? body.name,
          kind: 'relation',
          target_base_id: body.base_id,
          position: targetFields.length,
          config: {
            options: [],
            cardinality: body.reverse_cardinality,
            reciprocal_field_id: id
          }
        })
      }

      return field
    })

    return response.created(created)
  })

export const updateField = forge
  .mutation({
    description:
      'Change a primitive field type without losing values or saved view settings',
    input: {
      query: idQuery,
      body: z.object({
        name,
        kind: fieldKind.optional(),
        options: z.array(name).max(100)
      })
    },
    output: { OK: fieldDto }
  })
  .callback(async ({ db, res, query, body, response }) => {
    const owner = ownerId(res)
    const updated = await db.transaction(async tx => {
      const initial = await ownedField(tx, owner, query.id)
      await ownedBase(tx, owner, initial.base_id, true)
      const field = await ownedField(tx, owner, query.id)
      const principalIds = (await ownedPeople(tx, owner)).map(
        person => person.id
      )

      if (new Set(body.options).size !== body.options.length)
        throw new ClientError('Select options must be unique')

      const candidate = {
        ...field,
        name: body.name,
        kind: body.kind ?? field.kind,
        config: { ...field.config, options: body.options }
      }

      if (
        candidate.kind !== field.kind &&
        (candidate.kind === 'relation' || field.kind === 'relation')
      )
        throw new ClientError(
          'Relation fields cannot change type; create a new field'
        )

      const rows = await tx
        .select()
        .from(records)
        .where(
          and(eq(records.owner_id, owner), eq(records.base_id, field.base_id))
        )

      const convertedRows = rows.map(row => {
        if (!(field.id in row.values) || field.kind === 'relation') return row

        try {
          return {
            ...row,
            values: {
              ...row.values,
              [field.id]: convertFieldValue(
                field,
                candidate,
                row.values[field.id] ?? null,
                principalIds
              )
            }
          }
        } catch (error) {
          if (!(error instanceof ClientError)) throw error
          throw new ClientError(
            `Cannot change field "${field.name}": record "${row.title}" is incompatible. Edit its value first. ${error.message}`
          )
        }
      })
      const candidateFields = (await baseFields(tx, owner, field.base_id)).map(
        current => (current.id === field.id ? candidate : current)
      )
      const savedViews = await tx
        .select()
        .from(views)
        .where(and(eq(views.owner_id, owner), eq(views.base_id, field.base_id)))
      const convertedViews = savedViews.map(view => {
        try {
          const converted = convertViewField(
            view,
            field,
            candidate,
            principalIds
          )
          validateView(candidateFields, converted, principalIds)

          return converted
        } catch (error) {
          if (!(error instanceof ClientError)) throw error
          throw new ClientError(
            `Cannot change field "${field.name}": saved view "${view.name}" is incompatible. Edit its grouping or filters first. ${error.message}`
          )
        }
      })

      for (const view of convertedViews)
        await validateViewIdentities(tx, owner, candidateFields, view)

      if (candidate.kind !== field.kind) {
        for (const row of convertedRows) {
          if (!(field.id in row.values)) continue
          await tx
            .update(records)
            .set({ values: row.values, updated: dayjs().toDate() })
            .where(and(eq(records.id, row.id), eq(records.owner_id, owner)))
        }
        for (const view of convertedViews)
          await tx
            .update(views)
            .set({ config: view.config })
            .where(and(eq(views.id, view.id), eq(views.owner_id, owner)))
      }

      const [result] = await tx
        .update(fields)
        .set({
          name: candidate.name,
          kind: candidate.kind,
          config: candidate.config
        })
        .where(and(eq(fields.id, query.id), eq(fields.owner_id, owner)))
        .returning()

      if (!result) throw new ClientError('Field not found', 404)

      return result
    })

    return response.ok(updated)
  })

export const removeField = forge
  .mutation({
    description:
      'Delete a field and its reciprocal definition, values and view references',
    input: { query: idQuery },
    output: { NO_CONTENT: true }
  })
  .callback(async ({ db, res, query, response }) => {
    const owner = ownerId(res)
    await db.transaction(async tx => {
      const field = await ownedField(tx, owner, query.id)
      const ids = [
        field.id,
        ...(field.config.reciprocal_field_id
          ? [field.config.reciprocal_field_id]
          : [])
      ]

      for (const base of [
        ...new Set([
          field.base_id,
          ...(field.target_base_id ? [field.target_base_id] : [])
        ])
      ].sort())
        await ownedBase(tx, owner, base, true)
      await checkCalendarFieldRemoval(tx, owner, ids)
      await cleanRemovedFields(tx, owner, ids)
      await tx
        .delete(fields)
        .where(and(eq(fields.owner_id, owner), inArray(fields.id, ids)))
    })

    return response.noContent()
  })

export const createRecord = forge
  .mutation({
    description: 'Create a record content page with validated properties',
    input: { body: recordInput.extend({ base_id: z.string().uuid() }) },
    output: { CREATED: recordDto }
  })
  .callback(async ({ db, res, body, response }) => {
    const owner = ownerId(res)
    const created = await db.transaction(async tx => {
      await ownedBase(tx, owner, body.base_id, true)
      validateValues(
        await baseFields(tx, owner, body.base_id),
        body.values,
        (await ownedPeople(tx, owner)).map(person => person.id)
      )
      const calendars = await tx
        .select()
        .from(views)
        .where(
          and(
            eq(views.owner_id, owner),
            eq(views.base_id, body.base_id),
            eq(views.mode, 'calendar')
          )
        )

      for (const view of calendars) validateCalendarValue(view, body.values)

      const content = await prepareContent(tx, owner, body.content)
      const [record] = await tx
        .insert(records)
        .values({
          owner_id: owner,
          ...body,
          item_type: body.item_type ?? 'page',
          content,
          date: body.date ? new Date(body.date) : null,
          end_date: body.end_date ? new Date(body.end_date) : null
        })
        .returning()

      if (!record) throw new Error('Record creation failed')
      await syncItemToModules(tx, record)

      return record
    })

    return response.created(created)
  })

export const updateRecord = forge
  .mutation({
    description: 'Save record content and typed properties',
    input: {
      query: idQuery,
      body: recordInput.extend({
        expected_updated: z.string().datetime().optional()
      })
    },
    output: { OK: recordDto }
  })
  .callback(async ({ db, res, query, body, response }) => {
    const owner = ownerId(res)
    const updated = await db.transaction(async tx => {
      const initial = await ownedRecord(tx, owner, query.id)
      await ownedBase(tx, owner, initial.base_id, true)
      const current = await ownedRecord(tx, owner, query.id)

      if (
        body.expected_updated &&
        current.updated.toISOString() !== body.expected_updated
      )
        throw new ClientError(
          'This page changed elsewhere. Reload before saving.',
          409
        )
      validateValues(
        await baseFields(tx, owner, initial.base_id),
        body.values,
        (await ownedPeople(tx, owner)).map(person => person.id)
      )
      const calendars = await tx
        .select()
        .from(views)
        .where(
          and(
            eq(views.owner_id, owner),
            eq(views.base_id, initial.base_id),
            eq(views.mode, 'calendar')
          )
        )

      for (const view of calendars) validateCalendarValue(view, body.values)

      const content = await prepareContent(
        tx,
        owner,
        body.content,
        current.content
      )
      const [record] = await tx
        .update(records)
        .set({
          title: body.title,
          values: body.values,
          content,
          item_type: body.item_type ?? current.item_type,
          done: body.done ?? current.done,
          date:
            body.date === undefined
              ? current.date
              : body.date
                ? new Date(body.date)
                : null,
          end_date:
            body.end_date === undefined
              ? current.end_date
              : body.end_date
                ? new Date(body.end_date)
                : null,
          project_id:
            body.project_id === undefined
              ? current.project_id
              : body.project_id,
          updated: new Date(Math.max(Date.now(), current.updated.getTime() + 1))
        })
        .where(and(eq(records.id, query.id), eq(records.owner_id, owner)))
        .returning()

      if (!record) throw new ClientError('Record not found', 404)
      await syncItemToModules(tx, record, current)

      return record
    })

    return response.ok(updated)
  })

export const removeRecord = forge
  .mutation({
    description: 'Delete a content page and all incoming/outgoing links',
    input: { query: idQuery },
    output: { NO_CONTENT: true }
  })
  .callback(async ({ db, res, query, response }) => {
    const owner = ownerId(res)
    const record = await ownedRecord(db, owner, query.id)
    await removeItemFromModules(db, record)
    await db
      .delete(records)
      .where(and(eq(records.id, query.id), eq(records.owner_id, owner)))

    return response.noContent()
  })

export const createView = forge
  .mutation({
    description:
      'Save a table, Kanban or calendar view with typed filters and sorting',
    input: { body: viewInput.extend({ base_id: z.string().uuid() }) },
    output: { CREATED: viewDto }
  })
  .callback(async ({ db, res, body, response }) => {
    const owner = ownerId(res)
    const created = await db.transaction(async tx => {
      await ownedBase(tx, owner, body.base_id, true)
      const properties = await baseFields(tx, owner, body.base_id)
      const principalIds = (await ownedPeople(tx, owner)).map(
        person => person.id
      )
      validateView(properties, body, principalIds)
      await validateViewIdentities(tx, owner, properties, body)
      const [view] = await tx
        .insert(views)
        .values({ owner_id: owner, ...body })
        .returning()

      if (!view) throw new Error('View creation failed')

      return { ...view, config: viewConfigSchema.parse(view.config) }
    })

    return response.created(created)
  })

export const updateView = forge
  .mutation({
    description: 'Update a saved view',
    input: { query: idQuery, body: viewInput },
    output: { OK: viewDto }
  })
  .callback(async ({ db, res, body, query, response }) => {
    const owner = ownerId(res)
    const updated = await db.transaction(async tx => {
      const [current] = await tx
        .select()
        .from(views)
        .where(and(eq(views.owner_id, owner), eq(views.id, query.id)))

      if (!current) throw new ClientError('View not found', 404)
      await ownedBase(tx, owner, current.base_id, true)
      const properties = await baseFields(tx, owner, current.base_id)
      const principalIds = (await ownedPeople(tx, owner)).map(
        person => person.id
      )
      validateView(properties, body, principalIds)
      await validateViewIdentities(tx, owner, properties, body)
      const [view] = await tx
        .update(views)
        .set(body)
        .where(and(eq(views.owner_id, owner), eq(views.id, query.id)))
        .returning()

      if (!view) throw new ClientError('View not found', 404)

      return { ...view, config: viewConfigSchema.parse(view.config) }
    })

    return response.ok(updated)
  })

export const removeView = forge
  .mutation({
    description: 'Delete a saved view',
    input: { query: idQuery },
    output: { NO_CONTENT: true }
  })
  .callback(async ({ db, res, query, response }) => {
    const owner = ownerId(res)
    const [current] = await db
      .select()
      .from(views)
      .where(and(eq(views.owner_id, owner), eq(views.id, query.id)))

    if (!current) throw new ClientError('View not found', 404)
    await db
      .delete(views)
      .where(and(eq(views.owner_id, owner), eq(views.id, query.id)))

    return response.noContent()
  })

export const setLinks = forge
  .mutation({
    description:
      'Atomically replace reciprocal relations with cardinality checks',
    input: {
      body: z.object({
        field_id: z.string().uuid(),
        record_id: z.string().uuid(),
        target_ids: z.array(z.string().uuid()).max(500),
        expected_ids: z.array(z.string().uuid()).max(500).optional()
      })
    },
    output: { NO_CONTENT: true }
  })
  .callback(async ({ db, res, body, response }) => {
    const owner = ownerId(res)
    await db.transaction(tx =>
      replaceLinks(
        tx,
        owner,
        body.field_id,
        body.record_id,
        body.target_ids,
        body.expected_ids
      )
    )

    return response.noContent()
  })
