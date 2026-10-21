// SPDX-License-Identifier: 0BSD
import { defineProperties } from '@vanilla-extract/sprinkles'

import { RESPONSIVE_CONDITIONS } from '../../responsive/constant'
import type { ResponsiveProp } from '../../responsive/types'
import { layoutValues } from '../registry'

export type PositionValue = (typeof layoutValues.position)[number]
export type OverflowValue = (typeof layoutValues.overflow)[number]
export type TokenizedLayoutProps = {
  [Name in keyof typeof layoutValues]?: ResponsiveProp<
    (typeof layoutValues)[Name][number]
  >
}
export const tokenizedLayoutProperties = defineProperties({
  properties: layoutValues,
  defaultCondition: 'base',
  conditions: RESPONSIVE_CONDITIONS
})
