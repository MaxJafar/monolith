import type { ResolvedStyle } from '../../props-resolver'
import {
  LAYOUT_PROP_DEFS,
  type LayoutPropDefsKey,
  RESPONSIVE_CONDITIONS
} from '../constant'
import type { PropDef, ResponsiveProp } from '../types'

export function getResponsiveStyles(
  definition: PropDef,
  input: ResponsiveProp<string | number> | undefined
): ResolvedStyle | undefined {
  if (input == null) return
  const entries =
    typeof input === 'object' ? Object.entries(input) : [['base', input]]
  const classes: string[] = []
  const variables: Record<string, string> = {}
  for (const [breakpoint, value] of entries) {
    if (!Object.hasOwn(RESPONSIVE_CONDITIONS, breakpoint!) || value == null)
      continue
    classes.push(
      breakpoint === 'base'
        ? definition.className
        : breakpoint + ':' + definition.className
    )
    const variable =
      definition.customProperties[0] +
      (breakpoint === 'base' ? '' : '-' + breakpoint)
    variables[variable] = String(value)
  }
  return classes.length
    ? { className: classes.join(' '), style: variables }
    : undefined
}

export function getResponsiveLayoutStyles(
  props: Partial<Record<LayoutPropDefsKey, ResponsiveProp<string | number>>>
): ResolvedStyle {
  const result: ResolvedStyle = { className: '', style: {} }
  const classes: string[] = []
  for (const name of Object.keys(LAYOUT_PROP_DEFS) as LayoutPropDefsKey[]) {
    const resolved = getResponsiveStyles(LAYOUT_PROP_DEFS[name], props[name])
    if (!resolved) continue
    classes.push(resolved.className)
    Object.assign(result.style, resolved.style)
  }
  result.className = classes.join(' ')
  return result
}
