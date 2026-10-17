import type { ElementType } from 'react'

import type { ResponsiveProp, SpaceToken } from '@/system'

import {
  type SurfaceOwnProps,
  type SurfaceProps,
  renderSurface
} from '../surface'

interface FlexOwnProps<T extends ElementType> extends SurfaceOwnProps<
  T,
  'none' | 'flex' | 'inline-flex'
> {
  centered?: boolean
  direction?: ResponsiveProp<
    'row' | 'column' | 'row-reverse' | 'column-reverse'
  >
  align?: ResponsiveProp<'stretch' | 'center' | 'start' | 'end' | 'baseline'>
  justify?: ResponsiveProp<
    'start' | 'center' | 'between' | 'around' | 'evenly' | 'end'
  >
  wrap?: ResponsiveProp<'nowrap' | 'wrap' | 'wrap-reverse'>
  gap?: ResponsiveProp<SpaceToken>
  gapX?: ResponsiveProp<SpaceToken>
  gapY?: ResponsiveProp<SpaceToken>
}

export type FlexProps<T extends ElementType = 'div'> = SurfaceProps<
  T,
  FlexOwnProps<T>
>

export function Flex<T extends ElementType = 'div'>(props: FlexProps<T>) {
  return renderSurface(props, 'flex')
}
