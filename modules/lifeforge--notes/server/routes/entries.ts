import dayjs from 'dayjs'
import { and, desc, eq, sql } from 'drizzle-orm'
import z from 'zod'

import { ClientError } from '@lifeforge/server-utils'

import {
  pageCatalog,
  prepareContent
} from '../../../zillion--databases/server/knowledge'
import forge from '../forge'
import { entriesInput } from '../models'
import { notesMutationLock } from '../mutationLock'
import { entries, subjects } from '../schema.drizzle'

const output = entriesInput
  .extend({
    id: z.uuid(),
    created: z.date(),
    updated: z.date(),
    file: z.string().nullable()
  })
  .strip()

export const catalog = forge
  .query({
    description: 'Owned link targets for the block editor',
    output: {
      OK: z.array(
        z.object({
          id: z.uuid(),
          kind: z.enum(['document', 'record', 'note']),
          title: z.string(),
          context: z.string().optional()
        })
      )
    }
  })
  .callback(async ({ db, res, response }) => {
    const owner = res.locals.userId

    if (typeof owner !== 'string') return response.unauthorized()

    return response.ok(
      (await pageCatalog(db, owner)).map(({ id, kind, title, context }) => ({
        id,
        kind,
        title,
        context
      }))
    )
  })

export const list = forge
  .query({
    description: 'List notes entries belonging to the current user',
    output: { OK: z.array(output) }
  })
  .callback(async ({ db, res, response }) => {
    const owner = res.locals.userId

    if (typeof owner !== 'string') return response.unauthorized()

    return response.ok(
      (
        await db
          .select()
          .from(entries)
          .where(eq(entries.owner_id, owner))
          .orderBy(desc(entries.updated))
      ).map(record => output.parse(record))
    )
  })

export const create = forge
  .mutation({
    description: 'create notes entries',
    input: { body: entriesInput },
    output: { CREATED: output }
  })
  .callback(async ({ db, body, res, response }) => {
    const owner = res.locals.userId

    if (typeof owner !== 'string') return response.unauthorized()
    await db.execute(notesMutationLock(owner))

    if (body.subject_id) {
      const [target] = await db
        .select()
        .from(subjects)
        .where(
          and(eq(subjects.id, body.subject_id), eq(subjects.owner_id, owner))
        )
        .limit(1)

      if (!target) return response.notFound()
    }

    if (body.parent_id) {
      const [target] = await db
        .select()
        .from(entries)
        .where(and(eq(entries.id, body.parent_id), eq(entries.owner_id, owner)))
        .limit(1)

      if (!target) return response.notFound()
      if (target.type !== 'folder' || target.subject_id !== body.subject_id)
        return response.badRequest(
          'Parent must be a folder in the same subject'
        )
    }

    const [created] = await db
      .insert(entries)
      .values({
        ...body,
        content: await prepareContent(db, owner, body.content),
        owner_id: owner
      })
      .returning()

    if (!created) throw new Error('Insert did not return a record')

    return response.created(output.parse(created))
  })

export const update = forge
  .mutation({
    description: 'update notes entries',
    input: {
      query: z.object({ id: z.uuid() }),
      body: entriesInput.extend({
        expected_updated: z.string().datetime().optional()
      })
    },
    output: { NO_CONTENT: true }
  })
  .callback(async ({ db, body, query, res, response }) => {
    const owner = res.locals.userId

    if (typeof owner !== 'string') return response.unauthorized()
    await db.execute(notesMutationLock(owner))

    const [existing] = await db
      .select()
      .from(entries)
      .where(and(eq(entries.id, query.id), eq(entries.owner_id, owner)))
      .limit(1)

    if (!existing) return response.notFound()
    if (
      body.expected_updated &&
      existing.updated.toISOString() !== body.expected_updated
    )
      throw new ClientError(
        'This note changed elsewhere. Reload before saving.',
        409
      )
    if (existing.file && body.type === 'folder')
      return response.badRequest(
        'Remove the attachment before changing the entry to a folder'
      )

    if (body.subject_id) {
      const [target] = await db
        .select()
        .from(subjects)
        .where(
          and(eq(subjects.id, body.subject_id), eq(subjects.owner_id, owner))
        )
        .limit(1)

      if (!target) return response.notFound()
    }

    if (body.parent_id) {
      const [target] = await db
        .select()
        .from(entries)
        .where(and(eq(entries.id, body.parent_id), eq(entries.owner_id, owner)))
        .limit(1)

      if (!target) return response.notFound()
      if (target.type !== 'folder' || target.subject_id !== body.subject_id)
        return response.badRequest(
          'Parent must be a folder in the same subject'
        )
      let cursor: string | null = target.id

      const visited = new Set<string>()

      while (cursor) {
        if (cursor === query.id || visited.has(cursor))
          return response.badRequest('Folder cannot contain itself')
        visited.add(cursor)
        const [ancestor] = await db
          .select({ parent: entries.parent_id })
          .from(entries)
          .where(and(eq(entries.id, cursor), eq(entries.owner_id, owner)))
          .limit(1)
        cursor = ancestor?.parent || null
      }
    }

    const [child] = await db
      .select({ id: entries.id })
      .from(entries)
      .where(eq(entries.parent_id, query.id))
      .limit(1)

    if (
      child &&
      (body.type !== 'folder' || body.subject_id !== existing.subject_id)
    )
      return response.badRequest(
        'Move or remove child entries before changing the folder type or subject'
      )
    await db
      .update(entries)
      .set({
        name: body.name,
        type: body.type,
        subject_id: body.subject_id,
        parent_id: body.parent_id,
        content: await prepareContent(
          db,
          owner,
          body.content,
          existing.content
        ),
        updated: new Date(Math.max(Date.now(), existing.updated.getTime() + 1))
      })
      .where(and(eq(entries.id, query.id), eq(entries.owner_id, owner)))

    return response.noContent()
  })

export const remove = forge
  .mutation({
    description: 'Delete notes entries',
    input: { query: z.object({ id: z.uuid() }) },
    output: { NO_CONTENT: true }
  })
  .callback(async ({ db, query, core: { storage }, res, response }) => {
    const owner = res.locals.userId

    if (typeof owner !== 'string') return response.unauthorized()
    await db.execute(notesMutationLock(owner))

    const attachments = await db.execute<{
      file: string
    }>(sql`with recursive descendants as (
select ${entries.id} as id, ${entries.file} as file from ${entries} where ${entries.id} = ${query.id} and ${entries.owner_id} = ${owner}
union select child.id, child.file from ${entries} child join descendants parent on child.parent_id = parent.id where child.owner_id = ${owner}
) select file from descendants where file is not null`)
    const deleted = await db
      .delete(entries)
      .where(and(eq(entries.id, query.id), eq(entries.owner_id, owner)))
      .returning({ id: entries.id })

    if (!deleted.length) return response.notFound()
    for (const attachment of attachments) await storage.delete(attachment.file)

    return response.noContent()
  })

export const attach = forge
  .mutation({
    description: 'Upload an attachment to an owned note or file entry',
    input: { query: z.object({ id: z.uuid() }), body: z.object({}) },
    media: { file: { optional: false } },
    output: { NO_CONTENT: true }
  })
  .callback(async ({ db, query, media, core: { storage }, res, response }) => {
    const owner = res.locals.userId

    if (typeof owner !== 'string') return response.unauthorized()
    await db.execute(notesMutationLock(owner))

    const [entry] = await db
      .select()
      .from(entries)
      .where(and(eq(entries.id, query.id), eq(entries.owner_id, owner)))
      .limit(1)

    if (!entry) return response.notFound()
    if (entry.type === 'folder')
      return response.badRequest('Attachments belong to a note or file entry')
    if (!media.file || typeof media.file === 'string')
      return response.badRequest('Upload a file')
    if (media.file.size > 20 * 1024 * 1024)
      return response.badRequest('Attachment must be smaller than 20 MB')

    const reference = await storage.save({
      file: media.file,
      currentKey: entry.file
    })

    if (!reference) return response.badRequest('File could not be saved')
    await db
      .update(entries)
      .set({ file: reference.key, updated: dayjs().toDate() })
      .where(and(eq(entries.id, query.id), eq(entries.owner_id, owner)))

    return response.noContent()
  })

export const detach = forge
  .mutation({
    description: 'Remove an attachment from an owned entry',
    input: { query: z.object({ id: z.uuid() }) },
    output: { NO_CONTENT: true }
  })
  .callback(async ({ db, query, core: { storage }, res, response }) => {
    const owner = res.locals.userId

    if (typeof owner !== 'string') return response.unauthorized()
    await db.execute(notesMutationLock(owner))

    const [entry] = await db
      .select()
      .from(entries)
      .where(and(eq(entries.id, query.id), eq(entries.owner_id, owner)))
      .limit(1)

    if (!entry) return response.notFound()
    if (entry.file) await storage.delete(entry.file)
    await db
      .update(entries)
      .set({ file: null, updated: dayjs().toDate() })
      .where(and(eq(entries.id, query.id), eq(entries.owner_id, owner)))

    return response.noContent()
  })
