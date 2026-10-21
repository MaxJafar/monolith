// SPDX-License-Identifier: 0BSD
type Condition = {
  suffix: string
  varSuffix: string
  selectorTemplate: string
  media?: string
}
const rule = (
  suffix: string,
  selectorTemplate: string,
  media?: string
): Condition => ({
  suffix,
  varSuffix: suffix,
  selectorTemplate,
  ...(media ? { media } : {})
})

const dark = '.dark'
const image = '.has-bg-image'
const both = `:is(${dark}${image}, ${dark} ${image}, ${image} ${dark})`
export const THEME_CONDITIONS = {
  base: rule('', '.{cls}'),
  dark: rule('-dark', `${dark} .{cls}`),
  hover: rule('-hover', '.{cls}:hover'),
  darkHover: rule('-dark-hover', `${dark} .{cls}:hover`),
  hasBgImage: rule('-has-bg-image', `${image} .{cls}`),
  darkHasBgImage: rule('-dark-has-bg-image', `${both} .{cls}`),
  hasBgImageHover: rule('-has-bg-image-hover', `${image} .{cls}:hover`),
  hasBgImageDarkHover: rule('-has-bg-image-dark-hover', `${both} .{cls}:hover`),
  print: rule('-print', '.{cls}', 'print')
} satisfies Record<string, Condition>
export type ThemeConditionPropName = keyof typeof THEME_CONDITIONS
export type ThemeConditionProp<Value> =
  Value | Partial<Record<ThemeConditionPropName, Value>>
