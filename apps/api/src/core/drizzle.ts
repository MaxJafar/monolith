import { composeRelations, defineModuleSchema } from '@monolith/drizzle'
import { filesSchema } from '@monolith/file-storage/server'
import { ModuleRegistry } from '@monolith/module-runtime/registry'
import { defineRelations } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/postgres-js'
import { type PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'

import * as apiKeysSchema from '../lib/apiKeys/schema.drizzle'
import * as authSchema from '../lib/auth/schema.drizzle'
import * as fontsSchema from '../lib/fonts/schema.drizzle'
import * as roomsSchema from '../lib/rooms/schema.drizzle'
import * as searchSchema from '../lib/search/schema.drizzle'
import * as userSchema from '../lib/user/schema.drizzle'

const connectionString = process.env.DATABASE_URL!

// Timestamp-without-time-zone columns are stored and decoded as UTC.
const client = postgres(connectionString, {
  max: 10,
  prepare: false,
  connection: { TimeZone: 'UTC' }
})

const coreTables = {
  ...userSchema.tables,
  ...authSchema.tables,
  ...apiKeysSchema.tables,
  ...fontsSchema.tables,
  ...filesSchema.tables,
  ...searchSchema.tables,
  ...roomsSchema.tables
}

const coreDefinition = defineModuleSchema(coreTables, r =>
  Object.assign(
    {},
    userSchema.relations(r),
    authSchema.relations(r),
    apiKeysSchema.relations(r),
    fontsSchema.relations(r),
    filesSchema.relations(r),
    searchSchema.relations(r),
    roomsSchema.relations(r)
  )
)

ModuleRegistry.registerSchemaPart('core', coreDefinition)

const coreRelations = defineRelations(
  coreDefinition.tables,
  coreDefinition.relations
)

export type CoreRelations = typeof coreRelations

let db: PostgresJsDatabase<CoreRelations> = drizzle({
  client,
  relations: coreRelations
})

export { db }

export function listenDeviceRevocations(listener: (sessionId: string) => void) {
  return client.listen('monolith_device_revoked', listener)
}

export function listenRoomChanges(listener: (payload: string) => void) {
  return client.listen('monolith_rooms_changed', listener)
}

export function initDrizzle(): void {
  db = drizzle({
    client,
    relations: composeRelations(ModuleRegistry.schemaParts)
  }) as unknown as PostgresJsDatabase<CoreRelations>
}

export async function verifyDatabaseIsolation(): Promise<void> {
  const [role] =
    await client`select rolsuper, rolbypassrls from pg_roles where rolname = current_user`

  if (!role || role.rolsuper || role.rolbypassrls) {
    throw new Error(
      'DATABASE_URL must use a non-superuser role without BYPASSRLS. Use DATABASE_ADMIN_URL only for migrations.'
    )
  }
}
