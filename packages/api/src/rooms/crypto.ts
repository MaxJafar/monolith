/** Rooms v1 uses Web Crypto primitives only. The server never receives private
 * identity keys, message keys, attachment keys, or recovery passwords. */
export type RoomIdentity = {
  owner_id: string
  agreement: string
  signing: string
}

export type RoomPrivateIdentity = RoomIdentity & {
  agreementKey: CryptoKey
  signingKey: CryptoKey
  backup: RoomKeyBackup
}

export type RoomKeyBackup = {
  version: 1
  identity: RoomIdentity
  salt: string
  iv: string
  ciphertext: string
}

export type RoomMessageContext = {
  workspace_id: string
  room_id: string
  author_id: string
  transaction_id: string
  thread_id: string | null
  content_revision: number
  references: string[]
  attachment_ids: string[]
}

export type RoomEnvelope = {
  version: 1
  context: RoomMessageContext
  sender: string
  ephemeral: string
  iv: string
  ciphertext: string
  recipients: {
    user_id: string
    fingerprint: string
    iv: string
    key: string
  }[]
  signature: string
}

export type RoomAttachment = {
  id: string
  name: string
  type: string
  size: number
  key: string
  iv: string
  hash: string
}

export type RoomPlaintext = { body: string; attachments: RoomAttachment[] }

const utf8 = new TextEncoder()
const text = new TextDecoder('utf-8', { fatal: true })
const subtle = () => globalThis.crypto.subtle
const random = (size: number) => crypto.getRandomValues(new Uint8Array(size))

export function roomsBase64(data: ArrayBuffer | Uint8Array) {
  const bytes = new Uint8Array(data)

  let binary = ''
  for (let i = 0; i < bytes.length; i += 8192)
    binary += String.fromCharCode(...bytes.subarray(i, i + 8192))

  return btoa(binary)
    .replaceAll('+', '-')
    .replaceAll('/', '_')
    .replace(/=+$/, '')
}

export function roomsBytes(value: string): Uint8Array<ArrayBuffer> {
  if (!/^[A-Za-z0-9_-]*$/.test(value)) throw Error('Invalid encrypted encoding')

  const result = Uint8Array.from(
    atob(value.replaceAll('-', '+').replaceAll('_', '/')),
    c => c.charCodeAt(0)
  )

  if (roomsBase64(result) !== value)
    throw Error('Noncanonical encrypted encoding')

  return result
}

export function roomsCanonical(value: unknown): string {
  if (Array.isArray(value))
    return '[' + value.map(roomsCanonical).join(',') + ']'
  if (value && typeof value === 'object')
    return (
      '{' +
      Object.entries(value)
        .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
        .map(([k, v]) => JSON.stringify(k) + ':' + roomsCanonical(v))
        .join(',') +
      '}'
    )

  return JSON.stringify(value)
}

const encoded = (value: unknown) => utf8.encode(roomsCanonical(value))

export async function roomFingerprint(identity: RoomIdentity) {
  const { owner_id, agreement, signing } = identity

  return roomsBase64(
    await subtle().digest('SHA-256', encoded({ owner_id, agreement, signing }))
  )
}

export async function signRoomValue(
  identity: RoomPrivateIdentity,
  value: unknown
) {
  return roomsBase64(
    await subtle().sign(
      { name: 'ECDSA', hash: 'SHA-256' },
      identity.signingKey,
      encoded(value)
    )
  )
}

export async function verifyRoomValue(
  identity: RoomIdentity,
  value: unknown,
  signature: string
) {
  try {
    const key = await subtle().importKey(
      'spki',
      roomsBytes(identity.signing),
      { name: 'ECDSA', namedCurve: 'P-256' },
      false,
      ['verify']
    )

    return await subtle().verify(
      { name: 'ECDSA', hash: 'SHA-256' },
      key,
      roomsBytes(signature),
      encoded(value)
    )
  } catch {
    return false
  }
}

async function passwordKey(password: string, salt: Uint8Array<ArrayBuffer>) {
  const key = await subtle().importKey(
    'raw',
    utf8.encode(password),
    'PBKDF2',
    false,
    ['deriveKey']
  )

  return subtle().deriveKey(
    { name: 'PBKDF2', hash: 'SHA-256', salt, iterations: 600000 },
    key,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  )
}

export async function createRoomIdentity(
  owner_id: string,
  password: string
): Promise<RoomPrivateIdentity> {
  if (password.length < 12)
    throw Error('Use at least 12 characters for the recovery password')

  const agreement = await subtle().generateKey(
    { name: 'ECDH', namedCurve: 'P-256' },
    true,
    ['deriveBits']
  )
  const signing = await subtle().generateKey(
    { name: 'ECDSA', namedCurve: 'P-256' },
    true,
    ['sign', 'verify']
  )
  const identity: RoomIdentity = {
    owner_id,
    agreement: roomsBase64(
      await subtle().exportKey('spki', agreement.publicKey)
    ),
    signing: roomsBase64(await subtle().exportKey('spki', signing.publicKey))
  }
  const secret = encoded({
    agreement: roomsBase64(
      await subtle().exportKey('pkcs8', agreement.privateKey)
    ),
    signing: roomsBase64(await subtle().exportKey('pkcs8', signing.privateKey))
  })
  const salt = random(32),
    iv = random(12)
  const backup: RoomKeyBackup = {
    version: 1,
    identity,
    salt: roomsBase64(salt),
    iv: roomsBase64(iv),
    ciphertext: roomsBase64(
      await subtle().encrypt(
        { name: 'AES-GCM', iv, additionalData: encoded(identity) },
        await passwordKey(password, salt),
        secret
      )
    )
  }
  secret.fill(0)

  return restoreRoomIdentity(backup, password)
}

export async function restoreRoomIdentity(
  backup: RoomKeyBackup,
  password: string
): Promise<RoomPrivateIdentity> {
  if (
    // Runtime recovery files can have a different schema than their TS type.
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    backup.version !== 1 ||
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    !backup.identity ||
    backup.ciphertext.length > 8192 ||
    roomsBytes(backup.salt).length !== 32 ||
    roomsBytes(backup.iv).length !== 12
  )
    throw Error('Invalid Rooms recovery file')

  const raw = new Uint8Array(
    await subtle().decrypt(
      {
        name: 'AES-GCM',
        iv: roomsBytes(backup.iv),
        additionalData: encoded(backup.identity)
      },
      await passwordKey(password, roomsBytes(backup.salt)),
      roomsBytes(backup.ciphertext)
    )
  )
  const secret = JSON.parse(text.decode(raw)) as {
    agreement: string
    signing: string
  }
  raw.fill(0)
  const agreementKey = await subtle().importKey(
    'pkcs8',
    roomsBytes(secret.agreement),
    { name: 'ECDH', namedCurve: 'P-256' },
    false,
    ['deriveBits']
  )
  const signingKey = await subtle().importKey(
    'pkcs8',
    roomsBytes(secret.signing),
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['sign']
  )
  const identity = { ...backup.identity, agreementKey, signingKey, backup }

  if (
    !(await verifyRoomValue(
      identity,
      'rooms-recovery-check',
      await signRoomValue(identity, 'rooms-recovery-check')
    ))
  )
    throw Error('Recovery identity does not match its signing key')

  // Verify the ECDH key pair too, before trusting an imported backup.
  const test = await subtle().generateKey(
    { name: 'ECDH', namedCurve: 'P-256' },
    false,
    ['deriveBits']
  )
  const publicKey = await subtle().importKey(
    'spki',
    roomsBytes(identity.agreement),
    { name: 'ECDH', namedCurve: 'P-256' },
    false,
    []
  )
  const a = await subtle().deriveBits(
    { name: 'ECDH', public: test.publicKey },
    agreementKey,
    256
  )
  const b = await subtle().deriveBits(
    { name: 'ECDH', public: publicKey },
    test.privateKey,
    256
  )

  if (roomsBase64(a) !== roomsBase64(b))
    throw Error('Recovery identity does not match its agreement key')

  return identity
}

async function wrappingKey(
  privateKey: CryptoKey,
  publicKey: CryptoKey,
  header: unknown,
  recipient: string
) {
  const bits = await subtle().deriveBits(
    { name: 'ECDH', public: publicKey },
    privateKey,
    256
  )
  const key = await subtle().importKey('raw', bits, 'HKDF', false, [
    'deriveKey'
  ])

  return subtle().deriveKey(
    {
      name: 'HKDF',
      hash: 'SHA-256',
      salt: await subtle().digest('SHA-256', encoded(header)),
      info: utf8.encode('monolith/rooms/key/v1/' + recipient)
    },
    key,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  )
}

export async function sealRoomMessage(
  identity: RoomPrivateIdentity,
  context: RoomMessageContext,
  payload: RoomPlaintext,
  people: RoomIdentity[]
): Promise<RoomEnvelope> {
  if (
    context.author_id !== identity.owner_id ||
    !people.some(p => p.owner_id === identity.owner_id) ||
    new Set(people.map(p => p.owner_id)).size !== people.length
  )
    throw Error('Invalid encryption recipients')

  const sender = await roomFingerprint({
    owner_id: identity.owner_id,
    agreement: identity.agreement,
    signing: identity.signing
  })
  const header = { version: 1 as const, context, sender }
  const ephemeral = await subtle().generateKey(
    { name: 'ECDH', namedCurve: 'P-256' },
    false,
    ['deriveBits']
  )
  const key = random(32),
    iv = random(12)
  const contentKey = await subtle().importKey('raw', key, 'AES-GCM', false, [
    'encrypt'
  ])
  const recipients = await Promise.all(
    [...people]
      .sort((a, b) => a.owner_id.localeCompare(b.owner_id))
      .map(async person => {
        const fingerprint = await roomFingerprint(person)
        const publicKey = await subtle().importKey(
          'spki',
          roomsBytes(person.agreement),
          { name: 'ECDH', namedCurve: 'P-256' },
          false,
          []
        )
        const wrap = await wrappingKey(
          ephemeral.privateKey,
          publicKey,
          header,
          person.owner_id + '/' + fingerprint
        )
        const wrapIV = random(12)

        return {
          user_id: person.owner_id,
          fingerprint,
          iv: roomsBase64(wrapIV),
          key: roomsBase64(
            await subtle().encrypt(
              { name: 'AES-GCM', iv: wrapIV, additionalData: encoded(header) },
              wrap,
              key
            )
          )
        }
      })
  )
  key.fill(0)
  const unsigned = {
    ...header,
    ephemeral: roomsBase64(
      await subtle().exportKey('spki', ephemeral.publicKey)
    ),
    iv: roomsBase64(iv),
    ciphertext: roomsBase64(
      await subtle().encrypt(
        { name: 'AES-GCM', iv, additionalData: encoded(header) },
        contentKey,
        encoded(payload)
      )
    ),
    recipients
  }

  return { ...unsigned, signature: await signRoomValue(identity, unsigned) }
}

export async function openRoomMessage(
  identity: RoomPrivateIdentity,
  envelope: RoomEnvelope,
  sender: RoomIdentity
): Promise<RoomPlaintext> {
  const { signature, ...unsigned } = envelope

  if (
    // Remote ciphertext must retain its runtime version check.
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    envelope.version !== 1 ||
    sender.owner_id !== envelope.context.author_id ||
    envelope.sender !== (await roomFingerprint(sender)) ||
    !(await verifyRoomValue(sender, unsigned, signature))
  )
    throw Error('Message signature could not be verified')

  const recipient = envelope.recipients.find(
    r => r.user_id === identity.owner_id
  )

  if (
    !recipient ||
    recipient.fingerprint !==
      (await roomFingerprint({
        owner_id: identity.owner_id,
        agreement: identity.agreement,
        signing: identity.signing
      }))
  )
    throw Error('This identity has no key for this message')

  const { version, context, sender: fingerprint } = envelope
  const header = { version, context, sender: fingerprint }
  const publicKey = await subtle().importKey(
    'spki',
    roomsBytes(envelope.ephemeral),
    { name: 'ECDH', namedCurve: 'P-256' },
    false,
    []
  )
  const wrap = await wrappingKey(
    identity.agreementKey,
    publicKey,
    header,
    recipient.user_id + '/' + recipient.fingerprint
  )
  const rawKey = new Uint8Array(
    await subtle().decrypt(
      {
        name: 'AES-GCM',
        iv: roomsBytes(recipient.iv),
        additionalData: encoded(header)
      },
      wrap,
      roomsBytes(recipient.key)
    )
  )
  const contentKey = await subtle().importKey('raw', rawKey, 'AES-GCM', false, [
    'decrypt'
  ])
  rawKey.fill(0)
  const plaintext = await subtle().decrypt(
    {
      name: 'AES-GCM',
      iv: roomsBytes(envelope.iv),
      additionalData: encoded(header)
    },
    contentKey,
    roomsBytes(envelope.ciphertext)
  )
  const payload = JSON.parse(text.decode(plaintext)) as RoomPlaintext

  if (
    typeof payload.body !== 'string' ||
    payload.body.length > 16000 ||
    !Array.isArray(payload.attachments) ||
    payload.attachments.length > 4
  )
    throw Error('Invalid encrypted message')
  for (const file of payload.attachments)
    if (
      !context.attachment_ids.includes(file.id) ||
      typeof file.name !== 'string' ||
      file.name.length > 255 ||
      typeof file.type !== 'string' ||
      !Number.isInteger(file.size) ||
      file.size < 0 ||
      file.size > 20 * 1024 * 1024 ||
      roomsBytes(file.key).length !== 32 ||
      roomsBytes(file.iv).length !== 12 ||
      roomsBytes(file.hash).length !== 32
    )
      throw Error('Invalid encrypted attachment')

  return payload
}

export async function encryptRoomFile(
  id: string,
  bytes: ArrayBuffer,
  name: string,
  type: string
) {
  if (bytes.byteLength > 20 * 1024 * 1024)
    throw Error('Files must be 20 MiB or smaller')

  const key = random(32),
    iv = random(12)
  const aes = await subtle().importKey('raw', key, 'AES-GCM', false, [
    'encrypt'
  ])
  const encrypted = new Uint8Array(
    await subtle().encrypt(
      {
        name: 'AES-GCM',
        iv,
        additionalData: utf8.encode('monolith/rooms/file/v1/' + id)
      },
      aes,
      bytes
    )
  )
  const file: RoomAttachment = {
    id,
    name: name.slice(0, 255),
    type: type.slice(0, 100),
    size: bytes.byteLength,
    key: roomsBase64(key),
    iv: roomsBase64(iv),
    hash: roomsBase64(await subtle().digest('SHA-256', encrypted))
  }
  key.fill(0)

  return { file, encrypted }
}

export async function decryptRoomFile(
  file: RoomAttachment,
  encrypted: Uint8Array<ArrayBuffer>
) {
  if (
    encrypted.length !== file.size + 16 ||
    roomsBase64(await subtle().digest('SHA-256', encrypted)) !== file.hash
  )
    throw Error('Attachment integrity check failed')

  const key = await subtle().importKey(
    'raw',
    roomsBytes(file.key),
    'AES-GCM',
    false,
    ['decrypt']
  )

  return subtle().decrypt(
    {
      name: 'AES-GCM',
      iv: roomsBytes(file.iv),
      additionalData: utf8.encode('monolith/rooms/file/v1/' + file.id)
    },
    key,
    encrypted
  )
}
