// SPDX-License-Identifier: 0BSD
import { type Options, RRule } from 'rrule'

export const days = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const
export type Day = (typeof days)[number]
export const frequencies = {
  hourly: RRule.HOURLY,
  daily: RRule.DAILY,
  weekly: RRule.WEEKLY,
  monthly: RRule.MONTHLY,
  yearly: RRule.YEARLY
}
export type FrequencyName = keyof typeof frequencies
export const positions = {
  first: 1,
  second: 2,
  third: 3,
  fourth: 4,
  last: -1
} as const
export const durationUnits = [
  'minute',
  'hour',
  'day',
  'week',
  'month',
  'year'
] as const
export type Duration = {
  duration_amt: number
  duration_unit: (typeof durationUnits)[number]
}
export type RepeatDraft = {
  start: Date | null
  frequency: FrequencyName
  interval: number
  days: Day[]
  pattern: 'exactDate' | 'relativeDay'
  monthDay: number
  month: number
  position: keyof typeof positions
  dayGroup: Day | 'day' | 'weekday' | 'weekendDay'
  ending: 'never' | 'after' | 'on'
  count: number
  until: Date | null
  duration: Duration | null
}
export function emptyRepeat(): RepeatDraft {
  return {
    start: null,
    frequency: 'daily',
    interval: 1,
    days: ['mon'],
    pattern: 'exactDate',
    monthDay: 1,
    month: 1,
    position: 'first',
    dayGroup: 'mon',
    ending: 'never',
    count: 1,
    until: null,
    duration: null
  }
}
function list<T>(value: T | T[] | null | undefined): T[] {
  return value == null ? [] : Array.isArray(value) ? value : [value]
}
const positive = (value: number) => Number.isSafeInteger(value) && value > 0
const validDate = (value: Date | null | undefined): value is Date =>
  value instanceof Date && Number.isFinite(value.getTime())
const weekdayOptions = [
  RRule.MO,
  RRule.TU,
  RRule.WE,
  RRule.TH,
  RRule.FR,
  RRule.SA,
  RRule.SU
]
function groupDays(group: RepeatDraft['dayGroup']) {
  if (group === 'day') return weekdayOptions
  if (group === 'weekday') return weekdayOptions.slice(0, 5)
  if (group === 'weekendDay') return weekdayOptions.slice(5)
  return days.includes(group) ? [weekdayOptions[days.indexOf(group)]] : []
}
export function encodeRepeat(draft: RepeatDraft) {
  if (
    !validDate(draft.start) ||
    !positive(draft.interval) ||
    !(draft.frequency in frequencies)
  )
    return ''
  const options: Partial<Options> = {
    dtstart: draft.start,
    freq: frequencies[draft.frequency],
    interval: draft.interval
  }
  if (draft.frequency === 'weekly') {
    if (!draft.days.length || draft.days.some(day => !days.includes(day)))
      return ''
    options.byweekday = [...new Set(draft.days)].map(
      day => weekdayOptions[days.indexOf(day)]
    )
  }
  if (draft.frequency === 'monthly' || draft.frequency === 'yearly') {
    if (draft.frequency === 'yearly') {
      if (!positive(draft.month) || draft.month > 12 || draft.interval !== 1)
        return ''
      options.bymonth = draft.month
    }
    if (draft.pattern === 'relativeDay') {
      if (!(draft.position in positions)) return ''
      options.bysetpos = positions[draft.position]
      options.byweekday = groupDays(draft.dayGroup)
      if (!options.byweekday.length) return ''
    } else {
      if (
        !Number.isInteger(draft.monthDay) ||
        draft.monthDay === 0 ||
        Math.abs(draft.monthDay) > 31
      )
        return ''
      options.bymonthday = draft.monthDay
    }
  }
  if (draft.ending === 'after') {
    if (!positive(draft.count)) return ''
    options.count = draft.count
  }
  if (draft.ending === 'on') {
    if (!validDate(draft.until) || draft.until < draft.start) return ''
    options.until = draft.until
  }
  const duration = draft.duration
  if (
    duration &&
    (!positive(duration.duration_amt) ||
      !durationUnits.includes(duration.duration_unit))
  )
    return ''
  try {
    const rule = new RRule(options).toString()
    return duration
      ? rule +
          '||duration_amt=' +
          duration.duration_amt +
          ';duration_unit=' +
          duration.duration_unit
      : rule
  } catch {
    return ''
  }
}
function readDuration(suffix: string | undefined): Duration | null {
  if (suffix === undefined) return null
  const fields = suffix.split(';')
  if (fields.length !== 2) throw Error('Duration fields')
  const [amount, unit] = fields
  if (
    !/^duration_amt=[0-9]+$/.test(amount) ||
    !unit.startsWith('duration_unit=')
  )
    throw Error('Duration syntax')
  const duration_amt = Number(amount.slice('duration_amt='.length))
  const duration_unit = unit.slice(
    'duration_unit='.length
  ) as Duration['duration_unit']
  if (!positive(duration_amt) || !durationUnits.includes(duration_unit))
    throw Error('Duration value')
  return { duration_amt, duration_unit }
}

/** Unsupported rules remain raw text; the structured editor must never discard constraints. */
export function decodeRepeat(source: string): RepeatDraft | null {
  try {
    const parts = source.split('||')
    if (parts.length > 2 || !parts[0].trim()) return null
    const lines = parts[0].trim().split(/\r?\n/)
    if (
      lines.filter(line => line.startsWith('RRULE:')).length > 1 ||
      lines.filter(line => line.startsWith('DTSTART')).length > 1
    )
      return null
    const options = RRule.parseString(parts[0])
    const allowed = [
      'freq',
      'interval',
      'dtstart',
      'byweekday',
      'bysetpos',
      'bymonth',
      'bymonthday',
      'count',
      'until',
      'wkst'
    ]
    if (Object.keys(options).some(key => !allowed.includes(key))) return null
    const frequency = (Object.keys(frequencies) as FrequencyName[]).find(
      name => frequencies[name] === options.freq
    )
    if (!frequency || (options.dtstart && !validDate(options.dtstart)))
      return null
    if (
      options.wkst !== undefined &&
      options.wkst !== RRule.MO &&
      options.wkst !== 0 &&
      String(options.wkst) !== 'MO'
    )
      return null
    const interval = options.interval ?? 1
    if (!positive(interval) || (frequency === 'yearly' && interval !== 1))
      return null
    if (options.count != null && (!positive(options.count) || options.until))
      return null
    if (options.until && !validDate(options.until)) return null
    const month = list(options.bymonth),
      date = list(options.bymonthday),
      position = list(options.bysetpos),
      weekday = list(options.byweekday)
    if ([month, date, position].some(values => values.length > 1)) return null
    if (
      month.some(value => !positive(value) || value > 12) ||
      date.some(
        value => !Number.isInteger(value) || value === 0 || Math.abs(value) > 31
      )
    )
      return null
    if (month.length && frequency !== 'yearly') return null
    if (
      ['daily', 'hourly'].includes(frequency) &&
      (weekday.length || position.length || date.length)
    )
      return null
    if (frequency === 'weekly' && (position.length || date.length)) return null
    const indexes = weekday.map(value =>
      typeof value === 'number'
        ? value
        : typeof value === 'object' && !value.n
          ? value.weekday
          : -1
    )
    if (
      indexes.some(index => !Number.isInteger(index) || index < 0 || index > 6)
    )
      return null
    const weekdayNumbers = [...new Set(indexes)].sort((a, b) => a - b)
    let group: RepeatDraft['dayGroup'] = 'mon'
    if (weekdayNumbers.length) {
      const key = weekdayNumbers.join('')
      group =
        ({ '0123456': 'day', '01234': 'weekday', '56': 'weekendDay' } as const)[
          key as '0123456'
        ] ?? days[weekdayNumbers[0]]
      if (
        frequency !== 'weekly' &&
        weekdayNumbers.length > 1 &&
        !['0123456', '01234', '56'].includes(key)
      )
        return null
    }
    const relative = position.length > 0
    if (relative && (!weekday.length || date.length)) return null
    if (!relative && weekday.length && frequency !== 'weekly') return null
    const ordinal = (Object.keys(positions) as RepeatDraft['position'][]).find(
      key => positions[key] === position[0]
    )
    if (relative && !ordinal) return null
    const start = options.dtstart ?? null
    const fallbackDay = start ? (start.getUTCDay() + 6) % 7 : 0
    const draft: RepeatDraft = {
      ...emptyRepeat(),
      start,
      frequency,
      interval,
      days: weekdayNumbers.length
        ? weekdayNumbers.map(index => days[index])
        : [days[fallbackDay]],
      pattern: relative ? 'relativeDay' : 'exactDate',
      month: month[0] ?? (start ? start.getUTCMonth() + 1 : 1),
      monthDay: date[0] ?? start?.getUTCDate() ?? 1,
      position: ordinal ?? 'first',
      dayGroup: group,
      ending: options.count ? 'after' : options.until ? 'on' : 'never',
      count: options.count ?? 1,
      until: options.until ?? null,
      duration: readDuration(parts[1])
    }
    if (draft.start && !encodeRepeat(draft)) return null
    return draft
  } catch {
    return null
  }
}
