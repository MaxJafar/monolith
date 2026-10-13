import z from 'zod'

import { type GymSnapshot, snapshotSchema } from '../../../shared'
import { type RecoveryStorage, recoveryKey, recoverySchema } from './recovery'

export const OFFLINE_OWNER_KEY = 'zillion-gym:offline:owner:v1'

export const OFFLINE_SNAPSHOT_KEY = 'zillion-gym:offline:snapshot:v1'

const MAX_SNAPSHOT_BYTES = 12_000_000

export function offlineDraftKey(owner: string) {
  return `zillion-gym:offline:draft:v1:${owner}`
}

export function hasOfflineDraftConflict(
  storage: RecoveryStorage | null,
  owner: string
) {
  try {
    return (
      !!storage?.getItem(offlineDraftKey(owner)) &&
      !readOfflineDraft(storage, owner)
    )
  } catch {
    return false
  }
}

export function readOfflineDraft(
  storage: RecoveryStorage | null,
  owner: string
) {
  try {
    const raw = storage?.getItem(offlineDraftKey(owner))

    if (!raw || raw.length > 6_000_000) return null

    const value = recoverySchema
      .safeExtend({ native_baseline: z.string().max(2_000_000).nullable() })
      .safeParse(JSON.parse(raw))

    if (
      !value.success ||
      value.data.owner_id !== owner ||
      storage?.getItem(recoveryKey(owner)) !== value.data.native_baseline
    )
      return null
    if (
      value.data.native_baseline &&
      recoverySchema.parse(JSON.parse(value.data.native_baseline)).server.id !==
        value.data.server.id
    )
      return null

    return recoverySchema.parse(value.data)
  } catch {
    return null
  }
}

const offlineSnapshotSchema = z.object({
  version: z.literal(1),
  owner_id: z.string().uuid(),
  owner_name: z.string().max(255),
  saved_at: z.string().datetime(),
  labels: z.record(z.string(), z.string().max(1000)),
  data: snapshotSchema
})

export function offlineEnabled(storage: RecoveryStorage | null, owner: string) {
  try {
    return storage?.getItem(OFFLINE_OWNER_KEY) === owner
  } catch {
    return false
  }
}

export function clearOfflineSnapshot(storage: RecoveryStorage | null) {
  try {
    storage?.removeItem(OFFLINE_OWNER_KEY)
    storage?.removeItem(OFFLINE_SNAPSHOT_KEY)

    return !!storage
  } catch {
    return false
  }
}

export function enableOfflineSnapshot(
  storage: RecoveryStorage | null,
  owner: string
) {
  try {
    if (!storage || !z.string().uuid().safeParse(owner).success) return false
    // This device keeps only one opted-in profile, never a selectable list of accounts.
    if (storage.getItem(OFFLINE_OWNER_KEY) !== owner)
      storage.removeItem(OFFLINE_SNAPSHOT_KEY)
    storage.setItem(OFFLINE_OWNER_KEY, owner)

    return true
  } catch {
    return false
  }
}

export function readOfflineSnapshot(storage: RecoveryStorage | null) {
  try {
    const owner = storage?.getItem(OFFLINE_OWNER_KEY)
    const raw = storage?.getItem(OFFLINE_SNAPSHOT_KEY)

    if (!owner || !raw || raw.length > MAX_SNAPSHOT_BYTES) return null

    const parsed = offlineSnapshotSchema.safeParse(JSON.parse(raw))

    return parsed.success && parsed.data.owner_id === owner ? parsed.data : null
  } catch {
    return null
  }
}

export function writeOfflineSnapshot(
  storage: RecoveryStorage | null,
  owner: string,
  ownerName: string,
  data: GymSnapshot,
  labels: Record<string, string>
) {
  try {
    if (!storage || !offlineEnabled(storage, owner)) return false

    const snapshot = offlineSnapshotSchema.parse({
      version: 1,
      owner_id: owner,
      owner_name: ownerName,
      saved_at: new Date().toISOString(),
      data,
      labels
    })
    const serialized = JSON.stringify(snapshot)

    if (serialized.length > MAX_SNAPSHOT_BYTES) return false
    storage.setItem(OFFLINE_SNAPSHOT_KEY, serialized)

    return true
  } catch {
    return false
  }
}

export function offlineLabels(t: (key: string) => string) {
  return Object.fromEntries(
    [
      'title',
      'saved',
      'help',
      'missing',
      'reconnect',
      'savedDraft',
      'draftConflict',
      'storageError',
      'clear',
      'clearConfirm',
      'rest',
      'done',
      'search',
      'noActive',
      'timer',
      'close',
      'plan',
      'library',
      'history',
      'workout',
      'weight',
      'reps',
      'seconds',
      'minutes',
      'speed',
      'notes',
      'instructions',
      'completed'
    ].map(key => [key, t(`offline.${key}`)])
  )
}
