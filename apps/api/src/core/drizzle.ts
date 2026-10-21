// SPDX-License-Identifier: 0BSD
import { defineRelations } from 'drizzle-orm'
import { type PostgresJsDatabase, drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'

import { composeRelations, defineModuleSchema } from '@monolith/drizzle'
import { filesSchema } from '@monolith/file-storage/server'
import { ModuleRegistry } from '@monolith/module-runtime/registry'

import * as credentials from '../lib/apiKeys/schema.drizzle'
import * as sessions from '../lib/auth/schema.drizzle'
import * as fonts from '../lib/fonts/schema.drizzle'
import * as rooms from '../lib/rooms/schema.drizzle'
import * as search from '../lib/search/schema.drizzle'
import * as accounts from '../lib/user/schema.drizzle'

const tables = {
  ...accounts.tables,
  ...sessions.tables,
  ...credentials.tables,
  ...fonts.tables,
  ...filesSchema.tables,
  ...search.tables,
  ...rooms.tables
}
const schema = defineModuleSchema(tables, builder => {
  const declarations = [
    accounts,
    sessions,
    credentials,
    fonts,
    filesSchema,
    search,
    rooms
  ]
  return Object.assign({}, ...declarations.map(item => item.relations(builder)))
})
const connectionUrl = process.env.DATABASE_URL
if (!connectionUrl)
  throw Error('The application database connection is not configured')
const connection = postgres(connectionUrl, {
  max: 10,
  prepare: false,
  connection: { TimeZone: 'UTC' }
})
const relations = defineRelations(schema.tables, schema.relations)
export type CoreRelations = typeof relations
export let db: PostgresJsDatabase<CoreRelations> = drizzle({
  client: connection,
  relations
})

ModuleRegistry.registerSchemaPart('core', schema)
export function initDrizzle() {
  const assembled = composeRelations(ModuleRegistry.schemaParts)
  db = drizzle({
    client: connection,
    relations: assembled
  }) as unknown as PostgresJsDatabase<CoreRelations>
}
export const listenDeviceRevocations = (
  listener: (sessionId: string) => void
) => connection.listen('monolith_device_revoked', listener)
export const listenRoomChanges = (listener: (payload: string) => void) =>
  connection.listen('monolith_rooms_changed', listener)

export async function verifyDatabaseIsolation(): Promise<void> {
  const roles =
    await connection`select rolsuper, rolbypassrls from pg_roles where rolname = current_user`
  const role = roles[0]
  if (role && !role.rolsuper && !role.rolbypassrls) return
  throw Error(
    'DATABASE_URL must use a non-superuser role without BYPASSRLS. Use DATABASE_ADMIN_URL only for migrations.'
  )
}
