// SPDX-License-Identifier: 0BSD
import type { CSSProperties, ReactNode } from 'react'

import { Slot } from '@/components/primitives'

import { placeholderRecipe } from './Placeholder.css'

export function Placeholder({
  children,
  color = 'default',
  focusColor = 'default',
  className,
  style
}: {
  children: ReactNode
  color?: 'default' | 'transparent'
  focusColor?: 'default' | 'transparent'
  className?: string
  style?: CSSProperties
}) {
  return (
    <Slot
      style={style}
      className={[placeholderRecipe({ color, focusColor }), className]
        .filter(Boolean)
        .join(' ')}
    >
      {children}
    </Slot>
  )
}
