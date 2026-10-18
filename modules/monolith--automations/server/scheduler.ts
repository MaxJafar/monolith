import { randomUUID } from 'node:crypto'
import type postgres from 'postgres'

import { graphSchema } from '../shared'
import { executeGraph } from './engine'
import { requestHTTP } from './http'

export async function runDueWorkflow(
  db: postgres.Sql,
  actor: string,
  signal: AbortSignal
) {
  return db.begin(async tx => {
    await tx`select set_config('zillion.user_id',${actor},true)`
    const [flow] =
      await tx`select f.* from automations__workflows f join zillion_databases__workspaces w on w.id=f.workspace_id where f.owner_id=${actor} and f.enabled=true and f.interval_minutes>0 and f.next_run<=now() and w.enabled_modules @> '["automations"]'::jsonb order by f.next_run limit 1 for update of f skip locked`
    if (!flow) return null
    const [lock] =
      await tx`select pg_try_advisory_xact_lock(hashtextextended(${flow.id},0)) as locked`
    if (!lock?.locked) return null
    await tx`update automations__workflows set next_run=now()+interval_minutes*interval '1 minute' where id=${flow.id}`
    const result = await executeGraph(
      graphSchema.parse(flow.graph),
      {},
      requestHTTP,
      AbortSignal.any([signal, AbortSignal.timeout(30000)])
    )
    await tx`insert into automations__runs(id,owner_id,workspace_id,workflow_id,revision,trigger,result) values(${randomUUID()},${actor},${flow.workspace_id},${flow.id},${flow.revision},'schedule',${JSON.stringify(result)}::jsonb)`
    return result.status
  })
}
