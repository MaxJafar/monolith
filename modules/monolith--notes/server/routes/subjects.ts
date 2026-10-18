import dayjs from 'dayjs'
import { and, desc, eq } from 'drizzle-orm'
import z from 'zod'

import endpoints from '../endpoints'
import { subjectsInput } from '../models'
import { notesMutationLock } from '../mutationLock'
import { entries, subjects, workspaces } from '../schema.drizzle'

const output = subjectsInput
  .extend({ id: z.uuid(), created: z.date(), updated: z.date() })
  .strip()

export const list = endpoints
  .query({
    description: 'List notes subjects belonging to the current user',
    output: { OK: z.array(output) }
  })
  .callback(async ({ db, res, response }) => {
    const owner = res.locals.userId

    if (typeof owner !== 'string') return response.unauthorized()

    return response.ok(
      (
        await db
          .select()
          .from(subjects)
          .where(eq(subjects.owner_id, owner))
          .orderBy(desc(subjects.updated))
      ).map(record => output.parse(record))
    )
  })

export const create = endpoints
  .mutation({
    description: 'create notes subjects',
    input: { body: subjectsInput },
    output: { CREATED: output }
  })
  .callback(async ({ db, body, res, response }) => {
    const owner = res.locals.userId

    if (typeof owner !== 'string') return response.unauthorized()
    await db.execute(notesMutationLock(owner))

    if (body.workspace_id) {
      const [target] = await db
        .select()
        .from(workspaces)
        .where(
          and(
            eq(workspaces.id, body.workspace_id),
            eq(workspaces.owner_id, owner)
          )
        )
        .limit(1)

      if (!target) return response.notFound()
    }

    const [created] = await db
      .insert(subjects)
      .values({ ...body, owner_id: owner })
      .returning()

    if (!created) throw new Error('Insert did not return a record')

    return response.created(output.parse(created))
  })

export const update = endpoints
  .mutation({
    description: 'update notes subjects',
    input: { query: z.object({ id: z.uuid() }), body: subjectsInput },
    output: { NO_CONTENT: true }
  })
  .callback(async ({ db, body, query, res, response }) => {
    const owner = res.locals.userId

    if (typeof owner !== 'string') return response.unauthorized()
    await db.execute(notesMutationLock(owner))

    const [existing] = await db
      .select()
      .from(subjects)
      .where(and(eq(subjects.id, query.id), eq(subjects.owner_id, owner)))
      .limit(1)

    if (!existing) return response.notFound()

    if (body.workspace_id) {
      const [target] = await db
        .select()
        .from(workspaces)
        .where(
          and(
            eq(workspaces.id, body.workspace_id),
            eq(workspaces.owner_id, owner)
          )
        )
        .limit(1)

      if (!target) return response.notFound()
    }
    await db
      .update(subjects)
      .set({ ...body, updated: dayjs().toDate() })
      .where(and(eq(subjects.id, query.id), eq(subjects.owner_id, owner)))

    return response.noContent()
  })

export const remove = endpoints
  .mutation({
    description: 'Delete notes subjects',
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
      .where(and(eq(entries.subject_id, query.id), eq(entries.owner_id, owner)))
    const deleted = await db
      .delete(subjects)
      .where(and(eq(subjects.id, query.id), eq(subjects.owner_id, owner)))
      .returning({ id: subjects.id })

    if (!deleted.length) return response.notFound()
    for (const attachment of attachments)
      if (attachment.file) await storage.delete(attachment.file)

    return response.noContent()
  })
