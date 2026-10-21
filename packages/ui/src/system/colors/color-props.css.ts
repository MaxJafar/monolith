// SPDX-License-Identifier: 0BSD
import { type GlobalStyleRule, globalStyle } from '@vanilla-extract/css'

import { COLOR_PROP_DEFS } from './constants/color-props'
import { THEME_CONDITIONS } from './constants/theme-conditions'

const declarations = Object.values(COLOR_PROP_DEFS).flatMap(property =>
  Object.values(THEME_CONDITIONS).map(condition => {
    const selector = condition.selectorTemplate.replaceAll(
      '{cls}',
      property.className + condition.suffix
    )
    const value = `var(${property.varPrefix}${condition.varSuffix})`
    const body = {
      [property.cssProperty]: value + (condition.media ? ' !important' : '')
    }
    return {
      selector,
      rule: condition.media ? { '@media': { [condition.media]: body } } : body
    }
  })
)
for (const { selector, rule } of declarations)
  globalStyle(selector, rule as GlobalStyleRule)
