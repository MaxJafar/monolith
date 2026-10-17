import type { ElementType } from 'react'

import {
  type ColorValue,
  type ResponsiveProp,
  type ThemeConditionProp,
  mergeStyle,
  resolveColorProp
} from '@/system'
import { getResponsiveLayoutStyles } from '@/system/responsive/utils/getResponsiveLayoutStyles'

import { Box, type BoxProps } from '../Box'
import type { SurfaceOwnProps, SurfaceProps } from '../surface'
import { ring } from './Ring.css'

interface RingOwnProps<T extends ElementType> extends SurfaceOwnProps<
  T,
  'block' | 'inline' | 'inline-block' | 'none' | 'contents'
> {
  ringWidth?: ResponsiveProp<string>
  ringColor?: ThemeConditionProp<ColorValue>
  ringOffsetWidth?: ResponsiveProp<string>
}
export type RingProps<T extends ElementType = 'div'> = SurfaceProps<
  T,
  RingOwnProps<T>
>

export function Ring<T extends ElementType = 'div'>({
  ringWidth = '3px',
  ringOffsetWidth = '0px',
  ringColor = 'custom-500',
  className,
  style,
  ...surface
}: RingProps<T>) {
  const resolved = mergeStyle(
    resolveColorProp('ringColor', ringColor),
    getResponsiveLayoutStyles({ ringWidth, ringOffsetWidth }),
    {
      className: ['_ring', ring, className].filter(Boolean).join(' '),
      style: style ?? {}
    }
  )
  // Rest destructuring loses the element-specific prop relation in TypeScript 7.
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
  return <Box<T> {...(surface as BoxProps<T>)} {...resolved} />
}
