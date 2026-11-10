import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

import {
  createRoomIdentity,
  openRoomMessage,
  restoreRoomIdentity,
  sealRoomMessage
} from '../packages/api/src/rooms/crypto.ts'

const directory = resolve('apps/android/app/src/test/resources')
const path = resolve(directory, 'rooms-webcrypto.json')
const password = 'monolith-test-recovery-only'

if (process.argv.includes('--verify-native')) {
  const fixture = JSON.parse(readFileSync(path, 'utf8'))
  const receiver = await restoreRoomIdentity(fixture.receiverBackup, password)
  const envelope = JSON.parse(
    readFileSync('apps/android/app/build/native-room-envelope.json', 'utf8')
  )
  const plain = await openRoomMessage(
    receiver,
    envelope,
    fixture.senderIdentity
  )

  if (plain.body !== fixture.body)
    throw Error(
      'Native envelope did not round-trip through the shared web implementation'
    )
  console.log(
    'Kotlin Rooms envelope verified and decrypted by the existing Web Crypto implementation'
  )
} else {
  const sender = await createRoomIdentity(
    '11111111-1111-4111-8111-111111111111',
    password
  )
  const receiver = await createRoomIdentity(
    '22222222-2222-4222-8222-222222222222',
    password
  )
  const context = {
    workspace_id: '33333333-3333-4333-8333-333333333333',
    room_id: '44444444-4444-4444-8444-444444444444',
    author_id: sender.owner_id,
    transaction_id: '55555555-5555-4555-8555-555555555555',
    thread_id: null,
    content_revision: 1,
    references: [],
    attachment_ids: []
  }
  const publicIdentity = ({ owner_id, agreement, signing }) => ({
    owner_id,
    agreement,
    signing
  })
  const body = 'Hello from Monolith — 你好 👋'
  const envelope = await sealRoomMessage(
    sender,
    context,
    { body, attachments: [] },
    [publicIdentity(sender), publicIdentity(receiver)]
  )
  mkdirSync(directory, { recursive: true })
  writeFileSync(
    path,
    JSON.stringify(
      {
        password,
        body,
        context,
        senderIdentity: publicIdentity(sender),
        receiverIdentity: publicIdentity(receiver),
        senderBackup: sender.backup,
        receiverBackup: receiver.backup,
        envelope
      },
      null,
      2
    ) + '\n'
  )
  console.log('Generated synthetic cross-client Rooms fixtures')
}
