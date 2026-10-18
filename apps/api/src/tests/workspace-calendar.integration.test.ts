import { hash } from 'bcryptjs'
import dayjs from 'dayjs'
import { defineRelations, sql } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/postgres-js'
import { randomUUID } from 'node:crypto'
import postgres from 'postgres'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import type { EndpointContract } from '@monolith/server-utils'

import {
  type ScheduleRow,
  scheduleSchema
} from '../../../../modules/monolith--databases/calendarShared'
import {
  type CalendarEmail,
  deliverCalendarEmails,
  enqueueCalendarReminders,
  prepareCalendarEmails
} from '../../../../modules/monolith--databases/server/calendarDelivery'
import * as calendar from '../../../../modules/monolith--databases/server/calendarRoutes'
import {
  relations,
  tables
} from '../../../../modules/monolith--databases/server/schema.drizzle'
import * as database from '../../../../modules/monolith--databases/server/workspaceDatabaseRoutes'
import * as workspaces from '../../../../modules/monolith--databases/server/workspaceRoutes'
import type { RecordPage } from '../../../../modules/monolith--databases/shared'

const enabled = process.env.MONOLITH_WORKSPACE_INTEGRATION === '1'
for (const value of enabled
  ? [process.env.DATABASE_URL!, process.env.DATABASE_ADMIN_URL!]
  : []) {
  const url = new URL(value)
  if (
    process.env.NODE_ENV === 'production' ||
    !['127.0.0.1', 'localhost'].includes(url.hostname) ||
    url.port !== '55432' ||
    url.pathname !== '/zillion_dev'
  )
    throw Error('Calendar tests require the isolated loopback database')
}
const client = postgres(
  enabled ? process.env.DATABASE_URL! : 'postgres://127.0.0.1:55432/disabled',
  { max: 2 }
)
const admin = postgres(
  enabled
    ? process.env.DATABASE_ADMIN_URL!
    : 'postgres://127.0.0.1:55432/disabled',
  { max: 1, onnotice: () => {} }
)
const db = drizzle({ client, relations: defineRelations(tables, relations) })
const [owner, editor, viewer, outsider] = Array.from({ length: 4 }, () =>
  randomUUID()
) as [string, string, string, string]
type Context = Parameters<
  ReturnType<EndpointContract['getValue']>['callback']
>[0]
async function invoke<T = unknown>(
  route: EndpointContract,
  actor: string,
  body?: unknown,
  query: Record<string, string> = {}
): Promise<T> {
  const endpoint = route.getValue()
  const result = await db.transaction(async tx => {
    await tx.execute(sql`select set_config('zillion.user_id',${actor},true)`)
    return endpoint.callback({
      db: tx,
      res: { locals: { userId: actor } },
      body: endpoint.schema.body?.parse(body),
      query: endpoint.schema.query?.parse(query)
    } as unknown as Context)
  })
  return JSON.parse(JSON.stringify(result.payload ?? null)) as T
}
async function asOwner<T>(
  actor: string,
  callback: (
    tx: Parameters<Parameters<typeof db.transaction>[0]>[0]
  ) => Promise<T>
) {
  return db.transaction(async tx => {
    await tx.execute(sql`select set_config('zillion.user_id',${actor},true)`)
    return callback(tx)
  })
}
let workspace: { id: string },
  base: { id: string },
  event: RecordPage,
  schedule: ScheduleRow,
  dateField: { id: string },
  dated: RecordPage
const previousURL = process.env.MONOLITH_PUBLIC_URL,
  previousFrom = process.env.MONOLITH_EMAIL_FROM
beforeAll(async () => {
  if (!enabled) return
  process.env.MONOLITH_PUBLIC_URL = 'https://monolith.example.invalid'
  process.env.MONOLITH_EMAIL_FROM = 'Monolith <calendar@example.invalid>'
  const password = await hash(randomUUID(), 4)
  for (const id of [owner, editor, viewer, outsider])
    await admin`insert into users(id,email,username,name,auth_password_hash) values(${id},${id + '@example.invalid'},${id},'Synthetic calendar account',${password})`
  workspace = await invoke(workspaces.create, owner, {
    name: 'Calendar fixture',
    profile: 'collaborative',
    enabled_modules: ['calendar', 'databases', 'todo-list']
  })
  for (const [id, role] of [
    [editor, 'editor'],
    [viewer, 'viewer']
  ])
    await invoke(
      workspaces.setMember,
      owner,
      { email: id + '@example.invalid', role },
      { workspace_id: workspace.id }
    )
  base = await invoke(
    database.createBase,
    owner,
    { name: 'Calendar fixture' },
    { workspace_id: workspace.id }
  )
  event = await invoke(
    database.createRecord,
    owner,
    {
      base_id: base.id,
      title: 'Planning',
      item_type: 'event',
      date: '2026-10-20T09:00:00.000Z',
      end_date: '2026-10-20T10:00:00.000Z'
    },
    { workspace_id: workspace.id }
  )
})
afterAll(async () => {
  if (enabled)
    for (const id of [owner, editor, viewer, outsider]) {
      for (const table of [
        'projects__tasks',
        'projects__columns',
        'projects__entries',
        'notes__entries',
        'notes__subjects',
        'notes__workspaces',
        'calendar__events',
        'todo_list__entries',
        'blog__entries',
        'zillion_databases__bases',
        'zillion_databases__workspaces',
        'zillion_agents__activity',
        'zillion_agents__principals',
        'monolith_native_changes'
      ])
        await admin.unsafe(`delete from "${table}" where owner_id=$1`, [id])
      await admin`delete from users where id=${id}`
    }
  if (previousURL === undefined) delete process.env.MONOLITH_PUBLIC_URL
  else process.env.MONOLITH_PUBLIC_URL = previousURL
  if (previousFrom === undefined) delete process.env.MONOLITH_EMAIL_FROM
  else process.env.MONOLITH_EMAIL_FROM = previousFrom
  await Promise.all([client.end(), admin.end()])
})
const itemScope = () => ({ workspace_id: workspace.id, record_id: event.id })

describe.skipIf(!enabled)(
  'Calendar persistence, permissions and delivery',
  () => {
    it('invites workspace members, restricts writes and permits a viewer to RSVP only for themselves', async () => {
      const settings = scheduleSchema.parse({
        time_zone: 'UTC',
        attendees: [viewer],
        recurrence: { frequency: 'weekly', count: 4 }
      })
      await expect(
        invoke(
          calendar.save,
          viewer,
          { expected_revision: 0, settings },
          itemScope()
        )
      ).rejects.toThrow()
      await expect(
        invoke(calendar.list, outsider, undefined, {
          workspace_id: workspace.id
        })
      ).rejects.toThrow()
      await expect(
        invoke(
          calendar.save,
          owner,
          {
            expected_revision: 0,
            settings: { ...settings, attendees: [outsider] }
          },
          itemScope()
        )
      ).rejects.toThrow()
      schedule = await invoke(
        calendar.save,
        owner,
        { expected_revision: 0, settings },
        itemScope()
      )
      const inbox = await invoke<{ kind: string; record_id: string }[]>(
        calendar.notifications,
        viewer,
        undefined,
        { workspace_id: workspace.id }
      )
      expect(inbox).toMatchObject([{ kind: 'invitation', record_id: event.id }])
      expect(
        await invoke(calendar.notifications, editor, undefined, {
          workspace_id: workspace.id
        })
      ).toEqual([])
      await invoke(
        calendar.respond,
        viewer,
        { status: 'accepted', email: false },
        itemScope()
      )
      await expect(
        invoke(
          calendar.respond,
          editor,
          { status: 'accepted', email: true },
          itemScope()
        )
      ).rejects.toThrow()
      schedule = (
        await invoke<{ schedules: ScheduleRow[] }>(
          calendar.list,
          owner,
          undefined,
          { workspace_id: workspace.id }
        )
      ).schedules[0]!
      expect(schedule.responses[viewer]).toEqual({
        status: 'accepted',
        email: false
      })
    })
    it('edits one occurrence without changing the series and rejects stale or fabricated occurrences', async () => {
      const revision = schedule.revision
      const change = {
        start: '2026-10-27T11:00:00.000Z',
        end: '2026-10-27T12:30:00.000Z',
        done: true
      }
      schedule = await invoke(
        calendar.occurrence,
        editor,
        {
          expected_revision: revision,
          original: '2026-10-27T09:00:00.000Z',
          change
        },
        itemScope()
      )
      await expect(
        invoke(
          calendar.occurrence,
          editor,
          {
            expected_revision: revision,
            original: event.date,
            change: { cancelled: true }
          },
          itemScope()
        )
      ).rejects.toThrow()
      await expect(
        invoke(
          calendar.occurrence,
          editor,
          {
            expected_revision: schedule.revision,
            original: '2026-10-28T09:00:00.000Z',
            change
          },
          itemScope()
        )
      ).rejects.toThrow()
      expect(schedule.settings.exceptions).toEqual({
        '2026-10-27T09:00:00.000Z': change
      })
      await expect(
        invoke(
          database.updateRecord,
          owner,
          { date: '2026-10-21T09:00:00.000Z' },
          { workspace_id: workspace.id, id: event.id }
        )
      ).rejects.toThrow(/individual changes/)
      await expect(
        invoke(
          calendar.save,
          owner,
          {
            expected_revision: schedule.revision,
            settings: { ...schedule.settings, time_zone: 'Asia/Baku' }
          },
          itemScope()
        )
      ).rejects.toThrow(/individual changes/)
      const [original] =
        await admin`select date,done from zillion_databases__records where id=${event.id}`
      expect(original!.date.toISOString()).toBe(event.date)
      expect(original!.done).toBe(false)
    })
    it('moves an actual database date in the viewer time zone, preserving other values and avoiding a shadow date', async () => {
      dateField = await invoke(
        database.createField,
        editor,
        { base_id: base.id, name: 'Deadline', kind: 'date' },
        { workspace_id: workspace.id }
      )
      dated = await invoke(
        database.createRecord,
        editor,
        {
          base_id: base.id,
          title: 'Database deadline',
          values: { [dateField.id]: '2026-10-20' }
        },
        { workspace_id: workspace.id }
      )
      const body = {
        expected_updated: dated.updated,
        start_field: dateField.id,
        end_field: null,
        time_zone: 'Asia/Baku',
        start: '2026-10-21T20:00:00.000Z',
        end: '2026-10-22T20:00:00.000Z'
      }
      await expect(
        invoke(calendar.move, viewer, body, {
          workspace_id: workspace.id,
          record_id: dated.id
        })
      ).rejects.toThrow()
      await invoke(calendar.move, editor, body, {
        workspace_id: workspace.id,
        record_id: dated.id
      })
      await expect(
        invoke(calendar.move, editor, body, {
          workspace_id: workspace.id,
          record_id: dated.id
        })
      ).rejects.toThrow(/changed elsewhere/)
      const [saved] =
        await admin`select date,values from zillion_databases__records where id=${dated.id}`
      expect(saved!.date).toBeNull()
      expect(saved!.values[dateField.id]).toBe('2026-10-22')
      await expect(
        invoke(
          calendar.move,
          editor,
          { ...body, start_field: randomUUID() },
          { workspace_id: workspace.id, record_id: dated.id }
        )
      ).rejects.toThrow(/Invalid start/)
    })
    it('protects date properties used by schedules from deletion and conversion', async () => {
      await invoke(
        calendar.save,
        editor,
        {
          expected_revision: 0,
          settings: scheduleSchema.parse({
            start_field: dateField.id,
            end_field: null,
            time_zone: 'UTC',
            all_day: true
          })
        },
        { workspace_id: workspace.id, record_id: dated.id }
      )
      await expect(
        invoke(database.removeField, editor, undefined, {
          workspace_id: workspace.id,
          id: dateField.id
        })
      ).rejects.toThrow(/schedule uses/)
      await expect(
        invoke(
          database.updateField,
          editor,
          { name: 'Deadline', kind: 'text', options: [] },
          { workspace_id: workspace.id, id: dateField.id }
        )
      ).rejects.toThrow(/schedule uses/)
    })
    it('deduplicates reminders and retries the same committed email payload after ambiguous delivery', async () => {
      const separate = await invoke<{ id: string }>(
        workspaces.create,
        outsider,
        {
          name: 'Email fixture',
          profile: 'personal',
          enabled_modules: ['calendar', 'databases']
        }
      )
      const emailBase = await invoke<{ id: string }>(
        database.createBase,
        outsider,
        { name: 'Email fixture' },
        { workspace_id: separate.id }
      )
      const start = dayjs().add(10, 'minute'),
        now = start.subtract(10, 'minute').add(2, 'second').toISOString()
      const item = await invoke<RecordPage>(
        database.createRecord,
        outsider,
        {
          base_id: emailBase.id,
          title: 'Email reminder',
          item_type: 'event',
          date: start.toISOString(),
          end_date: start.add(1, 'hour').toISOString()
        },
        { workspace_id: separate.id }
      )
      await invoke(
        calendar.save,
        outsider,
        {
          expected_revision: 0,
          settings: scheduleSchema.parse({
            time_zone: 'UTC',
            email: true,
            reminders: [10]
          })
        },
        { workspace_id: separate.id, record_id: item.id }
      )
      // Ensure schedule creation precedes the reminder's due time.
      await admin`update zillion_databases__calendar_schedules set created=${dayjs(now).subtract(1, 'hour').toDate()} where record_id=${item.id}`
      await asOwner(outsider, async tx => {
        const [row] = await tx.select().from(tables.calendarSchedules)
        await enqueueCalendarReminders(tx, row!, item, now)
        await enqueueCalendarReminders(tx, row!, item, now)
        await prepareCalendarEmails(tx, outsider)
      })
      const messages =
        await admin`select * from zillion_databases__calendar_notifications where record_id=${item.id}`
      expect(messages).toHaveLength(1)
      expect(messages[0]!.email_payload.to).toBe(outsider + '@example.invalid')
      const sent: CalendarEmail[] = []
      await asOwner(outsider, tx =>
        deliverCalendarEmails(tx, outsider, now, async message => {
          sent.push(message)
          throw Error('Synthetic ambiguous timeout')
        })
      )
      await invoke(
        database.updateRecord,
        outsider,
        { title: 'Renamed after timeout' },
        { workspace_id: separate.id, id: item.id }
      )
      await asOwner(outsider, tx => prepareCalendarEmails(tx, outsider))
      await asOwner(outsider, tx =>
        deliverCalendarEmails(
          tx,
          outsider,
          dayjs(now).add(2, 'minute').toISOString(),
          async message => {
            sent.push(message)
          }
        )
      )
      expect(sent).toHaveLength(2)
      expect(sent[1]).toEqual(sent[0])
      const [delivered] =
        await admin`select email_status,attempts from zillion_databases__calendar_notifications where record_id=${item.id}`
      expect(delivered).toMatchObject({ email_status: 'sent', attempts: 2 })
      await asOwner(outsider, tx =>
        deliverCalendarEmails(
          tx,
          outsider,
          dayjs(now).add(4, 'minute').toISOString(),
          async message => {
            sent.push(message)
          }
        )
      )
      expect(sent).toHaveLength(2)
      const later = dayjs(now).add(11, 'minute').toISOString()
      const settings = scheduleSchema.parse({
        time_zone: 'UTC',
        email: true,
        reminders: [0]
      })
      await invoke(
        calendar.save,
        outsider,
        { expected_revision: 1, settings },
        { workspace_id: separate.id, record_id: item.id }
      )
      await asOwner(outsider, async tx => {
        const [row] = await tx.select().from(tables.calendarSchedules)
        await enqueueCalendarReminders(tx, row!, item, later)
        await prepareCalendarEmails(tx, outsider)
      })
      await invoke(
        calendar.save,
        outsider,
        { expected_revision: 2, settings: { ...settings, reminders: [] } },
        { workspace_id: separate.id, record_id: item.id }
      )
      await asOwner(outsider, tx =>
        deliverCalendarEmails(tx, outsider, later, async message => {
          sent.push(message)
        })
      )
      expect(sent).toHaveLength(2)
      const [withdrawn] =
        await admin`select email_status from zillion_databases__calendar_notifications where record_id=${item.id} and dedupe_key like ${'%:0:' + outsider}`
      expect(withdrawn?.email_status).toBe('disabled')
    })
    it('revokes calendar and inbox access immediately when a member is removed', async () => {
      await invoke(workspaces.removeMember, owner, undefined, {
        workspace_id: workspace.id,
        user_id: viewer
      })
      await expect(
        invoke(calendar.notifications, viewer, undefined, {
          workspace_id: workspace.id
        })
      ).rejects.toThrow()
      await expect(
        invoke(
          calendar.respond,
          viewer,
          { status: 'accepted', email: true },
          itemScope()
        )
      ).rejects.toThrow()
    })
  }
)
