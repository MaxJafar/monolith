// SPDX-License-Identifier: 0BSD
import type { RelationsBuilder } from 'drizzle-orm'
import { pgTable, timestamp, uuid } from 'drizzle-orm/pg-core'

import {
  flag,
  recordIdentity,
  recordedAt,
  storedText
} from '../../core/schema/columns'

// These identifiers describe the existing database protocol; no data migration is needed.
export const authOAuthProviders = pgTable('auth__oauth_providers', {
  ...recordIdentity(),
  provider: storedText('provider').notNull().unique(),
  client_id: storedText('client_id', 500),
  client_secret: storedText('client_secret', 500),
  enabled: flag('enabled')
})
export const authRefreshTokens = pgTable('auth__refresh_tokens', {
  ...recordIdentity(),
  userId: uuid('user_id').notNull(),
  family: storedText('family').notNull(),
  token_hash: storedText('token_hash').notNull(),
  expires_at: timestamp('expires_at', { mode: 'date' }).notNull(),
  revoked: flag('revoked'),
  bound_ip: storedText('bound_ip').notNull(),
  last_ip: storedText('last_ip').notNull(),
  last_used_at: recordedAt('last_used_at')
})
export const tables = { authRefreshTokens, authOAuthProviders }
export const relations = (_builder: RelationsBuilder<typeof tables>) => ({})
