// SPDX-License-Identifier: 0BSD
import { createSprinkles, defineProperties } from '@vanilla-extract/sprinkles'

import { RESPONSIVE_CONDITIONS } from '../../../system/responsive/constant'
import { layoutValues, spacingValues } from '../../../system/tokens/registry'
import { typographyValues } from '../../../system/tokens/typography'

export const textSprinkles = createSprinkles(
  defineProperties({
    properties: { ...spacingValues, ...layoutValues, ...typographyValues },
    conditions: RESPONSIVE_CONDITIONS,
    defaultCondition: 'base'
  })
)
export type TextSprinkles = Parameters<typeof textSprinkles>[0]
