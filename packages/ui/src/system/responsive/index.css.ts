import { globalStyle } from '@vanilla-extract/css'

import {
  LAYOUT_PROPERTIES,
  LAYOUT_PROP_DEFS,
  type LayoutPropDefsKey,
  RESPONSIVE_CONDITIONS
} from './constant'
import { escapeCssClassName } from './utils/escapeCssClassName'

for (const [name, [, property]] of Object.entries(LAYOUT_PROPERTIES)) {
  const definition = LAYOUT_PROP_DEFS[name as LayoutPropDefsKey]
  for (const [breakpoint, condition] of Object.entries(RESPONSIVE_CONDITIONS)) {
    const suffix = breakpoint === 'base' ? '' : '-' + breakpoint
    const selector =
      '.' +
      (breakpoint === 'base' ? '' : escapeCssClassName(breakpoint) + '\\:') +
      definition.className
    const declaration = {
      [property]:
        'var(' +
        definition.customProperties[0] +
        suffix +
        ')' +
        (breakpoint === 'print' ? ' !important' : '')
    }
    globalStyle(
      selector,
      '@media' in condition
        ? { '@media': { [condition['@media']]: declaration } }
        : declaration
    )
  }
}
