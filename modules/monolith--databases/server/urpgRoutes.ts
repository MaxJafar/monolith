import { ClientError } from '@monolith/server-utils'
import { eq, sql } from 'drizzle-orm'
import { randomUUID } from 'node:crypto'
import z from 'zod'

import {
  applyCommand,
  campaignSchema,
  characterSchema,
  commandSchema,
  newCampaign
} from '../urpgShared'
import endpoints from './endpoints'
import { ownerId } from './model'
import { rpgCampaigns, workspaces } from './schema.drizzle'
import { withWorkspaceOwner, workspaceAccess } from './workspaceStore'

const scope = z.object({ workspace_id: z.string().uuid() })
export const setup = endpoints
  .mutation({
    description: 'Create a dedicated uRPG workspace and character atomically',
    input: {
      body: z.object({
        setup_id: z.string().uuid(),
        name: z.string().trim().min(1).max(160),
        character: characterSchema
      })
    },
    output: { OK: z.object({ workspace_id: z.string().uuid() }) }
  })
  .callback(async ({ db, res, body, response }) => {
    const owner = ownerId(res)
    await db.execute(
      sql`select pg_advisory_xact_lock(hashtextextended(${owner + ':urpg-setup'},0))`
    )
    const [existing] = await db
      .select()
      .from(rpgCampaigns)
      .where(eq(rpgCampaigns.setup_id, body.setup_id))
    if (existing) {
      if (existing.owner_id !== owner)
        throw new ClientError('Setup unavailable', 409)
      return response.ok({ workspace_id: existing.workspace_id })
    }
    const [workspace] = await db
      .insert(workspaces)
      .values({
        owner_id: owner,
        name: body.name,
        icon: 'lucide:swords',
        profile: 'personal',
        enabled_modules: ['urpg'],
        description: 'uRPG · Your life, in progress',
        native_imported: true
      })
      .returning()
    if (!workspace) throw Error('Workspace could not be created')
    await db.insert(rpgCampaigns).values({
      workspace_id: workspace.id,
      owner_id: owner,
      setup_id: body.setup_id,
      state: newCampaign(body.character, randomUUID)
    })
    return response.ok({ workspace_id: workspace.id })
  })

export const snapshot = endpoints
  .query({
    description: 'Read the character and campaign in a uRPG workspace',
    input: { query: scope },
    output: { OK: campaignSchema.nullable() }
  })
  .callback(async ({ db, res, query, response }) => {
    const actor = ownerId(res),
      workspace = await workspaceAccess(db, actor, query.workspace_id)
    return withWorkspaceOwner(db, actor, workspace.owner_id, async () => {
      const [campaign] = await db
        .select()
        .from(rpgCampaigns)
        .where(eq(rpgCampaigns.workspace_id, workspace.id))
      return response.ok(campaign?.state ?? null)
    })
  })

export const command = endpoints
  .mutation({
    description:
      'Apply a revision-protected uRPG command with server-calculated XP',
    input: {
      query: scope,
      body: z.object({
        expected_revision: z.number().int().nonnegative(),
        command: commandSchema
      })
    },
    output: { OK: campaignSchema }
  })
  .callback(async ({ db, res, query, body, response }) => {
    const actor = ownerId(res),
      workspace = await workspaceAccess(db, actor, query.workspace_id, true)
    if (!workspace.enabled_modules.includes('urpg'))
      throw new ClientError('Enable uRPG in this workspace first', 409)
    await db.execute(
      sql`select pg_advisory_xact_lock(hashtextextended(${workspace.id + ':urpg'},0))`
    )
    return withWorkspaceOwner(db, actor, workspace.owner_id, async () => {
      const [campaign] = await db
        .select()
        .from(rpgCampaigns)
        .where(eq(rpgCampaigns.workspace_id, workspace.id))
      if (!campaign) throw new ClientError('Create a character first', 404)
      if (campaign.state.revision !== body.expected_revision)
        throw new ClientError(
          'Your campaign changed in another window. Refresh and try again.',
          409
        )
      let state
      try {
        state = applyCommand(
          campaign.state,
          body.command,
          new Date(),
          randomUUID
        )
      } catch (error) {
        throw new ClientError(
          error instanceof Error ? error.message : 'Invalid command',
          400
        )
      }
      await db
        .update(rpgCampaigns)
        .set({ state, updated: new Date() })
        .where(eq(rpgCampaigns.workspace_id, workspace.id))
      return response.ok(state)
    })
  })
