import { eq, sql } from 'drizzle-orm'
import { z } from 'zod'

import endpoints from '../endpoints'
import { fontsPinnedFonts as pins } from '../schema.drizzle'

export const list = endpoints
  .query({
    description: 'Read saved font favorites in creation order',
    output: { OK: z.array(z.string()) }
  })
  .callback(async ({ db, response }) => {
    const rows = await db
      .select({ family: pins.family })
      .from(pins)
      .orderBy(pins.created, pins.family)

    return response.ok(rows.map(({ family }) => family))
  })

export const toggle = endpoints
  .mutation({
    description: 'Change whether a hosted font is a favorite',
    input: { body: z.object({ family: z.string().trim().min(1).max(255) }) },
    output: { NO_CONTENT: true }
  })
  .callback(async ({ db, body, response }) => {
    // The endpoint runs in a transaction; serialize toggles even before a row exists.
    await db.execute(
      sql`SELECT pg_advisory_xact_lock(hashtext('monolith:font-pins'), hashtext(${body.family}))`
    )
    const key = eq(pins.family, body.family)
    const [existing] = await db
      .select({ family: pins.family })
      .from(pins)
      .where(key)
      .limit(1)

    if (existing) await db.delete(pins).where(key)
    else
      await db
        .insert(pins)
        .values({ family: body.family })
        .onConflictDoNothing()

    return response.noContent()
  })
