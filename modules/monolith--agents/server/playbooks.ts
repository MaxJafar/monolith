import { and, eq, inArray } from 'drizzle-orm'
import z from 'zod'

import endpoints from './endpoints'
import { playbookBindings, playbooks } from './schema.drizzle'
import { type Store, actor, audit, fail } from './store'

export const playbookInput = z
  .object({
    name: z.string().trim().min(1).max(120),
    description: z.string().trim().max(1000),
    instructions: z.string().trim().min(1).max(6000),
    checks: z
      .array(z.string().trim().min(1).max(240))
      .max(10)
      .refine(
        checks => new Set(checks).size === checks.length,
        'Use unique checks'
      ),
    require_review: z.boolean(),
    archived: z.boolean().default(false)
  })
  .strict()

export const playbookOutput = playbookInput.extend({
  id: z.uuid(),
  revision: z.number().int()
})

export const qualityOutput = z
  .object({
    check_id: z.string().max(80),
    passed: z.boolean(),
    evidence: z.string().trim().min(1).max(4000)
  })
  .strict()

export const playbookIds = z
  .array(z.uuid())
  .max(8)
  .refine(ids => new Set(ids).size === ids.length, 'Use unique playbooks')

export async function replacePlaybooks(
  db: Store,
  owner: string,
  principalId: string,
  ids: string[]
) {
  const available = ids.length
    ? await db
        .select()
        .from(playbooks)
        .where(and(eq(playbooks.owner_id, owner), inArray(playbooks.id, ids)))
    : []

  if (available.length !== ids.length)
    fail('Playbook not found in this account', 404)

  const existing = await db
    .select()
    .from(playbookBindings)
    .where(
      and(
        eq(playbookBindings.owner_id, owner),
        eq(playbookBindings.principal_id, principalId)
      )
    )

  if (
    available.some(
      book =>
        book.archived &&
        !existing.some(binding => binding.playbook_id === book.id)
    )
  )
    fail('Archived playbooks cannot be assigned to new agents', 400)
  await db
    .delete(playbookBindings)
    .where(
      and(
        eq(playbookBindings.owner_id, owner),
        eq(playbookBindings.principal_id, principalId)
      )
    )
  if (ids.length)
    await db.insert(playbookBindings).values(
      ids.map((id, position) => ({
        owner_id: owner,
        principal_id: principalId,
        playbook_id: id,
        position
      }))
    )
}

export const playbook = {
  create: endpoints
    .mutation({
      description:
        'Create a reusable agent playbook with completion evidence requirements',
      input: { body: playbookInput },
      output: { CREATED: z.object({ id: z.uuid() }) }
    })
    .callback(async ({ db, res, body, response }) => {
      const who = await actor(db, res.locals)
      const [created] = await db
        .insert(playbooks)
        .values({ ...body, owner_id: who.owner })
        .returning()

      if (!created) fail('Playbook could not be created', 500)
      await audit(db, who, 'playbook.created', created.name)

      return response.created({ id: created.id })
    }),
  update: endpoints
    .mutation({
      description: 'Revise an owned playbook without changing dispatched runs',
      input: {
        query: z.object({ id: z.uuid() }),
        body: playbookInput.extend({
          expected_revision: z.number().int().positive()
        })
      },
      output: { NO_CONTENT: true }
    })
    .callback(async ({ db, res, query, body, response }) => {
      const who = await actor(db, res.locals)
      const [existing] = await db
        .select()
        .from(playbooks)
        .where(
          and(eq(playbooks.id, query.id), eq(playbooks.owner_id, who.owner))
        )

      if (!existing) fail('Playbook not found', 404)
      if (existing.revision !== body.expected_revision)
        fail('Playbook changed. Reload before saving.')

      const { expected_revision: _revision, ...updates } = body
      await db
        .update(playbooks)
        .set({ ...updates, revision: existing.revision + 1 })
        .where(eq(playbooks.id, existing.id))
      await audit(db, who, 'playbook.updated', existing.name)

      return response.noContent()
    })
}
