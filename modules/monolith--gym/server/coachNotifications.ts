import { and, desc, eq, gte, inArray } from 'drizzle-orm'

import { principals, runs } from '../../monolith--agents/server/schema.drizzle'
import { coachConfigs, coachJobs } from './coachSchema'
import { parseProposal, planHash } from './coaching'
import { type GymStore, getSnapshot } from './store'

/** Called only inside the dispatcher's owner-scoped RLS transaction. */
export async function readyCoachNotifications(
  db: GymStore,
  owner: string,
  since: Date
): Promise<{ id: string; changes: number }[]> {
  const [config] = await db
    .select()
    .from(coachConfigs)
    .where(eq(coachConfigs.owner_id, owner))
    .limit(1)

  if (!config?.config.enabled || !config.config.consent || !config.agent_id)
    return []

  const jobs = await db
    .select({ job: coachJobs, run: runs })
    .from(coachJobs)
    .innerJoin(
      runs,
      and(eq(runs.id, coachJobs.run_id), eq(runs.owner_id, owner))
    )
    .innerJoin(
      principals,
      and(eq(principals.id, runs.principal_id), eq(principals.owner_id, owner))
    )
    .where(
      and(
        eq(coachJobs.owner_id, owner),
        eq(runs.principal_id, config.agent_id),
        eq(principals.status, 'active'),
        inArray(runs.status, ['review', 'approved']),
        gte(runs.settled_at, since)
      )
    )
    .orderBy(desc(runs.settled_at))
    .limit(20)

  if (!jobs.length) return []

  const hash = planHash(await getSnapshot(db, owner))

  return jobs.flatMap(({ job, run }) => {
    if (job.applied_ids.length || job.plan_hash !== hash) return []

    try {
      return [{ id: job.id, changes: parseProposal(run.result).changes.length }]
    } catch {
      return []
    }
  })
}
