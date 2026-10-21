// SPDX-License-Identifier: 0BSD
import { createSelectSchema } from 'drizzle-orm/zod'
import { z } from 'zod'

import { fileReferenceSchema } from '@monolith/file-storage'

import { accountFor } from '../account'
import endpoints from '../endpoints'
import { users } from '../schema.drizzle'

const publicAccount = createSelectSchema(users)
  .pick({
    id: true,
    email: true,
    emailVisibility: true,
    verified: true,
    username: true,
    name: true,
    dateOfBirth: true,
    theme: true,
    color: true,
    bgTemp: true,
    fontFamily: true,
    fontScale: true,
    borderRadiusMultiplier: true,
    bordered: true,
    language: true,
    dashboardLayout: true,
    backdropFilters: true
  })
  .extend({
    avatar: fileReferenceSchema.nullable(),
    bgImage: fileReferenceSchema.nullable(),
    twoFAEnabled: z.boolean(),
    hasAPIKeysMasterPassword: z.boolean()
  })

export const me = endpoints
  .query({
    description: 'Read the current account profile and preferences',
    encrypted: false,
    input: {},
    output: { OK: z.object({ userData: publicAccount }) }
  })
  .callback(async ({ db, res, core, response }) => {
    const account = await accountFor(db, res.locals.userId as string)
    const [avatar, background] = await Promise.all(
      [account.avatar, account.bgImage].map(key =>
        key ? core.storage.getReference(key) : null
      )
    )
    const userData = publicAccount.parse({
      ...account,
      avatar,
      bgImage: background,
      name: account.name || '',
      dateOfBirth: account.dateOfBirth || '',
      theme: account.theme || 'system',
      color: account.color || '',
      bgTemp: account.bgTemp || '',
      fontFamily: account.fontFamily || '',
      fontScale: account.fontScale || 1,
      borderRadiusMultiplier: account.borderRadiusMultiplier || 1,
      language: account.language || 'en',
      twoFAEnabled: !!account.twoFASecret,
      hasAPIKeysMasterPassword: !!account.APIKeysMasterPasswordHash
    })
    return response.ok({ userData })
  })
