// SPDX-License-Identifier: 0BSD
import type { ElementType } from 'react'

import type { ResponsiveProp, SpaceToken } from '@/system'

import {
  type SurfaceOwnProps,
  type SurfaceProps,
  renderSurface
} from '../surface'

type GridOptions<T extends ElementType> = SurfaceOwnProps<
  T,
  'grid' | 'inline-grid' | 'none'
> &
  Partial<
    Record<
      'templateRows' | 'templateCols',
      ResponsiveProp<number | string, string>
    >
  > &
  Partial<Record<'gap' | 'gapX' | 'gapY', ResponsiveProp<SpaceToken>>> & {
    flow?: ResponsiveProp<
      'row' | 'column' | 'dense' | 'row dense' | 'column dense'
    >
    align?: ResponsiveProp<'stretch' | 'center' | 'start' | 'end' | 'baseline'>
    justify?: ResponsiveProp<'start' | 'center' | 'end' | 'between'>
  }
export type GridProps<T extends ElementType = 'div'> = SurfaceProps<
  T,
  GridOptions<T>
>
export function Grid<T extends ElementType = 'div'>(options: GridProps<T>) {
  return renderSurface(options, 'grid')
}
