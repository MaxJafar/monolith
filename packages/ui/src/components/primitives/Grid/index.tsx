import type { ElementType } from 'react'

import type { ResponsiveProp, SpaceToken } from '@/system'

import {
  type SurfaceOwnProps,
  type SurfaceProps,
  renderSurface
} from '../surface'

interface GridOwnProps<T extends ElementType> extends SurfaceOwnProps<
  T,
  'none' | 'grid' | 'inline-grid'
> {
  templateRows?: ResponsiveProp<number | string, string>
  templateCols?: ResponsiveProp<number | string, string>
  flow?: ResponsiveProp<
    'row' | 'column' | 'dense' | 'row dense' | 'column dense'
  >
  align?: ResponsiveProp<'stretch' | 'center' | 'start' | 'end' | 'baseline'>
  justify?: ResponsiveProp<'start' | 'center' | 'end' | 'between'>
  gap?: ResponsiveProp<SpaceToken>
  gapX?: ResponsiveProp<SpaceToken>
  gapY?: ResponsiveProp<SpaceToken>
}

export type GridProps<T extends ElementType = 'div'> = SurfaceProps<
  T,
  GridOwnProps<T>
>

export function Grid<T extends ElementType = 'div'>(props: GridProps<T>) {
  return renderSurface(props, 'grid')
}
