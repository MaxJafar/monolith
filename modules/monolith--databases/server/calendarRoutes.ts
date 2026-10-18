import dayjs from 'dayjs'
import { and, desc, eq, sql } from 'drizzle-orm'
import z from 'zod'

import { ClientError } from '@monolith/server-utils'

import {
  type ScheduleRow,
  calendarTiming,
  expandCalendarRecord,
  occurrenceChangeSchema,
  scheduleRowSchema,
  scheduleSchema,
  timeZoneSchema,
  timingPatch
} from '../calendarShared'
import type { RecordPage } from '../shared'
import endpoints from './endpoints'
import { ownerId } from './model'
import {
  bases,
  calendarNotifications,
  calendarSchedules,
  fields,
  records
} from './schema.drizzle'
import { ownedBase } from './store'
import { updateRecord } from './workspaceDatabaseRoutes'
import {
  type Store,
  withWorkspaceOwner,
  workspaceAccess
} from './workspaceStore'

const scope = z.object({ workspace_id: z.string().uuid() })
const itemScope = scope.extend({ record_id: z.string().uuid() })
const ok = z.object({ saved: z.boolean() })

export function calendarEmailReady() {
  return !!(
    process.env.MONOLITH_RESEND_API_KEY &&
    process.env.MONOLITH_EMAIL_FROM &&
    /^https:\/\//.test(process.env.MONOLITH_PUBLIC_URL ?? '')
  )
}

export async function calendarRecord(
  db: Store,
  workspace: string,
  id: string
): Promise<RecordPage> {
  const [row] = await db
    .select({ record: records })
    .from(records)
    .innerJoin(bases, eq(bases.id, records.base_id))
    .where(and(eq(records.id, id), eq(bases.workspace_id, workspace)))

  if (!row) throw new ClientError('Event not found in this workspace', 404)

  return JSON.parse(JSON.stringify(row.record)) as RecordPage
}

export async function calendarMembers(
  db: Store,
  workspace: string,
  owner: string
) {
  return Array.from(
    await db.execute<{ id: string; email: string; name: string }>(sql`
    select id,email,coalesce(nullif(name,''),username) as name from users
    where id=${owner} or id in (select user_id from zillion_databases__workspace_members where workspace_id=${workspace})`)
  )
}

async function lock(db: Store, id: string) {
  await db.execute(
    sql`select pg_advisory_xact_lock(hashtextextended(${id + ':calendar'},0))`
  )
}

async function currentSchedule(db: Store, id: string) {
  const [row] = await db
    .select()
    .from(calendarSchedules)
    .where(eq(calendarSchedules.record_id, id))

  return row
}

export async function notifyCalendarChange(
  db: Store,
  owner: string,
  workspace: string,
  record: RecordPage,
  row: ScheduleRow,
  previous?: ScheduleRow,
  startsAt?: string
) {
  const timing = calendarTiming(
    record,
    row.settings.start_field,
    row.settings.end_field,
    row.settings
  )

  if (!timing) return

  const members = new Set(
    (await calendarMembers(db, workspace, owner)).map(member => member.id)
  )

  for (const recipient of row.settings.attendees) {
    if (!members.has(recipient) || recipient === row.organizer_id) continue

    const invitation = !previous?.settings.attendees.includes(recipient)
    await db
      .insert(calendarNotifications)
      .values({
        owner_id: owner,
        workspace_id: workspace,
        record_id: record.id,
        recipient_id: recipient,
        dedupe_key: `${record.id}:${record.updated}:${row.revision}:${recipient}:change`,
        kind: invitation ? 'invitation' : 'changed',
        title: record.title,
        starts_at: dayjs(startsAt ?? timing.start).toDate(),
        email_status:
          row.responses[recipient]?.email &&
          row.responses[recipient].status !== 'declined'
            ? 'pending'
            : 'disabled'
      })
      .onConflictDoNothing()
  }
}

export const list = endpoints
  .query({
    description:
      'Read recurrence, reminders and invitations for this workspace',
    input: { query: scope },
    output: {
      OK: z.object({
        schedules: z.array(scheduleRowSchema),
        email_ready: z.boolean()
      })
    }
  })
  .callback(async ({ db, res, query, response }) => {
    const actor = ownerId(res),
      workspace = await workspaceAccess(db, actor, query.workspace_id)

    return withWorkspaceOwner(db, actor, workspace.owner_id, async () =>
      response.ok({
        schedules: await db
          .select()
          .from(calendarSchedules)
          .where(eq(calendarSchedules.workspace_id, workspace.id)),
        email_ready: calendarEmailReady()
      })
    )
  })

export const save = endpoints
  .mutation({
    description: 'Save a calendar series and invite existing workspace members',
    input: {
      query: itemScope,
      body: z.object({
        expected_revision: z.number().int().nonnegative(),
        settings: scheduleSchema
      })
    },
    output: { OK: scheduleRowSchema }
  })
  .callback(async ({ db, res, query, body, response }) => {
    const actor = ownerId(res),
      workspace = await workspaceAccess(db, actor, query.workspace_id, true)

    return withWorkspaceOwner(db, actor, workspace.owner_id, async () => {
      const initial = await calendarRecord(db, workspace.id, query.record_id)
      await ownedBase(db, workspace.owner_id, initial.base_id, true)
      await lock(db, query.record_id)
      const record = await calendarRecord(db, workspace.id, query.record_id)
      const previous = await currentSchedule(db, record.id)

      if ((previous?.revision ?? 0) !== body.expected_revision)
        throw new ClientError(
          'Calendar settings changed elsewhere. Reload and try again.',
          409
        )

      const properties = await db
        .select()
        .from(fields)
        .where(eq(fields.base_id, record.base_id))

      for (const id of [body.settings.start_field, body.settings.end_field])
        if (
          id &&
          !['date', 'end_date'].includes(id) &&
          !properties.some(field => field.id === id && field.kind === 'date')
        )
          throw new ClientError('Choose a date property from this database')
      if (body.settings.start_field === body.settings.end_field)
        throw new ClientError('Choose different start and end properties')

      const timing = calendarTiming(
        record,
        body.settings.start_field,
        body.settings.end_field,
        body.settings
      )

      if (!timing)
        throw new ClientError('Add a start date before setting a schedule')
      if (
        body.settings.recurrence?.until &&
        body.settings.recurrence.until <
          dayjs(timing.start).tz(body.settings.time_zone).format('YYYY-MM-DD')
      )
        throw new ClientError('The recurrence end cannot be before its start')

      const members = new Set(
        (await calendarMembers(db, workspace.id, workspace.owner_id)).map(
          member => member.id
        )
      )

      if (body.settings.attendees.some(id => !members.has(id)))
        throw new ClientError('Guests must be members of this workspace')

      const settings = {
        ...body.settings,
        attendees: [...new Set(body.settings.attendees)]
      }

      if (
        previous &&
        previous.organizer_id !== actor &&
        settings.email !== previous.settings.email
      )
        throw new ClientError(
          'Only the organizer can change their email preference',
          403
        )
      // Only the occurrence endpoint can author exceptions after validating series membership.
      settings.exceptions = previous?.settings.exceptions ?? {}
      if (
        previous &&
        Object.keys(settings.exceptions).length &&
        (JSON.stringify(settings.recurrence) !==
          JSON.stringify(previous.settings.recurrence) ||
          ['time_zone', 'start_field', 'end_field', 'all_day'].some(
            key =>
              settings[key as keyof typeof settings] !==
              previous.settings[key as keyof typeof settings]
          ))
      )
        throw new ClientError(
          'This series has individual changes. Keep its repeat pattern or create a new series.'
        )

      const row: ScheduleRow = {
        record_id: record.id,
        organizer_id: previous?.organizer_id ?? actor,
        revision: (previous?.revision ?? 0) + 1,
        settings,
        responses: Object.fromEntries(
          Object.entries(previous?.responses ?? {}).filter(([id]) =>
            settings.attendees.includes(id)
          )
        )
      }
      await db
        .insert(calendarSchedules)
        .values({
          ...row,
          owner_id: workspace.owner_id,
          workspace_id: workspace.id
        })
        .onConflictDoUpdate({ target: calendarSchedules.record_id, set: row })
      await notifyCalendarChange(
        db,
        workspace.owner_id,
        workspace.id,
        record,
        row,
        previous
      )

      return response.ok(row)
    })
  })

export const occurrence = endpoints
  .mutation({
    description:
      'Move, resize, cancel or complete only one occurrence of a repeating event or task',
    input: {
      query: itemScope,
      body: z.object({
        expected_revision: z.number().int().positive(),
        original: z.string().datetime(),
        change: occurrenceChangeSchema
      })
    },
    output: { OK: scheduleRowSchema }
  })
  .callback(async ({ db, res, query, body, response }) => {
    const actor = ownerId(res),
      workspace = await workspaceAccess(db, actor, query.workspace_id, true)

    return withWorkspaceOwner(db, actor, workspace.owner_id, async () => {
      const initial = await calendarRecord(db, workspace.id, query.record_id)
      await ownedBase(db, workspace.owner_id, initial.base_id, true)
      await lock(db, query.record_id)
      const record = await calendarRecord(db, workspace.id, query.record_id),
        previous = await currentSchedule(db, query.record_id)

      if (!previous?.settings.recurrence)
        throw new ClientError('This record has no repeating schedule')
      if (previous.revision !== body.expected_revision)
        throw new ClientError(
          'This occurrence changed elsewhere. Reload and try again.',
          409
        )

      const clean = {
        ...previous,
        settings: { ...previous.settings, exceptions: {} }
      }
      const found = expandCalendarRecord(
        record,
        body.original,
        dayjs(body.original).add(1, 'second').toISOString(),
        [],
        clean
      ).some(item => item.original === body.original)

      if (!found) throw new ClientError('Occurrence is not part of this series')

      const settings = scheduleSchema.parse({
        ...previous.settings,
        exceptions: {
          ...previous.settings.exceptions,
          [body.original]: {
            ...previous.settings.exceptions[body.original],
            ...body.change
          }
        }
      })
      const row = { ...previous, revision: previous.revision + 1, settings }
      await db
        .update(calendarSchedules)
        .set({ settings, revision: row.revision })
        .where(eq(calendarSchedules.record_id, record.id))
      if (body.change.start || body.change.cancelled)
        await notifyCalendarChange(
          db,
          workspace.owner_id,
          workspace.id,
          record,
          row,
          previous,
          body.change.start ?? body.original
        )

      return response.ok(row)
    })
  })

export const move = endpoints
  .mutation({
    description:
      'Persist a calendar gesture to its original date properties with a revision guard',
    input: {
      query: itemScope,
      body: z
        .object({
          expected_updated: z.string().datetime(),
          time_zone: timeZoneSchema,
          start_field: z.string(),
          end_field: z.string().nullable(),
          start: z.string().datetime(),
          end: z.string().datetime()
        })
        .refine(value => value.end > value.start, 'End must be after start')
    },
    output: { OK: ok }
  })
  .callback(async ctx => {
    const actor = ownerId(ctx.res),
      workspace = await workspaceAccess(
        ctx.db,
        actor,
        ctx.query.workspace_id,
        true
      )
    const patch = await withWorkspaceOwner(
      ctx.db,
      actor,
      workspace.owner_id,
      async () => {
        const initial = await calendarRecord(
          ctx.db,
          workspace.id,
          ctx.query.record_id
        )
        await ownedBase(ctx.db, workspace.owner_id, initial.base_id, true)
        const record = await calendarRecord(
          ctx.db,
          workspace.id,
          ctx.query.record_id
        )
        const properties = await ctx.db
          .select()
          .from(fields)
          .where(eq(fields.base_id, record.base_id))
        const { start_field: start, end_field: end } = ctx.body

        if (
          start !== 'date' &&
          !properties.some(field => field.id === start && field.kind === 'date')
        )
          throw new ClientError('Invalid start property')
        if (
          end &&
          end !== 'end_date' &&
          !properties.some(field => field.id === end && field.kind === 'date')
        )
          throw new ClientError('Invalid end property')

        const schedule = await currentSchedule(ctx.db, record.id)

        if (start === end)
          throw new ClientError('Choose different start and end properties')
        if (
          schedule?.settings.recurrence &&
          schedule.settings.start_field === start
        )
          throw new ClientError(
            'Move a repeating occurrence through the occurrence editor'
          )

        return timingPatch(
          {
            record,
            startField: start,
            endField: end,
            schedule,
            id: record.id,
            original: '',
            start: '',
            end: '',
            done: false,
            allDay: start !== 'date'
          },
          ctx.body.start,
          ctx.body.end,
          ctx.body.time_zone
        )
      }
    )
    const endpoint = updateRecord.getValue()
    await endpoint.callback({
      ...ctx,
      query: { workspace_id: workspace.id, id: ctx.query.record_id },
      body: { ...patch, expected_updated: ctx.body.expected_updated }
    })

    return ctx.response.ok({ saved: true })
  })

export const respond = endpoints
  .mutation({
    description:
      'Respond to your own workspace calendar invitation and choose email reminders',
    input: {
      query: itemScope,
      body: z.object({
        status: z.enum(['accepted', 'tentative', 'declined']),
        email: z.boolean()
      })
    },
    output: { OK: ok }
  })
  .callback(async ({ db, res, query, body, response }) => {
    const actor = ownerId(res),
      workspace = await workspaceAccess(db, actor, query.workspace_id)

    return withWorkspaceOwner(db, actor, workspace.owner_id, async () => {
      await calendarRecord(db, workspace.id, query.record_id)
      await lock(db, query.record_id)
      const row = await currentSchedule(db, query.record_id)

      if (!row?.settings.attendees.includes(actor))
        throw new ClientError('You are not invited to this event', 403)
      await db
        .update(calendarSchedules)
        .set({
          responses: { ...row.responses, [actor]: body },
          revision: row.revision + 1
        })
        .where(eq(calendarSchedules.record_id, query.record_id))

      return response.ok({ saved: true })
    })
  })

const notificationSchema = z.object({
  id: z.string().uuid(),
  record_id: z.string().uuid(),
  title: z.string(),
  kind: z.string(),
  starts_at: z.coerce.date(),
  created: z.coerce.date(),
  read: z.boolean(),
  email_status: z.string()
})

export const notifications = endpoints
  .query({
    description:
      'Read your calendar inbox after checking current workspace membership',
    input: { query: scope },
    output: { OK: z.array(notificationSchema) }
  })
  .callback(async ({ db, res, query, response }) => {
    const actor = ownerId(res),
      workspace = await workspaceAccess(db, actor, query.workspace_id)

    return withWorkspaceOwner(db, actor, workspace.owner_id, async () =>
      response.ok(
        await db
          .select()
          .from(calendarNotifications)
          .where(
            and(
              eq(calendarNotifications.workspace_id, workspace.id),
              eq(calendarNotifications.recipient_id, actor)
            )
          )
          .orderBy(desc(calendarNotifications.created))
          .limit(100)
      )
    )
  })

export const markRead = endpoints
  .mutation({
    description: 'Mark your own calendar notification read',
    input: { query: scope, body: z.object({ id: z.string().uuid() }) },
    output: { OK: ok }
  })
  .callback(async ({ db, res, query, body, response }) => {
    const actor = ownerId(res),
      workspace = await workspaceAccess(db, actor, query.workspace_id)

    return withWorkspaceOwner(db, actor, workspace.owner_id, async () => {
      await db
        .update(calendarNotifications)
        .set({ read: true })
        .where(
          and(
            eq(calendarNotifications.id, body.id),
            eq(calendarNotifications.workspace_id, workspace.id),
            eq(calendarNotifications.recipient_id, actor)
          )
        )

      return response.ok({ saved: true })
    })
  })
