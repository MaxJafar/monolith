import { randomUUID } from 'node:crypto'
import { describe, expect, it } from 'vitest'

import {
  type Campaign,
  type RPGCommand,
  applyCommand,
  coins,
  completion,
  dayKey,
  earnedXP,
  levelProgress,
  newCampaign,
  periodStart,
  previewXP,
  weekKey
} from '../urpgShared'

const now = new Date('2026-10-15T10:00:00Z')
function fixture() {
  return newCampaign(
    {
      name: 'Player',
      age: null,
      weight: null,
      avatar: '',
      calorieTarget: 2100,
      waterTarget: 2000,
      weeklyTarget: 3000,
      timezone: 'Asia/Baku'
    },
    randomUUID
  )
}
function add(state: Campaign, kind: 'action' | 'daily' | 'weekly' = 'action') {
  return applyCommand(
    state,
    {
      type: 'item',
      id: randomUUID(),
      value: {
        title: 'Build something',
        kind,
        stat: 'CRFT',
        skillId: state.skills[0]!.id,
        parentId: null,
        difficulty: 'medium',
        baseXP: 100,
        due: null,
        notes: ''
      }
    },
    now,
    randomUUID
  )
}
function done(state: Campaign, time = now) {
  return applyCommand(
    state,
    { type: 'complete', id: state.items[0]!.id, quality: 'strong' },
    time,
    randomUUID
  )
}
describe('uRPG progression', () => {
  it('awards once, preserves history and reverses completion', () => {
    const state = done(add(fixture()))
    expect(earnedXP(state)).toBe(187)
    expect(done(state)).toBe(state)
    const undone = applyCommand(
      state,
      { type: 'undo', id: state.ledger[0]!.id },
      now,
      randomUUID
    )
    expect(earnedXP(undone)).toBe(0)
    expect(undone.ledger).toHaveLength(1)
    expect(earnedXP(done(undone))).toBe(187)
  })
  it('uses local days and Monday weeks for rituals', () => {
    expect(dayKey(new Date('2026-10-15T22:00Z'), 'Asia/Baku')).toBe(
      '2026-10-16'
    )
    expect(weekKey('2027-01-01')).toBe('2026-12-28')
    let state = done(add(fixture(), 'daily'))
    state = done(state, new Date('2026-10-15T22:00Z'))
    expect(state.ledger).toHaveLength(2)
    const weekly = done(add(fixture(), 'weekly'))
    expect(done(weekly, new Date('2026-10-18T10:00Z'))).toBe(weekly)
    expect(done(weekly, new Date('2026-10-19T10:00Z')).ledger).toHaveLength(2)
  })
  it('has exact level boundaries and periods', () => {
    expect([0, 499, 500, 1499, 1500].map(x => levelProgress(x).level)).toEqual([
      1, 1, 2, 2, 3
    ])
    expect(periodStart('2026-11-14', 'season')).toBe('2026-10-01')
    expect(periodStart('2026-11-14', 'year')).toBe('2026-01-01')
  })
  it('never spends lifetime XP, prevents double redemption and refunds', () => {
    let state = done(add(fixture()))
    const rewardId = randomUUID(),
      redemptionId = randomUUID()
    state = applyCommand(
      state,
      { type: 'reward', id: rewardId, title: 'A movie', cost: 15 },
      now,
      randomUUID
    )
    state = applyCommand(
      state,
      { type: 'redeem', id: redemptionId, rewardId },
      now,
      randomUUID
    )
    expect(coins(state, '2026-10-15')).toBe(3)
    expect(earnedXP(state)).toBe(187)
    expect(
      applyCommand(
        state,
        { type: 'redeem', id: redemptionId, rewardId },
        now,
        randomUUID
      )
    ).toBe(state)
    expect(() =>
      applyCommand(
        state,
        { type: 'undo', id: state.ledger[0]!.id },
        now,
        randomUUID
      )
    ).toThrow('Refund')
    state = applyCommand(
      state,
      { type: 'refund', id: redemptionId },
      now,
      randomUUID
    )
    expect(coins(state, '2026-10-15')).toBe(18)
    expect(coins(state, '2026-10-19')).toBe(0)
  })
  it('caps combined debuffs and restores future earning after recovery', () => {
    let state = add(fixture())
    for (let n = 0; n < 4; n++)
      state = applyCommand(
        state,
        {
          type: 'debuff',
          id: randomUUID(),
          value: {
            title: 'Fatigue',
            stat: 'CRFT',
            reduction: 0.5,
            recovery: 'Take a walk'
          }
        },
        now,
        randomUUID
      )
    expect(previewXP(state, state.items[0]!, 'done')).toBe(75)
    for (const debuff of state.debuffs)
      state = applyCommand(
        state,
        { type: 'recover', id: debuff.id },
        now,
        randomUUID
      )
    expect(previewXP(state, state.items[0]!, 'done')).toBe(150)
  })
  it('validates hierarchy and skill/stat identity', () => {
    const state = add(fixture()),
      item = state.items[0]!
    expect(() =>
      applyCommand(
        state,
        { type: 'item', id: item.id, value: { ...item, parentId: item.id } },
        now,
        randomUUID
      )
    ).toThrow('parent')
    expect(() =>
      applyCommand(
        state,
        { type: 'item', id: item.id, value: { ...item, stat: 'BODY' } },
        now,
        randomUUID
      )
    ).toThrow('skill')
  })
  it('makes log retries idempotent and never refills bars on a new day', () => {
    const command: RPGCommand = {
      type: 'vital',
      id: randomUUID(),
      kind: 'water',
      amount: 250
    }
    const state = applyCommand(fixture(), command, now, randomUUID)
    expect(applyCommand(state, command, now, randomUUID)).toBe(state)
    expect(state.vitals.filter(v => v.day === '2026-10-16')).toHaveLength(0)
  })
  it('archives without destroying earned XP and blocks completion of archived items', () => {
    let state = done(add(fixture()))
    state = applyCommand(
      state,
      { type: 'archive', id: state.items[0]!.id, archived: true },
      now,
      randomUUID
    )
    expect(earnedXP(state)).toBe(187)
    expect(() => done(state)).toThrow('Restore')
    expect(completion(state, state.items[0]!, '2026-10-15')).toBeTruthy()
  })
})
