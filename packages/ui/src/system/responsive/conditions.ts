// SPDX-License-Identifier: 0BSD
import { RESPONSIVE_CONDITIONS } from './constant'
import type { Breakpoint, PropDef } from './types'

export function atBreakpoints<Value>(
  input: unknown
): Array<[Breakpoint, Value]> {
  if (input == null) return []
  if (typeof input !== 'object') return [['base', input as Value]]
  if (Array.isArray(input)) return []
  const values = input as Partial<Record<Breakpoint, Value>>
  return (Object.keys(RESPONSIVE_CONDITIONS) as Breakpoint[])
    .filter(key => values[key] != null)
    .map(key => [key, values[key]!])
}
export function conditionalName(definition: PropDef, at: Breakpoint) {
  return {
    className: (at === 'base' ? '' : at + ':') + definition.className,
    variable: definition.customProperties[0] + (at === 'base' ? '' : '-' + at)
  }
}
