// SPDX-License-Identifier: 0BSD
import type { Breakpoint, PropDef } from './types'

export const RESPONSIVE_CONDITIONS = {
  base: {},
  ...Object.fromEntries(
    ['sm', 'md'].map(name => [name, { '@media': '(min-width: 700px)' }])
  ),
  ...Object.fromEntries(
    ['lg', 'xl', '2xl'].map(name => [name, { '@media': '(min-width: 1000px)' }])
  ),
  print: { '@media': 'print' }
} as Record<Breakpoint, { '@media'?: string }>

// Compact identifiers are part of the CSS ABI used by prebuilt addon bundles.
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
function definitions() {
  const result = {} as Record<LayoutPropDefsKey, PropDef>
  for (const name of Object.keys(LAYOUT_PROPERTIES) as LayoutPropDefsKey[]) {
    const identifier = 'monolith-' + LAYOUT_PROPERTIES[name][0]
    result[name] = {
      className: identifier,
      customProperties: [
        ('--' + identifier) as PropDef['customProperties'][number]
      ]
    }
  }
  return result
}
export const LAYOUT_PROP_DEFS = definitions()
