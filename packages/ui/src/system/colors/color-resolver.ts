import type { ResolvedStyle } from '../props-resolver'
import { isColorWithOpacity } from './color-with-opacity'
import {
  COLORS,
  COLOR_PROP_DEFS,
  type ColorPropName,
  type ColorValue,
  THEME_CONDITIONS,
  type ThemeConditionProp
} from './constants'

export function resolveColorProp(
  name: ColorPropName,
  input: ThemeConditionProp<ColorValue> | undefined
): ResolvedStyle {
  const style: Record<string, string> = {}
  const classes: string[] = []
  const definition = COLOR_PROP_DEFS[name]
  if (!definition || input == null) return { className: '', style }
  const values =
    typeof input === 'string' || isColorWithOpacity(input)
      ? { base: input }
      : input
  for (const condition of Object.keys(THEME_CONDITIONS) as Array<
    keyof typeof THEME_CONDITIONS
  >) {
    const value = values[condition]
    if (value === undefined) continue
    const resolved = isColorWithOpacity(value) ? String(value) : COLORS[value]
    if (!resolved) continue
    const selector = THEME_CONDITIONS[condition]
    classes.push(definition.className + selector.suffix)
    style[definition.varPrefix + selector.varSuffix] = resolved
  }
  return { className: classes.join(' '), style }
}
