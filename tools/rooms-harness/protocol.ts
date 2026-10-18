import dotenv from 'dotenv'
import { readFileSync } from 'node:fs'
import postgres from 'postgres'

import {
  type Socket,
  io
} from '../../apps/web/node_modules/socket.io-client/build/esm/index.js'
import {
  restoreRoomIdentity,
  signRoomValue
} from '../../packages/api/src/rooms/crypto'

// Real socket protocol checks against the same disposable fixture as the media
// harness. This process never captures media or changes a real user's account.
dotenv.config({ path: 'env/.env.local', quiet: true })
const uri = new URL(process.env.DATABASE_ADMIN_URL!)

if (
  !['localhost', '127.0.0.1'].includes(uri.hostname) ||
  uri.port !== '55432' ||
  uri.pathname !== '/zillion_dev' ||
  process.env.NODE_ENV === 'production'
)
  throw Error('Protocol checks require the isolated loopback database')

const fixture = JSON.parse(
  readFileSync('.temp/rooms-media-fixture.json', 'utf8')
)

if (
  fixture.marker !== 'monolith-rooms-synthetic-media' ||
  fixture.expires < Date.now()
)
  throw Error('Create a current synthetic media fixture first')

const admin = postgres(uri.toString(), { max: 1 })
const sockets: Socket[] = []
const assert = (condition: unknown, message: string) => {
  if (!condition) throw Error(message)
  console.log('PASS ' + message)
}

type Reply = {
  call_id?: string
  error?: string
  peers?: unknown[]
  signature?: string
  ok?: boolean
}

const event = (socket: Socket, name: string, timeout = 8000): Promise<Reply> =>
  new Promise((resolve, reject) => {
    const done = (data: Reply) => {
      clearTimeout(timer)
      resolve(data)
    }
    const timer = setTimeout(() => {
      socket.off(name, done)
      reject(Error('Timeout: ' + name))
    }, timeout)
    socket.once(name, done)
  })
const request = (socket: Socket, name: string, data: unknown): Promise<Reply> =>
  new Promise((resolve, reject) =>
    socket
      .timeout(8000)
      .emit(name, data, (error: Error | null, result: Reply) =>
        error ? reject(error) : resolve(result)
      )
  )

async function main() {
  try {
    const [workspace] =
      await admin`select id from zillion_databases__workspaces where id=${fixture.scope.workspace_id} and name='Rooms synthetic media verification'`

    if (!workspace) throw Error('Disposable fixture ownership guard failed')

    const identities = await Promise.all(
      fixture.people.map(
        (p: {
          backup: Parameters<typeof restoreRoomIdentity>[0]
          password: string
        }) => restoreRoomIdentity(p.backup, p.password)
      )
    )
    const connect = async (index: number) => {
      const socket = io('http://localhost:3636', {
        transports: ['websocket'],
        auth: { token: fixture.people[index].token },
        extraHeaders: { Origin: 'http://localhost:5173' },
        autoConnect: false
      })
      sockets.push(socket)
      const connected = event(socket, 'connect')
      socket.connect()
      await connected

      return socket
    }
    const join = async (socket: Socket, index: number) => {
      const data = {
        ...fixture.scope,
        video: false,
        timestamp: Date.now(),
        nonce: crypto.randomUUID()
      }
      const proof = await signRoomValue(identities[index], {
        purpose: 'monolith/rooms/call/join/v1',
        socket_id: socket.id,
        ...data
      })

      return {
        ...(await request(socket, 'rooms:call:join', { ...data, proof })),
        nonce: data.nonce
      }
    }
    const a = await connect(0),
      b = await connect(1),
      c = await connect(2)
    const notification = event(c, 'rooms:notification')
    const first = await join(a, 0)
    assert(
      first.call_id && !first.error,
      'authorized participant starts a core call'
    )
    const alert = await notification
    assert(
      alert.call_id === first.call_id &&
        Object.keys(alert).sort().join(',') === 'call_id,room_id,workspace_id',
      'direct call notification contains only platform identifiers'
    )
    const second = await join(b, 1)
    assert(
      second.call_id === first.call_id && second.peers?.length === 1,
      'authorized participant joins the same call'
    )
    const data = {
      call_id: first.call_id,
      to: b.id,
      nonce: crypto.randomUUID(),
      timestamp: Date.now(),
      payload: JSON.stringify({
        candidate: { candidate: 'synthetic signed candidate' }
      })
    }
    const signed = {
      purpose: 'monolith/rooms/call/signal/v1',
      ...fixture.scope,
      from: a.id,
      actor_id: identities[0]!.owner_id,
      ...data
    }
    const signature = await signRoomValue(identities[0], signed)
    const forged = await request(a, 'rooms:call:signal', {
      ...data,
      payload: '{}',
      signature
    })
    assert(
      forged.error === 'Invalid signal signature',
      'tampered call signaling is rejected'
    )
    const delivered = event(b, 'rooms:call:signal')
    assert(
      (await request(a, 'rooms:call:signal', { ...data, signature })).ok,
      'signed signaling is accepted'
    )
    assert(
      (await delivered).signature === signature,
      'recipient receives the original signed envelope'
    )
    assert(
      (await request(a, 'rooms:call:signal', { ...data, signature })).error,
      'replayed signaling is rejected'
    )
    await new Promise(resolve => setTimeout(resolve, 1100))

    const rejoined = await join(a, 0)
    assert(
      rejoined.call_id === first.call_id,
      'retrying a join preserves the call and updates its leave token'
    )
    a.emit('rooms:call:leave', { nonce: first.nonce })
    const next = { ...data, nonce: crypto.randomUUID() }
    const nextSignature = await signRoomValue(identities[0], {
      ...signed,
      ...next
    })
    assert(
      (
        await request(a, 'rooms:call:signal', {
          ...next,
          signature: nextSignature
        })
      ).ok,
      'stale leave cannot terminate a newer call'
    )
    const duplicate = await connect(0)
    assert(
      (await join(duplicate, 0)).error?.includes('another device'),
      'duplicate account device cannot join the same call'
    )
    await admin`update zillion_databases__workspace_members set role='viewer' where workspace_id=${fixture.scope.workspace_id} and user_id=${fixture.people[2].id}`
    assert((await join(c, 2)).error, 'view-only membership cannot join a call')
    await admin`delete from zillion_databases__workspace_members where workspace_id=${fixture.scope.workspace_id} and user_id=${fixture.people[2].id}`
    const outside = await connect(2)
    assert((await join(outside, 2)).error, 'non-members cannot join a call')
    const revoked = event(b, 'rooms:call:ended')
    await admin`delete from zillion_databases__workspace_members where workspace_id=${fixture.scope.workspace_id} and user_id=${fixture.people[1].id}`
    assert(
      (await revoked).call_id === first.call_id,
      'membership revocation ends the active call'
    )
    console.log('ALL PROTOCOL CHECKS PASSED')
  } finally {
    sockets.forEach(socket => socket.disconnect())
    for (const person of fixture.people.slice(1))
      await admin`insert into zillion_databases__workspace_members(owner_id,workspace_id,user_id,role) values(${fixture.people[0].id},${fixture.scope.workspace_id},${person.id},'editor') on conflict(workspace_id,user_id) do update set role='editor'`
    await admin.end()
  }
}
void main().catch(error => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exitCode = 1
})
