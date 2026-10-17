import type { CSSProperties, ElementType } from 'react'

import {
  type ColorValue,
  type ThemeConditionProp,
  colorWithOpacity,
  mergeStyle,
  resolveColorProp
} from '@/system'

import { Box, type BoxProps } from '../Box'
import type { SurfaceOwnProps, SurfaceProps } from '../surface'

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

const edges: Record<BorderSide, string[]> = {
  all: ['Top', 'Right', 'Bottom', 'Left'],
  top: ['Top'],
  right: ['Right'],
  bottom: ['Bottom'],
  left: ['Left'],
  x: ['Right', 'Left'],
  y: ['Top', 'Bottom'],
  none: []
}

export function computeBorderStyles(
  side: BorderSide,
  width: string,
  style: BorderStyleValue
): CSSProperties {
  if (side === 'all') return { borderWidth: width, borderStyle: style }
  return {
    borderStyle: 'none',
    ...Object.fromEntries(
      edges[side].flatMap(edge => [
        ['border' + edge + 'Width', width],
        ['border' + edge + 'Style', style]
      ])
    )
  }
}

export function Bordered<T extends ElementType = 'div'>({
  borderSide = 'all',
  borderWidth = '1px',
  borderStyle = 'solid',
  borderColor = { base: 'bg-300', dark: colorWithOpacity('bg-700', '50%') },
  color,
  className,
  style,
  ...surface
}: BorderedProps<T>) {
  const resolved = mergeStyle(
    resolveColorProp('borderColor', borderColor),
    resolveColorProp('color', color),
    {
      className: className ?? '',
      style: {
        ...computeBorderStyles(borderSide, borderWidth, borderStyle),
        ...style
      }
    }
  )
  // Rest destructuring loses the element-specific prop relation in TypeScript 7.
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
  return <Box<T> {...(surface as BoxProps<T>)} {...resolved} />
}
