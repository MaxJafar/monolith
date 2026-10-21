// SPDX-License-Identifier: 0BSD
import type { ResolvedStyle } from '../../props-resolver'
import { atBreakpoints, conditionalName } from '../conditions'
import { LAYOUT_PROP_DEFS, type LayoutPropDefsKey } from '../constant'
import type { PropDef, ResponsiveProp } from '../types'

export function getResponsiveStyles(
  definition: PropDef,
  input: ResponsiveProp<string | number> | undefined
): ResolvedStyle | undefined {
  const entries = atBreakpoints<string | number>(input)
    .filter(
      ([, value]) =>
        typeof value === 'string' ||
        (typeof value === 'number' && Number.isFinite(value))
    )
    .map(([at, value]) => ({
      ...conditionalName(definition, at),
      value: String(value)
    }))
  if (!entries.length) return undefined
  return {
    className: entries.map(entry => entry.className).join(' '),
    style: Object.fromEntries(
      entries.map(entry => [entry.variable, entry.value])
    )
  }
}
export function getResponsiveLayoutStyles(
  props: Partial<Record<LayoutPropDefsKey, ResponsiveProp<string | number>>>
): ResolvedStyle {
  const output: ResolvedStyle = { className: '', style: {} }
  for (const property in props) {
    if (!Object.hasOwn(LAYOUT_PROP_DEFS, property)) continue
    const key = property as LayoutPropDefsKey
    const rule = getResponsiveStyles(LAYOUT_PROP_DEFS[key], props[key])
    if (rule) {
      output.className += (output.className ? ' ' : '') + rule.className
      output.style = { ...output.style, ...rule.style }
    }
  }
  return output
}
