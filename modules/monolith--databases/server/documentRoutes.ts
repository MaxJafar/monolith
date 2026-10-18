import { and, desc, eq, sql } from 'drizzle-orm'
import { createSelectSchema } from 'drizzle-orm/zod'
import z from 'zod'

import { ClientError } from '@monolith/server-utils'

import endpoints from './endpoints'
import { prepareContent } from './knowledge'
import { ownerId } from './model'
import { documents } from './schema.drizzle'
import type { Transaction } from './store'

const input = z
  .object({
    title: z.string().trim().min(1).max(255),
    content: z.string().max(1_000_000).default(''),
    parent_id: z.uuid().nullable().default(null)
  })
  .strict()
const output = createSelectSchema(documents)
const idQuery = z.object({ id: z.uuid() })
const lock = (owner: string) =>
  sql`select pg_advisory_xact_lock(hashtextextended(${`documents:${owner}`}, 0))`

async function validateParent(
  db: Transaction,
  owner: string,
  parent: string | null,
  id?: string
) {
  const visited = new Set<string>()

  let cursor = parent

  while (cursor) {
    if (cursor === id || visited.has(cursor))
      throw new ClientError('A document cannot contain itself')
    if (visited.size >= 32)
      throw new ClientError('Document nesting is limited to 32 levels')
    visited.add(cursor)
    const [row] = await db
      .select()
      .from(documents)
      .where(and(eq(documents.owner_id, owner), eq(documents.id, cursor)))

    if (!row) throw new ClientError('Parent document not found', 404)
    cursor = row.parent_id
  }
}

export const list = endpoints
  .query({
    description: 'Read owned documents',
    output: { OK: z.array(output) }
  })
  .callback(async ({ db, res, response }) =>
    response.ok(
      await db
        .select()
        .from(documents)
        .where(eq(documents.owner_id, ownerId(res)))
        .orderBy(desc(documents.updated))
    )
  )

export const create = endpoints
  .mutation({
    description: 'Create a block document',
    input: { body: input },
    output: { CREATED: output }
  })
  .callback(async ({ db, res, body, response }) => {
    const owner = ownerId(res)
    const created = await db.transaction(async tx => {
      await tx.execute(lock(owner))
      await validateParent(tx, owner, body.parent_id)
      const content = await prepareContent(tx, owner, body.content)
      const [row] = await tx
        .insert(documents)
        .values({ ...body, content, owner_id: owner })
        .returning()

      if (!row) throw new Error('Document creation failed')

      return row
    })

    return response.created(created)
  })

export const update = endpoints
  .mutation({
    description: 'Save a document without overwriting newer revisions',
    input: {
      query: idQuery,
      body: input.extend({ expected_revision: z.number().int().min(1) })
    },
    output: { OK: output }
  })
  .callback(async ({ db, res, query, body, response }) => {
    const owner = ownerId(res)
    const updated = await db.transaction(async tx => {
      await tx.execute(lock(owner))
      const [existing] = await tx
        .select()
        .from(documents)
        .where(and(eq(documents.owner_id, owner), eq(documents.id, query.id)))
        .for('update')

      if (!existing) throw new ClientError('Document not found', 404)
      if (existing.revision !== body.expected_revision)
        throw new ClientError(
          'This document changed elsewhere. Reload the latest version before saving.',
          409
        )
      await validateParent(tx, owner, body.parent_id, query.id)
      const content = await prepareContent(
        tx,
        owner,
        body.content,
        existing.content
      )
      const [row] = await tx
        .update(documents)
        .set({
          title: body.title,
          content,
          parent_id: body.parent_id,
          revision: existing.revision + 1,
          updated: new Date()
        })
        .where(eq(documents.id, query.id))
        .returning()

      if (!row) throw new Error('Document save failed')

      return row
    })

    return response.ok(updated)
  })

export const remove = endpoints
  .mutation({
    description: 'Delete one document while preserving its children',
    input: {
      query: idQuery,
      body: z.object({ expected_revision: z.number().int().min(1) })
    },
    output: { NO_CONTENT: true }
  })
  .callback(async ({ db, res, query, body, response }) => {
    const owner = ownerId(res)
    await db.transaction(async tx => {
      await tx.execute(lock(owner))
      const [row] = await tx
        .select()
        .from(documents)
        .where(and(eq(documents.owner_id, owner), eq(documents.id, query.id)))
        .for('update')

      if (!row) throw new ClientError('Document not found', 404)
      if (row.revision !== body.expected_revision)
        throw new ClientError(
          'This document changed elsewhere. Reload before deleting.',
          409
        )
      // Detach children explicitly so their optimistic revisions reflect the changed hierarchy.
      await tx
        .update(documents)
        .set({
          parent_id: null,
          revision: sql`${documents.revision} + 1`,
          updated: new Date()
        })
        .where(
          and(eq(documents.owner_id, owner), eq(documents.parent_id, query.id))
        )
      await tx.delete(documents).where(eq(documents.id, query.id))
    })

    return response.noContent()
  })
