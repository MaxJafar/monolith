import { and, eq, sql } from 'drizzle-orm'
import z from 'zod'

import { ClientError } from '@monolith/server-utils'

import {
  knowledgeCollectionInput,
  knowledgeLibraryDto,
  knowledgeLimits,
  knowledgeSearchDto,
  knowledgeSearchInput,
  knowledgeSourceInput
} from '../knowledgeLibraryShared'
import endpoints from './endpoints'
import {
  addKnowledgeSource,
  knowledgeCollection,
  lockKnowledgeLibrary,
  searchWorkspaceKnowledge,
  snapshotKnowledgeLibrary
} from './knowledgeLibraryStore'
import { ownerId } from './model'
import { knowledgeCollections, knowledgeSources } from './schema.drizzle'
import { workspaceAccess } from './workspaceStore'

const workspaceQuery = z.object({ workspace_id: z.uuid() })
const idQuery = workspaceQuery.extend({ id: z.uuid() })
const identity = z.object({ id: z.uuid() })

export const snapshot = endpoints
  .query({
    description:
      'Workspace-scoped knowledge collections, imported text and live canonical page sources',
    input: { query: workspaceQuery },
    output: { OK: knowledgeLibraryDto }
  })
  .callback(async ({ db, res, query, response }) =>
    response.ok(
      await snapshotKnowledgeLibrary(db, ownerId(res), query.workspace_id)
    )
  )

export const createCollection = endpoints
  .mutation({
    description: 'Create a knowledge collection in an editable workspace',
    input: { query: workspaceQuery, body: knowledgeCollectionInput },
    output: { OK: identity }
  })
  .callback(async ({ db, res, query, body, response }) => {
    const workspace = await workspaceAccess(
      db,
      ownerId(res),
      query.workspace_id,
      true
    )
    await lockKnowledgeLibrary(db, workspace.id)
    const [count] = await db
      .select({ value: sql<number>`count(*)::int` })
      .from(knowledgeCollections)
      .where(eq(knowledgeCollections.workspace_id, workspace.id))

    if (Number(count?.value) >= knowledgeLimits.collections)
      throw new ClientError(
        'This workspace has reached its knowledge collection limit',
        409
      )

    const [collection] = await db
      .insert(knowledgeCollections)
      .values({
        owner_id: workspace.owner_id,
        workspace_id: workspace.id,
        ...body
      })
      .returning({ id: knowledgeCollections.id })

    return response.ok(collection!)
  })

export const updateCollection = endpoints
  .mutation({
    description: 'Rename or describe a workspace knowledge collection',
    input: { query: idQuery, body: knowledgeCollectionInput },
    output: { NO_CONTENT: true }
  })
  .callback(async ({ db, res, query, body, response }) => {
    await workspaceAccess(db, ownerId(res), query.workspace_id, true)
    const result = await db
      .update(knowledgeCollections)
      .set({ ...body, updated: new Date() })
      .where(
        and(
          eq(knowledgeCollections.workspace_id, query.workspace_id),
          eq(knowledgeCollections.id, query.id)
        )
      )
      .returning({ id: knowledgeCollections.id })

    if (!result.length)
      throw new ClientError('Knowledge collection not found', 404)

    return response.noContent()
  })

export const removeCollection = endpoints
  .mutation({
    description:
      'Remove a knowledge collection and its source references; canonical pages are preserved',
    input: { query: idQuery },
    output: { NO_CONTENT: true }
  })
  .callback(async ({ db, res, query, response }) => {
    await workspaceAccess(db, ownerId(res), query.workspace_id, true)
    await lockKnowledgeLibrary(db, query.workspace_id)
    await knowledgeCollection(db, query.workspace_id, query.id)
    await db
      .delete(knowledgeCollections)
      .where(
        and(
          eq(knowledgeCollections.workspace_id, query.workspace_id),
          eq(knowledgeCollections.id, query.id)
        )
      )

    return response.noContent()
  })

export const addSource = endpoints
  .mutation({
    description:
      'Import plain text/Markdown or link a current workspace page or record as a knowledge source',
    input: { query: workspaceQuery, body: knowledgeSourceInput },
    output: { OK: identity }
  })
  .callback(async ({ db, res, query, body, response }) =>
    response.ok(
      await addKnowledgeSource(db, ownerId(res), query.workspace_id, body)
    )
  )

export const removeSource = endpoints
  .mutation({
    description:
      'Remove a source from the knowledge library without deleting its canonical page',
    input: { query: idQuery },
    output: { NO_CONTENT: true }
  })
  .callback(async ({ db, res, query, response }) => {
    await workspaceAccess(db, ownerId(res), query.workspace_id, true)
    const result = await db
      .delete(knowledgeSources)
      .where(
        and(
          eq(knowledgeSources.workspace_id, query.workspace_id),
          eq(knowledgeSources.id, query.id)
        )
      )
      .returning({ id: knowledgeSources.id })

    if (!result.length) throw new ClientError('Knowledge source not found', 404)

    return response.noContent()
  })

export const search = endpoints
  .mutation({
    description:
      'Retrieve ranked lexical evidence with citations; returns source excerpts rather than model-generated claims',
    input: { query: workspaceQuery, body: knowledgeSearchInput },
    output: { OK: knowledgeSearchDto }
  })
  .callback(async ({ db, res, query, body, response }) =>
    response.ok(
      await searchWorkspaceKnowledge(db, ownerId(res), query.workspace_id, body)
    )
  )
