import { describe, expect, it, vi } from 'vitest'

import { workoutSchema } from '../../../shared'
import {
  acknowledgeDraft,
  commandForDraft,
  mutableWorkout,
  readRecovery,
  recoveryKey,
  removeRecovery,
  writeRecovery
} from './recovery'
import type { RecoveryStorage, WorkoutRecovery } from './recovery'

const owner = '00000000-0000-4000-8000-000000000001'
const other = '00000000-0000-4000-8000-000000000002'
const commandId = '00000000-0000-4000-8000-000000000003'
const workout = workoutSchema.parse({
  id: '00000000-0000-4000-8000-000000000004',
  routine_id: null,
  name: 'Session',
  date: '2026-10-12',
  status: 'active',
  started_at: '2026-10-12T13:00:00.000Z',
  finished_at: null,
  notes: '',
  bodyweight_kg: 80,
  revision: 1,
  current_entry_id: null,
  rest_until: null,
  entries: []
})
const recovery: WorkoutRecovery = {
  owner_id: owner,
  server: workout,
  draft: { ...workout, notes: 'A local correction' },
  pending: null,
  saved_at: '2026-10-12T13:05:00.000Z'
}

function storage(): RecoveryStorage {
  const values = new Map<string, string>()

  return {
    getItem: key => values.get(key) ?? null,
    setItem: (key, value) => {
      values.set(key, value)
    },
    removeItem: key => {
      values.delete(key)
    }
  }
}

describe('durable active workout recovery', () => {
  it('round-trips one owner’s active draft without exposing it to another owner', () => {
    const local = storage()
    expect(writeRecovery(local, owner, recovery)).toBe(true)
    expect(readRecovery(local, owner)).toEqual(recovery)
    expect(readRecovery(local, other)).toBeNull()
    expect(writeRecovery(local, other, recovery)).toBe(false)
  })
  it('rejects a forged owner envelope even when placed in the requested owner key', () => {
    const local = storage()
    local.setItem(recoveryKey(other), JSON.stringify(recovery))
    expect(readRecovery(local, other)).toBeNull()
  })
  it('does not restore a completed session or a mismatched workout ID', () => {
    const local = storage()
    expect(
      writeRecovery(local, owner, {
        ...recovery,
        draft: { ...recovery.draft, status: 'completed' }
      })
    ).toBe(false)
    expect(
      writeRecovery(local, owner, {
        ...recovery,
        draft: { ...recovery.draft, id: other }
      })
    ).toBe(false)
  })
  it('retains an unfinished name edit and strips unrecognized envelope fields', () => {
    const local = storage()
    const unfinished = {
      ...recovery,
      draft: { ...recovery.draft, name: '' },
      accessToken: 'must-never-be-saved'
    }
    expect(writeRecovery(local, owner, unfinished)).toBe(true)
    expect(readRecovery(local, owner)?.draft.name).toBe('')
    expect(local.getItem(recoveryKey(owner))).not.toContain(
      'must-never-be-saved'
    )
  })
  it('tolerates corrupt, unavailable and oversized storage without deleting other recoveries', () => {
    const local = storage()
    local.setItem(recoveryKey(owner), '{bad JSON')
    expect(readRecovery(local, owner)).toBeNull()
    local.setItem(recoveryKey(owner), 'x'.repeat(2_000_001))
    expect(readRecovery(local, owner)).toBeNull()
    expect(readRecovery(null, owner)).toBeNull()
    expect(writeRecovery(null, owner, recovery)).toBe(false)
    expect(
      writeRecovery(
        {
          getItem: () => null,
          removeItem: () => {},
          setItem: () => {
            throw new Error('quota')
          }
        },
        owner,
        recovery
      )
    ).toBe(false)
    writeRecovery(local, other, { ...recovery, owner_id: other })
    expect(removeRecovery(local, owner)).toBe(true)
    expect(readRecovery(local, other)?.owner_id).toBe(other)
  })
  it('replays the exact pending command even after additional local edits and a newer server revision', () => {
    const first = commandForDraft(recovery.draft, 1, null, () => commandId)
    const nextId = vi.fn(() => other)
    const replay = commandForDraft(
      { ...recovery.draft, notes: 'Newer local edit' },
      8,
      first,
      nextId
    )
    expect(replay).toBe(first)
    expect(nextId).not.toHaveBeenCalled()
    expect(replay.expected_revision).toBe(1)
    expect(replay.body.notes).toBe('A local correction')
  })
  it('restores a pending command after refresh without changing its identifier or payload', () => {
    const local = storage()
    const pending = commandForDraft(recovery.draft, 1, null, () => commandId)
    writeRecovery(local, owner, { ...recovery, pending })
    const restored = readRecovery(local, owner)!
    expect(
      commandForDraft(restored.draft, 1, restored.pending, () => other)
    ).toEqual(pending)
  })
  it('uses the server result when it acknowledges the current draft', () => {
    const command = commandForDraft(recovery.draft, 1, null, () => commandId)
    const result = { ...recovery.draft, revision: 2 }
    expect(acknowledgeDraft(result, recovery.draft, command)).toBe(result)
  })
  it('preserves edits made after a pending request and bases the next command on its acknowledgement', () => {
    const command = commandForDraft(recovery.draft, 1, null, () => commandId)
    const current = { ...recovery.draft, notes: 'Typed while sending' }
    const result = { ...recovery.draft, revision: 2 }
    const retained = acknowledgeDraft(result, current, command)
    expect(retained.notes).toBe(current.notes)
    expect(retained.revision).toBe(2)
    expect(current.revision).toBe(1)
    expect(commandForDraft(retained, 2, null, () => other)).toMatchObject({
      command_id: other,
      expected_revision: 2,
      body: { notes: 'Typed while sending' }
    })
  })
  it('excludes server metadata from update commands and rejects invalid mutable values', () => {
    expect(mutableWorkout(workout)).not.toHaveProperty('status')
    expect(mutableWorkout(workout)).not.toHaveProperty('revision')
    expect(mutableWorkout(workout)).not.toHaveProperty('started_at')
    expect(() =>
      commandForDraft({ ...workout, name: '' }, 1, null, () => commandId)
    ).toThrow()
  })
})
