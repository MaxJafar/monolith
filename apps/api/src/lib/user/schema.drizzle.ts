// SPDX-License-Identifier: 0BSD
import type { RelationsBuilder } from 'drizzle-orm'
import { json, jsonb, pgTable, real } from 'drizzle-orm/pg-core'

import type { CanvasPage } from '@monolith/blocks'

import { flag, recordIdentity, storedText } from '../../core/schema/columns'

const credentials = {
  email: storedText('email').notNull().unique(),
  username: storedText('username', 150).notNull().unique(),
  auth_password_hash: storedText('auth_password_hash'),
  twoFASecret: storedText('two_fa_secret'),
  APIKeysMasterPasswordHash: storedText('api_keys_master_password_hash'),
  verified: flag('verified')
}
const profile = {
  name: storedText('name'),
  avatar: storedText('avatar'),
  dateOfBirth: storedText('date_of_birth', 50),
  emailVisibility: flag('email_visibility')
}
const appearance = {
  language: storedText('language', 50).default('en').notNull(),
  theme: storedText('theme', 50).default('system').notNull(),
  color: storedText('color', 50),
  fontFamily: storedText('font_family'),
  fontScale: real('font_scale').default(1).notNull(),
  borderRadiusMultiplier: real('border_radius_multiplier').default(1).notNull(),
  bordered: flag('bordered'),
  bgImage: storedText('bg_image'),
  bgTemp: storedText('bg_temp'),
  backdropFilters: json('backdrop_filters').$type<Record<string, unknown>>()
}
export const users = pgTable('users', {
  ...recordIdentity(),
  ...credentials,
  ...profile,
  ...appearance,
  dashboardLayout: json('dashboard_layout').$type<Record<string, unknown>>(),
  workspacePages: jsonb('workspace_pages')
    .$type<Record<string, CanvasPage>>()
    .notNull()
    .default({})
})
export const tables = { users }
export const relations = (_builder: RelationsBuilder<typeof tables>) => ({})
