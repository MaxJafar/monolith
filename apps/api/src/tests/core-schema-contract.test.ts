// SPDX-License-Identifier: 0BSD
import { getTableConfig } from 'drizzle-orm/pg-core'
import { expect, it } from 'vitest'

import { apiKeysEntries } from '../lib/apiKeys/schema.drizzle'
import {
  authOAuthProviders,
  authRefreshTokens
} from '../lib/auth/schema.drizzle'
import { fontsFontFamilyUpload } from '../lib/fonts/schema.drizzle'
import { users } from '../lib/user/schema.drizzle'

it('keeps the stored identity, preference and credential contracts', () => {
  const tables = [
    users,
    authRefreshTokens,
    authOAuthProviders,
    apiKeysEntries,
    fontsFontFamilyUpload
  ].map(getTableConfig)
  expect(tables.map(table => table.name)).toEqual([
    'users',
    'auth__refresh_tokens',
    'auth__oauth_providers',
    'api_keys__entries',
    'fonts__font_family_upload'
  ])
  for (const table of tables) {
    for (const name of ['id', 'created', 'updated']) {
      const column = table.columns.find(column => column.name === name)!
      expect(column.notNull).toBe(true)
      expect(column.hasDefault).toBe(true)
    }
  }
  const account = getTableConfig(users).columns
  expect(account.find(column => column.name === 'username')?.getSQLType()).toBe(
    'varchar(150)'
  )
  expect(
    account.find(column => column.name === 'workspace_pages')?.getSQLType()
  ).toBe('jsonb')
  expect(account.find(column => column.name === 'theme')?.default).toBe(
    'system'
  )
  expect(account.find(column => column.name === 'language')?.default).toBe('en')
  expect(
    getTableConfig(authRefreshTokens).columns.find(
      column => column.name === 'expires_at'
    )?.hasDefault
  ).toBe(false)
})
