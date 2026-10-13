import { describe, expect, it } from 'vitest'

import { settingsSchema, snapshotSchema, workoutSchema } from '../../../shared'
import {
  OFFLINE_OWNER_KEY,
  OFFLINE_SNAPSHOT_KEY,
  clearOfflineSnapshot,
  enableOfflineSnapshot,
  offlineDraftKey,
  readOfflineDraft,
  readOfflineSnapshot,
  writeOfflineSnapshot
} from './offline'
import { mutableWorkout, recoveryKey } from './recovery'

const owner = '00000000-0000-4000-8000-000000000001'
const other = '00000000-0000-4000-8000-000000000002'
const settings = settingsSchema.parse({ revision: 1 })
const snapshot = snapshotSchema.parse({
  exercises: [],
  routines: [],
  schedule: [],
  workouts: [],
  active: null,
  bodyweight: [],
  settings,
  stats: {
    workouts: 0,
    completed_sets: 0,
    volume_kg: 0,
    duration_seconds: 0,
    streak_weeks: 0,
    heatmap: [],
    muscles: [],
    records: [],
    exercise_trends: [],
    effort: { rated_sets: 0, average_rir: null, hard_sets: 0, histogram: [] }
  }
})

function storage() {
  const values = new Map<string, string>()

  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => {
      values.set(key, value)
    },
    removeItem: (key: string) => {
      values.delete(key)
    }
  }
}

describe('opted-in device Gym snapshots', () => {
  it('adopts a separate offline draft while preserving the exact native pending command', () => {
    const local = storage()
    const active = workoutSchema.parse({
      id: owner,
      routine_id: null,
      name: 'Offline fixture',
      date: '2026-10-12',
      status: 'active',
      started_at: '2026-10-12T12:00:00Z',
      finished_at: null,
      notes: '',
      bodyweight_kg: null,
      revision: 1,
      current_entry_id: null,
      rest_until: null,
      entries: []
    })
    const pending = {
      command_id: other,
      expected_revision: 1,
      body: mutableWorkout(active)
    }
    const native = JSON.stringify({
      owner_id: owner,
      server: active,
      draft: active,
      pending,
      saved_at: '2026-10-12T12:00:00Z'
    })
    local.setItem(recoveryKey(owner), native)
    local.setItem(
      offlineDraftKey(owner),
      JSON.stringify({
        ...JSON.parse(native),
        draft: { ...active, notes: 'Retained offline edit' },
        native_baseline: native
      })
    )
    expect(readOfflineDraft(local, owner)?.pending).toEqual(pending)
    expect(readOfflineDraft(local, owner)?.draft.notes).toBe(
      'Retained offline edit'
    )
    expect(local.getItem(recoveryKey(owner))).toBe(native)
    local.setItem(
      recoveryKey(owner),
      JSON.stringify({
        ...JSON.parse(native),
        saved_at: '2026-10-12T13:00:00Z'
      })
    )
    expect(readOfflineDraft(local, owner)).toBeNull()
    expect(readOfflineDraft(local, other)).toBeNull()
    expect(local.getItem(offlineDraftKey(owner))).not.toBeNull()
  })
  it('never caches before explicit owner opt-in', () => {
    const local = storage()
    expect(writeOfflineSnapshot(local, owner, 'Preview', snapshot, {})).toBe(
      false
    )
    expect(readOfflineSnapshot(local)).toBeNull()
  })
  it('round trips a validated owned snapshot without an access token', () => {
    const local = storage()
    expect(enableOfflineSnapshot(local, owner)).toBe(true)
    expect(
      writeOfflineSnapshot(local, owner, 'Preview', snapshot, { plan: 'Plan' })
    ).toBe(true)
    expect(readOfflineSnapshot(local)).toMatchObject({
      owner_id: owner,
      owner_name: 'Preview',
      data: snapshot
    })
    expect(local.getItem(OFFLINE_SNAPSHOT_KEY)).not.toContain('accessToken')
  })
  it('replaces the previous opted-in profile and denies stale writes', () => {
    const local = storage()
    enableOfflineSnapshot(local, owner)
    writeOfflineSnapshot(local, owner, 'First', snapshot, {})
    enableOfflineSnapshot(local, other)
    expect(readOfflineSnapshot(local)).toBeNull()
    expect(writeOfflineSnapshot(local, owner, 'First', snapshot, {})).toBe(
      false
    )
    expect(writeOfflineSnapshot(local, other, 'Second', snapshot, {})).toBe(
      true
    )
    expect(readOfflineSnapshot(local)?.owner_id).toBe(other)
  })
  it('rejects mismatched, malformed and oversized local values', () => {
    const local = storage()
    enableOfflineSnapshot(local, owner)
    writeOfflineSnapshot(local, owner, 'Preview', snapshot, {})
    local.setItem(OFFLINE_OWNER_KEY, other)
    expect(readOfflineSnapshot(local)).toBeNull()
    local.setItem(OFFLINE_SNAPSHOT_KEY, '{')
    expect(readOfflineSnapshot(local)).toBeNull()
    local.setItem(OFFLINE_SNAPSHOT_KEY, 'x'.repeat(12000001))
    expect(readOfflineSnapshot(local)).toBeNull()
  })
  it('removes the opt-in and snapshot on clearing', () => {
    const local = storage()
    enableOfflineSnapshot(local, owner)
    writeOfflineSnapshot(local, owner, 'Preview', snapshot, {})
    expect(clearOfflineSnapshot(local)).toBe(true)
    expect(local.getItem(OFFLINE_OWNER_KEY)).toBeNull()
    expect(local.getItem(OFFLINE_SNAPSHOT_KEY)).toBeNull()
  })
  it('handles denied storage and invalid owner input', () => {
    const local = {
      getItem() {
        throw new Error('denied')
      },
      setItem() {
        throw new Error('denied')
      },
      removeItem() {
        throw new Error('denied')
      }
    }
    expect(enableOfflineSnapshot(storage(), 'not-an-owner')).toBe(false)
    expect(enableOfflineSnapshot(local, owner)).toBe(false)
    expect(writeOfflineSnapshot(local, owner, '', snapshot, {})).toBe(false)
    expect(readOfflineSnapshot(local)).toBeNull()
    expect(clearOfflineSnapshot(local)).toBe(false)
  })
})
