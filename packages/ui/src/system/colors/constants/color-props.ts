// SPDX-License-Identifier: 0BSD
import type { ColorValue } from './colors'
import type { ThemeConditionProp } from './theme-conditions'

const properties = {
  bg: ['bg', 'backgroundColor'],
  color: ['color', 'color'],
  borderColor: ['border-color', 'borderColor'],
  ringColor: ['ring-color', '--monolith-ring-color-resolved'],
  ringOffsetColor: [
    'ring-offset-color',
    '--monolith-ring-offset-color-resolved'
  ],
  divideColor: ['divide-color', '--monolith-divide-color-resolved']
} as const
export type ColorPropName = keyof typeof properties
export type ColorProps = Partial<
  Record<ColorPropName, ThemeConditionProp<ColorValue>>
>
export const COLOR_PROP_DEFS = Object.fromEntries(
  Object.entries(properties).map(([name, [suffix, cssProperty]]) => [
    name,
    {
      className: 'monolith-' + suffix,
      varPrefix: '--monolith-' + suffix,
      cssProperty
    }
  ])
) as Record<
  ColorPropName,
  { className: string; varPrefix: string; cssProperty: string }
>
