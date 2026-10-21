// SPDX-License-Identifier: 0BSD
import type { ResolvedStyle } from '../props-resolver'
import { isColorWithOpacity } from './color-with-opacity'
import { COLOR_PROP_DEFS, type ColorPropName } from './constants/color-props'
import { COLORS, type ColorValue } from './constants/colors'
import {
  THEME_CONDITIONS,
  type ThemeConditionProp,
  type ThemeConditionPropName
} from './constants/theme-conditions'

function cssColor(value: ColorValue | undefined) {
  if (typeof value === 'string')
    return Object.hasOwn(COLORS, value) ? COLORS[value] : undefined
  if (isColorWithOpacity(value))
    return `color-mix(in srgb, ${COLORS[value.token]} ${value.opacity}, transparent)`
}
export function resolveColorProp(
  property: ColorPropName,
  choice: ThemeConditionProp<ColorValue> | undefined
): ResolvedStyle {
  const output: ResolvedStyle = { className: '', style: {} }
  if (choice == null || !Object.hasOwn(COLOR_PROP_DEFS, property)) return output
  const perCondition =
    typeof choice === 'string' || isColorWithOpacity(choice)
      ? { base: choice }
      : choice
  const names: string[] = []
  const variables: Record<string, string> = {}
  const target = COLOR_PROP_DEFS[property]
  for (const [condition, rule] of Object.entries(THEME_CONDITIONS)) {
    const color = cssColor(perCondition[condition as ThemeConditionPropName])
    if (color === undefined) continue
    names.push(target.className + rule.suffix)
    variables[target.varPrefix + rule.varSuffix] = color
  }
  return { className: names.join(' '), style: variables }
}
