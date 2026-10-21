// SPDX-License-Identifier: 0BSD
import type { ElementType } from 'react'

import type { ResponsiveProp, SpaceToken } from '@/system'

import {
  type SurfaceOwnProps,
  type SurfaceProps,
  renderSurface
} from '../surface'

type Conditional<T> = ResponsiveProp<T>
type Alignment = 'stretch' | 'center' | 'start' | 'end' | 'baseline'
type FlexOptions<T extends ElementType> = SurfaceOwnProps<
  T,
  'flex' | 'inline-flex' | 'none'
> & {
  centered?: boolean
  direction?: Conditional<'row' | 'column' | 'row-reverse' | 'column-reverse'>
  align?: Conditional<Alignment>
  justify?: Conditional<
    'start' | 'center' | 'between' | 'around' | 'evenly' | 'end'
  >
  wrap?: Conditional<'nowrap' | 'wrap' | 'wrap-reverse'>
} & Partial<Record<'gap' | 'gapX' | 'gapY', Conditional<SpaceToken>>>
export type FlexProps<T extends ElementType = 'div'> = SurfaceProps<
  T,
  FlexOptions<T>
>
export function Flex<T extends ElementType = 'div'>(options: FlexProps<T>) {
  return renderSurface(options, 'flex')
}
