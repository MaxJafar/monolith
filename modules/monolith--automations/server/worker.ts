import dotenv from 'dotenv'
import { setTimeout } from 'node:timers/promises'
import { fileURLToPath } from 'node:url'
import postgres from 'postgres'

import { runDueWorkflow } from './scheduler'

dotenv.config({
  path: fileURLToPath(new URL('../../../env/.env.local', import.meta.url)),
  quiet: true
})
const actor = process.env.MONOLITH_AUTOMATIONS_USER_ID
if (!actor || !/^[a-f0-9-]{36}$/i.test(actor))
  throw Error(
    'Set MONOLITH_AUTOMATIONS_USER_ID to the account whose schedules this worker executes'
  )
if (!process.env.DATABASE_URL) throw Error('DATABASE_URL is required')
const db = postgres(process.env.DATABASE_URL, { max: 1, prepare: false })
const controller = new AbortController()
process.once('SIGINT', () => controller.abort())
process.once('SIGTERM', () => controller.abort())
try {
  const [role] =
    await db`select rolsuper, rolbypassrls from pg_roles where rolname=current_user`
  if (!role || role.rolsuper || role.rolbypassrls)
    throw Error(
      'The scheduler requires the restricted application database role'
    )
  console.info('Monolith Automations scheduler started')
  while (!controller.signal.aborted) {
    await runDueWorkflow(db, actor, controller.signal)
      .then(status => {
        if (status) console.info(`Scheduled execution ${status}`)
      })
      .catch(error => {
        console.error(
          error instanceof Error ? error.message : 'Schedule failed'
        )
      })
    await setTimeout(5000, undefined, { signal: controller.signal }).catch(
      () => {}
    )
  }
} finally {
  await db.end()
}
