// Configure real table/board/calendar acceptance views without touching user data.
import { config } from 'dotenv'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { resolve } from 'node:path'

config({ path: 'env/.env.local', quiet: true })
const fixture = JSON.parse(readFileSync('.temp/desktop-fixture.json', 'utf8'))
const require = createRequire(resolve('apps/api/package.json'))
const sql = require('postgres')(process.env.DATABASE_ADMIN_URL, { max: 1 })
try {
  await sql.begin(async tx => {
    const [user] = await tx`select email from users where id=${fixture.owner}`
    if (
      user?.email !== fixture.email ||
      !fixture.email.endsWith('@example.invalid')
    )
      throw Error('Not an acceptance account')
    const [existing] =
      await tx`select id from zillion_databases__fields where base_id=${fixture.base} and owner_id=${fixture.owner} and name='Status'`
    const [field] = existing
      ? [existing]
      : await tx`insert into zillion_databases__fields(owner_id,base_id,name,kind,config) values(${fixture.owner},${fixture.base},'Status','select',${tx.json({ options: ['Ready', 'In progress', 'Done'] })}) returning id`
    await tx`update zillion_databases__records set date=now(), values=values || ${tx.json({ [field.id]: 'Ready' })} where id=${fixture.record} and owner_id=${fixture.owner}`
    await tx`update zillion_databases__views set group_field_id=${field.id} where id=${fixture.views[1]} and owner_id=${fixture.owner}`
    await tx`update zillion_databases__views set config=config || ${tx.json({ date_field_id: 'date' })} where id=${fixture.views[2]} and owner_id=${fixture.owner}`
  })
  console.log('Acceptance database views configured.')
} finally {
  await sql.end()
}
