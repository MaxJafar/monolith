import { type RelationsBuilder, sql } from 'drizzle-orm'
import {
  boolean,
  check,
  doublePrecision,
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

import type {
  DeviceInput,
  ProbeResult,
  ServiceInput,
  SettingsInput
} from '../shared'

const table = createModuleTable('zillion_tech_lab')
const instant = (name: string) =>
  timestamp(name, { mode: 'date', withTimezone: true })
const identity = () => ({
  id: uuid('id').defaultRandom().primaryKey(),
  owner_id: uuid('owner_id').notNull(),
  created: instant('created').notNull().defaultNow(),
  updated: instant('updated').notNull().defaultNow()
})

export const devices = table(
  'devices',
  {
    ...identity(),
    name: varchar('name', { length: 160 }).notNull(),
    kind: varchar('kind', { length: 80 }).notNull(),
    host: text('host').notNull().default(''),
    os: text('os').notNull().default(''),
    cpu: text('cpu').notNull().default(''),
    gpu: text('gpu').notNull().default(''),
    ram_gb: doublePrecision('ram_gb'),
    storage: text('storage').notNull().default(''),
    location: text('location').notNull().default(''),
    management_url: text('management_url').notNull().default(''),
    glances_url: text('glances_url').notNull().default(''),
    notes: text('notes').notNull().default(''),
    tags: jsonb('tags').$type<DeviceInput['tags']>().notNull().default([]),
    source_key: varchar('source_key', { length: 200 })
  },
  t => [
    uniqueIndex('tech_lab_device_identity').on(t.owner_id, t.id),
    uniqueIndex('tech_lab_device_source').on(t.owner_id, t.source_key),
    index('tech_lab_device_owner_name').on(t.owner_id, t.name),
    check('tech_lab_device_ram', sql`${t.ram_gb} is null or ${t.ram_gb} >= 0`)
  ]
)

export const services = table(
  'services',
  {
    ...identity(),
    name: varchar('name', { length: 160 }).notNull(),
    kind: varchar('kind', { length: 20 })
      .$type<ServiceInput['kind']>()
      .notNull(),
    category: varchar('category', { length: 120 }).notNull().default(''),
    device_id: uuid('device_id'),
    url: text('url').notNull().default(''),
    address: text('address').notNull().default(''),
    description: text('description').notNull().default(''),
    notes: text('notes').notNull().default(''),
    tags: jsonb('tags').$type<string[]>().notNull().default([]),
    monitor_kind: varchar('monitor_kind', { length: 20 })
      .$type<ServiceInput['monitor_kind']>()
      .notNull()
      .default('none'),
    monitor_target: text('monitor_target').notNull().default(''),
    monitor_port: integer('monitor_port'),
    monitor_enabled: boolean('monitor_enabled').notNull().default(false),
    monitor_interval_seconds: integer('monitor_interval_seconds')
      .notNull()
      .default(300),
    monitor_revision: integer('monitor_revision').notNull().default(1),
    source_key: varchar('source_key', { length: 200 })
  },
  t => [
    uniqueIndex('tech_lab_service_identity').on(t.owner_id, t.id),
    uniqueIndex('tech_lab_service_source').on(t.owner_id, t.source_key),
    index('tech_lab_service_device').on(t.owner_id, t.device_id),
    index('tech_lab_service_owner_category').on(t.owner_id, t.category),
    index('tech_lab_service_monitors').on(t.owner_id, t.monitor_enabled),
    foreignKey({
      columns: [t.owner_id, t.device_id],
      foreignColumns: [devices.owner_id, devices.id]
    }).onDelete('restrict'),
    check('tech_lab_service_kind', sql`${t.kind} in ('service','game','link')`),
    check(
      'tech_lab_monitor_kind',
      sql`${t.monitor_kind} in ('none','http','tcp','minecraft')`
    ),
    check(
      'tech_lab_monitor_interval',
      sql`${t.monitor_interval_seconds} between 60 and 86400`
    ),
    check(
      'tech_lab_monitor_port',
      sql`${t.monitor_port} is null or ${t.monitor_port} between 1 and 65535`
    ),
    check('tech_lab_monitor_revision', sql`${t.monitor_revision} > 0`),
    check(
      'tech_lab_monitor_enabled',
      sql`not ${t.monitor_enabled} or ${t.monitor_kind} <> 'none'`
    )
  ]
)

export const checks = table(
  'checks',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    owner_id: uuid('owner_id').notNull(),
    service_id: uuid('service_id'),
    original_service_id: uuid('original_service_id').notNull(),
    service_name: varchar('service_name', { length: 160 }).notNull(),
    monitor_kind: varchar('monitor_kind', { length: 20 })
      .$type<ServiceInput['monitor_kind']>()
      .notNull(),
    monitor_target: text('monitor_target').notNull(),
    monitor_port: integer('monitor_port'),
    monitor_revision: integer('monitor_revision').notNull(),
    status: varchar('status', { length: 10 })
      .$type<ProbeResult['status']>()
      .notNull(),
    latency_ms: doublePrecision('latency_ms'),
    http_status: integer('http_status'),
    message: text('message').notNull(),
    details: jsonb('details').$type<ProbeResult['details']>(),
    checked_at: instant('checked_at').notNull().defaultNow()
  },
  t => [
    foreignKey({
      columns: [t.owner_id, t.service_id],
      foreignColumns: [services.owner_id, services.id]
    }).onDelete('restrict'),
    index('tech_lab_check_service_time').on(
      t.owner_id,
      t.service_id,
      t.checked_at
    ),
    index('tech_lab_check_original_time').on(
      t.owner_id,
      t.original_service_id,
      t.checked_at
    ),
    index('tech_lab_check_retention').on(t.owner_id, t.checked_at),
    check('tech_lab_check_status', sql`${t.status} in ('up','down','error')`),
    check(
      'tech_lab_check_latency',
      sql`${t.latency_ms} is null or ${t.latency_ms} >= 0`
    ),
    check(
      'tech_lab_check_http_status',
      sql`${t.http_status} is null or ${t.http_status} between 100 and 599`
    ),
    check('tech_lab_check_revision', sql`${t.monitor_revision} > 0`)
  ]
)

export const settings = table('settings', {
  owner_id: uuid('owner_id').primaryKey(),
  values: jsonb('values').$type<SettingsInput>().notNull(),
  updated: instant('updated').notNull().defaultNow()
})

export const tables = { devices, services, checks, settings }

export const relations = (_r: RelationsBuilder<typeof tables>) => ({
  devices: {},
  services: {},
  checks: {},
  settings: {}
})
