// SPDX-License-Identifier: 0BSD
import type { ElementType } from 'react'

import {
  type ColorValue,
  type ResponsiveProp,
  type ThemeConditionProp,
  mergeStyle,
  resolveColorProp
} from '@/system'
import { getResponsiveLayoutStyles } from '@/system/responsive/utils/getResponsiveLayoutStyles'

import {
  type SurfaceOwnProps,
  type SurfaceProps,
  renderSurface
} from '../surface'
import './ring.css'

type RingOptions<T extends ElementType> = SurfaceOwnProps<
  T,
  'block' | 'inline' | 'inline-block' | 'none' | 'contents'
> & {
  ringWidth?: ResponsiveProp<string>
  ringOffsetWidth?: ResponsiveProp<string>
  ringColor?: ThemeConditionProp<ColorValue>
}
export type RingProps<T extends ElementType = 'div'> = SurfaceProps<
  T,
  RingOptions<T>
>
export function Ring<T extends ElementType = 'div'>({
  ringWidth = '3px',
  ringOffsetWidth = '0px',
  ringColor = 'custom-500',
  style,
  className,
  ...content
}: RingProps<T>) {
  const visuals = mergeStyle(
    getResponsiveLayoutStyles({ ringWidth, ringOffsetWidth }),
    resolveColorProp('ringColor', ringColor),
    {
      className: ['monolith-ring', className].filter(Boolean).join(' '),
      style: style ?? {}
    }
  )
  return renderSurface({ ...content, ...visuals }, 'box')
}
