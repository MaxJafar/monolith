import dotenv from 'dotenv'
import jwt from 'jsonwebtoken'
import { randomUUID } from 'node:crypto'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import postgres from 'postgres'

import { createRoomIdentity } from '../../packages/api/src/rooms/crypto'

async function main() {
  dotenv.config({ path: 'env/.env.local', quiet: true })
  const uri = new URL(process.env.DATABASE_ADMIN_URL!)

  if (
    !['localhost', '127.0.0.1'].includes(uri.hostname) ||
    uri.port !== '55432' ||
    uri.pathname !== '/zillion_dev' ||
    process.env.NODE_ENV === 'production'
  )
    throw Error('Media verification requires the isolated loopback database')

  const admin = postgres(uri.toString(), { max: 1 })
  const path = '.temp/rooms-media-fixture.json'

  try {
    if (process.argv.includes('--cleanup')) {
      const fixture = JSON.parse(readFileSync(path, 'utf8'))

      if (fixture.marker !== 'monolith-rooms-synthetic-media')
        throw Error('Not a Rooms media fixture')
      await admin`delete from zillion_databases__workspaces where id=${fixture.scope.workspace_id} and name='Rooms synthetic media verification'`
      for (const person of fixture.people)
        await admin`delete from users where id=${person.id} and email=${person.id + '@rooms-media.invalid'}`
      writeFileSync(
        path,
        JSON.stringify({ marker: fixture.marker, expires: 0 })
      )
      console.log('Synthetic media fixtures removed')
    } else {
      if (existsSync(path) && JSON.parse(readFileSync(path, 'utf8')).people)
        throw Error(
          'Clean up the previous Rooms media fixture before creating another'
        )

      const owner = randomUUID(),
        workspace = randomUUID(),
        room = randomUUID()
      const people = []

      for (const [index, id] of [owner, randomUUID(), randomUUID()].entries()) {
        const password = 'Synthetic Rooms media fixture password'
        const identity = await createRoomIdentity(id, password)
        await admin`insert into users(id,email,username,name) values(${id},${id + '@rooms-media.invalid'},${id},${'Media tester ' + (index + 1)})`
        await admin`insert into rooms__identities(owner_id,agreement,signing) values(${id},${identity.agreement},${identity.signing})`
        people.push({
          id,
          password,
          backup: identity.backup,
          token: jwt.sign({ sub: id }, process.env.JWT_SIGNING_KEY!, {
            algorithm: 'HS512',
            expiresIn: '30m'
          })
        })
      }
      await admin`insert into zillion_databases__workspaces(id,owner_id,name) values(${workspace},${owner},'Rooms synthetic media verification')`
      for (const person of people.slice(1))
        await admin`insert into zillion_databases__workspace_members(owner_id,workspace_id,user_id,role) values(${owner},${workspace},${person.id},'editor')`
      await admin`insert into rooms__rooms(id,owner_id,workspace_id,created_by,name,kind,member_ids) values(${room},${owner},${workspace},${owner},'Media checks','channel','{}'::uuid[])`
      writeFileSync(
        path,
        JSON.stringify({
          marker: 'monolith-rooms-synthetic-media',
          expires: Date.now() + 30 * 60 * 1000,
          scope: { workspace_id: workspace, room_id: room },
          people
        })
      )
      console.log(
        'Created isolated media fixtures (credentials are kept out of logs)'
      )
    }
  } finally {
    await admin.end()
  }
}
void main().catch(error => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exitCode = 1
})
