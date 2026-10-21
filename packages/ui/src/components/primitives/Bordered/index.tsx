// SPDX-License-Identifier: 0BSD
import type { CSSProperties, ElementType } from 'react'

import {
  type ColorValue,
  type ThemeConditionProp,
  colorWithOpacity,
  mergeStyle,
  resolveColorProp
} from '@/system'

import {
  type SurfaceOwnProps,
  type SurfaceProps,
  renderSurface
} from '../surface'

export type BorderSide =
  'all' | 'top' | 'right' | 'bottom' | 'left' | 'x' | 'y' | 'none'
export type BorderStyleValue = 'solid' | 'dashed' | 'dotted' | 'double' | 'none'
export interface BorderedOwnProps<
  T extends ElementType = 'div'
> extends SurfaceOwnProps<
  T,
  'block' | 'inline' | 'inline-block' | 'none' | 'contents'
> {
  color?: ThemeConditionProp<ColorValue>
  borderColor?: ThemeConditionProp<ColorValue>
  borderStyle?: BorderStyleValue
  borderSide?: BorderSide
  borderWidth?: string
}
export type BorderedProps<T extends ElementType = 'div'> = SurfaceProps<
  T,
  BorderedOwnProps<T>
>
const masks: Record<BorderSide, number> = {
  none: 0,
  top: 8,
  right: 4,
  bottom: 2,
  left: 1,
  x: 5,
  y: 10,
  all: 15
}
export function computeBorderStyles(
  side: BorderSide,
  width: string,
  style: BorderStyleValue
): CSSProperties {
  const mask = masks[side]
  return {
    borderStyle: style,
    borderWidth: [8, 4, 2, 1].map(bit => (mask & bit ? width : '0px')).join(' ')
  }
}
export function Bordered<T extends ElementType = 'div'>({
  color,
  borderColor = { base: 'bg-300', dark: colorWithOpacity('bg-700', '50%') },
  borderStyle = 'solid',
  borderWidth = '1px',
  borderSide = 'all',
  style,
  className,
  ...content
}: BorderedProps<T>) {
  const decoration = mergeStyle(
    resolveColorProp('color', color),
    resolveColorProp('borderColor', borderColor),
    {
      className: className ?? '',
      style: {
        ...computeBorderStyles(borderSide, borderWidth, borderStyle),
        ...style
      }
    }
  )
  return renderSurface({ ...content, ...decoration }, 'box')
}
