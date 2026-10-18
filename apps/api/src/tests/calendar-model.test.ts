import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import {
  type FilterableEvent,
  type SmartFilters,
  canReschedule,
  civilDate,
  databaseEvents,
  eventSource,
  filterEvents,
  localDay,
  readSelection,
  requestRange,
  toggleSelection,
  viewRange,
  writeSelection
} from '../../../../modules/monolith--calendar/client/src/utils/calendarModel'
import {
  getRRuleStart,
  setRRuleStart
} from '../../../../modules/monolith--calendar/client/src/utils/recurrence'
import {
  expandOccurrences,
  isOffsetInstant,
  parseDuration,
  parseEventRange
} from '../../../../modules/monolith--calendar/server/functions/eventValidation'

const defaults: SmartFilters = {
  calendars: null,
  categories: null,
  search: '',
  source: 'all',
  type: 'all',
  from: '',
  to: '',
  upcoming: false,
  tag: '',
  owner: ''
}
const event: FilterableEvent = {
  id: 'native',
  title: 'Team meeting',
  description: 'planning',
  location: 'Studio',
  calendar: 'work',
  category: 'meeting',
  type: 'single',
  start: '2026-10-31T13:00:00Z',
  end: '2026-10-31T14:00:00Z'
}
const timezone = process.env.TZ
beforeAll(() => {
  process.env.TZ = 'America/New_York'
})
afterAll(() => {
  if (timezone === undefined) delete process.env.TZ
  else process.env.TZ = timezone
})

describe('Calendar selections and smart filters', () => {
  it('shows a mirrored event once and keeps its database copy available when filtering to that source', () => {
    const linked = {
      ...event,
      id: 'db:view:record',
      calendar: 'db:view',
      source: 'database' as const,
      native_event_id: event.id,
      canonical_record_id: 'record'
    }
    expect(filterEvents([event, linked], defaults)).toEqual([event])
    expect(
      filterEvents([event, linked], { ...defaults, source: 'database' })
    ).toEqual([linked])
    expect(
      filterEvents([linked, { ...linked, id: 'db:other:record' }], defaults)
    ).toEqual([linked])
  })
  it('distinguishes all, none, singleton legacy links and explicit plural overrides', () => {
    expect(readSelection(null)).toBeNull()
    expect(readSelection(null, 'old')).toEqual(['old'])
    expect(readSelection('[]', 'old')).toEqual([])
    expect(readSelection('["new","new"]', 'old')).toEqual(['new'])
    expect(readSelection('invalid')).toEqual([])
    expect(writeSelection(null)).toBeNull()
    expect(readSelection(writeSelection(['comma,tag']))).toEqual(['comma,tag'])
  })
  it('toggles all to all-but-one and does not interpret an empty set as all', () => {
    expect(toggleSelection(null, 'work', ['work', 'home'])).toEqual(['home'])
    expect(toggleSelection(['work'], 'work', ['work', 'home'])).toEqual([])
    expect(toggleSelection([], 'home', ['work', 'home'])).toEqual(['home'])
    expect(filterEvents([event], { ...defaults, calendars: [] })).toEqual([])
    expect(filterEvents([event], { ...defaults, categories: [] })).toEqual([])
  })
  it('combines calendar, category, source, type and case-insensitive text filters', () => {
    const imported = {
      ...event,
      id: 'ical-1',
      calendar: 'home',
      category: '_external'
    }
    const repeated = { ...event, id: 'repeated', type: 'recurring' as const }
    const events = [event, imported, repeated]
    expect(
      filterEvents(events, {
        ...defaults,
        calendars: ['work'],
        categories: ['meeting'],
        search: 'PLANNING',
        source: 'native',
        type: 'single'
      })
    ).toEqual([event])
    expect(filterEvents(events, { ...defaults, source: 'ics' })).toEqual([
      imported
    ])
    expect(
      filterEvents(events, { ...defaults, search: 'cannot match' })
    ).toEqual([])
  })
  it('matches overlapping events, rejects invalid dates, and includes ongoing upcoming events', () => {
    const spanning = {
      ...event,
      start: '2026-10-01T00:00:00Z',
      end: '2026-12-01T00:00:00Z'
    }
    expect(
      filterEvents(
        [spanning],
        { ...defaults, from: '2026-10-31', to: '2026-10-31', upcoming: true },
        new Date('2026-11-01T12:00:00Z')
      )
    ).toEqual([spanning])
    expect(
      filterEvents(
        [event],
        { ...defaults, upcoming: true },
        new Date('2026-11-01T00:00:00Z')
      )
    ).toEqual([])
    for (const filter of [
      { from: '2026-02-30' },
      { from: '2026-11-01', to: '2026-10-31' }
    ])
      expect(filterEvents([event], { ...defaults, ...filter })).toEqual([])
  })
  it('applies tag and owner membership only where the event carries actual metadata', () => {
    const record = {
      ...event,
      id: 'db:view:record',
      source: 'database' as const,
      tags: ['Launch'],
      owners: ['person']
    }
    expect(
      filterEvents([event, record], {
        ...defaults,
        tag: 'Launch',
        owner: 'person'
      })
    ).toEqual([record])
    expect(filterEvents([record], { ...defaults, owner: 'other' })).toEqual([])
    expect(
      filterEvents([{ ...record, tags: ['Cart'] }], { ...defaults, tag: 'Art' })
    ).toEqual([])
  })
  it('protects imported, module, recurring and database events from native rescheduling', () => {
    expect(canReschedule(event)).toBe(true)
    for (const input of [
      { ...event, type: 'recurring' as const },
      { ...event, id: 'ical-1' },
      { ...event, category: '_todo' },
      { ...event, source: 'database' as const }
    ])
      expect(canReschedule(input)).toBe(false)
    expect(eventSource({ ...event, category: '_todo' })).toBe('module')
  })
})

describe('Calendar civil dates and instants', () => {
  it('creates local midnight blocks across the autumn DST transition with inclusive ends', () => {
    const feed = {
      sources: [
        {
          source_id: 'view',
          view_id: 'view',
          base_id: 'base',
          name: 'Launch',
          base_name: 'Projects',
          unscheduled_count: 0
        }
      ],
      items: [
        {
          id: 'view:record',
          record_id: 'record',
          title: 'Launch',
          start: '2026-10-31',
          end: '2026-11-01',
          source_id: 'view',
          tags: ['Ship'],
          owners: ['person'],
          href: '/databases?base=base&view=view&record=record'
        }
      ]
    }
    const [record] = databaseEvents(feed)
    expect(record).toMatchObject({
      id: 'db:view:record',
      calendar: 'db:view',
      source: 'database',
      all_day: true,
      reference_link: feed.items[0]!.href
    })
    expect(record!.start).toBe('2026-10-31T04:00:00.000Z')
    expect(record!.end).toBe('2026-11-02T05:00:00.000Z')
    expect(localDay(new Date(record!.end))).toBe('2026-11-02')
    expect(
      filterEvents([record!], { ...defaults, from: '2026-11-02' })
    ).toEqual([])
    expect(() =>
      databaseEvents({
        ...feed,
        items: [{ ...feed.items[0]!, end: '2026-02-30' }]
      })
    ).toThrow('invalid date')
  })
  it('derives month spillover ranges on first render and direct date links', () => {
    expect(viewRange('2026-10-12', 'month')).toEqual({
      start: '2026-09-27',
      end: '2026-10-31'
    })
    expect(viewRange('2027-01-01', 'month')).toEqual({
      start: '2026-12-27',
      end: '2027-02-06'
    })
    const range = requestRange(
      viewRange('2026-11-12', 'month')!.start,
      viewRange('2026-11-12', 'month')!.end
    )!
    expect(
      filterEvents(
        [
          {
            ...event,
            start: '2026-12-05T14:00:00Z',
            end: '2026-12-05T15:00:00Z'
          }
        ],
        defaults,
        new Date(),
        range
      )
    ).toHaveLength(1)
  })
  it('derives week/workweek/day/agenda ranges and respects the locale week start', () => {
    expect(viewRange('2026-10-31', 'week')).toEqual({
      start: '2026-10-25',
      end: '2026-10-31'
    })
    expect(viewRange('2026-10-31', 'week', 1)).toEqual({
      start: '2026-10-26',
      end: '2026-11-01'
    })
    expect(viewRange('2026-10-31', 'work_week')).toEqual({
      start: '2026-10-26',
      end: '2026-10-30'
    })
    expect(viewRange('2026-10-31', 'day')).toEqual({
      start: '2026-10-31',
      end: '2026-10-31'
    })
    expect(viewRange('2026-10-31', 'agenda')).toEqual({
      start: '2026-10-31',
      end: '2026-11-30'
    })
    expect(viewRange('invalid', 'month')).toBeNull()
  })
  it('converts a browser civil-day query into exact UTC bounds without shifting the day', () => {
    expect(requestRange('2026-11-01', '2026-11-01')).toEqual({
      start: '2026-11-01T04:00:00.000Z',
      end: '2026-11-02T04:59:59.999Z'
    })
    expect(civilDate('2026-02-30')).toBeNull()
    expect(requestRange('invalid', '2026-10-31')).toBeNull()
    expect(requestRange('2026-11-01', '2026-10-31')).toBeNull()
  })
  it('preserves the UTC instant when toggling a local 09:00 event to recurrence and back', () => {
    const start = new Date(2026, 9, 31, 9, 0, 0)
    const rule = setRRuleStart(
      'RRULE:FREQ=DAILY;COUNT=2||duration_amt=1;duration_unit=hour',
      start
    )
    expect(rule).toContain('DTSTART:20261031T130000Z')
    expect(getRRuleStart(rule)?.toISOString()).toBe(start.toISOString())
    expect(getRRuleStart('invalid')).toBeNull()
  })
  it('accepts legacy civil queries while preserving exact offset query bounds', () => {
    const range = parseEventRange(
      '2026-11-01T00:00:00-04:00',
      '2026-11-01T23:59:59-05:00'
    )
    expect(range.start.toISOString()).toBe('2026-11-01T04:00:00.000Z')
    expect(range.end.toISOString()).toBe('2026-11-02T04:59:59.000Z')
    expect(parseEventRange('2026-11-01', '2026-11-01').start.getHours()).toBe(0)
    expect(isOffsetInstant('2026-10-31T09:00:00')).toBe(false)
    expect(isOffsetInstant('2026-10-31T24:00:00Z')).toBe(false)
  })
  it('rejects unordered, invalid and excessive calendar queries', () => {
    for (const [start, end] of [
      ['invalid', '2026-11-01'],
      ['2026-02-30', '2026-03-01'],
      ['2026-11-01', '2026-10-31'],
      ['2025-01-01', '2026-11-01']
    ])
      expect(() => parseEventRange(start!, end!)).toThrow()
  })
  it('limits recurrence frequencies, duration and expansion without silently truncating results', () => {
    for (const rule of [
      'RRULE:FREQ=SECONDLY',
      'RRULE:FREQ=MINUTELY',
      'RRULE:FREQ=DAILY'
    ])
      expect(
        parseDuration(`${rule}||duration_amt=1;duration_unit=hour`)
      ).toHaveProperty('error')
    expect(
      parseDuration(
        'DTSTART:20261031T130000Z\nRRULE:FREQ=DAILY;COUNT=2||duration_amt=1;duration_unit=hour'
      )
    ).not.toHaveProperty('error')
    expect(
      parseDuration(
        'DTSTART:20261031T130000Z\nRRULE:FREQ=DAILY||duration_amt=2;duration_unit=year'
      )
    ).toHaveProperty('error')
    expect(
      parseDuration(
        'DTSTART:20261031T130000Z\nRRULE:FREQ=DAILY||duration_amt=9007199254740991;duration_unit=year'
      )
    ).toHaveProperty('error')
    expect(() =>
      expandOccurrences(
        'DTSTART:20261031T130000Z\nRRULE:FREQ=HOURLY;COUNT=3',
        new Date('2026-10-31T00:00:00Z'),
        new Date('2026-11-01T00:00:00Z'),
        2
      )
    ).toThrow('Too many')
  })
})
