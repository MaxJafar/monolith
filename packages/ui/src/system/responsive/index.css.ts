// SPDX-License-Identifier: 0BSD
import { type GlobalStyleRule, globalStyle } from '@vanilla-extract/css'

import { conditionalName } from './conditions'
import {
  LAYOUT_PROPERTIES,
  LAYOUT_PROP_DEFS,
  type LayoutPropDefsKey,
  RESPONSIVE_CONDITIONS
} from './constant'
import type { Breakpoint } from './types'
import { escapeCssClassName } from './utils/escapeCssClassName'

for (const key of Object.keys(LAYOUT_PROPERTIES) as LayoutPropDefsKey[]) {
  for (const at of Object.keys(RESPONSIVE_CONDITIONS) as Breakpoint[]) {
    const identity = conditionalName(LAYOUT_PROP_DEFS[key], at)
    const property = LAYOUT_PROPERTIES[key][1]
    const value =
      'var(' + identity.variable + ')' + (at === 'print' ? ' !important' : '')
    const declaration: GlobalStyleRule = property.startsWith('--')
      ? { vars: { [property]: value } }
      : { [property]: value }
    const media = RESPONSIVE_CONDITIONS[at]['@media']
    globalStyle(
      '.' + escapeCssClassName(identity.className),
      media ? { '@media': { [media]: declaration } } : declaration
    )
  }
}
