// Creates only a synthetic, isolated acceptance workspace. No existing content is migrated.
import bcrypt from 'bcryptjs'
import { config } from 'dotenv'
import { randomBytes, randomUUID } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { resolve } from 'node:path'

config({ path: 'env/.env.local', quiet: true })
const require = createRequire(resolve('apps/api/package.json'))
const postgres = require('postgres')
const path = resolve('.temp/desktop-fixture.json')
if (existsSync(path)) {
  console.log('Acceptance fixture already exists.')
  process.exit(0)
}
const database = new URL(process.env.DATABASE_ADMIN_URL)
if (!['localhost', '127.0.0.1'].includes(database.hostname))
  throw Error('Fixture creation requires an isolated local PostgreSQL server')
const sql = postgres(database.href, { max: 1 })
const id = () => randomUUID()
const fixture = {
  owner: id(),
  workspace: id(),
  page: id(),
  base: id(),
  record: id(),
  views: [id(), id(), id()],
  email: `native-${id()}@example.invalid`,
  password: randomBytes(24).toString('base64url'),
  origin: process.env.PUBLIC_URL || 'https://rtx5060-32gb.tail8320dd.ts.net'
}
try {
  await sql.begin(async tx => {
    await tx`insert into users(id,email,username,name,verified,auth_password_hash) values(${fixture.owner},${fixture.email},${'native-' + fixture.owner},'Desktop acceptance',true,${await bcrypt.hash(fixture.password, 12)})`
    await tx`insert into zillion_databases__workspaces(id,owner_id,name,is_default,native_imported,enabled_modules) values(${fixture.workspace},${fixture.owner},'Desktop acceptance',true,true,${tx.json(['databases', 'projects', 'notes'])})`
    await tx`insert into zillion_databases__bases(id,owner_id,workspace_id,name) values(${fixture.base},${fixture.owner},${fixture.workspace},'Release checks')`
    await tx`insert into zillion_databases__records(id,owner_id,base_id,title) values(${fixture.record},${fixture.owner},${fixture.base},'Inline database record')`
    for (const [index, mode] of ['table', 'kanban', 'calendar'].entries())
      await tx`insert into zillion_databases__views(id,owner_id,base_id,name,mode,config) values(${fixture.views[index]},${fixture.owner},${fixture.base},${mode},${mode},${tx.json({})})`
    const defaults = {
      title: '',
      url: '',
      widget: '',
      content: '',
      width: 'full'
    }
    const body = {
      version: 1,
      title: 'Desktop acceptance document',
      icon: 'lucide:file-text',
      fullWidth: true,
      revision: 1,
      updated: new Date().toISOString(),
      blocks: [
        {
          ...defaults,
          id: id(),
          type: 'document',
          content: 'Native persistence baseline'
        },
        ...fixture.views.map(viewId => ({
          ...defaults,
          id: id(),
          type: 'database',
          database: {
            workspaceId: fixture.workspace,
            baseId: fixture.base,
            viewId
          }
        }))
      ]
    }
    await tx`insert into zillion_databases__workspace_pages(id,owner_id,workspace_id,route_key,title,body) values(${fixture.page},${fixture.owner},${fixture.workspace},${'/page/' + fixture.page},${body.title},${tx.json(body)})`
  })
  mkdirSync(resolve('.temp'), { recursive: true })
  writeFileSync(path, JSON.stringify(fixture, null, 2))
  console.log(
    'Created isolated desktop acceptance account and workspace. Credentials retained in ignored .temp only.'
  )
} finally {
  await sql.end()
}
