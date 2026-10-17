import { decrypt2, encrypt2 } from '@functions/auth/encryption'
import { eq } from 'drizzle-orm'
import { createSelectSchema } from 'drizzle-orm/zod'
import z from 'zod'

import { defineRoutes } from '@monolith/server-utils'

import endpoints from '../endpoints'
import { apiKeysEntries } from '../schema.drizzle'

const entrySchema = createSelectSchema(apiKeysEntries)
const fields = z.object({
  keyId: z.string(),
  name: z.string(),
  icon: z.string(),
  key: z.string(),
  exposable: z.boolean()
})
const identity = z.object({ id: z.string() })
function master(): string {
  const key = process.env.MASTER_KEY
  if (!key) throw new Error('MASTER_KEY must be configured')
  return key
}
function preview<T extends { key: string }>(entry: T): T {
  return { ...entry, key: decrypt2(entry.key, master()).slice(-4) }
}

export default defineRoutes({
  get: endpoints
    .query({
      description: 'Read a key explicitly marked for client access',
      input: { query: z.object({ keyId: z.string() }) },
      output: { OK: z.string().nullable() }
    })
    .callback(async ({ db, query, response }) => {
      const entry = await db.query.apiKeysEntries.findFirst({
        where: { keyId: query.keyId }
      })
      if (!entry) return response.ok(null)
      if (!entry.exposable) return response.forbidden()
      try {
        return response.ok(decrypt2(entry.key, master()))
      } catch {
        return response.forbidden()
      }
    }),
  list: endpoints
    .query({
      description: 'List credentials with masked values',
      output: { OK: z.array(entrySchema) }
    })
    .callback(async ({ db, response }) =>
      response.ok(
        (
          await db.query.apiKeysEntries.findMany({ orderBy: { name: 'asc' } })
        ).map(preview)
      )
    ),
  checkKeys: endpoints
    .query({
      description: 'Check availability of the requested credentials',
      input: { query: z.object({ keys: z.string() }) },
      output: { OK: z.boolean() }
    })
    .callback(async ({ query, core, response }) => {
      const required = [
        ...new Set(query.keys.split(',').map(key => key.trim()))
      ]
      try {
        await Promise.all(required.map(key => core.api.getAPIKey(key)))
        return response.ok(true)
      } catch {
        return response.ok(false)
      }
    }),
  create: endpoints
    .mutation({
      description: 'Store an encrypted credential',
      input: { body: fields },
      output: { CREATED: entrySchema }
    })
    .callback(async ({ db, body, response }) => {
      const [entry] = await db
        .insert(apiKeysEntries)
        .values({ ...body, key: encrypt2(body.key, master()) })
        .returning()
      return entry
        ? response.created({ ...entry, key: body.key.slice(-4) })
        : response.badRequest('Credential could not be created')
    }),
  update: endpoints
    .mutation({
      description: 'Edit credential metadata or replace its secret',
      input: {
        query: identity,
        body: fields.extend({ overrideKey: z.boolean() })
      },
      output: { OK: entrySchema }
    })
    .callback(async ({ db, query, body, response }) => {
      const { overrideKey, key, ...metadata } = body
      const [entry] = await db
        .update(apiKeysEntries)
        .set({
          ...metadata,
          updated: new Date(),
          ...(overrideKey ? { key: encrypt2(key, master()) } : {})
        })
        .where(eq(apiKeysEntries.id, query.id))
        .returning()
      return entry ? response.ok(preview(entry)) : response.notFound()
    }),
  remove: endpoints
    .mutation({
      description: 'Remove a stored credential',
      input: { query: identity },
      output: { NO_CONTENT: true }
    })
    .callback(async ({ db, query, response }) => {
      const removed = await db
        .delete(apiKeysEntries)
        .where(eq(apiKeysEntries.id, query.id))
        .returning({ id: apiKeysEntries.id })
      return removed.length ? response.noContent() : response.notFound()
    })
})
