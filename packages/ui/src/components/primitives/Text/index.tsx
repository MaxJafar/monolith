// SPDX-License-Identifier: 0BSD
import {
  type CSSProperties,
  type ComponentPropsWithRef,
  type ElementType,
  type ReactElement,
  type ReactNode,
  type Ref,
  createElement
} from 'react'

import {
  type ColorValue,
  type ResponsiveProp,
  type ThemeConditionProp,
  type TokenizedLayoutProps,
  type TokenizedSpacingProps,
  normalizeResponsiveProp,
  resolveLayoutSprinklesProps,
  resolveSpacingSprinklesProps,
  resolveStyles
} from '@/system'
import { layoutValues, spacingAliases } from '@/system/tokens/registry'
import type { typographyValues } from '@/system/tokens/typography'

import { Slot } from '../Slot'
import { textSprinkles } from './Text.css'

const format = {
  size: 'fontSize',
  weight: 'fontWeight',
  leading: 'lineHeight',
  tracking: 'letterSpacing',
  align: 'textAlign',
  decoration: 'textDecoration',
  transform: 'textTransform',
  wrap: 'textWrap',
  whiteSpace: 'whiteSpace',
  wordBreak: 'wordBreak',
  overflowWrap: 'overflowWrap',
  display: 'display',
  trim: 'textBoxTrim'
} as const
type Choice<T> = T extends readonly (infer Value)[] ? Value : keyof T
type FormatProps = {
  [Field in keyof typeof format]?: ResponsiveProp<
    Choice<(typeof typographyValues)[(typeof format)[Field]]>
  >
}
type OwnText<T extends ElementType> = FormatProps &
  TokenizedLayoutProps &
  TokenizedSpacingProps & {
    as?: T
    asChild?: boolean
    ref?: Ref<HTMLElement>
    children?: ReactNode
    className?: string
    style?: CSSProperties
    color?: ThemeConditionProp<ColorValue>
    bg?: ThemeConditionProp<ColorValue>
    truncate?: boolean
    lineClamp?: number
  }
export type TextProps<T extends ElementType = 'span'> = OwnText<T> &
  Omit<ComponentPropsWithRef<T>, keyof OwnText<T>>

function clipping(
  single: boolean | undefined,
  lines: number | undefined
): CSSProperties {
  if (lines !== undefined && Number.isFinite(lines) && lines >= 1)
    return {
      display: '-webkit-box',
      WebkitLineClamp: Math.floor(lines),
      WebkitBoxOrient: 'vertical',
      overflow: 'hidden',
      whiteSpace: 'normal'
    }
  return single
    ? { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }
    : {}
}
export function Text<T extends ElementType = 'span'>({
  as,
  asChild,
  ref,
  children,
  className,
  style,
  color,
  bg,
  truncate,
  lineClamp,
  ...attributes
}: TextProps<T>): ReactElement {
  const native: Record<string, unknown> = { ...attributes }
  const tokens: Record<string, unknown> = {}
  const spacing: Record<string, unknown> = {}
  const placement: Record<string, unknown> = {}
  for (const field in attributes) {
    const value = attributes[field as keyof typeof attributes]
    if (Object.hasOwn(format, field))
      tokens[format[field as keyof typeof format]] =
        normalizeResponsiveProp(value)
    else if (Object.hasOwn(spacingAliases, field)) spacing[field] = value
    else if (Object.hasOwn(layoutValues, field)) placement[field] = value
    else continue
    delete native[field]
  }
  tokens.lineHeight ??= tokens.fontSize
  const resolved = resolveStyles({
    sprinkles: textSprinkles,
    sprinkleProps: {
      ...tokens,
      ...resolveSpacingSprinklesProps(spacing),
      ...resolveLayoutSprinklesProps(placement)
    },
    colorProps: { color, bg },
    className,
    style: { ...style, ...clipping(truncate, lineClamp) }
  })
  return createElement(asChild ? Slot : (as ?? 'span'), {
    ...native,
    ...resolved,
    ref,
    children
  })
}
