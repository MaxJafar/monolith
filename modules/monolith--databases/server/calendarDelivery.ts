import dayjs from 'dayjs'
import { and, asc, eq, gt, lte, sql } from 'drizzle-orm'

import { type ScheduleRow, expandCalendarRecord } from '../calendarShared'
import type { RecordPage } from '../shared'
import { calendarEmailReady, calendarMembers } from './calendarRoutes'
import {
  bases,
  calendarNotifications,
  calendarSchedules,
  records
} from './schema.drizzle'
import type { Database } from './store'
import type { Store } from './workspaceStore'

export type CalendarEmail = {
  id: string
  to: string
  subject: string
  text: string
  from: string
}

export async function sendCalendarEmail(message: CalendarEmail) {
  if (!calendarEmailReady())
    throw Error('Calendar email delivery is not configured')

  const result = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    signal: AbortSignal.timeout(10000),
    headers: {
      authorization: `Bearer ${process.env.MONOLITH_RESEND_API_KEY}`,
      'content-type': 'application/json',
      'idempotency-key': `monolith-calendar/${message.id}`
    },
    body: JSON.stringify({
      from: message.from,
      to: [message.to],
      subject: message.subject,
      text: message.text
    })
  })

  if (!result.ok)
    throw Error(`Calendar email delivery returned ${result.status}`)
}

export async function enqueueCalendarReminders(
  db: Store,
  row: ScheduleRow & { owner_id: string; workspace_id: string; created: Date },
  record: RecordPage,
  now: string
) {
  if (record.done) return

  const since = dayjs(now).subtract(1, 'day')
  const occurrences = expandCalendarRecord(
    record,
    since.toISOString(),
    dayjs(now).add(29, 'day').toISOString(),
    [],
    row
  )
  const members = new Set(
    (await calendarMembers(db, row.workspace_id, row.owner_id)).map(
      member => member.id
    )
  )

  for (const item of occurrences) {
    if (item.done) continue

    for (const minutes of [...new Set(row.settings.reminders)]) {
      const due = dayjs(item.start).subtract(minutes, 'minute')

      if (due.isAfter(now) || due.isBefore(since) || due.isBefore(row.created))
        continue

      for (const recipient of new Set([
        row.organizer_id,
        ...row.settings.attendees
      ])) {
        const answer = row.responses[recipient]

        if (!members.has(recipient) || answer?.status === 'declined') continue
        await db
          .insert(calendarNotifications)
          .values({
            owner_id: row.owner_id,
            workspace_id: row.workspace_id,
            record_id: record.id,
            recipient_id: recipient,
            dedupe_key: `${record.id}:${item.original}:${item.start}:${minutes}:${recipient}`,
            kind: 'reminder',
            title: record.title,
            starts_at: dayjs(item.start).toDate(),
            email_status: (
              recipient === row.organizer_id
                ? row.settings.email
                : answer?.email
            )
              ? 'pending'
              : 'disabled'
          })
          .onConflictDoNothing()
      }
    }
  }
}

/** Commit these immutable payloads before attempting any external delivery. */
export async function prepareCalendarEmails(db: Store, owner: string) {
  const pending = await db
    .select()
    .from(calendarNotifications)
    .where(
      and(
        eq(calendarNotifications.owner_id, owner),
        eq(calendarNotifications.email_status, 'pending')
      )
    )
    .orderBy(asc(calendarNotifications.created))
    .limit(100)

  for (const message of pending) {
    if (message.email_payload) continue

    const member = (
      await calendarMembers(db, message.workspace_id, owner)
    ).find(person => person.id === message.recipient_id)
    const [row] = await db
      .select()
      .from(calendarSchedules)
      .where(eq(calendarSchedules.record_id, message.record_id))
    const [record] = await db
      .select({ base_id: records.base_id })
      .from(records)
      .where(eq(records.id, message.record_id))

    if (!member || !row || !record) continue

    const url = new URL('/calendar', process.env.MONOLITH_PUBLIC_URL)
    url.searchParams.set('workspace', message.workspace_id)
    url.searchParams.set('base', record.base_id)
    url.searchParams.set('record', message.record_id)
    url.searchParams.set('pageMode', 'full')
    const when = dayjs(message.starts_at)
      .tz(row.settings.time_zone)
      .format('ddd, D MMM YYYY HH:mm')
    const payload = {
      to: member.email,
      from: process.env.MONOLITH_EMAIL_FROM!,
      subject: (
        (message.kind === 'reminder' ? 'Reminder' : 'Calendar update') +
        ': ' +
        message.title
      )
        .replace(/[\r\n]/g, ' ')
        .slice(0, 200),
      text:
        message.title +
        '\n' +
        when +
        ' (' +
        row.settings.time_zone +
        ')\n\nOpen in Monolith: ' +
        url +
        "\n\nYou can change email reminders from this event's calendar settings."
    }
    await db
      .update(calendarNotifications)
      .set({ email_payload: payload })
      .where(eq(calendarNotifications.id, message.id))
  }
}

export async function deliverCalendarEmails(
  db: Store,
  owner: string,
  now: string,
  send = sendCalendarEmail
) {
  const pending = await db
    .select()
    .from(calendarNotifications)
    .where(
      and(
        eq(calendarNotifications.owner_id, owner),
        eq(calendarNotifications.email_status, 'pending'),
        lte(calendarNotifications.next_attempt, dayjs(now).toDate())
      )
    )
    .orderBy(asc(calendarNotifications.created))
    .limit(10)

  for (const message of pending) {
    const [row] = await db
      .select()
      .from(calendarSchedules)
      .where(eq(calendarSchedules.record_id, message.record_id))
    const member = (
      await calendarMembers(db, message.workspace_id, owner)
    ).find(person => person.id === message.recipient_id)
    const subscribed =
      row &&
      (row.organizer_id === message.recipient_id
        ? row.settings.email
        : row.settings.attendees.includes(message.recipient_id) &&
          row.responses[message.recipient_id]?.email &&
          row.responses[message.recipient_id]?.status !== 'declined')

    let valid = !!(
      member &&
      subscribed &&
      (!message.email_payload || message.email_payload.to === member.email)
    )

    if (valid && message.kind === 'reminder' && row) {
      const [record] = await db
        .select()
        .from(records)
        .where(eq(records.id, row.record_id))
      valid =
        !!record &&
        !record.done &&
        row.settings.reminders.some(minutes =>
          message.dedupe_key.endsWith(`:${minutes}:${message.recipient_id}`)
        ) &&
        expandCalendarRecord(
          JSON.parse(JSON.stringify(record)) as RecordPage,
          message.starts_at.toISOString(),
          dayjs(message.starts_at).add(1, 'second').toISOString(),
          [],
          row
        ).some(
          item => item.start === message.starts_at.toISOString() && !item.done
        )
    }

    if (!valid) {
      await db
        .update(calendarNotifications)
        .set({ email_status: 'disabled' })
        .where(eq(calendarNotifications.id, message.id))
      continue
    }

    // Resend remembers idempotency keys for 24h. Never retry an ambiguous request beyond that window.
    if (
      message.attempts >= 8 ||
      dayjs(now).diff(message.created, 'hour', true) >= 23
    ) {
      await db
        .update(calendarNotifications)
        .set({ email_status: 'failed' })
        .where(eq(calendarNotifications.id, message.id))
      continue
    }
    if (!message.email_payload) continue

    try {
      await send({ id: message.id, ...message.email_payload })
      await db
        .update(calendarNotifications)
        .set({ email_status: 'sent', attempts: message.attempts + 1 })
        .where(eq(calendarNotifications.id, message.id))
    } catch {
      await db
        .update(calendarNotifications)
        .set({
          attempts: message.attempts + 1,
          next_attempt: dayjs(now)
            .add(Math.min(360, 2 ** message.attempts), 'minute')
            .toDate()
        })
        .where(eq(calendarNotifications.id, message.id))
    }
  }
}

export function startCalendarDispatcher(options: {
  db: Database
  listOwners: (limit: number) => Promise<string[]>
  onError: (message: string) => void
}) {
  let stopped = false,
    running = false

  const cursors = new Map<string, string>()
  // stop() can run while an awaited database or email operation is in flight.
  const isStopped = () => stopped

  async function tick() {
    if (stopped || running) return
    running = true

    try {
      for (const owner of await options.listOwners(20)) {
        if (isStopped()) break
        await options.db.transaction(async tx => {
          await tx.execute(
            sql`select set_config('zillion.user_id',${owner},true)`
          )
          const [lock] = await tx.execute<{ locked: boolean }>(
            sql`select pg_try_advisory_xact_lock(hashtextextended(${owner + ':calendar-delivery'},0)) as locked`
          )

          if (!lock?.locked) return

          const now = dayjs().toISOString()
          const cursor = cursors.get(owner)
          const rows = await tx
            .select({ schedule: calendarSchedules, record: records })
            .from(calendarSchedules)
            .innerJoin(records, eq(records.id, calendarSchedules.record_id))
            .innerJoin(bases, eq(bases.id, records.base_id))
            .where(
              and(
                eq(calendarSchedules.owner_id, owner),
                eq(calendarSchedules.workspace_id, bases.workspace_id),
                cursor ? gt(calendarSchedules.record_id, cursor) : undefined
              )
            )
            .orderBy(asc(calendarSchedules.record_id))
            .limit(100)

          for (const { schedule, record } of rows)
            await enqueueCalendarReminders(
              tx,
              schedule,
              JSON.parse(JSON.stringify(record)) as RecordPage,
              now
            )
          if (rows.length === 100)
            cursors.set(owner, rows.at(-1)!.schedule.record_id)
          else cursors.delete(owner)
          if (calendarEmailReady()) await prepareCalendarEmails(tx, owner)
        })
        // The outbox and payload are durable before a provider can accept the email.
        if (calendarEmailReady() && !isStopped())
          await options.db.transaction(async tx => {
            await tx.execute(
              sql`select set_config('zillion.user_id',${owner},true)`
            )
            const [lock] = await tx.execute<{ locked: boolean }>(
              sql`select pg_try_advisory_xact_lock(hashtextextended(${owner + ':calendar-delivery'},0)) as locked`
            )

            if (lock?.locked)
              await deliverCalendarEmails(tx, owner, dayjs().toISOString())
          })
      }
    } catch {
      options.onError(
        'Calendar reminders could not be processed; the worker will retry.'
      )
    } finally {
      running = false
    }
  }

  const timer = setInterval(() => void tick(), 30000)
  timer.unref()
  void tick()

  return {
    stop() {
      stopped = true
      clearInterval(timer)
    }
  }
}
