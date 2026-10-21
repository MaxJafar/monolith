// SPDX-License-Identifier: 0BSD
import { hash } from 'argon2'
import { sql } from 'drizzle-orm'
import { z } from 'zod'

import endpoints from '../endpoints'
import { users } from '../schema.drizzle'

export const createFirstUser = endpoints
  .mutation({
    description: 'Initialize an empty installation with its first account',
    noAuth: true,
    input: {
      body: z.object({
        email: z.email(),
        username: z.string().min(3),
        name: z.string().min(1),
        password: z.string().min(8)
      })
    },
    output: { CREATED: z.object({ state: z.literal('success') }) }
  })
  .callback(async ({ db, body, response }) => {
    const { password, ...identity } = body
    const digest = await hash(password, { type: 2 })
    return db.transaction(async transaction => {
      // Bootstrap has no account scope; the table lock serializes competing first-account requests.
      await transaction.execute(
        sql`LOCK TABLE ${users} IN SHARE ROW EXCLUSIVE MODE`
      )
      const existing = await transaction
        .select({ id: users.id })
        .from(users)
        .limit(1)
      if (existing.length) return response.badRequest('Users already exist')
      await transaction.insert(users).values({
        ...identity,
        auth_password_hash: digest,
        verified: true,
        theme: 'light',
        color: '#3b8a82',
        bgTemp: 'zillion',
        fontFamily: 'Inter',
        language: 'en',
        fontScale: 1,
        borderRadiusMultiplier: 1
      })
      return response.created({ state: 'success' })
    })
  })
