import dotenv from 'dotenv'
import { createRequire } from 'node:module'

import { pushSchemaFiles } from '../src/commands/db/functions/pushSchema.ts'

dotenv.config({
  path: new URL('../../env/.env.local', import.meta.url),
  quiet: true
})
const requireAPI = createRequire(
  new URL('../../apps/api/package.json', import.meta.url)
)
const postgres = requireAPI('postgres')
const adminURL = process.env.DATABASE_ADMIN_URL
if (!adminURL || !process.env.DATABASE_URL)
  throw new Error('Configure DATABASE_ADMIN_URL and DATABASE_URL first')
const adminTarget = new URL(adminURL),
  appTarget = new URL(process.env.DATABASE_URL)
if (
  adminTarget.hostname !== appTarget.hostname ||
  adminTarget.port !== appTarget.port ||
  adminTarget.pathname !== appTarget.pathname
)
  throw new Error('Admin and application URLs must address the same database')
const admin = postgres(adminURL, {
  max: 1,
  connect_timeout: 8,
  onnotice: () => {}
})
try {
  const [{ users }] =
    await admin`select to_regclass('public.users')::text as users`
  if (!users)
    throw new Error(
      'This database does not contain Monolith users; no search tables were added'
    )
  const schema = new URL(
    '../../apps/api/src/lib/search/schema.drizzle.ts',
    import.meta.url
  )
  const { applied, failures } = await pushSchemaFiles([
    decodeURIComponent(schema.pathname).replace(/^\/([A-Z]:)/, '$1')
  ])
  if (failures.length) throw new Error(failures.join('\n'))
  // Existing clusters may predate the application-role default grants.
  const role = decodeURIComponent(appTarget.username)
  await admin`grant select,insert,update,delete on search__documents,search__chunks to ${admin(role)}`
  console.log(
    `Search schema ready (${applied} scoped additions). Existing content was preserved.`
  )
} catch (error) {
  if (error.code === 'ECONNREFUSED')
    console.error(
      'Monolith database is not running. Start its configured PostgreSQL instance, then rerun the search migration.'
    )
  else console.error(error.message)
  process.exitCode = 1
} finally {
  await admin.end()
}
