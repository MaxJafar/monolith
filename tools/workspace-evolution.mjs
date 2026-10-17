// Additive schema upgrade. Existing identities, bodies and addon settings stay intact.
import { config } from 'dotenv'
import { createRequire } from 'node:module'
import { resolve } from 'node:path'

config({ path: 'env/.env.local', quiet: true })
const require = createRequire(resolve('apps/api/package.json'))
const sql = require('postgres')(process.env.DATABASE_ADMIN_URL, { max: 1 })
try {
  await sql.begin(async tx => {
    await tx`alter table zillion_databases__workspaces add column if not exists navigation jsonb not null default '{"revision":0,"groups":[],"items":[]}'`
    await tx`alter table zillion_databases__records add column if not exists status varchar(20) not null default 'planned'`
    await tx`alter table zillion_databases__records add column if not exists priority varchar(20) not null default 'normal'`
    await tx`alter table zillion_databases__records add column if not exists tags jsonb not null default '[]'`
  })
  console.log('Workspace navigation and system properties are ready.')
} finally {
  await sql.end()
}
