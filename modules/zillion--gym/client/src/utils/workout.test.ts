import { describe, expect, it } from 'vitest'

import {
  acknowledgedWorkTimer,
  adjacentGroups,
  cleanSupersets,
  clock,
  restAfterSet,
  timerRemaining,
  weightDisplay,
  weightKg
} from './workout'

describe('workout presentation rules', () => {
  it('groups only consecutive superset partners while retaining their order', () => {
    const entries = [
      { id: 'a', superset_group: 'pair' },
      { id: 'b', superset_group: 'pair' },
      { id: 'c', superset_group: null },
      { id: 'd', superset_group: 'pair' }
    ]
    expect(
      adjacentGroups(entries).map(group => group.map(entry => entry.id))
    ).toEqual([['a', 'b'], ['c'], ['d']])
  })
  it('clears orphaned groups after removal without mutating surviving entries or joining separated groups', () => {
    const entries = [
      { id: 'a', superset_group: 'pair' },
      { id: 'b', superset_group: null },
      { id: 'c', superset_group: 'pair' },
      { id: 'd', superset_group: 'two' },
      { id: 'e', superset_group: 'two' }
    ]
    const cleaned = cleanSupersets(entries)
    expect(cleaned.map(entry => entry.superset_group)).toEqual([
      null,
      null,
      null,
      'two',
      'two'
    ])
    expect(entries[0]!.superset_group).toBe('pair')
    expect(cleaned.map(entry => entry.id)).toEqual(['a', 'b', 'c', 'd', 'e'])
  })
  it('converts pounds to canonical kg and formats display values without rewriting stored values', () => {
    expect(weightKg(220.46226218487757, 'lb')).toBeCloseTo(100, 10)
    expect(weightDisplay(100, 'lb')).toBe(220.46)
    expect(weightKg(100, 'kg')).toBe(100)
    expect(weightDisplay(0, 'lb')).toBe(0)
  })
  it('renders elapsed and countdown values at whole seconds without negative times', () => {
    expect(clock(-2)).toBe('0:00')
    expect(clock(59.9)).toBe('0:59')
    expect(clock(3601)).toBe('60:01')
  })
})

describe('superset rest timing', () => {
  const a = {
    id: 'a',
    target: { rest_seconds: 30 },
    sets: [
      { id: 'a1', done: true },
      { id: 'a2', done: false }
    ]
  }
  const b = {
    id: 'b',
    target: { rest_seconds: 90 },
    sets: [
      { id: 'b1', done: false },
      { id: 'b2', done: false }
    ]
  }
  it('does not start rest after the first partner alone', () => {
    expect(restAfterSet([a, b], 'a', 'a1')).toBe(0)
  })
  it('does not start rest when the last partner is checked before the first', () => {
    expect(
      restAfterSet(
        [
          { ...a, sets: [{ id: 'a1', done: false }] },
          { ...b, sets: [{ id: 'b1', done: true }] }
        ],
        'b',
        'b1'
      )
    ).toBe(0)
  })
  it('starts the final partner’s prescribed rest once all partners complete that round', () => {
    expect(
      restAfterSet(
        [
          a,
          {
            ...b,
            sets: [
              { id: 'b1', done: true },
              { id: 'b2', done: false }
            ]
          }
        ],
        'b',
        'b1'
      )
    ).toBe(90)
  })
  it('handles unequal set counts using the final partner participating in that round', () => {
    expect(
      restAfterSet(
        [
          {
            ...a,
            sets: [
              { id: 'a1', done: true },
              { id: 'a2', done: true }
            ]
          },
          { ...b, sets: [{ id: 'b1', done: true }] }
        ],
        'a',
        'a2'
      )
    ).toBe(30)
  })
})

describe('acknowledged timed workout commands', () => {
  const timer = {
    entry_id: '00000000-0000-4000-8000-000000000001',
    set_id: '00000000-0000-4000-8000-000000000002',
    started_at: '2026-10-12T13:00:00.000Z',
    target_seconds: 50
  }
  it('shows a local timer’s actual remaining time after a lost start response and cannot complete it before acknowledgement', () => {
    expect(timerRemaining(timer, Date.parse('2026-10-12T13:00:15Z'))).toBe(35)
    expect(acknowledgedWorkTimer(null, timer)).toBe(false)
    expect(acknowledgedWorkTimer({ ...timer }, timer)).toBe(true)
  })
  it('clamps future-start clock differences and elapsed time beyond the target', () => {
    expect(timerRemaining(timer, Date.parse('2026-10-12T12:59:59.500Z'))).toBe(
      50
    )
    expect(timerRemaining(timer, Date.parse('2026-10-12T13:01:00Z'))).toBe(0)
    expect(timerRemaining(null, Date.now())).toBe(0)
  })
  it('requires the exact acknowledged entry, set, start instant and target before completion', () => {
    expect(
      acknowledgedWorkTimer(timer, { ...timer, set_id: timer.entry_id })
    ).toBe(false)
    expect(
      acknowledgedWorkTimer(timer, { ...timer, entry_id: timer.set_id })
    ).toBe(false)
    expect(acknowledgedWorkTimer(timer, { ...timer, target_seconds: 30 })).toBe(
      false
    )
    expect(
      acknowledgedWorkTimer(timer, {
        ...timer,
        started_at: '2026-10-12T13:00:01Z'
      })
    ).toBe(false)
  })
})
