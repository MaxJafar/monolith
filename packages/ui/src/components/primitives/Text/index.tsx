import type {
  CSSProperties,
  ComponentPropsWithRef,
  ElementType,
  ReactNode,
  Ref
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
  resolveStyles,
  vars
} from '@/system'

import { Slot } from '../Slot'
import { textSprinkles } from './Text.css'

interface Typography<T extends ElementType>
  extends TokenizedSpacingProps, TokenizedLayoutProps {
  as?: T
  asChild?: boolean
  ref?: Ref<HTMLElement>
  children?: ReactNode
  className?: string
  style?: CSSProperties
  size?: ResponsiveProp<keyof typeof vars.fontSize>
  weight?: ResponsiveProp<'normal' | 'medium' | 'semibold' | 'bold'>
  leading?: ResponsiveProp<
    'none' | 'tight' | 'snug' | 'normal' | 'relaxed' | 'loose'
  >
  tracking?: ResponsiveProp<
    'tighter' | 'tight' | 'normal' | 'wide' | 'wider' | 'widest'
  >
  color?: ThemeConditionProp<ColorValue>
  bg?: ThemeConditionProp<ColorValue>
  align?: ResponsiveProp<'left' | 'center' | 'right'>
  decoration?: ResponsiveProp<'underline' | 'line-through' | 'none'>
  transform?: ResponsiveProp<'uppercase' | 'lowercase' | 'capitalize' | 'none'>
  wrap?: ResponsiveProp<'wrap' | 'nowrap' | 'pretty' | 'balance'>
  whiteSpace?: ResponsiveProp<
    'normal' | 'nowrap' | 'pre' | 'pre-line' | 'pre-wrap' | 'break-spaces'
  >
  wordBreak?: ResponsiveProp<'normal' | 'break-all' | 'keep-all'>
  overflowWrap?: ResponsiveProp<'normal' | 'break-word' | 'anywhere'>
  display?: ResponsiveProp<
    | 'block'
    | 'inline'
    | 'inline-block'
    | 'flex'
    | 'inline-flex'
    | 'none'
    | 'contents'
  >
  trim?: ResponsiveProp<'normal' | 'start' | 'end' | 'both'>
  truncate?: boolean
  lineClamp?: number
}
export type TextProps<T extends ElementType = 'span'> = Typography<T> &
  Omit<ComponentPropsWithRef<T>, keyof Typography<T>>

const typography = {
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
const spacing = new Set('p px py pt pr pb pl m mx my mt mr mb ml'.split(' '))
const layout = new Set(['position', 'overflow', 'overflowX', 'overflowY'])

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
  ...properties
}: TextProps<T>) {
  const tokens: Record<string, unknown> = {}
  const space: Record<string, unknown> = {}
  const placement: Record<string, unknown> = {}
  const native: Record<string, unknown> = {}
  for (const [name, value] of Object.entries(properties)) {
    if (Object.prototype.hasOwnProperty.call(typography, name)) {
      tokens[typography[name as keyof typeof typography]] =
        normalizeResponsiveProp(value as never)
    } else if (spacing.has(name)) space[name] = value
    else if (layout.has(name)) placement[name] = value
    else native[name] = value
  }
  tokens.lineHeight ??= tokens.fontSize
  const clipping: CSSProperties = {}
  if (truncate)
    Object.assign(clipping, {
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      whiteSpace: 'nowrap'
    })
  if (lineClamp !== undefined && Number.isFinite(lineClamp) && lineClamp >= 1) {
    Object.assign(clipping, {
      display: '-webkit-box',
      WebkitLineClamp: Math.floor(lineClamp),
      WebkitBoxOrient: 'vertical',
      overflow: 'hidden',
      whiteSpace: 'normal'
    })
  }
  const resolved = resolveStyles({
    sprinkles: textSprinkles,
    sprinkleProps: {
      ...tokens,
      ...resolveSpacingSprinklesProps(space),
      ...resolveLayoutSprinklesProps(placement)
    },
    colorProps: { color, bg },
    className,
    style: { ...style, ...clipping }
  })
  const Element = asChild ? Slot : (as ?? 'span')
  return (
    <Element {...native} {...resolved} ref={ref as Ref<never>}>
      {children}
    </Element>
  )
}
