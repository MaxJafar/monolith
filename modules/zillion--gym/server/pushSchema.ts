import { sql } from 'drizzle-orm'
import {
  check,
  foreignKey,
  index,
  integer,
  jsonb,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar
} from 'drizzle-orm/pg-core'

import { createModuleTable } from '@lifeforge/drizzle'

import type { PushLanguage, PushPayload, PushPreferences } from '../pushShared'

const table = createModuleTable('zillion_gym')
const instant = (name: string) =>
  timestamp(name, { withTimezone: true, mode: 'date' })

export const pushSubscriptions = table(
  'push_subscriptions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    owner_id: uuid('owner_id').notNull(),
    endpoint: text('endpoint').notNull(),
    endpoint_hash: varchar('endpoint_hash', { length: 64 }).notNull(),
    keys: jsonb('keys').$type<{ p256dh: string; auth: string }>().notNull(),
    device_name: varchar('device_name', { length: 100 }).notNull(),
    language: varchar('language', { length: 10 })
      .$type<PushLanguage>()
      .notNull(),
    preferences: jsonb('preferences').$type<PushPreferences>().notNull(),
    expires_at: instant('expires_at'),
    created: instant('created').notNull().defaultNow(),
    last_success: instant('last_success'),
    last_error: varchar('last_error', { length: 40 })
  },
  t => [
    uniqueIndex('gym_push_subscription_identity').on(t.owner_id, t.id),
    uniqueIndex('gym_push_subscription_endpoint').on(
      t.owner_id,
      t.endpoint_hash
    ),
    index('gym_push_subscription_owner').on(t.owner_id),
    check(
      'gym_push_subscription_language',
      sql`${t.language} in ('en','ms','zh-CN','zh-TW')`
    )
  ]
)

export type PushKind = 'planned' | 'rest' | 'coach' | 'test'

export const pushDeliveries = table(
  'push_deliveries',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    owner_id: uuid('owner_id').notNull(),
    subscription_id: uuid('subscription_id').notNull(),
    dedupe_key: varchar('dedupe_key', { length: 200 }).notNull(),
    kind: varchar('kind', { length: 10 }).$type<PushKind>().notNull(),
    payload: jsonb('payload').$type<PushPayload>().notNull(),
    status: varchar('status', { length: 15 })
      .$type<'pending' | 'sending' | 'sent' | 'failed' | 'cancelled'>()
      .notNull()
      .default('pending'),
    attempts: integer('attempts').notNull().default(0),
    due_at: instant('due_at').notNull(),
    expires_at: instant('expires_at').notNull(),
    lease_until: instant('lease_until'),
    lease_token: uuid('lease_token'),
    sent_at: instant('sent_at'),
    error_code: varchar('error_code', { length: 40 }),
    created: instant('created').notNull().defaultNow()
  },
  t => [
    foreignKey({
      columns: [t.owner_id, t.subscription_id],
      foreignColumns: [pushSubscriptions.owner_id, pushSubscriptions.id]
    }).onDelete('cascade'),
    uniqueIndex('gym_push_delivery_dedupe').on(
      t.owner_id,
      t.subscription_id,
      t.dedupe_key
    ),
    index('gym_push_delivery_due').on(t.owner_id, t.status, t.due_at),
    check(
      'gym_push_delivery_kind',
      sql`${t.kind} in ('planned','rest','coach','test')`
    ),
    check(
      'gym_push_delivery_status',
      sql`${t.status} in ('pending','sending','sent','failed','cancelled')`
    ),
    check('gym_push_delivery_attempts', sql`${t.attempts} between 0 and 4`)
  ]
)

export const pushTables = { pushSubscriptions, pushDeliveries }
