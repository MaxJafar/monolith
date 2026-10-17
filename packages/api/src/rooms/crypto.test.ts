import { beforeAll, describe, expect, it } from 'vitest'

import {
  type RoomIdentity,
  type RoomMessageContext,
  type RoomPrivateIdentity,
  createRoomIdentity,
  decryptRoomFile,
  encryptRoomFile,
  openRoomMessage,
  restoreRoomIdentity,
  roomFingerprint,
  sealRoomMessage,
  signRoomValue,
  verifyRoomValue
} from './crypto'

let alice: RoomPrivateIdentity,
  bob: RoomPrivateIdentity,
  outsider: RoomPrivateIdentity

const password = 'Rooms test recovery passphrase 2026'
const publicKey = ({
  owner_id,
  agreement,
  signing
}: RoomIdentity): RoomIdentity => ({ owner_id, agreement, signing })
const context = (): RoomMessageContext => ({
  workspace_id: crypto.randomUUID(),
  room_id: crypto.randomUUID(),
  author_id: alice.owner_id,
  transaction_id: crypto.randomUUID(),
  thread_id: null,
  content_revision: 1,
  references: [],
  attachment_ids: []
})
beforeAll(async () => {
  ;[alice, bob, outsider] = await Promise.all([
    createRoomIdentity(crypto.randomUUID(), password),
    createRoomIdentity(crypto.randomUUID(), password),
    createRoomIdentity(crypto.randomUUID(), password)
  ])
})
describe('Rooms end-to-end encryption', () => {
  it('keeps private keys non-extractable and restores them only with the recovery password', async () => {
    expect(alice.signingKey.extractable).toBe(false)
    expect(alice.agreementKey.extractable).toBe(false)
    await expect(
      crypto.subtle.exportKey('pkcs8', alice.agreementKey)
    ).rejects.toThrow()
    await expect(
      restoreRoomIdentity(alice.backup, 'wrong password')
    ).rejects.toThrow()
    const restored = await restoreRoomIdentity(alice.backup, password)
    expect(await roomFingerprint(restored)).toBe(
      await roomFingerprint(publicKey(alice))
    )
    expect(
      await verifyRoomValue(
        alice,
        'restored',
        await signRoomValue(restored, 'restored')
      )
    ).toBe(true)
  })
  it('decrypts only for listed recipients and does not leak plaintext in its envelope', async () => {
    const sealed = await sealRoomMessage(
      alice,
      context(),
      { body: 'Secret ReDraw discussion 🔒', attachments: [] },
      [publicKey(alice), publicKey(bob)]
    )
    expect(JSON.stringify(sealed)).not.toContain('Secret ReDraw')
    expect((await openRoomMessage(bob, sealed, publicKey(alice))).body).toBe(
      'Secret ReDraw discussion 🔒'
    )
    expect((await openRoomMessage(alice, sealed, publicKey(alice))).body).toBe(
      'Secret ReDraw discussion 🔒'
    )
    await expect(
      openRoomMessage(outsider, sealed, publicKey(alice))
    ).rejects.toThrow('no key')
  })
  it('rejects ciphertext, recipient, sender and context substitution', async () => {
    const sealed = await sealRoomMessage(
      alice,
      context(),
      { body: 'Bound to this room', attachments: [] },
      [publicKey(alice), publicKey(bob)]
    )

    for (const mutate of [
      (e: typeof sealed) => {
        e.context.room_id = crypto.randomUUID()
      },
      (e: typeof sealed) => {
        e.context.references = ['record:forged']
      },
      (e: typeof sealed) => {
        e.context.content_revision++
      },
      (e: typeof sealed) => {
        e.ciphertext = 'AAAA'
      },
      (e: typeof sealed) => {
        e.recipients[0]!.key = 'AAAA'
      }
    ]) {
      const changed = structuredClone(sealed)
      mutate(changed)
      await expect(
        openRoomMessage(bob, changed, publicKey(alice))
      ).rejects.toThrow('signature')
    }
    await expect(
      openRoomMessage(bob, sealed, publicKey(outsider))
    ).rejects.toThrow('signature')
  })
  it('uses fresh message keys and permits a restored device to read history', async () => {
    const c = context(),
      payload = { body: 'same content', attachments: [] }
    const first = await sealRoomMessage(alice, c, payload, [
      publicKey(alice),
      publicKey(bob)
    ])
    const second = await sealRoomMessage(alice, c, payload, [
      publicKey(alice),
      publicKey(bob)
    ])
    expect(first.ephemeral).not.toBe(second.ephemeral)
    expect(first.ciphertext).not.toBe(second.ciphertext)
    const restored = await restoreRoomIdentity(bob.backup, password)
    expect(await openRoomMessage(restored, first, publicKey(alice))).toEqual(
      payload
    )
  })
  it('authenticates attachment bytes and binds them to their attachment identity', async () => {
    const bytes = new TextEncoder().encode('Private file contents').buffer
    const { encrypted, file } = await encryptRoomFile(
      crypto.randomUUID(),
      bytes,
      'private.txt',
      'text/plain'
    )
    expect(
      new TextDecoder().decode(await decryptRoomFile(file, encrypted))
    ).toBe('Private file contents')
    const tampered = new Uint8Array(encrypted)
    tampered[0] = tampered[0]! ^ 1
    await expect(decryptRoomFile(file, tampered)).rejects.toThrow('integrity')
    await expect(
      decryptRoomFile({ ...file, id: crypto.randomUUID() }, encrypted)
    ).rejects.toThrow()
    await expect(
      decryptRoomFile({ ...file, size: file.size + 1 }, encrypted)
    ).rejects.toThrow('integrity')
    const c = context()
    c.attachment_ids = [file.id]
    const sealed = await sealRoomMessage(
      alice,
      c,
      { body: '', attachments: [file] },
      [publicKey(alice), publicKey(bob)]
    )
    expect(JSON.stringify(sealed)).not.toContain(file.name)
    expect(JSON.stringify(sealed)).not.toContain(file.key)
    expect(
      (await openRoomMessage(bob, sealed, publicKey(alice))).attachments[0]
    ).toEqual(file)
  })
  it('signs call descriptions and rejects changed DTLS fingerprints and destinations', async () => {
    const value = {
      purpose: 'monolith/rooms/call/signal/v1',
      call_id: crypto.randomUUID(),
      from: 'alice',
      to: 'bob',
      payload: 'a=fingerprint:sha-256 ORIGINAL'
    }
    const signature = await signRoomValue(alice, value)
    expect(await verifyRoomValue(publicKey(alice), value, signature)).toBe(true)
    expect(
      await verifyRoomValue(
        publicKey(alice),
        { ...value, payload: 'a=fingerprint:sha-256 FORGED' },
        signature
      )
    ).toBe(false)
    expect(
      await verifyRoomValue(
        publicKey(alice),
        { ...value, to: 'outsider' },
        signature
      )
    ).toBe(false)
  })
})
