// SPDX-License-Identifier: 0BSD
import { globalStyle } from '@vanilla-extract/css'

import { conditionalName } from '@/system/responsive/conditions'
import { RESPONSIVE_CONDITIONS } from '@/system/responsive/constant'
import type { Breakpoint } from '@/system/responsive/types'
import { escapeCssClassName } from '@/system/responsive/utils/escapeCssClassName'

for (const at of Object.keys(RESPONSIVE_CONDITIONS) as Breakpoint[]) {
  const identity = conditionalName(
    { className: 'monolith-size', customProperties: ['--monolith-size'] },
    at
  )
  const value =
    'var(' + identity.variable + ')' + (at === 'print' ? ' !important' : '')
  const dimensions = { width: value, height: value }
  const query = RESPONSIVE_CONDITIONS[at]['@media']
  globalStyle(
    '.' + escapeCssClassName(identity.className),
    query ? { '@media': { [query]: dimensions } } : dimensions
  )
}
