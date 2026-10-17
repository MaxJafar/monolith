import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
import * as RRuleModule from 'rrule'

dayjs.extend(utc)
// Node exposes rrule's CommonJS object as default; Vite uses its named ESM exports.
const implementation =
  (Reflect.get(RRuleModule, 'default') as typeof RRuleModule | undefined) ??
  RRuleModule
const { RRule } = implementation

export function getRRuleStart(value: string): Date | null {
  try {
    const parsed = RRule.parseString(value.split('||')[0] ?? '')

    return parsed.dtstart && Number.isFinite(parsed.dtstart.getTime())
      ? parsed.dtstart
      : null
  } catch {
    return null
  }
}

export function setRRuleStart(value: string, start: Date) {
  const [rule = '', duration] = value.split('||')
  const startString = `DTSTART:${dayjs(start).utc().format('YYYYMMDD[T]HHmmss')}Z`
  const line =
    /RRULE:.*/.exec(rule)?.[0] ?? 'RRULE:FREQ=YEARLY;BYMONTH=1;BYMONTHDAY=1'
  const result = `${startString}\n${line}`

  return duration ? `${result}||${duration}` : result
}
