import {
  type RoomAttachment,
  type RoomIdentity,
  type RoomKeyBackup,
  type RoomMessageContext,
  type RoomPrivateIdentity,
  createRoomIdentity,
  openRoomMessage,
  restoreRoomIdentity,
  roomFingerprint,
  roomsCanonical,
  sealRoomMessage,
  signRoomValue,
  useAuth
} from '@monolith/api'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  type ReactNode,
  createContext,
  useContext,
  useEffect,
  useState
} from 'react'

import workspaceAPI from '@/core/utils/workspaceAPI'

import {
  loadRoomIdentity,
  pinRoomIdentities,
  saveRoomIdentity
} from './encryptionStore'
import type { Entity, Message } from './types'

function useEncryptionState() {
  const { userData } = useAuth()

  const actor = userData?.id ?? ''

  const cache = useQueryClient()
  const [identity, setIdentity] = useState<RoomPrivateIdentity | null>(null)
  const [error, setError] = useState('')
  const [loaded, setLoaded] = useState(false)

  const own = useQuery({
    ...workspaceAPI.rooms.myIdentity.queryOptions(),
    queryKey: [...workspaceAPI.rooms.myIdentity.key, actor],
    enabled: !!actor,
    staleTime: 30000
  })
  useEffect(() => {
    let active = true
    setIdentity(null)
    setLoaded(false)
    setError('')
    if (actor)
      void loadRoomIdentity(actor)
        .then(value => {
          if (active) setIdentity(value ?? null)
        })
        .catch(err => {
          if (active) setError(String(err))
        })
        .finally(() => {
          if (active) setLoaded(true)
        })

    return () => {
      active = false
    }
  }, [actor])
  const publicIdentity = identity
    ? {
        owner_id: identity.owner_id,
        agreement: identity.agreement,
        signing: identity.signing
      }
    : null
  const ready =
    !!identity &&
    !own.error &&
    !!own.data &&
    roomsCanonical(publicIdentity) === roomsCanonical(own.data)

  async function enroll(value: RoomPrivateIdentity) {
    const publicKey: RoomIdentity = {
      owner_id: value.owner_id,
      agreement: value.agreement,
      signing: value.signing
    }

    if (value.owner_id !== actor)
      throw Error('This recovery file belongs to another account')
    // Save before publishing: an interrupted request can be retried without losing
    // the private identity that the server now knows.
    if (own.data && roomsCanonical(own.data) !== roomsCanonical(publicKey))
      throw Error('This recovery file does not match your Rooms identity')
    await saveRoomIdentity(value)
    await workspaceAPI.rooms.registerIdentity.mutate({
      identity: publicKey,
      proof: await signRoomValue(value, {
        purpose: 'monolith/rooms/enroll/v1',
        identity: publicKey
      })
    })
    setIdentity(value)
    setError('')
    await cache.invalidateQueries({ queryKey: workspaceAPI.rooms.key })
  }

  async function initialize(password: string) {
    if (!actor || own.status !== 'success')
      throw Error('Wait for your account identity to load')
    if (identity) return enroll(identity)
    if (own.data)
      throw Error('Restore your existing Rooms recovery file on this device')
    await enroll(await createRoomIdentity(actor, password))
  }

  async function restore(file: File, password: string) {
    if (file.size > 16000) throw Error('Invalid Rooms recovery file')

    const backup = JSON.parse(await file.text()) as RoomKeyBackup

    // Uploaded JSON is untrusted even though its expected shape is typed.
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (backup?.identity?.owner_id !== actor)
      throw Error('This recovery file belongs to another account')
    await enroll(await restoreRoomIdentity(backup, password))
  }

  async function roster(scope: { workspace_id: string; room_id: string }) {
    const keys = await workspaceAPI.rooms.keys.input(scope).query()
    await pinRoomIdentities(actor, [...keys.identities, ...keys.historical])

    return keys
  }

  async function seal(
    context: RoomMessageContext,
    body: string,
    attachments: RoomAttachment[] = []
  ) {
    if (!ready)
      throw Error('Set up or restore your Rooms encryption identity first')

    const people = await roster(context)

    if (people.missing.length)
      throw Error(
        'Waiting for encryption setup: ' +
          people.missing.map(p => p.name).join(', ')
      )

    return sealRoomMessage(
      identity,
      context,
      { body, attachments },
      people.identities
    )
  }

  async function decrypt(
    message: Message,
    workspaceId: string,
    keys: RoomIdentity[]
  ): Promise<Message> {
    if (message.deleted || !message.sealed) return message

    try {
      if (!ready)
        throw Error('Restore your encryption identity to read this message')

      const c = message.sealed.context

      if (
        c.workspace_id !== workspaceId ||
        c.room_id !== message.room_id ||
        c.author_id !== message.author_id ||
        c.transaction_id !== message.transaction_id ||
        c.thread_id !== message.thread_id ||
        roomsCanonical(c.references) !==
          roomsCanonical(message.references.map(r => r.key))
      )
        throw Error('Message identity could not be verified')

      const sender = keys.find(p => p.owner_id === message.author_id)

      if (!sender)
        throw Error('The sender’s encryption identity is unavailable')

      const content = await openRoomMessage(identity, message.sealed, sender)

      return {
        ...message,
        body: content.body,
        attachments: content.attachments
      }
    } catch (error) {
      return {
        ...message,
        body: '',
        references: [],
        attachments: [],
        encryptionError:
          error instanceof Error ? error.message : 'Unable to decrypt message'
      }
    }
  }

  return {
    actor,
    identity,
    publicIdentity,
    ready,
    loaded,
    own,
    error,
    initialize,
    restore,
    roster,
    seal,
    decrypt,
    fingerprint: () =>
      publicIdentity ? roomFingerprint(publicIdentity) : Promise.resolve('')
  }
}

const Encryption = createContext<ReturnType<typeof useEncryptionState> | null>(
  null
)

export function RoomsEncryptionProvider({ children }: { children: ReactNode }) {
  const value = useEncryptionState()

  return <Encryption value={value}>{children}</Encryption>
}

export function useRoomsEncryption() {
  const value = useContext(Encryption)

  if (!value) throw Error('Rooms encryption provider missing')

  return value
}

export function messageContext(
  scope: { workspace_id: string; room_id: string },
  actor: string,
  transactionId: string,
  threadId: string | null,
  refs: Entity[],
  files: RoomAttachment[] = [],
  revision = 1
): RoomMessageContext {
  return {
    ...scope,
    author_id: actor,
    transaction_id: transactionId,
    thread_id: threadId,
    content_revision: revision,
    references: refs.map(r => r.key),
    attachment_ids: files.map(f => f.id)
  }
}
