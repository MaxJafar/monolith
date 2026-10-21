// SPDX-License-Identifier: 0BSD
import { RESPONSIVE_CONDITIONS } from '../responsive/constant'
import type { ResponsiveProp } from '../responsive/types'
import { themeTokens } from '../token-values'

/** Ordered from shorthand to the most specific edge. */
export const spacingAliases = {
  p: ['padding'],
  px: ['paddingLeft', 'paddingRight'],
  py: ['paddingTop', 'paddingBottom'],
  pt: ['paddingTop'],
  pr: ['paddingRight'],
  pb: ['paddingBottom'],
  pl: ['paddingLeft'],
  m: ['margin'],
  mx: ['marginLeft', 'marginRight'],
  my: ['marginTop', 'marginBottom'],
  mt: ['marginTop'],
  mr: ['marginRight'],
  mb: ['marginBottom'],
  ml: ['marginLeft']
} as const
export const roundingAliases = {
  r: ['borderRadius'],
  rtl: ['borderTopLeftRadius'],
  rtr: ['borderTopRightRadius'],
  rbl: ['borderBottomLeftRadius'],
  rbr: ['borderBottomRightRadius']
} as const
export const layoutValues = {
  position: ['static', 'relative', 'absolute', 'fixed', 'sticky'],
  overflow: ['visible', 'hidden', 'scroll', 'auto'],
  overflowX: ['visible', 'hidden', 'scroll', 'auto'],
  overflowY: ['visible', 'hidden', 'scroll', 'auto']
} as const

export function propertyFamily<
  const Aliases extends Record<string, readonly string[]>,
  Values extends Record<string, string>
>(aliases: Aliases, values: Values) {
  return Object.fromEntries(
    [...new Set(Object.values(aliases).flat())].map(property => [
      property,
      values
    ])
  ) as Record<Aliases[keyof Aliases][number], Values>
}
export const spacingValues = propertyFamily(spacingAliases, themeTokens.space)
export const roundingValues = propertyFamily(roundingAliases, themeTokens.radii)
export const layoutAliases = Object.fromEntries(
  Object.keys(layoutValues).map(key => [key, [key]])
) as unknown as { [Name in keyof typeof layoutValues]: readonly [Name] }

type Aliases = Record<string, readonly string[]>
type Conditional = ResponsiveProp<string>
type Expanded<Mapping extends Aliases, Input extends object> = Partial<{
  [Property in Mapping[keyof Mapping][number]]: {
    [Alias in keyof Mapping]: Property extends Mapping[Alias][number]
      ? Alias extends keyof Input
        ? Input[Alias]
        : never
      : never
  }[keyof Mapping]
}>

/** Merge per condition so an edge override cannot discard the axis's other breakpoints. */
export function expandAliases<Mapping extends Aliases, Input extends object>(
  aliases: Mapping,
  input: Input
): Expanded<Mapping, Input> {
  const source = input as Record<string, Conditional | undefined>
  const result: Record<string, Record<string, string>> = {}
  for (const alias of Object.keys(aliases)) {
    const raw = source[alias]
    if (raw === undefined) continue
    const entries =
      typeof raw === 'string' ? [['base', raw]] : Object.entries(raw)
    for (const [condition, value] of entries) {
      if (
        !Object.hasOwn(RESPONSIVE_CONDITIONS, condition!) ||
        typeof value !== 'string'
      )
        continue
      for (const property of aliases[alias]!) {
        const values = (result[property] ??= {})
        values[condition!] = value
      }
    }
  }
  return result as Expanded<Mapping, Input>
}
