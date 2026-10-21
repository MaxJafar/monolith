// SPDX-License-Identifier: 0BSD
import { defineProperties } from '@vanilla-extract/sprinkles'

import { RESPONSIVE_CONDITIONS } from '../../responsive/constant'
import type { ResponsiveProp } from '../../responsive/types'
import type { themeTokens } from '../../token-values'
import { spacingAliases, spacingValues } from '../registry'

export type TokenizedSpacingProps = Partial<
  Record<
    keyof typeof spacingAliases,
    ResponsiveProp<keyof typeof themeTokens.space>
  >
>
export const tokenizedSpacingProperties = defineProperties({
  properties: spacingValues,
  defaultCondition: 'base',
  conditions: RESPONSIVE_CONDITIONS
})
