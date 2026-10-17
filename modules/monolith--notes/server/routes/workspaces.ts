import dayjs from 'dayjs'
import { and, desc, eq } from 'drizzle-orm'
import z from 'zod'

import endpoints from '../endpoints'
import { workspacesInput } from '../models'
import { notesMutationLock } from '../mutationLock'
import { entries, subjects, workspaces } from '../schema.drizzle'

const output = workspacesInput
  .extend({ id: z.uuid(), created: z.date(), updated: z.date() })
  .strip()

export const list = endpoints
  .query({
    description: 'List notes workspaces belonging to the current user',
    output: { OK: z.array(output) }
  })
  .callback(async ({ db, res, response }) => {
    const owner = res.locals.userId

    if (typeof owner !== 'string') return response.unauthorized()

    return response.ok(
      (
        await db
          .select()
          .from(workspaces)
          .where(eq(workspaces.owner_id, owner))
          .orderBy(desc(workspaces.updated))
      ).map(record => output.parse(record))
    )
  })

export const create = endpoints
  .mutation({
    description: 'create notes workspaces',
    input: { body: workspacesInput },
    output: { CREATED: output }
  })
  .callback(async ({ db, body, res, response }) => {
    const owner = res.locals.userId

    if (typeof owner !== 'string') return response.unauthorized()
    await db.execute(notesMutationLock(owner))

    const [created] = await db
      .insert(workspaces)
      .values({ ...body, owner_id: owner })
      .returning()

    if (!created) throw new Error('Insert did not return a record')

    return response.created(output.parse(created))
  })

export const update = endpoints
  .mutation({
    description: 'update notes workspaces',
    input: { query: z.object({ id: z.uuid() }), body: workspacesInput },
    output: { NO_CONTENT: true }
  })
  .callback(async ({ db, body, query, res, response }) => {
    const owner = res.locals.userId

    if (typeof owner !== 'string') return response.unauthorized()
    await db.execute(notesMutationLock(owner))

    const [existing] = await db
      .select()
      .from(workspaces)
      .where(and(eq(workspaces.id, query.id), eq(workspaces.owner_id, owner)))
      .limit(1)

    if (!existing) return response.notFound()
    await db
      .update(workspaces)
      .set({ ...body, updated: dayjs().toDate() })
      .where(and(eq(workspaces.id, query.id), eq(workspaces.owner_id, owner)))

    return response.noContent()
  })

export const remove = endpoints
  .mutation({
    description: 'Delete notes workspaces',
    input: { query: z.object({ id: z.uuid() }) },
    output: { NO_CONTENT: true }
  })
  .callback(async ({ db, query, core: { storage }, res, response }) => {
    const owner = res.locals.userId

    if (typeof owner !== 'string') return response.unauthorized()
    await db.execute(notesMutationLock(owner))

    const attachments = await db
      .select({ file: entries.file })
      .from(entries)
      .innerJoin(subjects, eq(entries.subject_id, subjects.id))
      .where(
        and(
          eq(subjects.workspace_id, query.id),
          eq(entries.owner_id, owner),
          eq(subjects.owner_id, owner)
        )
      )
    const deleted = await db
      .delete(workspaces)
      .where(and(eq(workspaces.id, query.id), eq(workspaces.owner_id, owner)))
      .returning({ id: workspaces.id })

    if (!deleted.length) return response.notFound()
    for (const attachment of attachments)
      if (attachment.file) await storage.delete(attachment.file)

    return response.noContent()
  })
