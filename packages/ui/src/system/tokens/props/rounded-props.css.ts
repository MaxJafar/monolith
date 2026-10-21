// SPDX-License-Identifier: 0BSD
import { defineProperties } from '@vanilla-extract/sprinkles'

import { RESPONSIVE_CONDITIONS } from '../../responsive/constant'
import type { ResponsiveProp } from '../../responsive/types'
import type { themeTokens } from '../../token-values'
import { roundingAliases, roundingValues } from '../registry'

export type TokenizedRoundedProps = Partial<
  Record<
    keyof typeof roundingAliases,
    ResponsiveProp<keyof typeof themeTokens.radii>
  >
>
export const tokenizedRoundedProperties = defineProperties({
  properties: roundingValues,
  defaultCondition: 'base',
  conditions: RESPONSIVE_CONDITIONS
})
