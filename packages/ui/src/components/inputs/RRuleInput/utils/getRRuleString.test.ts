import { describe, expect, it } from 'vitest'

import { fromRRULEString, getRRULEString } from './getRRuleString'

const rule = 'DTSTART:20261101T053000Z\nRRULE:FREQ=HOURLY;COUNT=2'

describe('saved recurrence input', () => {
  it('restores a minute duration as a number and preserves the UTC start', () => {
    const parsed = fromRRULEString(
      rule + '||duration_amt=30;duration_unit=minute'
    )

    expect(parsed?.duration).toEqual({
      duration_amt: 30,
      duration_unit: 'minute'
    })
    expect(parsed?.start?.toISOString()).toBe('2026-11-01T05:30:00.000Z')
    expect(parsed?.rrule).toMatchObject({
      freq: 'hourly',
      data: { every: 1 },
      end: { type: 'after', after: 2 }
    })
  })

  it('round-trips the UTC start across the local daylight-saving clock change', () => {
    const parsed = fromRRULEString(rule)

    if (!parsed) throw new Error('A valid saved recurrence must parse')

    const restored = fromRRULEString(
      getRRULEString({ start: parsed.start, params: parsed.rrule })
    )

    expect(restored?.start?.toISOString()).toBe('2026-11-01T05:30:00.000Z')
    expect(restored?.rrule.end).toEqual(parsed.rrule.end)
  })

  it('restores all supported duration units', () => {
    for (const unit of ['minute', 'hour', 'day', 'week', 'month', 'year']) {
      expect(
        fromRRULEString(rule + `||duration_amt=2;duration_unit=${unit}`)
          ?.duration
      ).toEqual({ duration_amt: 2, duration_unit: unit })
    }
  })

  it('rejects malformed or non-positive duration values', () => {
    for (const duration of [
      '',
      'duration_amt=0;duration_unit=minute',
      'duration_amt=-1;duration_unit=hour',
      'duration_amt=1.5;duration_unit=hour',
      'duration_amt=9007199254740992;duration_unit=hour',
      'duration_amt=1;duration_unit=second',
      'duration_amt=1;duration_unit=hour;unexpected=1',
      'duration_amt=1;duration_unit=hour||duration_amt=2;duration_unit=day'
    ]) {
      expect(fromRRULEString(rule + '||' + duration)).toBeNull()
    }
  })

  it('returns null for empty, invalid or unsupported rules without throwing', () => {
    for (const value of [
      '',
      'not a rule',
      'RRULE:FREQ=INVALID',
      'RRULE:FREQ=SECONDLY'
    ]) {
      expect(fromRRULEString(value)).toBeNull()
    }
  })
})
