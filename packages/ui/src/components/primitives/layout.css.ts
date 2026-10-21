// SPDX-License-Identifier: 0BSD
import { recipe } from '@vanilla-extract/recipes'
import { createSprinkles, defineProperties } from '@vanilla-extract/sprinkles'

import { RESPONSIVE_CONDITIONS } from '../../system/responsive/constant'
import { themeTokens } from '../../system/token-values'
import {
  layoutValues,
  roundingValues,
  spacingValues
} from '../../system/tokens/registry'

const common = defineProperties({
  defaultCondition: 'base',
  conditions: RESPONSIVE_CONDITIONS,
  properties: { ...spacingValues, ...roundingValues, ...layoutValues }
})
const geometry = defineProperties({
  defaultCondition: 'base',
  conditions: RESPONSIVE_CONDITIONS,
  properties: {
    display: [
      'block',
      'inline',
      'inline-block',
      'contents',
      'none',
      'flex',
      'inline-flex',
      'grid',
      'inline-grid'
    ],
    alignItems: [
      'start',
      'end',
      'flex-start',
      'flex-end',
      'stretch',
      'center',
      'baseline'
    ],
    justifyContent: [
      'start',
      'end',
      'flex-start',
      'flex-end',
      'center',
      'space-between',
      'space-around',
      'space-evenly'
    ],
    flexDirection: ['row', 'column', 'row-reverse', 'column-reverse'],
    flexWrap: ['nowrap', 'wrap', 'wrap-reverse'],
    gridAutoFlow: ['row', 'column', 'dense', 'row dense', 'column dense'],
    gap: themeTokens.space,
    columnGap: themeTokens.space,
    rowGap: themeTokens.space
  }
})
export const layoutSprinkles = createSprinkles(common, geometry)
export const layoutBase = recipe({ base: { boxSizing: 'border-box' } })
