// SPDX-License-Identifier: 0BSD
import type { ElementType } from 'react'

import {
  type SurfaceOwnProps,
  type SurfaceProps,
  renderSurface
} from '../surface'

export type BoxProps<T extends ElementType = 'div'> = SurfaceProps<
  T,
  SurfaceOwnProps<T, 'block' | 'inline' | 'inline-block' | 'none' | 'contents'>
>
export function Box<T extends ElementType = 'div'>(options: BoxProps<T>) {
  return renderSurface(options, 'box')
}
