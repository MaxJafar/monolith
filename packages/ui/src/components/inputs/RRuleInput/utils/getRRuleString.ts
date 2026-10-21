// SPDX-License-Identifier: 0BSD
import {
  type RepeatDraft,
  decodeRepeat,
  emptyRepeat,
  encodeRepeat
} from '../model'
import type { RRuleParams } from '../types'

/** Compatibility boundary for callers using the original public parameter shape. */
export function getRRULEString({
  start,
  params
}: {
  start: Date | null
  params: RRuleParams
}) {
  const draft = {
    ...emptyRepeat(),
    start,
    frequency: params.freq,
    ending: params.end.type,
    count: params.end.after,
    until: params.end.on
  }
  if ('every' in params.data) draft.interval = params.data.every
  if (params.freq === 'weekly') draft.days = params.data.onDays
  if (params.freq === 'monthly' || params.freq === 'yearly') {
    draft.pattern = params.data.type
    draft.position = params.data.onThe as RepeatDraft['position']
    draft.dayGroup = params.data.onTheDay as RepeatDraft['dayGroup']
    if (params.freq === 'monthly') draft.monthDay = params.data.onDate
    else {
      draft.monthDay = params.data.date
      draft.month =
        params.data.type === 'exactDate'
          ? params.data.month
          : params.data.onTheDayOfMonth
    }
  }
  return encodeRepeat(draft)
}
export function fromRRULEString(value: string) {
  const draft = decodeRepeat(value)
  if (!draft) return null
  const end = { type: draft.ending, after: draft.count, on: draft.until }
  const relative = {
    type: draft.pattern,
    onThe: draft.position,
    onTheDay: draft.dayGroup
  }
  let rrule: RRuleParams
  if (draft.frequency === 'yearly')
    rrule = {
      freq: 'yearly',
      end,
      data: {
        ...relative,
        month: draft.month,
        date: draft.monthDay,
        onTheDayOfMonth: draft.month
      }
    }
  else if (draft.frequency === 'monthly')
    rrule = {
      freq: 'monthly',
      end,
      data: { ...relative, every: draft.interval, onDate: draft.monthDay }
    }
  else if (draft.frequency === 'weekly')
    rrule = {
      freq: 'weekly',
      end,
      data: { every: draft.interval, onDays: draft.days }
    }
  else rrule = { freq: draft.frequency, end, data: { every: draft.interval } }
  return { start: draft.start, duration: draft.duration, rrule }
}
