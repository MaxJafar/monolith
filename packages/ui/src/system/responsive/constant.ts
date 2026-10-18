import type { Breakpoint, PropDef } from './types'

export const RESPONSIVE_CONDITIONS = {
  base: {},
  sm: { '@media': '(min-width: 700px)' },
  md: { '@media': '(min-width: 700px)' },
  lg: { '@media': '(min-width: 1000px)' },
  xl: { '@media': '(min-width: 1000px)' },
  '2xl': { '@media': '(min-width: 1000px)' },
  print: { '@media': 'print' }
} as const satisfies Record<Breakpoint, object>

export const LAYOUT_PROPERTIES = {
  width: ['w', 'width'],
  minWidth: ['min-w', 'minWidth'],
  maxWidth: ['max-w', 'maxWidth'],
  height: ['h', 'height'],
  minHeight: ['min-h', 'minHeight'],
  maxHeight: ['max-h', 'maxHeight'],
  inset: ['inset', 'inset'],
  top: ['t', 'top'],
  right: ['r', 'right'],
  bottom: ['b', 'bottom'],
  left: ['l', 'left'],
  flex: ['fl', 'flex'],
  flexBasis: ['fb', 'flexBasis'],
  flexGrow: ['fg', 'flexGrow'],
  flexShrink: ['fs', 'flexShrink'],
  gridArea: ['ga', 'gridArea'],
  gridColumnSpan: ['gcsp', 'gridColumn'],
  gridRowSpan: ['grsp', 'gridRow'],
  gridTemplateColumns: ['gtc', 'gridTemplateColumns'],
  gridTemplateRows: ['gtr', 'gridTemplateRows'],
  zIndex: ['zi', 'zIndex'],
  ringWidth: ['rw', '--monolith-ring-width'],
  ringOffsetWidth: ['row', '--monolith-ring-offset-width'],
  aspectRatio: ['ar', 'aspectRatio']
} as const
export type LayoutPropDefsKey = keyof typeof LAYOUT_PROPERTIES
export const LAYOUT_PROP_DEFS = Object.fromEntries(
  Object.entries(LAYOUT_PROPERTIES).map(([name, [suffix]]) => [
    name,
    {
      className: 'monolith-' + suffix,
      customProperties: ['--monolith-' + suffix]
    }
  ])
) as Record<LayoutPropDefsKey, PropDef>
